import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  CreateCheckoutSessionPayload,
  CreateCheckoutSessionResponse,
  CreateRefundPayload,
  CreateRefundResponse,
  UUID,
} from '@/types';

export const paymentApi = {
  async createCheckoutSession(
    payload: CreateCheckoutSessionPayload,
    idempotencyKey: string
  ): Promise<CreateCheckoutSessionResponse> {
    const { data } = await axiosInstance.post<CreateCheckoutSessionResponse>(
      '/payments/checkout',
      payload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return data;
  },

  async createRefund(paymentId: UUID, payload: CreateRefundPayload): Promise<CreateRefundResponse> {
    const { data } = await axiosInstance.post<CreateRefundResponse>(
      `/payments/${paymentId}/refund`,
      payload
    );
    return data;
  },
};
