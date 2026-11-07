import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TaskService } from "../core/task.service";
import { DashboardSummary, Settings, Task } from "../core/models";
import { ToastService } from "../core/toast.service";

@Component({
  standalone: true,
  imports: [RouterLink],
  template: ` <section class="page-heading">
      <div>
        <span class="eyebrow">{{ todayLabel }}</span>
        <h1>Your workspace, <em>in flow.</em></h1>
        <p>See what's moving and make space for the next big thing.</p>
      </div>
      <a class="button button-primary" routerLink="/board"
        ><span>▦</span> Open board <span>→</span></a
      >
    </section>
    @if (loading()) {
      <div class="loading-card">
        <span class="spinner"></span> Gathering your workspace…
      </div>
    }
    @if (summary(); as s) {
      <section class="metric-grid">
        <article class="metric-card metric-total">
          <div class="metric-top">
            <span class="metric-icon">☷</span
            ><span class="metric-caption">ALL TASKS</span
            ><span class="metric-trend">↗</span>
          </div>
          <strong>{{ s.totalTasks }}</strong
          ><span class="metric-label">Tasks in workspace</span>
          <div class="metric-bottom">Across every stage</div>
        </article>
        <article class="metric-card">
          <div class="metric-top">
            <span class="metric-icon metric-amber">◌</span
            ><span class="metric-caption">BACKLOG</span>
          </div>
          <strong>{{ s.backlogTasks }}</strong
          ><span class="metric-label">Waiting to be planned</span>
          <div class="metric-bottom">
            <span class="mini-dot dot-amber"></span> Ready when you are
          </div>
        </article>
        <article class="metric-card">
          <div class="metric-top">
            <span class="metric-icon metric-blue">↗</span
            ><span class="metric-caption">PLANNED</span>
          </div>
          <strong>{{ s.plannedTasks }}</strong
          ><span class="metric-label">On your team's plate</span>
          <div class="metric-bottom">
            <span class="mini-dot dot-blue"></span>
            {{ s.totalStoryPoints }} story points total
          </div>
        </article>
        <article class="metric-card">
          <div class="metric-top">
            <span class="metric-icon metric-violet">◷</span
            ><span class="metric-caption">IN PROGRESS</span>
          </div>
          <strong>{{ s.inProgressTasks }}</strong
          ><span class="metric-label">Moving forward now</span>
          <div class="metric-bottom">
            <span class="mini-dot dot-violet"></span> Keep the momentum
          </div>
        </article>
        <article class="metric-card">
          <div class="metric-top">
            <span class="metric-icon metric-green">✓</span
            ><span class="metric-caption">COMPLETED</span>
          </div>
          <strong>{{ s.completedTasks }}</strong
          ><span class="metric-label">Finished with care</span>
          <div class="metric-bottom">
            <span class="mini-dot dot-green"></span> Progress worth celebrating
          </div>
        </article>
      </section>
      <div class="dashboard-grid">
        <section class="panel workload-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">CAPACITY SNAPSHOT</span>
              <h2>A balanced week</h2>
            </div>
            <a routerLink="/settings" class="text-link"
              >Adjust limits <span>→</span></a
            >
          </div>
          <p class="panel-subtitle">
            Your planned work against the limits you've set.
          </p>
          @if (settings(); as setting) {
            <div class="capacity-block">
              <div class="capacity-label">
                <span><i class="capacity-dot daily"></i> Daily capacity</span
                ><b
                  >{{ setting.dailyStoryPointLimit }}
                  <small>pts / day</small></b
                >
              </div>
              <div class="capacity-track">
                <span
                  class="capacity-fill fill-daily"
                  [style.width.%]="dailyPercent()"
                ></span>
              </div>
              <div class="capacity-foot">
                <span>{{ dailyPlanned() }} points planned today</span
                ><span
                  >{{ setting.dailyStoryPointLimit - dailyPlanned() }} pts
                  left</span
                >
              </div>
            </div>
            <div class="capacity-block">
              <div class="capacity-label">
                <span><i class="capacity-dot weekly"></i> Weekly capacity</span
                ><b
                  >{{ setting.weeklyStoryPointLimit }}
                  <small>pts / week</small></b
                >
              </div>
              <div class="capacity-track">
                <span
                  class="capacity-fill fill-weekly"
                  [style.width.%]="weeklyPercent()"
                ></span>
              </div>
              <div class="capacity-foot">
                <span>{{ weeklyPlanned() }} points planned this week</span
                ><span
                  >{{ setting.weeklyStoryPointLimit - weeklyPlanned() }} pts
                  left</span
                >
              </div>
            </div>
          }
          <div class="capacity-note">
            <span>✦</span>
            <p>
              Story points help you understand effort. They aren't a measure of
              value or time.
            </p>
          </div>
        </section>
        <section class="panel recent-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">RECENT WORK</span>
              <h2>Latest tasks</h2>
            </div>
            <a routerLink="/tasks" class="text-link">View all <span>→</span></a>
          </div>
          @if (recent().length) {
            <div class="recent-list">
              @for (task of recent(); track task.id) {
                <div class="recent-row">
                  <span
                    class="recent-status"
                    [class]="'recent-status status-' + slug(task.status)"
                  ></span>
                  <div class="recent-title">
                    <b>{{ task.title }}</b
                    ><small>{{ task.status }} · {{ task.plannedDate }}</small>
                  </div>
                  <span class="points-pill">{{ task.storyPoints }} pts</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state compact">
              <div class="empty-icon">☷</div>
              <b>A fresh start</b>
              <p>Add your first task and give your plans a place to land.</p>
              <a routerLink="/tasks" class="text-link">Create a task →</a>
            </div>
          }
        </section>
      </div>
    }
    @if (error()) {
      <div class="error-banner">
        {{ error() }} <button (click)="load()">Try again</button>
      </div>
    }
    <footer class="page-foot">
      <span>One thoughtful step at a time.</span
      ><a routerLink="/board">Go to your board →</a>
    </footer>`,
})
export class DashboardComponent implements OnInit {
  private api = inject(TaskService);
  private toast = inject(ToastService);
  summary = signal<DashboardSummary | null>(null);
  settings = signal<Settings | null>(null);
  recent = signal<Task[]>([]);
  loading = signal(true);
  error = signal("");
  todayLabel = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
  dailyPlanned = signal(0);
  weeklyPlanned = signal(0);
  dailyPercent = () =>
    Math.min(
      100,
      (this.dailyPlanned() / (this.settings()?.dailyStoryPointLimit || 1)) *
        100,
    );
  weeklyPercent = () =>
    Math.min(
      100,
      (this.weeklyPlanned() / (this.settings()?.weeklyStoryPointLimit || 1)) *
        100,
    );
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set("");
    this.api.dashboard().subscribe({
      next: (r) => {
        this.summary.set(r.data);
        this.dailyPlanned.set(r.data.plannedDailyPoints);
        this.weeklyPlanned.set(r.data.plannedWeeklyPoints);
      },
      error: () => {
        this.error.set("We could not load your workspace summary.");
        this.loading.set(false);
      },
    });
    this.api
      .settings()
      .subscribe({
        next: (r) => this.settings.set(r.data),
        error: () =>
          this.toast.show("Could not load planning limits.", "error"),
      });
    this.api
      .list({ limit: 100, sortBy: "plannedDate", order: "asc" })
      .subscribe({
        next: (r) => {
          this.recent.set(r.data.slice(0, 4));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
  slug(status: string) {
    return status.toLowerCase().replace(" ", "-");
  }
}
