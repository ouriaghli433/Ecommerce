import { useState } from 'react';
import {
  Boxes,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button, Drawer } from '@/components/ui';
import { useLogout } from '@/features/auth/useAuth';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

const adminLinks = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag, end: false },
  { to: '/admin/shipping-prices', label: 'Shipping Prices', icon: Truck, end: false },
];

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const renderLinks = (onClick?: () => void) => (
    <nav className="space-y-1" aria-label="Admin navigation">
      {adminLinks.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            A
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Admin Console</p>
            <p className="text-[11px] text-slate-500">Store Management</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{renderLinks()}</div>

        <div className="space-y-2 border-t border-slate-200 p-4">
          <Link to="/" className="block">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              leftIcon={<Store className="h-4 w-4" />}
            >
              View Storefront
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-slate-700 lg:hidden">Admin Console</span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <Drawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        position="left"
        title="Admin Console"
      >
        <div className="space-y-6">
          {renderLinks(() => setMobileOpen(false))}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block">
              <Button variant="outline" className="w-full" leftIcon={<Store className="h-4 w-4" />}>
                View Storefront
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-50"
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
