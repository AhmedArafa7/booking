import { Component, computed, signal, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { LibraryService } from '../../core/services/library.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { ToastService } from '../../core/services/toast.service';
import { Invoice, InvoiceItem } from '../../core/models/invoice.model';
import { Library } from '../../core/models/library.model';
import { ActivityService } from '../../core/services/activity.service';
import { SettingsService } from '../../core/services/settings.service';
@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.html'
})
export class InvoicesComponent {
  @Input() isCompact = false;
  
  private inventoryService = inject(InventoryService);
  private libraryService = inject(LibraryService);
  private invoiceService = inject(InvoiceService);
  private toast = inject(ToastService);
  private activityService = inject(ActivityService);
  public settingsService = inject(SettingsService);

  getLibraryOwner(libraryName: string): string {
    const lib = this.librariesData().find(l => l.name === libraryName);
    return lib?.ownerName || '';
  }

  getPrintGroups(invoice: Invoice | null): { grade: string, items: (InvoiceItem & { globalIndex: number })[] }[] {
    if (!invoice) return [];
    const groupsMap = new Map<string, (InvoiceItem & { globalIndex: number })[]>();
    invoice.items.forEach((item, index) => {
      const grade = item.grade || 'أخرى';
      if (!groupsMap.has(grade)) groupsMap.set(grade, []);
      groupsMap.get(grade)!.push({ ...item, globalIndex: index + 1 });
    });
    return Array.from(groupsMap.entries()).map(([grade, items]) => ({ grade, items }));
  }

  getIntegerPart(val: number): number | string {
    if (!val) return '-';
    const int = Math.floor(val);
    return int > 0 ? int : '-';
  }

  getDecimalPart(val: number): number | string {
    if (!val) return '-';
    const dec = Math.round((val % 1) * 100);
    return dec > 0 ? dec : '-';
  }

  librariesData = signal<Library[]>([]);
  
  isFormCollapsed = signal(localStorage.getItem('inv_formCollapsed') === 'true');
  toggleForm() {
    this.isFormCollapsed.set(!this.isFormCollapsed());
    localStorage.setItem('inv_formCollapsed', String(this.isFormCollapsed()));
  }

  isHistoryCollapsed = signal(localStorage.getItem('inv_historyCollapsed') === 'true');
  toggleHistory() {
    this.isHistoryCollapsed.set(!this.isHistoryCollapsed());
    localStorage.setItem('inv_historyCollapsed', String(this.isHistoryCollapsed()));
  }

  filterType = signal('');
  filterTime = signal('all');
  filterTerm = signal('');
  filterGrade = signal('');
  filterBook = signal('');

  filteredInvoices = computed(() => {
    let list = this.invoicesList();

    const reg = this.isMerged() ? this.selectedRegion() : this.filterRegion();
    if (reg) list = list.filter(i => i.region === reg);

    const city = this.isMerged() ? this.selectedCity() : this.filterCity();
    if (city) list = list.filter(i => i.city === city);

    const lib = this.isMerged() ? this.selectedLibrary() : this.filterLibrary();
    if (lib) list = list.filter(i => i.libraryName === lib);

    const type = this.filterType();
    if (type) list = list.filter(i => i.type === type);

    const time = this.filterTime();
    if (time !== 'all') {
      const now = new Date();
      list = list.filter(i => {
        if (!i.date) return false;
        const d = new Date(i.date);
        if (time === 'today') {
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (time === 'yesterday') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear();
        } else if (time === 'week') {
          const w = new Date(now);
          w.setDate(w.getDate() - 7);
          return d >= w;
        } else if (time === 'month') {
          const m = new Date(now);
          m.setMonth(m.getMonth() - 1);
          return d >= m;
        }
        return true;
      });
    }

    const term = this.filterTerm();
    if (term) list = list.filter(i => i.items.some(it => it.term === term));

    const grade = this.filterGrade();
    if (grade) list = list.filter(i => i.items.some(it => it.grade === grade));

    const book = this.filterBook().toLowerCase().trim();
    if (book) list = list.filter(i => i.items.some(it => (it.name && it.name.toLowerCase().includes(book)) || (it.subject && it.subject.toLowerCase().includes(book))));

    return list.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  });

