import { Injectable, signal } from '@angular/core';

export interface PrintSettings {
  brandName: string;
  phones: string;
  mainCurrency: string;
  subCurrency: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'printSettings';
  
  private defaultSettings: PrintSettings = {
    brandName: 'سلسلة تدريبات كامبريدج في الفيزياء',
    phones: 'إدارة المبيعات: هاتف: 91913020 - 98877925',
    mainCurrency: 'R.O.',
    subCurrency: 'Bz'
  };

  printSettings = signal<PrintSettings>(this.loadSettings());

  private readonly ORDER_KEY = 'sectionOrder';

  private defaultOrder = [
    'inv-form', 
    'inv-list', 
    'lib-form', 
    'dashboard', 
    'lib-list', 
    'inventory'
  ];
  sectionOrder = signal<string[]>(this.loadOrder());

  private loadSettings(): PrintSettings {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return this.defaultSettings;
  }

  private loadOrder(): string[] {
    const saved = localStorage.getItem(this.ORDER_KEY);
    if (saved) {
      try {
        let arr = JSON.parse(saved);
        if (arr.includes('invoices') || arr.includes('libraries')) {
          arr = this.defaultOrder;
        }
        return arr;
      } catch (e) {}
    }
    return this.defaultOrder;
  }

  updatePrintSettings(settings: PrintSettings) {
    this.printSettings.set(settings);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  updateSectionOrder(order: string[]) {
    this.sectionOrder.set(order);
    localStorage.setItem(this.ORDER_KEY, JSON.stringify(order));
  }
}
