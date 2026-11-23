import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  CreateInventoryMovementPayload,
  CreateInventoryMovementResponse,
  Inventory,
  InventoryMovement,
  UUID,
} from '@/types';

export const inventoryApi = {
  async list(): Promise<Inventory[]> {
    const { data } = await axiosInstance.get<Inventory[]>('/inventory');
    return data;
  },

  async show(id: UUID): Promise<Inventory> {
    const { data } = await axiosInstance.get<Inventory>(`/inventory/${id}`);
    return data;
  },

  async listMovements(): Promise<InventoryMovement[]> {
    const { data } = await axiosInstance.get<InventoryMovement[]>('/inventory-movement');
    return data;
  },

  async showMovement(id: UUID): Promise<InventoryMovement> {
    const { data } = await axiosInstance.get<InventoryMovement>(`/inventory-movement/${id}`);
    return data;
  },

  async createMovement(
    payload: CreateInventoryMovementPayload
  ): Promise<CreateInventoryMovementResponse> {
    const { data } = await axiosInstance.post<CreateInventoryMovementResponse>(
      '/inventory-movement',
      payload
    );
    return data;
  },
};
