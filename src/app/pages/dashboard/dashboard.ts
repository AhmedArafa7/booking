import { Component, inject, Input, computed, signal } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { LibraryService } from '../../core/services/library.service';
import { map, combineLatest } from 'rxjs';

import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  @Input() isCompact = false;

  private inventoryService = inject(InventoryService);
  private invoicesService = inject(InvoicesService);
  private libraryService = inject(LibraryService);
  public settingsService = inject(SettingsService);

  selectedViewMode = signal('الكميات');

  isAnalysisCollapsed = signal(localStorage.getItem('dash_analysisCollapsed') === 'true');
  toggleAnalysis() {
    this.isAnalysisCollapsed.set(!this.isAnalysisCollapsed());
    localStorage.setItem('dash_analysisCollapsed', String(this.isAnalysisCollapsed()));
  }

  // Combine services to show dashboard stats
  stats$ = combineLatest([
    this.inventoryService.inventory$,
    this.invoicesService.invoices$,
    this.libraryService.libraries$
  ]).pipe(
    map(([inventory, invoices, libraries]) => {
      const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
      const lowStockCount = inventory.filter(item => item.quantity < 150).length;
      const totalInvoices = invoices.length;
      const totalLibraries = libraries.length;

      return {
        totalItems,
        lowStockCount,
        totalInvoices,
        totalLibraries
      };
    })
  );

  // Base historical data to mix with real data
  private baseHistoricalData = [
    { year: 2025, term: 'الأول', library: 'متوقع', orderedQty: 2000, refundedQty: 0, priceMultiplier: 35, librariesCount: 5, refundedLibCount: 0 },
    { year: 2024, term: 'الأول', library: 'مكتبة جرير - الرياض', orderedQty: 7700, refundedQty: 105, priceMultiplier: 35, librariesCount: 15, refundedLibCount: 2 },
    { year: 2024, term: 'الثاني', library: 'مكتبة جرير - الرياض', orderedQty: 7700, refundedQty: 105, priceMultiplier: 35, librariesCount: 14, refundedLibCount: 1 },
    { year: 2023, term: 'الأول', library: 'مكتبة العبيكان', orderedQty: 6425, refundedQty: 72, priceMultiplier: 40, librariesCount: 12, refundedLibCount: 3 },
    { year: 2023, term: 'الثاني', library: 'مكتبة العبيكان', orderedQty: 6425, refundedQty: 73, priceMultiplier: 40, librariesCount: 12, refundedLibCount: 3 },
    { year: 2022, term: 'الأول', library: 'مكتبة الصفاء', orderedQty: 3000, refundedQty: 50, priceMultiplier: 30, librariesCount: 8, refundedLibCount: 1 },
    { year: 2022, term: 'الثاني', library: 'مكتبة الصفاء', orderedQty: 3200, refundedQty: 45, priceMultiplier: 30, librariesCount: 8, refundedLibCount: 1 }
  ];

  tableData = computed(() => {
    const mode = this.selectedViewMode();
    // Only show 2023 and 2024 in the table to match previous behavior
    return this.baseHistoricalData.filter(r => r.year === 2024 || r.year === 2023).map(row => {
      if (mode === 'المبيعات النقدية') {
        return {
          year: row.year,
          term: row.term,
          library: row.library,
          ordered: row.orderedQty * row.priceMultiplier,
          refunded: row.refundedQty * row.priceMultiplier,
          net: (row.orderedQty - row.refundedQty) * row.priceMultiplier,
          format: 'currency'
        };
      } else if (mode === 'عدد المكتبات') {
        return {
          year: row.year,
          term: row.term,
          library: row.library,
          ordered: row.librariesCount,
          refunded: row.refundedLibCount,
          net: row.librariesCount - row.refundedLibCount,
          format: 'number'
        };
      } else {
        // الكميات
        return {
          year: row.year,
          term: row.term,
          library: row.library,
          ordered: row.orderedQty,
          refunded: row.refundedQty,
          net: row.orderedQty - row.refundedQty,
          format: 'number'
        };
      }
    });
  });

  chartData = computed(() => {
    const mode = this.selectedViewMode();
    const years = [2022, 2023, 2024, 2025];
    const yearlyTotals = years.map(year => {
      const yearRows = this.baseHistoricalData.filter(r => r.year === year);
      let total = 0;
      yearRows.forEach(row => {
        if (mode === 'المبيعات النقدية') {
          total += (row.orderedQty - row.refundedQty) * row.priceMultiplier;
        } else if (mode === 'عدد المكتبات') {
          total += row.librariesCount; // Just sum them up as a proxy for activity
        } else {
          total += (row.orderedQty - row.refundedQty);
        }
      });
      return { year, total };
    });

    const maxTotal = Math.max(...yearlyTotals.map(yt => yt.total), 1); // prevent div by zero

    const colors = {
      2022: 'bg-primary-fixed-dim hover:bg-primary-fixed',
      2023: 'bg-primary hover:bg-primary-container',
      2024: 'bg-info hover:bg-info/80',
      2025: 'bg-surface-container-highest hover:bg-surface-variant'
    };

    const bars = yearlyTotals.map(yt => {
      // Calculate percentage (max 95% to leave some room at top)
      const heightPercent = Math.max((yt.total / maxTotal) * 95, 5); // min 5% height
      
      let titlePrefix = '';
      if (mode === 'المبيعات النقدية') titlePrefix = 'صافي المبيعات: ';
      else if (mode === 'عدد المكتبات') titlePrefix = 'نشاط المكتبات: ';
      else titlePrefix = 'صافي الكميات: ';

      const formattedTotal = new Intl.NumberFormat('ar-SA').format(yt.total);

      return {
        year: yt.year,
        heightPercent,
        colorClass: colors[yt.year as keyof typeof colors],
        title: `${yt.year}${yt.year === 2025 ? ' (متوقع)' : ''} - ${titlePrefix}${formattedTotal}`
      };
    });

    // Calculate Y-axis labels
    const formatter = new Intl.NumberFormat('ar-SA', { 
      notation: 'compact', 
      maximumFractionDigits: mode === 'عدد المكتبات' ? 0 : 1 
    });
    
    return {
      bars,
      label100: formatter.format(Math.round(maxTotal)),
      label75: formatter.format(Math.round(maxTotal * 0.75)),
      label50: formatter.format(Math.round(maxTotal * 0.5)),
      label25: formatter.format(Math.round(maxTotal * 0.25)),
      label0: formatter.format(0)
    };
  });
}