  isMerged = signal(localStorage.getItem('inv_isMerged') === 'true');

  setMerged(val: boolean) {
    this.isMerged.set(val);
    localStorage.setItem('inv_isMerged', String(val));
  }

  // Dynamic Lists State based on actual data
  regionsList = computed(() => {
    return Array.from(new Set(this.librariesData().map(l => l.region).filter(r => !!r)));
  });

  citiesList = computed(() => {
    let libs = this.librariesData();
    const reg = this.selectedRegion();
    if (reg) libs = libs.filter(l => l.region === reg);
    return Array.from(new Set(libs.map(l => l.city).filter(c => !!c)));
  });

  libraries = computed(() => {
    let libs = this.librariesData();
    const reg = this.selectedRegion();
    if (reg) libs = libs.filter(l => l.region === reg);
    const city = this.selectedCity();
    if (city) libs = libs.filter(l => l.city === city);
    return libs.map(l => l.name);
  });

  termsList = computed(() => {
    return Array.from(new Set(this.draftItems().map(i => i.term).filter(t => !!t)));
  });

  gradesList = computed(() => {
    return Array.from(new Set(this.draftItems().map(i => i.grade).filter(g => !!g)));
  });

  hasActiveSearchFilter = computed(() => {
    return this.filterType() !== '' || 
           this.filterTime() !== 'all' || 
           this.filterTerm() !== '' || 
           this.filterGrade() !== '' || 
           this.filterBook() !== '' ||
           (this.isMerged() ? false : this.filterRegion() !== '') ||
           (this.isMerged() ? false : this.filterCity() !== '') ||
           (this.isMerged() ? false : this.filterLibrary() !== '');
  });

  isForceShowButtonVisible = signal<boolean>(JSON.parse(localStorage.getItem('inv_force_show_btn') || 'false'));
  isForceShowActive = signal<boolean>(false);

  toggleForceShowButtonVisibility() {
    this.isForceShowButtonVisible.update(v => !v);
    localStorage.setItem('inv_force_show_btn', JSON.stringify(this.isForceShowButtonVisible()));
  }

  shouldShowInvoicesList = computed(() => {
    return this.isMerged() && (this.hasActiveSearchFilter() || this.isForceShowActive());
  });

  isTableEditMode = signal(false);
  toggleTableEditMode(event: Event) {
    event.stopPropagation();
    this.isTableEditMode.set(!this.isTableEditMode());
  }

  selectedLibrary = signal('');
  selectedRegion = signal('');
  selectedCity = signal('');

  onRegionChange(region: string) {
    this.selectedRegion.set(region);
    const cities = this.citiesList();
    if (!cities.includes(this.selectedCity())) {
      this.selectedCity.set('');
    }
    const libs = this.libraries();
    if (!libs.includes(this.selectedLibrary())) {
      this.selectedLibrary.set('');
    }
  }

  onCityChange(city: string) {
    this.selectedCity.set(city);
    if (city) {
      const libData = this.librariesData().find(l => l.city === city);
      if (libData && libData.region) {
        this.selectedRegion.set(libData.region);
      }
    }
    const libs = this.libraries();
    if (!libs.includes(this.selectedLibrary())) {
      this.selectedLibrary.set('');
    }
  }

  onLibraryChange(libName: string) {
    this.selectedLibrary.set(libName);
    if (libName) {
      const reg = this.selectedRegion();
      const city = this.selectedCity();
      
      let libData = this.librariesData().find(l => 
        l.name === libName && 
        (!reg || l.region === reg) && 
        (!city || l.city === city)
      );

      if (!libData) {
        libData = this.librariesData().find(l => l.name === libName);
      }

      if (libData) {
        if (libData.region && !reg) this.selectedRegion.set(libData.region);
        if (libData.city && !city) this.selectedCity.set(libData.city);
      }
    }
  }

