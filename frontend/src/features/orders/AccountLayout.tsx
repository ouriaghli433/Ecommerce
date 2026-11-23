import { LogOut, MapPin, Package, User as UserIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui';
import { useLogout } from '@/features/auth/useAuth';
import { getUserRole, useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

export function AccountLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = getUserRole(user);
  const logout = useLogout();

  const navItems = [
    { to: '/account', label: 'Profile', icon: UserIcon, end: true },
    { to: '/account/orders', label: 'Orders', icon: Package, end: false },
    ...(role === 'customer'
      ? [{ to: '/account/addresses', label: 'Addresses', icon: MapPin, end: false }]
      : []),
  ];

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="My Account"
        description={
          user ? `Signed in as ${user.first_name} ${user.last_name} (${user.email})` : undefined
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            isLoading={logout.isPending}
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
          >
            Sign out
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <section className="lg:col-span-9">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
