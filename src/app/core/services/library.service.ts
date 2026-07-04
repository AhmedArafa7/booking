import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { Library } from '../models/library.model';
import { environment } from '../../../environments/environment';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/libraries`;
  private readonly storageKey = 'libraries'; 
  private syncService = inject(SyncService);

  private librariesSubject = new BehaviorSubject<Library[]>(this.loadFromStorage());
  public libraries$ = this.librariesSubject.asObservable();

  constructor() {
    this.fetchLibraries();
  }

  private loadFromStorage(): Library[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveToStorage(data: Library[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.syncService.queueSync();
  }

  addLibrary(lib: Library) {
    const current = this.librariesSubject.value;
    const updated = [...current, lib];
    this.saveToStorage(updated);
    this.librariesSubject.next(updated);
  }

  deleteLibrary(id: string) {
    const current = this.librariesSubject.value;
    const updated = current.filter(l => l.id !== id);
    this.saveToStorage(updated);
    this.librariesSubject.next(updated);
  }

  executeCompensation(activity: import('../models/activity.model').Activity) {
    if (!activity.type || !activity.payload) return;
    
    switch (activity.type) {
      case 'ADD':
        this.deleteLibrary(activity.payload.library.id);
        break;
      case 'DELETE':
        this.addLibrary(activity.payload.library);
        break;
    }
  }

  executeRedo(activity: import('../models/activity.model').Activity) {
    if (!activity.type || !activity.payload) return;
    
    switch (activity.type) {
      case 'ADD':
        this.addLibrary(activity.payload.library);
        break;
      case 'DELETE':
        this.deleteLibrary(activity.payload.library.id);
        break;
    }
  }

  fetchLibraries(): void {
    this.http.get<Library[]>(this.apiUrl).pipe(
      tap(data => {
        this.saveToStorage(data);
        this.librariesSubject.next(data);
      }),
      catchError(error => {
        console.error('API Error, falling back to local storage', error);
        return of(this.librariesSubject.value);
      })
    ).subscribe();
  }
}
