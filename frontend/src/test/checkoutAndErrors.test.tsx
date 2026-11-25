import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/router/AppRouter';
import {
  addressApi,
  cartApi,
  categoryApi,
  checkoutApi,
  orderApi,
  paymentApi,
  productApi,
  shippingApi,
} from '@/services/api';
import { parseApiError } from '@/services/http/errorParser';
import { useAuthStore } from '@/store/authStore';
import type { Address, Cart, Order } from '@/types';
import { renderWithProviders, resetAppStores } from './testUtils';

const customerUser = {
  id: 'user-cust-1',
  first_name: 'Nadia',
  last_name: 'Benali',
  email: 'nadia@example.com',
  role: 'customer' as const,
  email_verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleAddress: Address = {
  id: 'addr-1',
  user_id: customerUser.id,
  full_name: 'Nadia Benali',
  phone: '0612345678',
  address_line: '12 Avenue Mohammed V',
  city: 'Tangier',
  postal_code: '90000',
  country: 'Morocco',
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleCart: Cart = {
  id: 'cart-1',
  user_id: customerUser.id,
  status: 'active',
  guest_token: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  cart_lines: [
    {
      id: 'line-1',
      cart_id: 'cart-1',
      product_id: 'prod-1',
      quantity: 2,
      unit_price: 5000,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      product: {
        id: 'prod-1',
        name: 'Ceramic Mug',
        slug: 'ceramic-mug',
        sku: 'MUG-01',
        price: 5000,
        description: null,
        is_active: true,
        attributes: null,
        category_id: 'cat-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    },
  ],
};

describe('Checkout Initiation, Stripe Return Verification, and Error Parsing', () => {
  beforeEach(() => {
    resetAppStores();
    vi.restoreAllMocks();
    useAuthStore.setState({
      token: 'cust-token-1',
      user: customerUser,
      isHydrated: true,
    });
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);
    vi.spyOn(productApi, 'list').mockResolvedValue([]);
  });

  it('completes multi-step checkout, applies coupon, places order, and redirects to Stripe URL', async () => {
    vi.spyOn(cartApi, 'get').mockResolvedValue({
      cart: sampleCart,
      guest_token: null,
    });
    vi.spyOn(addressApi, 'list').mockResolvedValue([sampleAddress]);

    const previewSpy = vi
      .spyOn(checkoutApi, 'preview')
      .mockResolvedValueOnce({
        addresses: [sampleAddress],
        selected_address: sampleAddress,
        cart: sampleCart,
        cart_lines: sampleCart.cart_lines ?? [],
        subtotal: 10000,
        shipping_cost: 3000,
        discount: 0,
        total: 13000,
      })
      .mockResolvedValue({
        addresses: [sampleAddress],
        selected_address: sampleAddress,
        cart: sampleCart,
        cart_lines: sampleCart.cart_lines ?? [],
        subtotal: 10000,
        shipping_cost: 3000,
        discount: 1000,
        total: 12000,
      });

    const createdOrder: Order = {
      id: 'order-1234',
      user_id: customerUser.id,
      coupon_id: null,
      shipping_address_id: sampleAddress.id,
      status: 'pending_payment',
      subtotal: 10000,
      discount_amount: 1000,
      shipping_amount: 3000,
      tax_amount: 0,
      total_amount: 12000,
      currency: 'MAD',
      expires_at: '2026-12-01T00:00:00Z',
      paid_at: null,
      cancelled_at: null,
      cancel_reason: null,
      shipping_full_name: sampleAddress.full_name,
      shipping_phone: sampleAddress.phone,
      shipping_address_line: sampleAddress.address_line,
      shipping_city: sampleAddress.city,
      shipping_postal_code: sampleAddress.postal_code,
      shipping_country: sampleAddress.country,
      created_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z',
      order_lines: [],
    };

    const placeOrderSpy = vi.spyOn(checkoutApi, 'placeOrder').mockResolvedValue({
      message: 'Order created successfully.',
      order: { ...createdOrder, order_lines: [] },
    });

    const stripeSessionSpy = vi
      .spyOn(paymentApi, 'createCheckoutSession')
      .mockResolvedValue({
        checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        payment_id: 'pay-1',
      });

    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: assignMock },
    });

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/checkout'] });

    expect(await screen.findByText('Ceramic Mug')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to shipping/i }));

    expect(await screen.findByText('12 Avenue Mohammed V')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to review/i }));

    const couponInput = await screen.findByPlaceholderText(/enter coupon code/i);
    await user.type(couponInput, 'save10');
    await user.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() => {
      expect(previewSpy).toHaveBeenLastCalledWith({
        address_id: 'addr-1',
        coupon_code: 'SAVE10',
      });
    });

    await user.click(
      screen.getByRole('button', { name: /place order & pay with stripe/i })
    );

    await waitFor(() => {
      expect(placeOrderSpy).toHaveBeenCalledWith({
        address_id: 'addr-1',
        coupon_code: 'SAVE10',
      });
      expect(stripeSessionSpy).toHaveBeenCalledWith(
        { order_id: 'order-1234' },
        expect.any(String)
      );
      expect(assignMock).toHaveBeenCalledWith(
        'https://checkout.stripe.com/c/pay/cs_test_123'
      );
    });
  });

  it('does not assume payment success on /checkout/success when backend status is pending_payment', async () => {
    sessionStorage.setItem('last_checkout_order_id', 'order-pending-1');
    vi.spyOn(cartApi, 'get').mockResolvedValue({
      cart: { ...sampleCart, cart_lines: [] },
      guest_token: null,
    });
    vi.spyOn(orderApi, 'show').mockResolvedValue({
      id: 'order-pending-1',
      user_id: customerUser.id,
      coupon_id: null,
      shipping_address_id: sampleAddress.id,
      status: 'pending_payment',
      subtotal: 10000,
      discount_amount: 0,
      shipping_amount: 3000,
      tax_amount: 0,
      total_amount: 13000,
      currency: 'MAD',
      expires_at: '2026-12-01T00:00:00Z',
      paid_at: null,
      cancelled_at: null,
      cancel_reason: null,
      shipping_full_name: sampleAddress.full_name,
      shipping_phone: sampleAddress.phone,
      shipping_address_line: sampleAddress.address_line,
      shipping_city: sampleAddress.city,
      shipping_postal_code: sampleAddress.postal_code,
      shipping_country: sampleAddress.country,
      created_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z',
    });

    renderWithProviders(<AppRoutes />, {
      initialEntries: ['/checkout/success?session_id=cs_test_pending'],
    });

    expect(
      await screen.findByText(/awaiting payment confirmation/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/payment confirmed/i)).not.toBeInTheDocument();
  });

  it('parses Laravel validation and network errors consistently', () => {
    const validationErr = parseApiError({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: { coupon_code: ['This coupon has expired.'] },
        },
      },
    });

    expect(validationErr.isValidationError).toBe(true);
    expect(validationErr.fieldErrors.coupon_code?.[0]).toBe('This coupon has expired.');

    const networkErr = parseApiError({
      isAxiosError: true,
      message: 'Network Error',
    });

    expect(networkErr.isNetworkError).toBe(true);
    expect(networkErr.message).toMatch(/network error/i);
  });

  it('populates address city select options from database shipping cities', async () => {
    vi.spyOn(addressApi, 'list').mockResolvedValue([]);
    vi.spyOn(shippingApi, 'listCities').mockResolvedValue([
      { id: 'city-1', city: 'Casablanca', cost: 3000 },
      { id: 'city-2', city: 'Tangier', cost: 4500 },
    ]);
    const createAddrSpy = vi.spyOn(addressApi, 'create').mockResolvedValue({
      message: 'Address created successfully.',
      address: { ...sampleAddress, city: 'Casablanca' },
    });

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/account/addresses'] });

    await user.click(await screen.findByRole('button', { name: /add address/i }));

    const citySelect = await screen.findByLabelText(/^city$/i);
    expect(await screen.findByRole('option', { name: /casablanca/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /tangier/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), 'Nadia Benali');
    await user.type(screen.getByLabelText(/^phone$/i), '0612345678');
    await user.selectOptions(citySelect, 'Casablanca');
    await user.type(screen.getByLabelText(/street address/i), '12 Boulevard Zerktouni');
    await user.click(screen.getByRole('button', { name: /save address/i }));

    await waitFor(() => {
      expect(createAddrSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Casablanca',
          country: 'Morocco',
        })
      );
    });
  });
});
