import { Injectable, signal, inject } from '@angular/core';
import { Invoice } from '../models/invoice.model';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private syncService = inject(SyncService);
  private invoicesSignal = signal<Invoice[]>([]);
  public readonly invoices$ = this.invoicesSignal.asReadonly();

  constructor() {
    this.loadInvoices();
  }

  private loadInvoices() {
    const saved = localStorage.getItem('invoices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let needsSave = false;
        parsed.forEach((inv: any, i: number) => {
          if (!inv.invoiceNumber) {
            inv.invoiceNumber = i + 1;
            needsSave = true;
          }
        });
        this.invoicesSignal.set(parsed);
        if (needsSave) {
          localStorage.setItem('invoices', JSON.stringify(parsed));
          this.syncService.queueSync();
        }
      } catch (e) {
        this.invoicesSignal.set([]);
      }
    }
  }

  saveInvoice(invoice: Invoice) {
    if (!invoice.id) {
      invoice.id = Math.random().toString(36).substring(2, 9);
    }
    if (!invoice.date) {
      invoice.date = new Date().toISOString();
    }
    if (!invoice.invoiceNumber) {
      const currentInvoices = this.invoicesSignal();
      const maxNumber = currentInvoices.reduce((max, inv) => Math.max(max, inv.invoiceNumber || 0), 0);
      invoice.invoiceNumber = maxNumber + 1;
    }
    const updated = [...this.invoicesSignal(), invoice];
    this.invoicesSignal.set(updated);
    localStorage.setItem('invoices', JSON.stringify(updated));
    this.syncService.queueSync();
  }

  getInvoicesByLibrary(libraryName: string): Invoice[] {
    return this.invoicesSignal().filter(inv => inv.libraryName === libraryName);
  }

  updateInvoice(updatedInvoice: Invoice) {
    const updated = this.invoicesSignal().map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);
    this.invoicesSignal.set(updated);
    localStorage.setItem('invoices', JSON.stringify(updated));
    this.syncService.queueSync();
  }
}
