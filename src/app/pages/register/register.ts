import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegisterRequest } from '../../models/auth';

@Component({
  selector: 'app-register',
  imports: [FormsModule,
            RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  username = '';
  email = '';
  password = '';

  constructor(
    private authService: AuthService, private router: Router
  ) {}

  register(){
    const request: RegisterRequest = {
      username: this.username,
      email: this.email,
      password: this.password
    };

    this.authService.register(request).subscribe({
      next: response => {
        console.log('Cadastro realizado!', response);

        this.router.navigate(['/login']);
      },

      error: error => {
        console.error('Erro no cadastro:', error);
      }
    });
  }
  
}
