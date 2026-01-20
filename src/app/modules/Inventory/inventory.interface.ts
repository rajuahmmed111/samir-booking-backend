export interface IUpdateInventoryItems {
  items: Array<{
    id: string;
    name?: string;
    quantity?: number;
    missingQuantity?: number;
    description?: string;
  }>;
}
