import { useState } from 'react';
import { paymentApi } from '@/services/api';
import { parseApiError } from '@/services/http/errorParser';
import {
  getOrCreateOrderIdempotencyKey,
  rotateOrderIdempotencyKey,
} from '@/services/http/idempotency';
import type { UUID } from '@/types';

const LAST_CHECKOUT_ORDER_KEY = 'last_checkout_order_id';

export function saveLastCheckoutOrderId(orderId: UUID): void {
  sessionStorage.setItem(LAST_CHECKOUT_ORDER_KEY, orderId);
}

export function getLastCheckoutOrderId(): string | null {
  return sessionStorage.getItem(LAST_CHECKOUT_ORDER_KEY);
}

export function useStripeCheckout() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startStripeSession = async (orderId: UUID): Promise<string | null> => {
    setIsRedirecting(true);
    setErrorMessage(null);
    saveLastCheckoutOrderId(orderId);

    const idempotencyKey = getOrCreateOrderIdempotencyKey(orderId);

    try {
      const response = await paymentApi.createCheckoutSession(
        { order_id: orderId },
        idempotencyKey
      );
      window.location.assign(response.checkout_url);
      return response.checkout_url;
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.status === 409 || parsed.status === 502) {
        rotateOrderIdempotencyKey(orderId);
      }
      setErrorMessage(parsed.message);
      setIsRedirecting(false);
      return null;
    }
  };

  return {
    startStripeSession,
    isRedirecting,
    errorMessage,
    clearError: () => setErrorMessage(null),
  };
}
