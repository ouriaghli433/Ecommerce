import { useMemo } from 'react';
import { AlertTriangle, Boxes, FolderTree, ShoppingCart, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErrorState, MoneyDisplay, OrderStatusBadge, PageHeader } from '@/components/common';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { useCategories } from '@/features/categories/useCategories';
import { useOrders } from '@/features/orders/useOrders';
import { useAdminCoupons, useAdminInventory } from '../useAdminQueries';

const LOW_STOCK_THRESHOLD = 5;

export function AdminDashboardPage() {
  const ordersQuery = useOrders(1);
  const inventoryQuery = useAdminInventory();
  const categoriesQuery = useCategories();
  const couponsQuery = useAdminCoupons();

  const ordersPage = ordersQuery.data;
  const recentOrders = ordersPage?.data ?? [];
  const inventories = inventoryQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const coupons = couponsQuery.data ?? [];

  const lowStockItems = useMemo(
    () =>
      inventories
        .filter((inv) => inv.on_hand - inv.reserved <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.on_hand - a.reserved - (b.on_hand - b.reserved)),
    [inventories]
  );

  const stockChartData = useMemo(
    () =>
      inventories.slice(0, 8).map((inv) => ({
        name: (inv.product?.name ?? inv.product_id.slice(0, 6)).slice(0, 14),
        available: Math.max(0, inv.on_hand - inv.reserved),
        reserved: inv.reserved,
      })),
    [inventories]
  );

  const activeProductsCount = inventories.filter((inv) => inv.product?.is_active).length;
  const activeCouponsCount = coupons.filter((c) => c.is_active).length;

  const isLoading =
    ordersQuery.isLoading ||
    inventoryQuery.isLoading ||
    categoriesQuery.isLoading ||
    couponsQuery.isLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Overview"
        description="Real-time metrics derived directly from existing Laravel REST API endpoints."
      />

      <Alert variant="info" title="Backend Analytics Scope">
        The backend does not expose global revenue, customer count, or dashboard aggregation endpoints.
        Cards below display real counts from <code>/api/orders</code>, <code>/api/inventory</code>,{' '}
        <code>/api/category</code>, and <code>/api/coupons</code>.
      </Alert>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : ordersQuery.isError || inventoryQuery.isError ? (
        <ErrorState
          title="Unable to load dashboard metrics"
          error={ordersQuery.error ?? inventoryQuery.error}
          onRetry={() => {
            ordersQuery.refetch();
            inventoryQuery.refetch();
          }}
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Total Orders
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {ordersPage?.total ?? 0}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tracked SKUs
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {inventories.length}
                  </p>
                  <p className="text-xs text-slate-500">{activeProductsCount} active</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Boxes className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Low Stock SKUs
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
                    {lowStockItems.length}
                  </p>
                  <p className="text-xs text-slate-500">&le; {LOW_STOCK_THRESHOLD} available</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Categories &amp; Coupons
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {categories.length} / {activeCouponsCount}
                  </p>
                  <p className="text-xs text-slate-500">Categories / Active coupons</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  {activeCouponsCount > 0 ? (
                    <Tag className="h-5 w-5" />
                  ) : (
                    <FolderTree className="h-5 w-5" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Inventory Chart */}
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Inventory Distribution (Available vs Reserved)</CardTitle>
                <CardDescription>
                  Live stock levels from <code>GET /api/inventory</code> (up to 8 SKUs).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stockChartData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">
                    No inventory records found.
                  </p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="available" name="Available" fill="#059669" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="reserved" name="Reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Inventory Alerts */}
            <Card className="lg:col-span-5">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Low Inventory</CardTitle>
                  <CardDescription>SKUs with &le; {LOW_STOCK_THRESHOLD} available units</CardDescription>
                </div>
                <Link to="/admin/inventory">
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100">
                {lowStockItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    All SKUs have healthy available stock.
                  </p>
                ) : (
                  lowStockItems.slice(0, 6).map((item) => {
                    const available = item.on_hand - item.reserved;
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                        <div className="min-w-0 pr-3">
                          <p className="truncate font-medium text-slate-900">
                            {item.product?.name ?? item.product_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-slate-500">
                            On hand: {item.on_hand} &middot; Reserved: {item.reserved}
                          </p>
                        </div>
                        <Badge variant={available <= 0 ? 'danger' : 'warning'}>
                          {available} avail
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Latest Orders Snapshot */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Latest Orders</CardTitle>
                <CardDescription>Most recent orders from page 1 of /api/orders</CardDescription>
              </div>
              <Link to="/admin/orders">
                <Button variant="outline" size="sm">
                  View All Orders
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No orders placed yet.</p>
              ) : (
                recentOrders.slice(0, 6).map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50 px-2 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        #{order.id.slice(0, 8)} &middot; {order.shipping_full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.user?.email ?? order.shipping_city}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <MoneyDisplay
                        amountInCentimes={order.total_amount}
                        currency={order.currency}
                        className="text-sm font-semibold text-slate-900"
                      />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
