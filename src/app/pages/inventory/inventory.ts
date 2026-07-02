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
      this.inventoryList.set(items);
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
