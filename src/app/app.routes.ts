import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { InventoryComponent } from './pages/inventory/inventory';
import { InvoicesComponent } from './pages/invoices/invoices';
import { LibrariesComponent } from './pages/libraries/libraries';
import { SinglePageComponent } from './pages/single-page/single-page';
import { LoginComponent } from './pages/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'single-page', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: 'invoices', component: InvoicesComponent, canActivate: [authGuard] },
  { path: 'libraries', component: LibrariesComponent, canActivate: [authGuard] },
  { path: 'single-page', component: SinglePageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
