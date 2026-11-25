import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/router/AppRouter';
import { authApi, categoryApi, couponApi, inventoryApi, orderApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { renderWithProviders, resetAppStores } from './testUtils';

describe('Authentication and Route Protection', () => {
  beforeEach(() => {
    resetAppStores();
    vi.restoreAllMocks();
  });

  it('logs in a customer, clears guest cart token, and navigates to home', async () => {
    useCartStore.setState({ guestToken: 'guest-uuid-123' });

    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({
      token: 'sanctum-token-1',
      user: {
        id: 'user-1',
        first_name: 'Nadia',
        last_name: 'Benali',
        email: 'nadia@example.com',
        role: 'customer',
        email_verified_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/login'] });

    await user.type(screen.getByLabelText(/email address/i), 'nadia@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: 'nadia@example.com',
        password: 'password123',
      });
    });

    expect(useAuthStore.getState().token).toBe('sanctum-token-1');
    expect(useCartStore.getState().guestToken).toBeNull();
  });

  it('displays server error alert when login fails with 401', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: { message: 'email or password is incorrect' },
      },
    });
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/login'] });

    await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email or password is incorrect/i)).toBeInTheDocument();
  });

  it('registers a customer and persists session from customer response key', async () => {
    const registerSpy = vi.spyOn(authApi, 'register').mockResolvedValue({
      token: 'reg-token-1',
      customer: {
        id: 'user-2',
        first_name: 'Karim',
        last_name: 'Tazi',
        email: 'karim@example.com',
        email_verified_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/register'] });

    await user.type(screen.getByLabelText(/first name/i), 'Karim');
    await user.type(screen.getByLabelText(/last name/i), 'Tazi');
    await user.type(screen.getByLabelText(/email address/i), 'karim@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'secret1234');
    await user.type(screen.getByLabelText(/confirm password/i), 'secret1234');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalled();
      expect(useAuthStore.getState().token).toBe('reg-token-1');
      expect(useAuthStore.getState().user?.role).toBe('customer');
    });
  });

  it('redirects unauthenticated visitors from protected routes to /login', async () => {
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);
    renderWithProviders(<AppRoutes />, { initialEntries: ['/checkout'] });

    expect(
      await screen.findByRole('heading', { name: /sign in to your account/i })
    ).toBeInTheDocument();
  });

  it('blocks customer accounts from accessing admin routes with 403', async () => {
    useAuthStore.setState({
      token: 'cust-token',
      isHydrated: true,
      user: {
        id: 'cust-1',
        first_name: 'Salma',
        last_name: 'Idrissi',
        email: 'salma@example.com',
        role: 'customer',
        email_verified_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin'] });

    expect(await screen.findByText(/Access Denied \(403\)/i)).toBeInTheDocument();
  });

  it('allows admin users to access the admin dashboard', async () => {
    useAuthStore.setState({
      token: 'admin-token',
      isHydrated: true,
      user: {
        id: 'admin-1',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        role: 'admin',
        email_verified_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    vi.spyOn(orderApi, 'list').mockResolvedValue({
      current_page: 1,
      data: [],
      first_page_url: null,
      from: null,
      last_page: 1,
      last_page_url: null,
      links: [],
      next_page_url: null,
      path: '/api/orders',
      per_page: 15,
      prev_page_url: null,
      to: null,
      total: 0,
    });
    vi.spyOn(inventoryApi, 'list').mockResolvedValue([]);
    vi.spyOn(categoryApi, 'list').mockResolvedValue([]);
    vi.spyOn(couponApi, 'list').mockResolvedValue([]);

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin'] });

    expect(await screen.findByRole('heading', { name: /admin overview/i })).toBeInTheDocument();
  });
});
