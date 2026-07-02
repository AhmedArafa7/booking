import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar';
import { HeaderComponent } from './layout/header/header';
import { ToastService } from './core/services/toast.service';
import { filter } from 'rxjs/operators';

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
  }
}
