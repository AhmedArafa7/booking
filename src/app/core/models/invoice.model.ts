export interface InvoiceItem {
  id?: number;
  name: string;
  grade?: string;
  term?: string;
  subject?: string;
  quantity: number | null;
  price: number;
  total: number | null;
}

export interface Invoice {
  id?: string;
  type: 'order' | 'refund';
  libraryName: string;
  region: string;
  city: string;
  items: InvoiceItem[];
  date?: string;
  printStatus?: 'printed' | 'failed' | 'pending';
  invoiceNumber?: number;
}
