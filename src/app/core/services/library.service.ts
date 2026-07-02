import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { Library } from '../models/library.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/libraries`;
  private readonly storageKey = 'libraries'; 

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
