import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegisterPayload {
  email: string;
  username: string;
  display_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  password: string;
  password_confirm: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  display_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  email_verified: boolean;
}

export interface UsernameAvailability {
  available: boolean;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  register(payload: RegisterPayload): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/api/auth/register/`, payload, {
      withCredentials: true,
    });
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/api/auth/login/`, payload, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/logout/`, null, {
      withCredentials: true,
    });
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/api/auth/me/`, {
      withCredentials: true,
    });
  }

  getCsrfToken(): Observable<void> {
    return this.http.get<void>(`${this.baseUrl}/api/auth/csrf/`, {
      withCredentials: true,
    });
  }

  isUsernameAvailable(username: string): Observable<UsernameAvailability> {
    return this.http.get<UsernameAvailability>(
      `${this.baseUrl}/api/auth/username-available/`,
      {
        params: { username },
        withCredentials: true,
      },
    );
  }
}