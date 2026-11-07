import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { tap } from "rxjs";

export interface SessionUser {
  id: number;
  email: string;
}
interface LoginResponse {
  token: string;
  expiresIn: string;
  user: SessionUser;
}
const TOKEN_KEY = "taskboard.access-token";
const USER_KEY = "taskboard.user";

@Injectable({ providedIn: "root" })
export class AuthService {
  readonly user = signal<SessionUser | null>(this.readUser());
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  get isAuthenticated(): boolean {
    return !!this.token;
  }
  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>("/api/login", { email, password })
      .pipe(
        tap((result) => {
          localStorage.setItem(TOKEN_KEY, result.token);
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
          this.user.set(result.user);
        }),
      );
  }
  logout(redirect = true) {
    if (this.token)
      this.http
        .post<void>("/api/logout", {})
        .subscribe({ error: () => undefined });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    if (redirect) void this.router.navigate(["/login"]);
  }
  private readUser(): SessionUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }
}
