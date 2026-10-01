import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Videos } from './pages/videos/videos';
import { authGuard } from './core/guards/auth-guard';


export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'videos',
    component: Videos,
    canActivate: [authGuard] 
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];