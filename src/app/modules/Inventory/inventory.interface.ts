export interface IUpdateInventoryItem {
  name?: string;
  quantity?: number;
  missingQuantity?: number;
  description?: string;
}

export interface IUpdateInventoryItems {
  items: Array<{
    id: string;
    name?: string;
    quantity?: number;
    missingQuantity?: number;
    description?: string;
  }>;
}
