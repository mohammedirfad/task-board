import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../core/auth.service";
import { ToastService } from "../core/toast.service";

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: ` <main class="login-page">
    <div class="login-art">
      <div class="login-art-grid"></div>
      <a class="brand brand-light"
        ><span class="brand-mark">t.</span
        ><span>taskflow<span class="brand-dot">.</span></span></a
      >
      <div class="art-content">
        <div class="art-kicker">
          <span class="live-dot"></span> A calmer way to get things done
        </div>
        <h1>Make room for<br /><em>meaningful work.</em></h1>
        <p>
          Plan with clarity, find your team's flow, and turn ambitious work into
          steady progress.
        </p>
        <div class="art-board">
          <div class="art-board-top">
            <span>THIS WEEK</span><span class="art-today">● On track</span>
          </div>
          <div class="art-progress"><span style="width:68%"></span></div>
          <div class="art-board-bottom">
            <span>Workload balance</span><b>68%</b>
          </div>
          <div class="art-task">
            <span class="art-check">✓</span><span>Map the next release</span
            ><b>3 pts</b>
          </div>
          <div class="art-task">
            <span class="art-check art-check-muted">·</span
            ><span>Review customer notes</span><b>2 pts</b>
          </div>
        </div>
      </div>
      <div class="art-footer">A little more focus. A lot more progress.</div>
    </div>
    <div class="login-side">
      <div class="login-form-wrap">
        <div class="login-welcome">
          <div class="welcome-mark">✦</div>
          <span class="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your<br />workspace</h2>
          <p>Pick up where your team left off.</p>
        </div>
        @if (expired()) {
          <div class="inline-alert">
            Your session ended. Sign in again to continue.
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label
            >Email address<input
              formControlName="email"
              type="email"
              autocomplete="username"
              placeholder="you@company.com"
            /><small
              *ngIf="form.controls.email.touched && form.controls.email.invalid"
              >Enter a valid email address.</small
            ></label
          ><label
            >Password
            <div class="password-wrap">
              <input
                formControlName="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
              /><button
                type="button"
                class="show-password"
                (click)="showPassword.set(!showPassword())"
              >
                {{ showPassword() ? "Hide" : "Show" }}
              </button>
            </div>
            <small
              *ngIf="
                form.controls.password.touched && form.controls.password.invalid
              "
              >Password is required.</small
            ></label
          >
          <div class="login-options">
            <span><span class="secure-dot"></span> Secure connection</span
            ><span>JWT protected</span>
          </div>
          <button
            class="button button-primary login-submit"
            [disabled]="form.invalid || loading()"
          >
            {{ loading() ? "Signing you in…" : "Sign in to Taskflow" }}
            <span>→</span>
          </button>
        </form>
        <div class="demo-hint">
          <b>Demo workspace</b><span>admin@test.com</span><span>Admin@123</span>
        </div>
        <p class="login-note">
          By continuing, you agree to keep your workspace access secure.
        </p>
      </div>
      <div class="login-copyright">
        © 2026 Taskflow <span>Built for thoughtful teams</span>
      </div>
    </div>
  </main>`,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  loading = signal(false);
  showPassword = signal(false);
  expired = signal(this.route.snapshot.queryParamMap.has("expired"));
  form = this.fb.group({
    email: ["admin@test.com", [Validators.required, Validators.email]],
    password: ["Admin@123", Validators.required],
  });
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show("Welcome back to your workspace.");
        const returnUrl =
          this.route.snapshot.queryParamMap.get("returnUrl") ?? "/";
        void this.router.navigateByUrl(
          returnUrl.startsWith("/") && !returnUrl.startsWith("//")
            ? returnUrl
            : "/",
        );
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.show(
          error.error?.error?.message ??
            "Unable to sign in. Check your connection and try again.",
          "error",
        );
      },
    });
  }
}
