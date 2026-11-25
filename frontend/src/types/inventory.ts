import type { UUID } from './common';
import type { Product } from './product';

export type InventoryMovementType =
  | 'purchase'
  | 'reservation'
  | 'release'
  | 'sale'
  | 'return'
  | 'damage'
  | 'adjustment';

export type ManualInventoryMovementType = 'purchase' | 'return' | 'damage' | 'adjustment';

export interface Inventory {
  id: UUID;
  product_id: UUID;
  on_hand: number;
  reserved: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface InventoryMovement {
  id: UUID;
  inventory_id: UUID;
  created_by: UUID | null;
  movement_type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: UUID | null;
  created_at: string;
  updated_at: string;
  inventory?: Inventory;
}

export interface CreateInventoryMovementPayload {
  inventory_id: UUID;
  type: ManualInventoryMovementType;
  quantity: number;
  reason?: string | null;
}

export interface CreateInventoryMovementResponse {
  message: string;
  movement: InventoryMovement;
}
