import { MapPin, Package, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { useMe } from '@/features/auth/useAuth';
import { formatDate } from '@/utils/format';

export function AccountProfilePage() {
  const meQuery = useMe();
  const user = meQuery.data;

  if (meQuery.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (meQuery.isError) {
    return (
      <ErrorState
        title="Could not load profile"
        error={meQuery.error}
        onRetry={() => meQuery.refetch()}
      />
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Profile Information</CardTitle>
            <Badge variant={user.role === 'admin' ? 'primary' : 'success'} className="capitalize">
              {user.role ?? 'customer'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Full Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {user.first_name} {user.last_name}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Email Address
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{user.email}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Account Role
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold capitalize text-slate-900">
                <Shield className="h-4 w-4 text-emerald-600" />
                {user.role ?? 'customer'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Member Since
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(user.created_at)}
              </dd>
            </div>
          </dl>

          <Alert variant="info">
            Account details are read-only because the backend API does not expose profile update or password change endpoints.
          </Alert>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-semibold text-slate-900">Order History</h3>
              <p className="mt-1 text-xs text-slate-500">
                Track payments, shipments, and receipts.
              </p>
            </div>
            <Link to="/account/orders">
              <Button variant="outline" size="sm" leftIcon={<Package className="h-4 w-4" />}>
                View Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        {user.role !== 'admin' && (
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <h3 className="font-semibold text-slate-900">Saved Addresses</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Manage delivery addresses for checkout.
                </p>
              </div>
              <Link to="/account/addresses">
                <Button variant="outline" size="sm" leftIcon={<MapPin className="h-4 w-4" />}>
                  Manage
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