  filterRegion = signal('');
  filterCity = signal('');
  filterLibrary = signal('');

  historyCitiesList = computed(() => {
    let libs = this.librariesData();
    const reg = this.filterRegion();
    if (reg) libs = libs.filter(l => l.region === reg);
    return Array.from(new Set(libs.map(l => l.city).filter(c => !!c)));
  });

  historyLibrariesList = computed(() => {
    let libs = this.librariesData();
    const reg = this.filterRegion();
    if (reg) libs = libs.filter(l => l.region === reg);
    const city = this.filterCity();
    if (city) libs = libs.filter(l => l.city === city);
    return libs.map(l => l.name);
  });

  onFilterRegionChange(region: string) {
    this.filterRegion.set(region);
    const cities = this.historyCitiesList();
    if (!cities.includes(this.filterCity())) {
      this.filterCity.set('');
    }
    const libs = this.historyLibrariesList();
    if (!libs.includes(this.filterLibrary())) {
      this.filterLibrary.set('');
    }
  }

  onFilterCityChange(city: string) {
    this.filterCity.set(city);
    if (city) {
      const libData = this.librariesData().find(l => l.city === city);
      if (libData && libData.region) {
        this.filterRegion.set(libData.region);
      }
    }
    const libs = this.historyLibrariesList();
    if (!libs.includes(this.filterLibrary())) {
      this.filterLibrary.set('');
    }
  }

  onFilterLibraryChange(libName: string) {
    this.filterLibrary.set(libName);
    if (libName) {
      const reg = this.filterRegion();
      const city = this.filterCity();
      
      let libData = this.librariesData().find(l => 
        l.name === libName && 
        (!reg || l.region === reg) && 
        (!city || l.city === city)
      );

      if (!libData) {
        libData = this.librariesData().find(l => l.name === libName);
      }

      if (libData) {
        if (libData.region && !reg) this.filterRegion.set(libData.region);
        if (libData.city && !city) this.filterCity.set(libData.city);
      }
    }
  }
  
  invoicesList = this.invoiceService.invoices$;
  draftItems = signal<InvoiceItem[]>([]);

  draftTotal = computed(() => {
    return this.draftItems().reduce((sum, item) => sum + (item.total || 0), 0);
  });

  editingItemId = signal<number | null>(null);
  editDraft = signal<Partial<InvoiceItem>>({});

  constructor() {
    this.libraryService.libraries$.subscribe(items => {
      this.librariesData.set(items);
    });

    this.inventoryService.inventory$.subscribe(items => {
      const currentDrafts = this.draftItems();
      const newDrafts = items.map(i => {
        const existing = currentDrafts.find(d => d.id === i.id);
        return {
          id: i.id,
          name: i.subject,
          grade: i.grade || '',
          term: i.term || '',
          subject: i.subject,
          quantity: existing ? existing.quantity : null,
          price: i.price,
          total: existing ? existing.total : null
        };
      });
      this.draftItems.set(newDrafts);
    });
  }

  updateItemTotal(item: InvoiceItem) {
    if (item.quantity !== null && item.quantity !== undefined) {
      item.total = item.quantity * item.price;
    } else {
      item.total = null;
    }
    this.draftItems.update(items => [...items]);
  }

  startEdit(item: InvoiceItem) {
    this.editingItemId.set(item.id || null);
    this.editDraft.set({ ...item });
  }

  cancelEdit() {
    this.editingItemId.set(null);
    this.editDraft.set({});
  }

