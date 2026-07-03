import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar';
import { HeaderComponent } from './layout/header/header';
import { ToastService } from './core/services/toast.service';
import { filter, take } from 'rxjs/operators';
import { SettingsService } from './core/services/settings.service';
import { InventoryService } from './core/services/inventory.service';
import { ActivityService } from './core/services/activity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('booking');
  public toastService = inject(ToastService);
  private router = inject(Router);
  
  private settingsService = inject(SettingsService);
  private inventoryService = inject(InventoryService);
  private activityService = inject(ActivityService);

  isSinglePageMode = signal(false);
  isLoginPage = signal(false);
  isDarkMode = signal(false); // Can be toggled globally if needed

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isSinglePageMode.set(event.urlAfterRedirects.includes('/single-page'));
      this.isLoginPage.set(event.urlAfterRedirects.includes('/login'));
    });

    this.checkAndAutoDeleteOldTermBooks();
  }

  private checkAndAutoDeleteOldTermBooks() {
    const currentTerm = this.settingsService.getCurrentTerm();
    const lastActiveTerm = localStorage.getItem('last_active_term');
    
    if (lastActiveTerm && lastActiveTerm !== currentTerm) {
      this.inventoryService.inventory$.pipe(take(1)).subscribe(items => {
        const itemsToDelete = items.filter(i => i.term && i.term !== currentTerm);
        if (itemsToDelete.length > 0) {
          itemsToDelete.forEach(item => {
            this.inventoryService.deleteInventoryItem(item.id!);
            this.activityService.logActivity(
              'حذف تلقائي',
              `تم حذف "${item.subject}" تلقائياً بسبب انتقال النظام من ${lastActiveTerm} إلى ${currentTerm}`,
              'DELETE',
              { entity: 'inventory', book: item }
            );
          });
          this.toastService.show(`تم حذف ${itemsToDelete.length} كتاب من ${lastActiveTerm} تلقائياً، يمكنك التراجع من سجل الأحداث.`, 'info');
        }
      });
    }
    
    localStorage.setItem('last_active_term', currentTerm);
  }
}
