import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environments';
import { RegisterRequest, 
         LoginRequest,
         LoginResponse} from '../../models/auth';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) {}

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(this.apiUrl + '/login', request).pipe(
      tap((value) => {
        sessionStorage.setItem('token', value.token);
      })
    );
  }

  register(request: RegisterRequest) {
    return this.http.post(this.apiUrl + '/users/register', request);
  }

}