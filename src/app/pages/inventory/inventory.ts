import { Component, inject, signal, computed, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryItem } from '../../core/models/inventory.model';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html'
})
export class InventoryComponent {
  @Input() isCompact = false;
  
  private inventoryService = inject(InventoryService);
  public settingsService = inject(SettingsService);

  // Filters
  selectedSubject = signal('كل المواد');
  selectedGrade = signal('كل الصفوف');
  selectedTerm = signal('كل الأترام');

  isListCollapsed = signal(localStorage.getItem('invnt_listCollapsed') === 'true');
  toggleList() {
    this.isListCollapsed.set(!this.isListCollapsed());
    localStorage.setItem('invnt_listCollapsed', String(this.isListCollapsed()));
  }

  inventoryList = signal<InventoryItem[]>([]);

  constructor() {
    this.inventoryService.inventory$.subscribe(items => {
      // Force update if empty or if using old 'رياضيات' defaults
      if (items.length === 0 || (items.length > 0 && items[0].subject === 'رياضيات')) {
        const defaultItems: InventoryItem[] = [
          { id: 1, subject: 'فيزياء الصف التاسع (كتابين)', grade: 'الصف التاسع', term: 'الأول', price: 3.000, quantity: 100 },
          { id: 2, subject: 'كيمياء الصف التاسع (كتابين)', grade: 'الصف التاسع', term: 'الأول', price: 3.000, quantity: 100 },
          { id: 3, subject: 'فيزياء الصف العاشر (كتابين)', grade: 'الصف العاشر', term: 'الأول', price: 3.000, quantity: 100 },
          { id: 4, subject: 'كيمياء الصف العاشر (كتابين)', grade: 'الصف العاشر', term: 'الأول', price: 3.000, quantity: 100 },
          { id: 5, subject: 'فيزياء الحادي عشر (كتابين)', grade: 'الصف الحادي عشر', term: 'الأول', price: 3.500, quantity: 100 },
          { id: 6, subject: 'العلوم البيئية (القسم الأدبي)', grade: 'الصف الحادي عشر', term: 'الأول', price: 3.500, quantity: 100 },
          { id: 7, subject: 'فيزياء الثاني عشر (كتاب واحد)', grade: 'الصف الثاني عشر', term: 'الأول', price: 4.000, quantity: 100 },
          { id: 8, subject: 'العلوم البيئية ثاني عشر (كتاب واحد)', grade: 'الصف الثاني عشر', term: 'الأول', price: 4.000, quantity: 100 },
          { id: 9, subject: 'كيمياء الثاني عشر (كتاب واحد)', grade: 'الصف الثاني عشر', term: 'الأول', price: 4.000, quantity: 100 }
        ];
        this.inventoryList.set(defaultItems);
        // Force sync to service localStorage for the user to see the new data
        localStorage.setItem('inventory', JSON.stringify(defaultItems));
      } else {
        this.inventoryList.set(items);
      }
    });
  }

  filteredInventory = computed(() => {
    return this.inventoryList().filter(item => {
      const matchSubject = this.selectedSubject() === 'كل المواد' || item.subject === this.selectedSubject();
      const matchGrade = this.selectedGrade() === 'كل الصفوف' || item.grade === this.selectedGrade();
      const matchTerm = this.selectedTerm() === 'كل الأترام' || item.term === this.selectedTerm();
      return matchSubject && matchGrade && matchTerm;
    });
  });
}
