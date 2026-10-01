import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environments';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  private apiUrl = `${environment.apiUrl}`;

  login() {
    const loginRequest = {
      email: this.email,
      password: this.password
    };
    this.authService.login(loginRequest)//faz a requisição para o endpoint de login usando o serviço AuthService
    .subscribe({
      next: response => {
        console.log('Login successful:');

          this.router.navigate(['/videos']);
      },
      error: err => {
        console.error('Login failed:', err);
      }
    });
  }
}
