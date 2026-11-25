import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Plus,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { ErrorState, MoneyDisplay, PageHeader } from '@/components/common';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Skeleton,
} from '@/components/ui';
import { AddressFormModal } from '@/features/addresses/AddressFormModal';
import { useAddresses } from '@/features/addresses/useAddresses';
import { useCart } from '@/features/cart/useCart';
import {
  saveLastCheckoutOrderId,
  useStripeCheckout,
} from '@/features/payments/useStripeCheckout';
import { useProducts } from '@/features/products/useProducts';
import { checkoutApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import { parseApiError } from '@/services/http/errorParser';
import type { Address, CheckoutPreviewResponse, Order } from '@/types';
import { cn } from '@/utils/cn';
import { getPrimaryProductImage } from '@/utils/product';

type Step = 1 | 2 | 3;

export function CheckoutPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { cartLines, isLoading: cartLoading } = useCart(true);
  const { data: catalogProducts } = useProducts();
  const addressesQuery = useAddresses(true);
  const { startStripeSession, isRedirecting, errorMessage: stripeError } = useStripeCheckout();

  const [step, setStep] = useState<Step>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CheckoutPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const addresses = addressesQuery.data ?? previewData?.addresses ?? [];

  const runPreview = useCallback(
    async (addressId: string | null, couponCode: string | null, clearCouponOnError = false) => {
      setIsPreviewLoading(true);
      setAddressError(null);
      setCouponError(null);
      setPreviewError(null);

      try {
        const res = await checkoutApi.preview({
          address_id: addressId ?? undefined,
          coupon_code: couponCode ?? undefined,
        });
        setPreviewData(res);
        if (!addressId && res.selected_address) {
          setSelectedAddressId(res.selected_address.id);
        }
        return true;
      } catch (error) {
        const parsed = parseApiError(error);
        if (parsed.fieldErrors.address_id?.[0]) {
          setAddressError(parsed.fieldErrors.address_id[0]);
        }
        if (parsed.fieldErrors.coupon_code?.[0]) {
          setCouponError(parsed.fieldErrors.coupon_code[0]);
          if (clearCouponOnError) {
            setAppliedCoupon(null);
          }
        }
        if (!parsed.fieldErrors.address_id && !parsed.fieldErrors.coupon_code) {
          setPreviewError(parsed.message);
        }
        return false;
      } finally {
        setIsPreviewLoading(false);
      }
    },
    []
  );

  // Initial checkout preview load when cart has items
  useEffect(() => {
    if (cartLines.length > 0 && !createdOrder) {
      runPreview(selectedAddressId, appliedCoupon);
    }
    // Only trigger initial/address/coupon preview sync when dependencies intentionally change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLines.length, selectedAddressId, appliedCoupon]);

  const handleApplyCoupon = async () => {
    const normalized = couponInput.trim().toUpperCase();
    if (!normalized) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponInput(normalized);
    const ok = await runPreview(selectedAddressId, normalized, true);
    if (ok) {
      setAppliedCoupon(normalized);
      toast.success('Coupon applied', `Code ${normalized} applied to your order.`);
    }
  };

  const handleClearCoupon = () => {
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handlePlaceOrderAndPay = async () => {
    if (createdOrder) {
      await startStripeSession(createdOrder.id);
      return;
    }

    if (!selectedAddressId) {
      setAddressError('Please select or add a shipping address before placing your order.');
      setStep(2);
      return;
    }

    setIsPlacingOrder(true);
    setPlaceOrderError(null);

    try {
      const orderRes = await checkoutApi.placeOrder({
        address_id: selectedAddressId,
        coupon_code: appliedCoupon ?? undefined,
      });

      const order = orderRes.order;
      setCreatedOrder(order);
      saveLastCheckoutOrderId(order.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.current });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all(1) });

      await startStripeSession(order.id);
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.fieldErrors.address_id?.[0]) {
        setAddressError(parsed.fieldErrors.address_id[0]);
        setStep(2);
      } else if (parsed.fieldErrors.coupon_code?.[0]) {
        setCouponError(parsed.fieldErrors.coupon_code[0]);
      } else {
        setPlaceOrderError(parsed.message);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleAddressCreated = (address: Address) => {
    setSelectedAddressId(address.id);
    setAddressError(null);
  };

  if (cartLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-2xl lg:col-span-8" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (cartLines.length === 0 && !createdOrder) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Add products to your shopping bag before starting checkout."
          action={
            <Link to="/products">
              <Button variant="primary">Browse Products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const fallbackSubtotal = cartLines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
  const subtotal = previewData?.subtotal ?? fallbackSubtotal;
  const shippingCost = addressError ? 0 : (previewData?.shipping_cost ?? 0);
  const discount = previewData?.discount ?? 0;
  const total = previewData?.total ?? Math.max(0, subtotal + shippingCost - discount);

  const isBusy = isPlacingOrder || isRedirecting;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Checkout"
        description="Review your items, confirm shipping city availability, and pay securely via Stripe."
        actions={
          <Link to="/cart">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Cart
            </Button>
          </Link>
        }
      />

      {/* Stepper */}
      <ol className="grid gap-3 sm:grid-cols-3" aria-label="Checkout steps">
        {[
          { num: 1 as Step, title: '1. Review Cart' },
          { num: 2 as Step, title: '2. Shipping Address' },
          { num: 3 as Step, title: '3. Confirm & Pay' },
        ].map((item) => {
          const isCurrent = step === item.num;
          const isDone = step > item.num;
          return (
            <li key={item.num}>
              <button
                type="button"
                disabled={Boolean(createdOrder)}
                onClick={() => setStep(item.num)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors',
                  isCurrent
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                    {item.num}
                  </span>
                )}
                <span>{item.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {createdOrder && (
        <Alert
          variant="info"
          title={`Order #${createdOrder.id.slice(0, 8)} created and inventory reserved`}
        >
          Your order is saved with status <strong>pending payment</strong>. Complete Stripe payment below to finalize it.
        </Alert>
      )}

      {(placeOrderError || stripeError || previewError) && (
        <Alert variant="error" title="Checkout notice">
          {placeOrderError || stripeError || previewError}
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Main Steps */}
        <div className="space-y-6 lg:col-span-8">
          {/* Step 1: Cart Review */}
          {step === 1 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cart Items ({cartLines.length})</CardTitle>
                <Link to="/cart" className="text-xs font-semibold text-emerald-700 hover:underline">
                  Edit bag
                </Link>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100">
                {cartLines.map((line) => {
                  const enriched =
                    catalogProducts?.find((p) => p.id === line.product_id) ?? line.product;
                  const img = getPrimaryProductImage(enriched);
                  return (
                    <div key={line.id} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {img ? (
                            <img
                              src={img.image_url}
                              alt={img.alt_text ?? enriched?.name ?? 'Item'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {enriched?.name ?? 'Product'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Qty {line.quantity} &times;{' '}
                            <MoneyDisplay amountInCentimes={line.unit_price} />
                          </p>
                        </div>
                      </div>
                      <MoneyDisplay
                        amountInCentimes={line.unit_price * line.quantity}
                        className="shrink-0 font-semibold text-slate-900"
                      />
                    </div>
                  );
                })}
                <div className="flex justify-end pt-4">
                  <Button
                    variant="primary"
                    onClick={() => setStep(2)}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continue to Shipping
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Shipping Address */}
          {step === 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  Select Shipping Address
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setAddressModalOpen(true)}
                >
                  New Address
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {addressError && (
                  <Alert variant="error" title="Shipping unavailable">
                    {addressError}
                  </Alert>
                )}

                {addressesQuery.isLoading ? (
                  <Skeleton className="h-32 w-full rounded-xl" />
                ) : addressesQuery.isError ? (
                  <ErrorState
                    title="Could not load addresses"
                    error={addressesQuery.error}
                    onRetry={() => addressesQuery.refetch()}
                  />
                ) : addresses.length === 0 ? (
                  <EmptyState
                    icon={<MapPin className="h-6 w-6" />}
                    title="No shipping addresses"
                    description="Add a shipping address to calculate delivery cost and continue."
                    action={
                      <Button variant="primary" onClick={() => setAddressModalOpen(true)}>
                        Add Shipping Address
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => {
                      const isSelected = selectedAddressId === address.id;
                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setSelectedAddressId(address.id)}
                          className={cn(
                            'rounded-xl border p-4 text-left transition-all',
                            isSelected
                              ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                              {address.full_name}
                            </span>
                            {address.is_default && <Badge variant="success">Default</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{address.address_line}</p>
                          <p className="text-sm text-slate-600">
                            {address.city}
                            {address.postal_code ? `, ${address.postal_code}` : ''} &middot;{' '}
                            {address.country}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{address.phone}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedAddressId || Boolean(addressError) || isPreviewLoading}
                    onClick={() => setStep(3)}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continue to Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Coupon & Final Review */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review &amp; Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {addressError && (
                  <Alert variant="error" title="Shipping unavailable">
                    {addressError}
                  </Alert>
                )}

                {selectedAddress && (
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Delivering To
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedAddress.full_name}
                      </p>
                      <p className="text-slate-600">
                        {selectedAddress.address_line}, {selectedAddress.city},{' '}
                        {selectedAddress.country}
                      </p>
                      <p className="text-xs text-slate-500">{selectedAddress.phone}</p>
                    </div>
                    {!createdOrder && (
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                        Change
                      </Button>
                    )}
                  </div>
                )}

                {/* Coupon Form */}
                {!createdOrder && (
                  <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Tag className="h-4 w-4 text-slate-500" />
                      Promo Coupon
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            if (couponError) setCouponError(null);
                          }}
                          placeholder="Enter coupon code (e.g. SAVE10)"
                          error={couponError ?? undefined}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleApplyCoupon}
                        isLoading={isPreviewLoading}
                      >
                        Apply
                      </Button>
                      {appliedCoupon && (
                        <Button
                          variant="ghost"
                          onClick={handleClearCoupon}
                          aria-label="Remove coupon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {appliedCoupon && !couponError && (
                      <p className="text-xs font-medium text-emerald-700">
                        Coupon <strong>{appliedCoupon}</strong> applied.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  {!createdOrder ? (
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={isBusy}
                      leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    variant="secondary"
                    size="lg"
                    isLoading={isBusy}
                    disabled={
                      isPreviewLoading ||
                      (!createdOrder && (!selectedAddressId || Boolean(addressError)))
                    }
                    onClick={handlePlaceOrderAndPay}
                    leftIcon={<CreditCard className="h-4 w-4" />}
                  >
                    {createdOrder ? 'Retry Stripe Payment' : 'Place Order & Pay with Stripe'}
                  </Button>
                </div>

                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Final order status is confirmed authoritatively by the Stripe webhook after payment.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Summary Sidebar */}
        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Items ({cartLines.reduce((sum, l) => sum + l.quantity, 0)})</span>
                <MoneyDisplay amountInCentimes={subtotal} />
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                {isPreviewLoading ? (
                  <span className="text-slate-400">Calculating...</span>
                ) : addressError ? (
                  <span className="text-red-600">Unavailable</span>
                ) : selectedAddressId ? (
                  <MoneyDisplay amountInCentimes={shippingCost} />
                ) : (
                  <span className="text-slate-400">Select address</span>
                )}
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {appliedCoupon ? `(${appliedCoupon})` : ''}</span>
                  <span>
                    -<MoneyDisplay amountInCentimes={discount} />
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                <span>Total</span>
                <MoneyDisplay amountInCentimes={total} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddressFormModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={handleAddressCreated}
      />
    </div>
  );
}
