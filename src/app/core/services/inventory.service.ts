import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { InventoryItem } from '../models/inventory.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inventory`;
  private readonly storageKey = 'inventory'; // Assuming 'inventory' was the old key

  private inventorySubject = new BehaviorSubject<InventoryItem[]>(this.loadFromStorage());
  public inventory$ = this.inventorySubject.asObservable();

  getItemById(id: number): InventoryItem | undefined {
    return this.inventorySubject.value.find(item => item.id === id);
  }

  constructor() {
    this.fetchInventory();
  }

  private loadFromStorage(): InventoryItem[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveToStorage(data: InventoryItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  fetchInventory(): void {
    this.http.get<InventoryItem[]>(this.apiUrl).pipe(
      tap(data => {
        this.saveToStorage(data);
        this.inventorySubject.next(data);
      }),
      catchError(error => {
        console.error('API Error, falling back to local storage', error);
        return of(this.inventorySubject.value);
      })
    ).subscribe();
  }

  addInventoryItem(item: InventoryItem) {
    if (!item.id) {
      item.id = Math.floor(Math.random() * 1000000);
    }
    const current = this.inventorySubject.value;
    const updated = [...current, item];
    this.saveToStorage(updated);
    this.inventorySubject.next(updated);
  }

  updateInventoryItem(updatedItem: InventoryItem) {
    const current = this.inventorySubject.value;
    const updated = current.map(item => item.id === updatedItem.id ? updatedItem : item);
    this.saveToStorage(updated);
    this.inventorySubject.next(updated);
  }

  deleteInventoryItem(id: number) {
    const current = this.inventorySubject.value;
    const updated = current.filter(item => item.id !== id);
    this.saveToStorage(updated);
    this.inventorySubject.next(updated);
  }

  // Activity-based out-of-order undo/redo
  executeCompensation(activity: import('../models/activity.model').Activity) {
    if (!activity.type || !activity.payload) return;
    
    switch (activity.type) {
      case 'ADD':
        this.deleteInventoryItem(activity.payload.book.id);
        break;
      case 'UPDATE':
        this.updateInventoryItem(activity.payload.oldBook);
        break;
      case 'DELETE':
        this.addInventoryItem(activity.payload.book);
        break;
    }
  }

  executeRedo(activity: import('../models/activity.model').Activity) {
    if (!activity.type || !activity.payload) return;

    switch (activity.type) {
      case 'ADD':
        this.addInventoryItem(activity.payload.book);
        break;
      case 'UPDATE':
        this.updateInventoryItem(activity.payload.newBook);
        break;
      case 'DELETE':
        this.deleteInventoryItem(activity.payload.book.id);
        break;
    }
  }

}
