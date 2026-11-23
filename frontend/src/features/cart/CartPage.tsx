import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState, MoneyDisplay, PageHeader } from '@/components/common';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from '@/components/ui';
import { getUserRole, useAuthStore } from '@/store/authStore';
import { CartLineItem } from './CartLineItem';
import { useCart, useRemoveCartLine, useUpdateCartLine } from './useCart';

export function CartPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const role = getUserRole(user);

  const { cartLines, itemCount, subtotal, isLoading, isError, error, refetch } = useCart(true);
  const updateLine = useUpdateCartLine();
  const removeLine = useRemoveCartLine();

  const isMutating = updateLine.isPending || removeLine.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Shopping Cart"
        description={
          itemCount > 0
            ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your bag`
            : 'Review items in your shopping bag'
        }
      />

      {isLoading ? (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      ) : isError ? (
        <ErrorState title="Could not load cart" error={error} onRetry={() => refetch()} />
      ) : cartLines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your shopping cart is empty"
          description="Browse products to add items to your cart."
          action={
            <Link to="/products">
              <Button variant="primary">Continue Shopping</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card>
              <CardContent className="divide-y divide-slate-100 p-5">
                {cartLines.map((line) => (
                  <CartLineItem
                    key={line.id}
                    line={line}
                    isUpdating={isMutating}
                    onUpdateQuantity={(cartLineId, quantity) =>
                      updateLine.mutate({ cartLineId, quantity })
                    }
                    onRemove={(cartLineId) => removeLine.mutate(cartLineId)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal ({itemCount} items)</span>
                  <MoneyDisplay amountInCentimes={subtotal} className="font-semibold text-slate-900" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Shipping &amp; Discounts</span>
                  <span className="text-slate-500">Calculated at checkout</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">Estimated Total</span>
                  <MoneyDisplay
                    amountInCentimes={subtotal}
                    className="text-lg font-bold text-slate-900"
                  />
                </div>

                {!token ? (
                  <div className="space-y-3 pt-2">
                    <Alert variant="info">
                      Sign in or register to proceed to checkout. Your guest bag will merge automatically.
                    </Alert>
                    <Link to="/login" state={{ from: '/checkout' }} className="block">
                      <Button variant="secondary" size="lg" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                        Sign in to Checkout
                      </Button>
                    </Link>
                  </div>
                ) : role === 'admin' ? (
                  <Alert variant="warning">
                    Checkout endpoints are restricted to customer accounts (`role:customer`).
                  </Alert>
                ) : (
                  <Link to="/checkout" className="block pt-2">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Proceed to Checkout
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
