import { Component, inject, Input, computed, signal } from '@angular/core';
import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InventoryService } from '../../core/services/inventory.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { LibraryService } from '../../core/services/library.service';
import { SettingsService } from '../../core/services/settings.service';
import { Invoice } from '../../core/models/invoice.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  @Input() isCompact = false;

  private inventoryService = inject(InventoryService);
  private invoicesService = inject(InvoiceService);
  private libraryService = inject(LibraryService);
  public settingsService = inject(SettingsService);

  isAnalysisCollapsed = signal(localStorage.getItem('dash_analysisCollapsed') === 'true');
  isDemoMode = signal(false); // Demo Mode Toggle
  isClassicMode = signal(localStorage.getItem('dash_classicMode') !== 'false'); // Default to true based on user request
  classicDisplayMode = signal<'libraries' | 'revenue' | 'quantity'>('libraries');
  dashboardTerm = signal<string>(this.settingsService.getCurrentTerm());

  onDashboardTermChange(term: string) {
    this.dashboardTerm.set(term);
  }

  toggleClassicMode(event: Event) {
    event.stopPropagation();
    this.isClassicMode.set(!this.isClassicMode());
    localStorage.setItem('dash_classicMode', String(this.isClassicMode()));
  }

  // Convert Observables to Signals
  private inventory = toSignal(this.inventoryService.inventory$, { initialValue: [] });
  private invoices = this.invoicesService.invoices$;
  private libraries = toSignal(this.libraryService.libraries$, { initialValue: [] });

  toggleAnalysis() {
    this.isAnalysisCollapsed.set(!this.isAnalysisCollapsed());
    localStorage.setItem('dash_analysisCollapsed', String(this.isAnalysisCollapsed()));
  }

  toggleDemoMode(event: Event) {
    event.stopPropagation();
    this.isDemoMode.set(!this.isDemoMode());
  }

  // Dummy Data for Demo Mode
  private dummyInvoices: Invoice[] = [
    { id: '1', invoiceNumber: 1, type: 'order', date: new Date().toISOString(), libraryName: 'مكتبة جرير - العليا', region: 'الرياض', city: 'الرياض', items: [{ id: 1, subject: 'فيزياء الصف العاشر', name: 'فيزياء الصف العاشر', quantity: 500, price: 5, total: 2500, term: 'الأول', grade: 'العاشر' }, { id: 2, subject: 'كيمياء الحادي عشر', name: 'كيمياء الحادي عشر', quantity: 300, price: 4, total: 1200, term: 'الأول', grade: 'الحادي عشر' }] },
    { id: '3', invoiceNumber: 3, type: 'order', date: new Date().toISOString(), libraryName: 'مكتبة العبيكان', region: 'مكة', city: 'جدة', items: [{ id: 3, subject: 'رياضيات المتقدمة', name: 'رياضيات المتقدمة', quantity: 200, price: 6, total: 1200, term: 'الأول', grade: 'الثاني عشر' }] },
    { id: '4', invoiceNumber: 4, type: 'refund', date: new Date().toISOString(), libraryName: 'مكتبة العبيكان', region: 'مكة', city: 'جدة', items: [{ id: 3, subject: 'رياضيات المتقدمة', name: 'رياضيات المتقدمة', quantity: 50, price: 6, total: 300, term: 'الأول', grade: 'الثاني عشر' }] },
    { id: '5', invoiceNumber: 5, type: 'order', date: new Date().toISOString(), libraryName: 'مكتبة المصيف', region: 'الشرقية', city: 'الدمام', items: [{ id: 1, subject: 'فيزياء الصف العاشر', name: 'فيزياء الصف العاشر', quantity: 1000, price: 5, total: 5000, term: 'الثاني', grade: 'العاشر' }] },
    { id: '7', invoiceNumber: 7, type: 'refund', date: new Date().toISOString(), libraryName: 'مكتبة جرير - العليا', region: 'الرياض', city: 'الرياض', items: [{ id: 2, subject: 'كيمياء الحادي عشر', name: 'كيمياء الحادي عشر', quantity: 150, price: 4, total: 600, term: 'الأول', grade: 'الحادي عشر' }] },
  ];

  private dummyInventory = [
    { id: 1, subject: 'فيزياء الصف العاشر', quantity: 50 }, // Critical stock (sold 1500, left 50)
    { id: 2, subject: 'كيمياء الحادي عشر', quantity: 400 },
    { id: 3, subject: 'رياضيات المتقدمة', quantity: 800 }
  ];

  private activeInvoices = computed(() => this.isDemoMode() ? this.dummyInvoices : this.invoices());
  private activeInventory = computed(() => this.isDemoMode() ? this.dummyInventory : this.inventory());
  private activeLibraries = computed(() => this.isDemoMode() ? [1,2,3,4,5] : this.libraries());

  // 1. Top Stats
  stats = computed(() => {
    const invs = this.activeInvoices();
    const invt = this.activeInventory();
    const libs = this.activeLibraries();

    let totalRevenue = 0;
    let totalCollected = 0;
    let totalItemsSold = 0;

    invs.forEach(inv => {
      let invTotal = 0;
      let invQty = 0;
      inv.items.forEach(item => {
        if (item.term && item.term !== this.dashboardTerm()) return;
        invTotal += (item.total || 0);
        invQty += (item.quantity || 0);
      });

      if (inv.type === 'order') {
        totalRevenue += invTotal;
        totalItemsSold += invQty;
      } else if (inv.type === 'refund') {
        totalRevenue -= invTotal;
        totalItemsSold -= invQty;
      }
    });

    const termInvt = invt.filter((item: any) => !item.term || item.term === this.dashboardTerm());

    return {
      totalLibraries: libs.length,
      totalItems: termInvt.reduce((sum: any, item: any) => sum + (item.quantity || 0), 0),
      lowStockCount: termInvt.filter((item: any) => (item.quantity || 0) < 150).length,
      totalInvoices: invs.length,
      totalRevenue,
      totalCollected,
      totalItemsSold
    };
  });

  // 2. Pending Balances (أين أموالي؟)
  pendingBalances = computed(() => {
    const invs = this.activeInvoices();
    const libMap = new Map<string, { ordered: number, refunded: number, cleared: number, balance: number }>();

    invs.forEach(inv => {
      if (!inv.libraryName) return;
      if (!libMap.has(inv.libraryName)) libMap.set(inv.libraryName, { ordered: 0, refunded: 0, cleared: 0, balance: 0 });
      
      const stats = libMap.get(inv.libraryName)!;
      let invTotal = 0;
      inv.items.forEach(item => {
        if (item.term && item.term !== this.dashboardTerm()) return;
        invTotal += (item.total || 0);
      });
      
      if (inv.type === 'order') stats.ordered += invTotal;
      else if (inv.type === 'refund') stats.refunded += invTotal;
    });

    return Array.from(libMap.entries())
      .map(([name, stats]) => ({
        name,
        balance: stats.ordered - stats.refunded
      }))
      .filter(lib => lib.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  });

  // 3. Critical Stock (ماذا يجب أن أطبع؟)
  criticalStock = computed(() => {
    const invt = this.activeInventory();
    const invs = this.activeInvoices();
    
    // Calculate total sold for each item to know its demand
    const demandMap = new Map<number, number>();
    invs.forEach(inv => {
      if (inv.type === 'order') {
        inv.items.forEach(item => {
          if (item.term && item.term !== this.dashboardTerm()) return;
          demandMap.set(item.id!, (demandMap.get(item.id!) || 0) + (item.quantity || 0));
        });
      }
    });

    return invt
      .filter((item: any) => (!item.term || item.term === this.dashboardTerm())) // Only current term books
      .filter((item: any) => (item.quantity || 0) < 200) // Less than 200 in stock
      .map((item: any) => ({
        name: item.subject,
        remaining: item.quantity || 0,
        demand: demandMap.get(item.id) || 0
      }))
      .sort((a, b) => a.remaining - b.remaining) // Sort by lowest remaining first
      .slice(0, 5);
  });

  // 4. Most Refunded (ما هي المشكلة؟)
  mostRefunded = computed(() => {
    const invs = this.activeInvoices();
    const refundMap = new Map<string, number>();

    invs.forEach(inv => {
      if (inv.type === 'refund') {
        inv.items.forEach(item => {
          const key = item.name || item.subject || 'غير محدد';
          refundMap.set(key, (refundMap.get(key) || 0) + (item.quantity || 0));
        });
      }
    });

    return Array.from(refundMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  // 5. Chart Data: Sales by Term (متى نبيع أكثر؟)
  chartData = computed(() => {
    const invs = this.activeInvoices();
    const termMap = new Map<string, number>();

    invs.forEach(inv => {
      inv.items.forEach(item => {
        if (!item.term) return;
        const term = item.term.trim();
        if (inv.type === 'order') termMap.set(term, (termMap.get(term) || 0) + (item.total || 0));
        if (inv.type === 'refund') termMap.set(term, (termMap.get(term) || 0) - (item.total || 0));
      });
    });

    const data = Array.from(termMap.entries())
      .map(([term, revenue]) => ({ term, revenue: Math.max(revenue, 0) }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

    const colors = ['bg-primary hover:bg-primary-container', 'bg-info hover:bg-info/80', 'bg-warning/80 hover:bg-warning', 'bg-success/80 hover:bg-success'];

    const bars = data.map((d, index) => ({
      term: d.term,
      revenue: d.revenue,
      heightPercent: Math.max((d.revenue / maxRevenue) * 95, 5),
      colorClass: colors[index % colors.length]
    }));

    const formatter = new Intl.NumberFormat('ar-SA', { notation: 'compact' });

    return {
      bars,
      label100: formatter.format(Math.round(maxRevenue)),
      label50: formatter.format(Math.round(maxRevenue * 0.5)),
      label0: '0',
      hasData: bars.length > 0
    };
  });

  // --- Classic Analytics Mode Data ---
  
  classicChartData = computed(() => {
    const invs = this.activeInvoices();
    const mode = this.classicDisplayMode();
    const yearMap = new Map<number, number | Set<string>>();

    invs.forEach(inv => {
      const year = new Date(inv.date || new Date()).getFullYear();
      
      if (mode === 'libraries') {
        if (!yearMap.has(year)) yearMap.set(year, new Set<string>());
        (yearMap.get(year) as Set<string>).add(inv.libraryName || 'غير محدد');
      } else {
        let val = 0;
        inv.items.forEach(item => {
          if (mode === 'revenue') {
            if (inv.type === 'order') val += (item.total || 0);
            if (inv.type === 'refund') val -= (item.total || 0);
          } else if (mode === 'quantity') {
            if (inv.type === 'order') val += (item.quantity || 0);
            if (inv.type === 'refund') val -= (item.quantity || 0);
          }
        });
        yearMap.set(year, (yearMap.get(year) as number || 0) + val);
      }
    });

    // Ensure we have some base years to look like the image if empty
    const currentYear = new Date().getFullYear();
    [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].forEach(y => {
      if (!yearMap.has(y)) {
        yearMap.set(y, mode === 'libraries' ? new Set<string>() : 0);
      }
    });

    const data = Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => {
        const val = mode === 'libraries' ? (value as Set<string>).size : Math.max((value as number), 0);
        return { year, value: val };
      });

    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    // Alternating blue colors for the chart as in the screenshot
    const colors = ['bg-[#C6D2FD]', 'bg-[#3A7CF6]', 'bg-[#002060]'];

    const bars = data.map((d, index) => ({
      year: d.year,
      value: d.value,
      heightPercent: Math.max((d.value / maxValue) * 90, 5),
      colorClass: colors[index % colors.length]
    }));

    return {
      bars,
      hasData: true // We always show base years
    };
  });

  classicTableData = computed(() => {
    const invs = this.activeInvoices();
    const mode = this.classicDisplayMode();
    
    // Group by Year and Term
    const groupMap = new Map<string, { year: number, term: string, ordered: number, refunded: number, net: number, libSales: Map<string, number> }>();

    invs.forEach(inv => {
      const year = new Date(inv.date || new Date()).getFullYear();
      
      inv.items.forEach(item => {
        const term = (item.term || 'الأول').trim();
        const key = `${year}-${term}`;
        
        if (!groupMap.has(key)) {
          groupMap.set(key, { year, term, ordered: 0, refunded: 0, net: 0, libSales: new Map() });
        }
        
        const group = groupMap.get(key)!;
        const libName = inv.libraryName || 'غير محدد';
        const qty = item.quantity || 0;
        const total = item.total || 0;

        // Metric for "Best Library"
        const metric = mode === 'revenue' ? total : qty;

        if (inv.type === 'order') {
          group.ordered += qty;
          group.net += total;
          group.libSales.set(libName, (group.libSales.get(libName) || 0) + metric);
        } else if (inv.type === 'refund') {
          group.refunded += qty;
          group.net -= total;
          group.libSales.set(libName, (group.libSales.get(libName) || 0) - metric);
        }
      });
    });

    const rows = Array.from(groupMap.values()).map(g => {
      // Find best selling library for this term
      let bestLib = '-';
      let maxVal = -1;
      g.libSales.forEach((val, lib) => {
        if (val > maxVal) {
          maxVal = val;
          bestLib = lib;
        }
      });

      return {
        year: g.year,
        term: g.term,
        bestLibrary: bestLib,
        ordered: g.ordered,
        refunded: g.refunded,
        netSales: g.net
      };
    });

    // Sort descending by year then term
    return rows.sort((a, b) => b.year - a.year || b.term.localeCompare(a.term));
  });

}
