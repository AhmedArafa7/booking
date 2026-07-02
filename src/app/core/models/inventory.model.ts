export interface InventoryItem {
  id: number;
  subject: string;
  grade: string;
  term: string;
  price: number;
  quantity: number;
  lowStock?: boolean;
}
