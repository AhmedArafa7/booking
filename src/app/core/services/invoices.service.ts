import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { Invoice } from '../models/invoice.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/invoices`;
  private readonly storageKey = 'invoices'; 

  private invoicesSubject = new BehaviorSubject<Invoice[]>(this.loadFromStorage());
  public invoices$ = this.invoicesSubject.asObservable();

  constructor() {
    this.fetchInvoices();
  }

  private loadFromStorage(): Invoice[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveToStorage(data: Invoice[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  fetchInvoices(): void {
    this.http.get<Invoice[]>(this.apiUrl).pipe(
      tap(data => {
        this.saveToStorage(data);
        this.invoicesSubject.next(data);
      }),
      catchError(error => {
        console.error('API Error, falling back to local storage', error);
        return of(this.invoicesSubject.value);
      })
    ).subscribe();
  }
}
