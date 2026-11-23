import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MoneyDisplay } from '@/components/common';
import { Alert, Button, Drawer, EmptyState, Skeleton } from '@/components/ui';
import { getUserRole, useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { CartLineItem } from './CartLineItem';
import { useCart, useRemoveCartLine, useUpdateCartLine } from './useCart';

export function CartDrawer() {
  const navigate = useNavigate();
  const isOpen = useCartStore((s) => s.isDrawerOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const role = getUserRole(user);

  const { cartLines, itemCount, subtotal, isLoading } = useCart(isOpen);
  const updateLine = useUpdateCartLine();
  const removeLine = useRemoveCartLine();

  const isMutating = updateLine.isPending || removeLine.isPending;

  const goTo = (path: string) => {
    closeDrawer();
    navigate(path);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeDrawer}
      title={`Shopping Bag (${itemCount})`}
      footer={
        cartLines.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Estimated Subtotal</span>
              <MoneyDisplay
                amountInCentimes={subtotal}
                className="text-base font-bold text-slate-900"
              />
            </div>
            <p className="text-xs text-slate-500">
              Shipping and eligible coupon discounts are calculated at checkout.
            </p>
            {role === 'admin' ? (
              <Alert variant="warning">
                Admin accounts cannot place customer orders. Switch to a customer account to check out.
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="outline" onClick={() => goTo('/cart')}>
                  View Cart
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => goTo(token ? '/checkout' : '/login')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {token ? 'Checkout' : 'Sign in to Pay'}
                </Button>
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : cartLines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your bag is empty"
          description="Explore our catalog and add items to get started."
          action={
            <Button variant="primary" onClick={() => goTo('/products')}>
              Browse Products
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {cartLines.map((line) => (
            <CartLineItem
              key={line.id}
              line={line}
              isUpdating={isMutating}
              onNavigate={closeDrawer}
              onUpdateQuantity={(cartLineId, quantity) =>
                updateLine.mutate({ cartLineId, quantity })
              }
              onRemove={(cartLineId) => removeLine.mutate(cartLineId)}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
