import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/router/AppRouter';
import { cartApi, categoryApi, productApi } from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import type { Category, Product } from '@/types';
import { renderWithProviders, resetAppStores } from './testUtils';

const sampleCategories: Category[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    parent_id: null,
    name: 'Audio',
    slug: 'audio',
    description: 'Studio headphones and speakers',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    parent_id: null,
    name: 'Workspace',
    slug: 'workspace',
    description: 'Desk accessories',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const sampleProducts: Product[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Studio Wireless Headphones',
    slug: 'studio-wireless-headphones',
    sku: 'AUD-101',
    price: 125000,
    description: 'Active noise cancelling wireless headphones.',
    is_active: true,
    attributes: { color: 'Matte Black', battery: '30h' },
    category_id: sampleCategories[0].id,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    images: [],
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Walnut Desk Stand',
    slug: 'walnut-desk-stand',
    sku: 'WRK-202',
    price: 45000,
    description: 'Solid walnut monitor riser.',
    is_active: true,
    attributes: null,
    category_id: sampleCategories[1].id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    images: [],
  },
];

describe('Product Listing, Details, and Cart', () => {
  beforeEach(() => {
    resetAppStores();
    vi.restoreAllMocks();
    vi.spyOn(categoryApi, 'list').mockResolvedValue(sampleCategories);
    vi.spyOn(productApi, 'list').mockResolvedValue(sampleProducts);
  });

  it('displays products and filters by search term', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/products'] });

    expect(await screen.findByText('Studio Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('Walnut Desk Stand')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/filter catalog products/i);
    await user.type(searchInput, 'Walnut');

    expect(screen.queryByText('Studio Wireless Headphones')).not.toBeInTheDocument();
    expect(screen.getByText('Walnut Desk Stand')).toBeInTheDocument();
  });

  it('displays product details and adds item to guest cart with guest_token persistence', async () => {
    vi.spyOn(productApi, 'show').mockResolvedValue(sampleProducts[0]);
    const cartPayload = {
      message: 'Product added to cart successfully.',
      guest_token: 'guest-token-999',
      cart: {
        id: 'cart-1',
        user_id: null,
        status: 'active' as const,
        guest_token: 'guest-token-999',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        cart_lines: [
          {
            id: 'line-1',
            cart_id: 'cart-1',
            product_id: sampleProducts[0].id,
            quantity: 2,
            unit_price: 125000,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            product: sampleProducts[0],
          },
        ],
      },
    };
    vi.spyOn(cartApi, 'get').mockResolvedValue(cartPayload);
    const addSpy = vi.spyOn(cartApi, 'addItem').mockResolvedValue(cartPayload);

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, {
      initialEntries: [`/products/${sampleProducts[0].id}`],
    });

    expect(await screen.findByRole('heading', { name: 'Studio Wireless Headphones' })).toBeInTheDocument();
    expect(screen.getByText('Matte Black')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith({
        product_id: sampleProducts[0].id,
        quantity: 2,
      });
    });

    expect(useCartStore.getState().guestToken).toBe('guest-token-999');
  });

  it('shows 404 state when product is missing or archived', async () => {
    vi.spyOn(productApi, 'show').mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { message: 'No query results for model' } },
    });

    renderWithProviders(<AppRoutes />, {
      initialEntries: ['/products/99999999-9999-4999-8999-999999999999'],
    });

    expect(await screen.findByText(/product not found/i)).toBeInTheDocument();
  });

  it('updates cart line quantity and handles stock limit errors', async () => {
    useCartStore.setState({ guestToken: 'guest-token-999' });

    vi.spyOn(cartApi, 'get').mockResolvedValue({
      guest_token: 'guest-token-999',
      cart: {
        id: 'cart-1',
        user_id: null,
        status: 'active',
        guest_token: 'guest-token-999',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        cart_lines: [
          {
            id: 'line-1',
            cart_id: 'cart-1',
            product_id: sampleProducts[0].id,
            quantity: 1,
            unit_price: 125000,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            product: sampleProducts[0],
          },
        ],
      },
    });

    const updateSpy = vi.spyOn(cartApi, 'updateItem').mockResolvedValue({
      message: 'Cart quantity updated successfully.',
      guest_token: 'guest-token-999',
      cart: {
        id: 'cart-1',
        user_id: null,
        status: 'active',
        guest_token: 'guest-token-999',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        cart_lines: [
          {
            id: 'line-1',
            cart_id: 'cart-1',
            product_id: sampleProducts[0].id,
            quantity: 2,
            unit_price: 125000,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            product: sampleProducts[0],
          },
        ],
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/cart'] });

    expect(await screen.findByText('Studio Wireless Headphones')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('line-1', { quantity: 2 });
    });

    updateSpy.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 422,
        data: { message: 'Requested quantity exceeds available stock.' },
      },
    });

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(
      await screen.findByText(/Requested quantity exceeds available stock\./i)
    ).toBeInTheDocument();
  });
});
