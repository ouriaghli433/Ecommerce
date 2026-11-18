import type { UUID } from './common';

export interface ShippingPrice {
  id: UUID;
  city: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingCity {
  id: UUID;
  city: string;
  cost: number;
}

export interface ShippingCitiesResponse {
  cities: ShippingCity[];
}

export interface ShippingPricePayload {
  city: string;
  cost: number;
  is_active?: boolean;
}

export interface ShippingPriceMutationResponse {
  message: string;
  shipping_price: ShippingPrice;
}
