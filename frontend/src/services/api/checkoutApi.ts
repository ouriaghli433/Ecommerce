import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  CheckoutPreviewPayload,
  CheckoutPreviewResponse,
  PlaceOrderPayload,
  PlaceOrderResponse,
} from '@/types';

export const checkoutApi = {
  async preview(payload: CheckoutPreviewPayload): Promise<CheckoutPreviewResponse> {
    const { data } = await axiosInstance.post<CheckoutPreviewResponse>(
      '/checkout-preview',
      payload
    );
    return data;
  },

  async placeOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResponse> {
    const { data } = await axiosInstance.post<PlaceOrderResponse>(
      '/checkout-place-order',
      payload
    );
    return data;
  },
};
