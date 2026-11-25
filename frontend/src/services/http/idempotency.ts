const STORAGE_PREFIX = 'checkout_idempotency_';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getOrCreateOrderIdempotencyKey(orderId: string): string {
  const key = `${STORAGE_PREFIX}${orderId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const fresh = generateUuid();
  sessionStorage.setItem(key, fresh);
  return fresh;
}

export function rotateOrderIdempotencyKey(orderId: string): string {
  const key = `${STORAGE_PREFIX}${orderId}`;
  const fresh = generateUuid();
  sessionStorage.setItem(key, fresh);
  return fresh;
}

export function clearOrderIdempotencyKey(orderId: string): void {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${orderId}`);
}