  saveEdit() {
    const draft = this.editDraft();
    if (!draft.name?.trim()) {
      this.toast.show('الرجاء إدخال اسم الكتاب', 'error');
      return;
    }
    // Fetch old book for undo purposes
    const oldBook = this.inventoryService.getItemById(draft.id!);
    
    const existingItem = this.inventoryService.getItemById(draft.id!);
    const newBook = {
      id: draft.id!,
      subject: draft.name,
      grade: draft.grade || '',
      term: draft.term || this.settingsService.getCurrentTerm(),
      price: draft.price || 0,
      quantity: existingItem ? existingItem.quantity : 0
    };

    // Update Inventory
    this.inventoryService.updateInventoryItem(newBook);

    this.activityService.logActivity('تعديل بيانات كتاب', `تم تعديل بيانات الكتاب: ${draft.name}`, 'UPDATE', { oldBook, newBook });
    this.toast.show('تم تحديث الكتاب بنجاح', 'success');
    this.cancelEdit();
  }

  deleteItem(item: InvoiceItem) {
    if (confirm('هل أنت متأكد من حذف هذا الكتاب؟')) {
      if (item.id) {
        const bookToDelete = this.inventoryService.getItemById(item.id);
        if (bookToDelete) {
          this.inventoryService.deleteInventoryItem(item.id);
          this.activityService.logActivity('حذف كتاب', `تم حذف الكتاب: ${item.name}`, 'DELETE', { book: bookToDelete });
        }
      }
      this.toast.show('تم الحذف بنجاح', 'success');
    }
  }

  addNewBook() {
    const newBook = {
      id: Math.floor(Math.random() * 100000),
      subject: 'كتاب جديد',
      grade: 'الصف غير محدد',
      term: this.settingsService.getCurrentTerm(),
      price: 0,
      quantity: 0
    };
    this.inventoryService.addInventoryItem(newBook);
    this.activityService.logActivity('إضافة كتاب جديد', `تمت إضافة كتاب جديد: كتاب جديد`, 'ADD', { book: newBook });
    this.toast.show('تمت الإضافة، يمكنك تعديل بياناته الآن', 'success');
    
    // Auto-start edit on the new book (need slight delay for view to update)
    setTimeout(() => {
      const added = this.draftItems().find(i => i.id === newBook.id);
      if (added) this.startEdit(added);
    }, 50);
  }

  private async executeTransaction(type: 'order' | 'refund') {
    if (!this.selectedLibrary()) {
      this.toast.show('الرجاء اختيار المكتبة أولاً', 'error');
      return;
    }

    const itemsToProcess = this.draftItems().filter(i => (i.quantity || 0) > 0);
    
    if (itemsToProcess.length === 0) {
      this.toast.show('الرجاء إدخال كميات لبعض المواد على الأقل', 'error');
      return;
    }

    // Validation
    if (type === 'order') {
      for (const item of itemsToProcess) {
        const invItem = this.inventoryService.getItemById(item.id!);
        if (!invItem || invItem.quantity < (item.quantity || 0)) {
          this.toast.show(`الكمية غير متوفرة في المخزن للكتاب: ${item.name}`, 'error');
          return;
        }
      }
    } else if (type === 'refund') {
      const libInvoices = this.invoiceService.getInvoicesByLibrary(this.selectedLibrary());
      
      for (const item of itemsToProcess) {
        let totalOrdered = 0;
        let totalRefunded = 0;
        
        libInvoices.forEach(inv => {
          const invItem = inv.items.find(i => i.id === item.id);
          if (invItem) {
            if (inv.type === 'order') totalOrdered += (invItem.quantity || 0);
            if (inv.type === 'refund') totalRefunded += (invItem.quantity || 0);
          }
        });
        
        const availableToRefund = totalOrdered - totalRefunded;
        if ((item.quantity || 0) > availableToRefund) {
          this.toast.show(`لا يمكن استرجاع كمية أكبر من المشتراة (${availableToRefund}) للكتاب: ${item.name}`, 'error');
          return;
        }
      }
    }

    // Process Inventory Deduction/Addition
    for (const item of itemsToProcess) {
      const invItem = this.inventoryService.getItemById(item.id!);
      if (invItem) {
        if (type === 'order') {
          invItem.quantity -= (item.quantity || 0);
        } else {
          invItem.quantity += (item.quantity || 0);
        }
        this.inventoryService.updateInventoryItem(invItem);
      }
    }

    const lib = this.librariesData().find(l => l.name === this.selectedLibrary());

    const invoice: Invoice = {
      type: type,
      libraryName: this.selectedLibrary(),
      region: lib?.region || this.selectedRegion() || 'الرياض',
      city: lib?.city || this.selectedCity() || 'الرياض',
      items: itemsToProcess.map(i => ({...i})),
      printStatus: 'pending'
    };

    // Keep reference so invoiceNumber gets populated after save
    this.invoiceService.saveInvoice(invoice);

    this.draftItems.update(items => items.map(i => ({ ...i, quantity: null, total: null })));
    this.selectedLibrary.set('');
    
    if (type === 'order') {
      this.toast.show('تم تسجيل طلب الشراء بنجاح وخصم الكميات!', 'success');
    } else {
      this.toast.show('تم تسجيل المرتجعات وإضافتها للمخزن!', 'success');
    }

    await this.printInvoice(invoice);
  }

