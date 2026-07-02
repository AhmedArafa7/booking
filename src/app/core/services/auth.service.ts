import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_KEY = 'auth_token';
  
  // Reactive signal for login state
  isAuthenticated = signal<boolean>(this.checkAuth());

  constructor(private router: Router, private toast: ToastService) {}

  private checkAuth(): boolean {
    return localStorage.getItem(this.AUTH_KEY) === 'true';
  }

  login(username: string, password: string): boolean {
    if (username === 'admin' && password === '1234567') {
      localStorage.setItem(this.AUTH_KEY, 'true');
      this.isAuthenticated.set(true);
      this.router.navigate(['/single-page']);
      return true;
    } else {
      this.toast.show('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
      return false;
    }
  }

  logout() {
    localStorage.removeItem(this.AUTH_KEY);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
}
