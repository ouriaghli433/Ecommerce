import { CreditCard, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  getLastCheckoutOrderId,
  useStripeCheckout,
} from '@/features/payments/useStripeCheckout';

export function CheckoutCancelPage() {
  const lastOrderId = getLastCheckoutOrderId();
  const { startStripeSession, isRedirecting, errorMessage } = useStripeCheckout();

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Checkout Cancelled</CardTitle>
            <p className="text-xs text-slate-500">
              No payment was finalized on Stripe.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            Your Stripe Checkout session was cancelled before completion. If your order reservation has not expired yet, you can resume payment from your order details.
          </p>

          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

          <div className="flex flex-wrap gap-3 pt-2">
            {lastOrderId && (
              <Button
                variant="secondary"
                isLoading={isRedirecting}
                leftIcon={<CreditCard className="h-4 w-4" />}
                onClick={() => startStripeSession(lastOrderId)}
              >
                Resume Payment
              </Button>
            )}
            <Link to="/account/orders">
              <Button variant="primary">View My Orders</Button>
            </Link>
            <Link to="/products">
              <Button variant="outline">Back to Storefront</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
