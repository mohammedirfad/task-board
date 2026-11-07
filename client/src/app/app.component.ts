import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (authenticated()) {
      <div class="app-shell">
        <aside class="sidebar">
          <a routerLink="/" class="brand"><span class="brand-mark">t.</span><span>taskflow<span class="brand-dot">.</span><small>WORKSPACE</small></span></a>
          <div class="nav-label">WORKSPACE</div>
          <nav>
            <a routerLink="/" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active"><span class="nav-icon">◫</span>Overview</a>
            <a routerLink="/board" routerLinkActive="active"><span class="nav-icon">▦</span>Kanban board</a>
            <a routerLink="/tasks" routerLinkActive="active"><span class="nav-icon">☷</span>All tasks</a>
            <a routerLink="/settings" routerLinkActive="active"><span class="nav-icon">⚙</span>Settings</a>
            <button class="mobile-logout" (click)="logout()"><span class="nav-icon">↗</span>Sign out</button>
          </nav>
          <div class="sidebar-bottom">
            <div class="help-card"><span class="help-spark">✦</span><b>Plan with purpose</b><p>Keep your workload balanced and your team moving forward.</p></div>
            <div class="profile-row"><div class="avatar">{{ initials() }}</div><div class="profile-meta"><b>{{ auth.user()?.email || 'Workspace admin' }}</b><small>Administrator</small></div><button class="icon-button logout" aria-label="Sign out" title="Sign out" (click)="logout()">↗</button></div>
          </div>
        </aside>
        <main class="main-area"><header class="topbar"><div class="crumb">Workspace <span>/</span> <strong>{{ currentPage() }}</strong></div><div class="topbar-right"><span class="live-dot"></span><span>All changes saved</span><div class="top-avatar">{{ initials() }}</div></div></header><div class="page-content"><router-outlet /></div></main>
      </div>
    } @else { <router-outlet /> }
    <div class="toast-stack" aria-live="polite" aria-relevant="additions">
      @for (toast of toasts.messages(); track toast.id) { <div class="toast" [class.toast-error]="toast.type==='error'" [class.toast-info]="toast.type==='info'"><span>{{ toast.type==='error' ? '!' : toast.type==='success' ? '✓' : 'i' }}</span>{{ toast.text }}<button (click)="toasts.dismiss(toast.id)" aria-label="Dismiss notification">×</button></div> }
    </div>`
})
export class AppComponent {
  auth = inject(AuthService); toasts = inject(ToastService); router = inject(Router);
  routeUrl = signal(this.router.url);
  authenticated = computed(() => this.auth.isAuthenticated && !this.routeUrl().startsWith('/login'));
  currentPage = computed(() => ({ '/': 'Overview', '/board': 'Kanban board', '/tasks': 'All tasks', '/settings': 'Planning settings' }[this.routeUrl().split('?')[0]] ?? 'Workspace'));
  constructor() { this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.routeUrl.set(event.urlAfterRedirects)); }
  initials() { return (this.auth.user()?.email?.[0] ?? 'A').toUpperCase(); }
  logout() { this.auth.logout(); this.toasts.show('You have safely signed out.', 'info'); }
}