  invoiceToPrint = signal<Invoice | null>(null);

  async printInvoice(invoice: Invoice) {
    this.invoiceToPrint.set(invoice);
    setTimeout(() => {
      window.print();
      const success = window.confirm('هل تمت الطباعة بنجاح؟');
      invoice.printStatus = success ? 'printed' : 'failed';
      this.invoiceService.updateInvoice(invoice);
      this.invoiceToPrint.set(null);
    }, 500);
  }

  retryPrint(invoice: Invoice) {
    this.printInvoice(invoice);
  }

  deleteInvoice(invoice: Invoice) {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الفاتورة رقم ${invoice.invoiceNumber}؟ سيتم استرجاع الكميات للمخزون.`)) {
      return;
    }

    // Reverse inventory deduction/addition
    for (const item of invoice.items) {
      const invItem = this.inventoryService.getItemById(item.id!);
      if (invItem) {
        if (invoice.type === 'order') {
          invItem.quantity += (item.quantity || 0); // Reverse order
        } else {
          invItem.quantity -= (item.quantity || 0); // Reverse refund
        }
        this.inventoryService.updateInventoryItem(invItem);
      }
    }

    this.invoiceService.deleteInvoice(invoice.id!);
    this.activityService.logActivity('حذف فاتورة', `تم حذف الفاتورة رقم ${invoice.invoiceNumber} واسترجاع كمياتها`, 'DELETE', { invoice });
    this.toast.show('تم حذف الفاتورة واسترجاع كميات الكتب بنجاح', 'success');
  }

  processInventoryAdd() {
    const invalidItems = this.draftItems().filter(i => (i.quantity || 0) < 0);
    if (invalidItems.length > 0) {
      this.toast.show('لا يمكن إدخال كميات سالبة', 'error');
      return;
    }

    const itemsToProcess = this.draftItems().filter(i => (i.quantity || 0) > 0);
    
    if (itemsToProcess.length === 0) {
      this.toast.show('الرجاء إدخال كميات لبعض المواد على الأقل لإضافتها للمخزن', 'error');
      return;
    }

    // Process Inventory Addition
    for (const item of itemsToProcess) {
      const invItem = this.inventoryService.getItemById(item.id!);
      if (invItem) {
        const oldQty = invItem.quantity;
        invItem.quantity += (item.quantity || 0);
        this.inventoryService.updateInventoryItem(invItem);
        this.activityService.logActivity('إضافة للمخزون', `تم إضافة كمية ${item.quantity} لكتاب ${item.name}`, 'UPDATE', { entity: 'inventory', oldBook: { ...invItem, quantity: oldQty }, newBook: { ...invItem } });
      }
    }

    this.draftItems.update(items => items.map(i => ({ ...i, quantity: null, total: null })));
    this.toast.show('تمت إضافة الكميات للمخزون بنجاح!', 'success');
  }

  processOrder() {
    this.executeTransaction('order');
  }

  processRefund() {
    this.executeTransaction('refund');
  }

  getInvoiceTotal(inv: Invoice): number {
    return inv.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
  }
}
