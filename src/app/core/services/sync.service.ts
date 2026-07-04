import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private http = inject(HttpClient);
  
  private syncTrigger = new Subject<void>();
  public isSyncing = false;
  public isChecking = false;
  public lastSyncTime: Date | null = null;
  public syncError: string | null = null;
  
  private deviceId: string;

  constructor() {
    this.deviceId = localStorage.getItem('deviceId') || '';
    if (!this.deviceId) {
      this.deviceId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', this.deviceId);
    }

    // Debounce multiple fast saves into one sync operation after 3 seconds of inactivity
    this.syncTrigger.pipe(
      debounceTime(3000),
      tap(() => this.performSync())
    ).subscribe();
  }

  // Called by AppComponent or main route on load
  startupCheck() {
    if (!environment.googleSheets?.webAppUrl) return;
    this.isChecking = true;
    
    // Check lastWriterId
    this.http.get(`${environment.googleSheets.webAppUrl}?action=checkToken`).subscribe({
      next: (res: any) => {
        if (res?.lastWriterId && res.lastWriterId !== this.deviceId) {
          // Cloud has newer data from another device, pull it!
          this.pullData();
        } else {
          this.isChecking = false;
        }
      },
      error: (err) => {
        console.error('Failed to check sync token:', err);
        this.isChecking = false;
      }
    });
  }

  pullData() {
    this.isSyncing = true;
    this.http.get(`${environment.googleSheets.webAppUrl}?action=getData`).subscribe({
      next: (res: any) => {
        if (res?.result === 'success' && res.data) {
          if (res.data.Libraries) localStorage.setItem('libraries', JSON.stringify(res.data.Libraries));
          if (res.data.Inventory) localStorage.setItem('inventory', JSON.stringify(res.data.Inventory));
          if (res.data.Invoices) localStorage.setItem('invoices', JSON.stringify(res.data.Invoices));
          if (res.data.ActivityLog) localStorage.setItem('activity_log', JSON.stringify(res.data.ActivityLog));
          
          // Reload page to reflect new state
          window.location.reload();
        }
        this.isSyncing = false;
      },
      error: (err) => {
        console.error('Failed to pull data:', err);
        this.syncError = err.message;
        this.isSyncing = false;
      }
    });
  }

  // Called by other services whenever data changes
  queueSync() {
    if (!environment.googleSheets?.webAppUrl) return;
    this.syncTrigger.next();
  }

  private performSync() {
    if (!environment.googleSheets?.webAppUrl) return;
    
    this.isSyncing = true;
    this.syncError = null;

    // Get current state from LocalStorage to send a complete snapshot
    const payload = {
      action: 'sync',
      deviceId: this.deviceId,
      tables: {
        Libraries: JSON.parse(localStorage.getItem('libraries') || '[]'),
        Inventory: JSON.parse(localStorage.getItem('inventory') || '[]'),
        Invoices: JSON.parse(localStorage.getItem('invoices') || '[]'),
        ActivityLog: JSON.parse(localStorage.getItem('activity_log') || '[]')
      }
    };

    // Google Apps script requires text/plain to avoid CORS preflight issues
    const headers = new HttpHeaders().set('Content-Type', 'text/plain;charset=utf-8');

    this.http.post(environment.googleSheets.webAppUrl, payload, { headers }).subscribe({
      next: (res: any) => {
        if (res?.result === 'success') {
          this.lastSyncTime = new Date();
          this.isSyncing = false;
        } else {
          this.syncError = res?.error || 'Unknown error';
          this.isSyncing = false;
        }
      },
      error: (err) => {
        console.error('Sync to Google Sheets failed:', err);
        this.syncError = err.message;
        this.isSyncing = false;
      }
    });
  }
}
