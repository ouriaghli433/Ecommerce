import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/router/AppRouter';
import {
  categoryApi,
  inventoryApi,
  orderApi,
  paymentApi,
  productApi,
} from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Category, Inventory, Order, Product } from '@/types';
import { renderWithProviders, resetAppStores } from './testUtils';

const adminUser = {
  id: 'admin-1',
  first_name: 'Admin',
  last_name: 'User',
  email: 'admin@example.com',
  role: 'admin' as const,
  email_verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleCategory: Category = {
  id: '11111111-1111-4111-8111-111111111111',
  parent_id: null,
  name: 'Hardware',
  slug: 'hardware',
  description: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('Admin Dashboard Workflows', () => {
  beforeEach(() => {
    resetAppStores();
    vi.restoreAllMocks();
    useAuthStore.setState({
      token: 'admin-token',
      user: adminUser,
      isHydrated: true,
    });
  });

  it('creates a product converting MAD to centimes and JSON-encoding attributes', async () => {
    vi.spyOn(categoryApi, 'list').mockResolvedValue([sampleCategory]);
    vi.spyOn(productApi, 'list').mockResolvedValue([]);
    vi.spyOn(inventoryApi, 'list').mockResolvedValue([]);
    const createSpy = vi.spyOn(productApi, 'create').mockResolvedValue({
      id: 'prod-new',
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      sku: 'KEY-100',
      price: 49900,
      description: 'Tactile switches',
      is_active: true,
      attributes: '{"switch":"Brown"}',
      category_id: sampleCategory.id,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as Product);

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/products'] });

    await user.click(await screen.findByRole('button', { name: /create product/i }));

    await user.type(screen.getByLabelText(/product name/i), 'Mechanical Keyboard');
    await user.click(screen.getByRole('button', { name: /^auto$/i }));
    await user.type(screen.getByLabelText(/^sku$/i), 'KEY-100');

    const priceInput = screen.getByLabelText(/price \(mad\)/i);
    await user.clear(priceInput);
    await user.type(priceInput, '499');

    await user.click(screen.getByRole('button', { name: /add attribute/i }));
    await user.type(screen.getByPlaceholderText(/key \(e\.g\. color\)/i), 'switch');
    await user.type(screen.getByPlaceholderText(/value \(e\.g\. matte black\)/i), 'Brown');

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^create product$/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Mechanical Keyboard',
        slug: 'mechanical-keyboard',
        sku: 'KEY-100',
        price: 49900,
        description: null,
        category_id: sampleCategory.id,
        is_active: true,
        attributes: '{"switch":"Brown"}',
      });
    });
  });

  it('records an inventory movement and updates order status / issues refund', async () => {
    const sampleInventory: Inventory = {
      id: '33333333-3333-4333-8333-333333333333',
      product_id: 'prod-1',
      on_hand: 10,
      reserved: 2,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      product: {
        id: 'prod-1',
        name: 'USB-C Dock',
        slug: 'usb-c-dock',
        sku: 'DOCK-01',
        price: 25000,
        description: null,
        is_active: true,
        attributes: null,
        category_id: sampleCategory.id,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    };

    vi.spyOn(inventoryApi, 'list').mockResolvedValue([sampleInventory]);
    vi.spyOn(inventoryApi, 'listMovements').mockResolvedValue([]);
    const movementSpy = vi.spyOn(inventoryApi, 'createMovement').mockResolvedValue({
      message: 'Inventory movement created successfully.',
      movement: {
        id: 'mov-1',
        inventory_id: sampleInventory.id,
        created_by: adminUser.id,
        movement_type: 'purchase',
        quantity: 5,
        reason: 'Restock',
        reference_type: null,
        reference_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/inventory'] });

    expect(await screen.findByText('USB-C Dock')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /record movement/i }));
    const qtyInput = screen.getByLabelText(/quantity/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '5');
    await user.type(screen.getByLabelText(/reason/i), 'Restock');
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^record movement$/i }));

    await waitFor(() => {
      expect(movementSpy).toHaveBeenCalledWith({
        inventory_id: sampleInventory.id,
        type: 'purchase',
        quantity: 5,
        reason: 'Restock',
      });
    });
  });

  it('advances paid order status and issues a Stripe refund', async () => {
    const sampleOrder: Order = {
      id: 'order-admin-1',
      user_id: 'cust-1',
      coupon_id: null,
      shipping_address_id: null,
      status: 'paid',
      subtotal: 25000,
      discount_amount: 0,
      shipping_amount: 3000,
      tax_amount: 0,
      total_amount: 28000,
      currency: 'MAD',
      expires_at: '2026-12-01T00:00:00Z',
      paid_at: '2026-11-18T10:00:00Z',
      cancelled_at: null,
      cancel_reason: null,
      shipping_full_name: 'Omar Alami',
      shipping_phone: '0600000000',
      shipping_address_line: 'Rue 1',
      shipping_city: 'Rabat',
      shipping_postal_code: '10000',
      shipping_country: 'Morocco',
      created_at: '2026-11-18T09:50:00Z',
      updated_at: '2026-11-18T10:00:00Z',
      order_lines: [],
      payments: [
        {
          id: 'pay-stripe-1',
          order_id: 'order-admin-1',
          status: 'succeeded',
          amount: 28000,
          currency: 'mad',
          provider: 'stripe',
          provider_ref: 'cs_test_abc',
          failure_reason: null,
          succeeded_at: '2026-11-18T10:00:00Z',
          checkout_expires_at: null,
          created_at: '2026-11-18T09:55:00Z',
          updated_at: '2026-11-18T10:00:00Z',
        },
      ],
    };

    vi.spyOn(orderApi, 'show').mockResolvedValue(sampleOrder);
    const updateStatusSpy = vi.spyOn(orderApi, 'updateStatus').mockResolvedValue({
      message: 'Order status updated successfully.',
      order: { ...sampleOrder, status: 'processing' },
    });
    const refundSpy = vi.spyOn(paymentApi, 'createRefund').mockResolvedValue({
      message: 'Refund request created successfully.',
      refund: {
        id: 'ref-1',
        payment_id: 'pay-stripe-1',
        created_by: adminUser.id,
        amount: 28000,
        status: 'succeeded',
        reason: 'admin',
        provider_ref: 're_123',
        created_at: '2026-11-18T10:05:00Z',
        updated_at: '2026-11-18T10:05:00Z',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, {
      initialEntries: ['/admin/orders/order-admin-1'],
    });

    await user.click(await screen.findByRole('button', { name: /mark as processing/i }));
    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith('order-admin-1', {
        status: 'processing',
      });
    });

    await user.click(screen.getByRole('button', { name: /issue refund/i }));
    await user.click(screen.getByRole('button', { name: /confirm refund/i }));
    await waitFor(() => {
      expect(refundSpy).toHaveBeenCalledWith('pay-stripe-1', { reason: 'admin' });
    });
    expect(await screen.findByText(/refunded/i)).toBeInTheDocument();
  });
});
