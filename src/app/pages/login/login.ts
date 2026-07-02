import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  authService = inject(AuthService);
  settingsService = inject(SettingsService);

  username = '';
  password = '';

  onSubmit() {
    this.authService.login(this.username, this.password);
  }
}
