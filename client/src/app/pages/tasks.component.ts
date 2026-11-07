import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import {
  Priority,
  Task,
  TaskInput,
  TaskListQuery,
  TaskSortBy,
  TaskStatus,
} from "../core/models";
import { TaskService } from "../core/task.service";
import { ToastService } from "../core/toast.service";
import { TaskFormComponent } from "../components/task-form.component";

@Component({
  standalone: true,
  imports: [FormsModule, TaskFormComponent],
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">EVERY IDEA, ACCOUNTED FOR</span>
        <h1>All your work, <em>together.</em></h1>
        <p>A clear list makes the next good decision easier.</p>
      </div>
      <button class="button button-primary" (click)="openCreate()">
        ＋ New task
      </button>
    </section>
    <section class="panel task-table-panel">
      <div class="table-toolbar">
        <div class="table-search">
          <span>⌕</span
          ><input
            maxlength="160"
            [(ngModel)]="search"
            (ngModelChange)="onFilter()"
            placeholder="Search tasks…"
            aria-label="Search tasks by title"
          />
        </div>
        <select
          [(ngModel)]="priority"
          (ngModelChange)="onFilter()"
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          @for (p of priorities; track p) {
            <option [value]="p">{{ p }} priority</option>
          }</select
        ><select
          [(ngModel)]="status"
          (ngModelChange)="onFilter()"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s }}</option>
          }</select
        ><button class="button button-quiet refresh-button" (click)="load()">
          ↻ <span>Refresh</span>
        </button>
      </div>
      @if (loading()) {
        <div class="table-loading">
          <span class="spinner"></span> Loading tasks…
        </div>
      }
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <button class="sort-button" (click)="sort('title')">
                  TASK
                  <span>{{
                    sortBy === "title" ? (order === "asc" ? "↑" : "↓") : "↕"
                  }}</span>
                </button>
              </th>
              <th>
                <button class="sort-button" (click)="sort('priority')">
                  PRIORITY
                  <span>{{ sortBy === "priority" ? order : "Sort" }}</span>
                </button>
              </th>
              <th>
                <button class="sort-button" (click)="sort('status')">
                  STATUS <span>{{ sortBy === "status" ? order : "Sort" }}</span>
                </button>
              </th>
              <th>
                <button class="sort-button" (click)="sort('storyPoints')">
                  POINTS
                  <span>{{
                    sortBy === "storyPoints"
                      ? order === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"
                  }}</span>
                </button>
              </th>
              <th>
                <button class="sort-button" (click)="sort('plannedDate')">
                  PLANNED
                  <span>{{
                    sortBy === "plannedDate"
                      ? order === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"
                  }}</span>
                </button>
              </th>
              <th>
                <button class="sort-button" (click)="sort('dueDate')">
                  DUE DATE
                  <span>{{ sortBy === "dueDate" ? order : "Sort" }}</span>
                </button>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (task of tasks(); track task.id) {
              <tr>
                <td>
                  <button class="table-task-title" (click)="edit(task)">
                    {{ task.title }}
                  </button>
                  @if (task.description) {
                    <small class="table-description">{{
                      task.description
                    }}</small>
                  }
                </td>
                <td>
                  <span
                    class="priority-badge"
                    [class]="'priority-' + task.priority.toLowerCase()"
                    ><i></i>{{ task.priority }}</span
                  >
                </td>
                <td>
                  <span
                    class="status-badge"
                    [class]="'status-' + slug(task.status)"
                    >{{ task.status }}</span
                  >
                </td>
                <td>
                  <span class="points-pill">{{ task.storyPoints }} pts</span>
                </td>
                <td class="date-cell">{{ task.plannedDate }}</td>
                <td class="date-cell">{{ task.dueDate }}</td>
                <td>
                  <div class="row-actions">
                    <button
                      class="icon-button"
                      (click)="edit(task)"
                      aria-label="Edit task"
                    >
                      ✎</button
                    ><button
                      class="icon-button delete-action"
                      (click)="confirmDelete(task)"
                      aria-label="Delete task"
                    >
                      ⌫
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              @if (!loading()) {
                <tr>
                  <td colspan="7">
                    <div class="empty-state">
                      <div class="empty-icon">⌕</div>
                      <b>{{
                        search || priority || status
                          ? "No tasks match those filters"
                          : "No tasks, yet"
                      }}</b>
                      <p>
                        {{
                          search || priority || status
                            ? "Try changing or clearing your filters."
                            : "Create a task to start planning your work."
                        }}
                      </p>
                      @if (!(search || priority || status)) {
                        <button
                          class="button button-primary"
                          (click)="openCreate()"
                        >
                          Create your first task
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span
          >Showing
          <b
            >{{ tasks().length ? (page() - 1) * limit + 1 : 0 }}–{{
              Math.min(page() * limit, total())
            }}</b
          >
          of <b>{{ total() }}</b> tasks</span
        >
        <div class="pagination">
          <label
            >Rows
            <select [ngModel]="limit" (ngModelChange)="changeLimit($event)">
              <option [ngValue]="10">10</option>
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
            </select></label
          ><button
            [disabled]="page() <= 1"
            (click)="goPage(page() - 1)"
            aria-label="Previous page"
          >
            ←</button
          ><span>{{ page() }} / {{ totalPages() || 1 }}</span
          ><button
            [disabled]="page() >= totalPages()"
            (click)="goPage(page() + 1)"
            aria-label="Next page"
          >
            →
          </button>
        </div>
      </div>
    </section>
    @if (dialogOpen()) {
      <app-task-form
        [task]="editing()"
        [saving]="saving()"
        (close)="closeDialog()"
        (submitTask)="save($event)"
      />
    }
    @if (deleting(); as task) {
      <div class="modal-backdrop" (click)="deleting.set(null)">
        <section
          class="confirm-modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="confirm-icon">⌫</div>
          <h2>Delete this task?</h2>
          <p>
            <b>{{ task.title }}</b> will be permanently removed. This action
            can't be undone.
          </p>
          <div class="modal-actions">
            <button class="button button-quiet" (click)="deleting.set(null)">
              Keep task</button
            ><button
              class="button button-danger"
              [disabled]="saving()"
              (click)="remove()"
            >
              {{ saving() ? "Deleting…" : "Delete task" }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class TasksComponent implements OnInit, OnDestroy {
  private api = inject(TaskService);
  private toast = inject(ToastService);
  Math = Math;
  priorities: Priority[] = ["Low", "Medium", "High", "Critical"];
  statuses: TaskStatus[] = ["Backlog", "Planned", "In Progress", "Completed"];
  tasks = signal<Task[]>([]);
  total = signal(0);
  totalPages = signal(0);
  page = signal(1);
  limit = 10;
  loading = signal(false);
  saving = signal(false);
  dialogOpen = signal(false);
  editing = signal<Task | null>(null);
  deleting = signal<Task | null>(null);
  search = "";
  priority: Priority | "" = "";
  status: TaskStatus | "" = "";
  sortBy: TaskSortBy = "plannedDate";
  order: "asc" | "desc" = "asc";
  private debounce?: ReturnType<typeof setTimeout>;
  private listRequest?: Subscription;
  ngOnInit() {
    this.load();
  }
  ngOnDestroy() {
    clearTimeout(this.debounce);
    this.listRequest?.unsubscribe();
  }
  onFilter() {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 250);
  }
  load() {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    const query: TaskListQuery = {
      search: this.search.trim(),
      priority: this.priority,
      status: this.status,
      sortBy: this.sortBy,
      order: this.order,
      page: this.page(),
      limit: this.limit,
    };
    this.listRequest = this.api.list(query).subscribe({
      next: (r) => {
        this.tasks.set(r.data);
        this.total.set(r.pagination.total);
        this.totalPages.set(r.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show("Could not load tasks.", "error");
      },
    });
  }
  sort(key: TaskSortBy) {
    if (this.sortBy === key) this.order = this.order === "asc" ? "desc" : "asc";
    else {
      this.sortBy = key;
      this.order = "asc";
    }
    this.page.set(1);
    this.load();
  }
  goPage(page: number) {
    this.page.set(page);
    this.load();
  }
  changeLimit(value: number) {
    this.limit = Number(value);
    this.page.set(1);
    this.load();
  }
  slug(status: string) {
    return status.toLowerCase().replace(" ", "-");
  }
  openCreate() {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }
  edit(task: Task) {
    this.editing.set(task);
    this.dialogOpen.set(true);
  }
  closeDialog() {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }
  save(input: TaskInput) {
    this.saving.set(true);
    const request = this.editing()
      ? this.api.update({ ...input, id: this.editing()!.id } as Task)
      : this.api.create(input);
    request.subscribe({
      next: ({ capacity }) => {
        const action = this.editing() ? "Task updated." : "Task created.";
        this.toast.show(`${action} ${this.api.capacityMessage(capacity)}`);
        this.saving.set(false);
        this.closeDialog();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.show(
          e.error?.error?.message ?? "Could not save task.",
          "error",
        );
      },
    });
  }
  confirmDelete(task: Task) {
    this.deleting.set(task);
  }
  remove() {
    const task = this.deleting();
    if (!task) return;
    this.saving.set(true);
    this.api.remove(task.id).subscribe({
      next: () => {
        this.toast.show("Task deleted.");
        this.saving.set(false);
        this.deleting.set(null);
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.show(
          e.error?.error?.message ?? "Could not delete task.",
          "error",
        );
      },
    });
  }
}
