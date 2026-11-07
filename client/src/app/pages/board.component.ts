import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { Task, TaskInput, TaskStatus } from '../core/models';
import { TaskService } from '../core/task.service';
import { ToastService } from '../core/toast.service';
import { TaskFormComponent } from '../components/task-form.component';

@Component({
  standalone: true, imports: [DragDropModule, RouterLink, TaskFormComponent],
  template: `
    <section class="page-heading"><div><span class="eyebrow">YOUR FLOW, AT A GLANCE</span><h1>Make progress <em>visible.</em></h1><p>Move work forward, one considered step at a time.</p></div><div class="heading-actions"><a class="button button-quiet" routerLink="/settings">Planning settings</a><button class="button button-primary" (click)="openCreate()">+ New task</button></div></section>
    @if (loading()) { <div class="loading-card"><span class="spinner"></span> Loading your board...</div> }
    <div class="board-toolbar"><span><span class="live-dot"></span> {{ tasks().length }} tasks on the board</span><span class="board-hint">Drag a card to update its status</span></div>
    <div class="board-workspace" [class.board-workspace-selected]="selectedTask()">
    <section class="kanban-grid" cdkDropListGroup>
      @for (column of columns; track column.status) {
        <div class="kanban-column" [class]="'kanban-column column-'+slug(column.status)"><div class="column-head"><div><span class="column-marker"></span><h2>{{ column.status }}</h2><span class="column-count">{{ listFor(column.status).length }}</span></div><button class="icon-button add-column-task" (click)="openCreate(column.status)" [attr.aria-label]="'Add task to '+column.status">+</button></div>
          <div class="column-dropzone" cdkDropList [id]="slug(column.status)" [cdkDropListData]="listFor(column.status)" (cdkDropListDropped)="drop($event, column.status)">
            @for (task of listFor(column.status); track task.id) {
              <article class="task-card" cdkDrag [cdkDragData]="task" [class.task-card-selected]="selectedTask()?.id === task.id"><div class="card-drag-handle" cdkDragHandle><span class="drag-grip" aria-hidden="true"></span></div><div class="task-card-top"><span class="priority-badge" [class]="'priority-'+task.priority.toLowerCase()"><i></i>{{ task.priority }}</span><button class="card-menu" (click)="edit(task)" aria-label="Edit task">...</button></div><button class="task-card-title" (click)="selectTask(task)" [attr.aria-pressed]="selectedTask()?.id === task.id">{{ task.title }}</button>@if (task.description) { <p class="task-card-desc">{{ task.description }}</p> }<div class="task-card-meta"><span class="points-pill">{{ task.storyPoints }} pts</span><span class="date-label">Planned {{ task.plannedDate }}</span></div><div class="task-card-footer"><span>Due {{ task.dueDate }}</span><span class="card-assignee">{{ initials(task.title) }}</span></div><div *cdkDragPlaceholder class="drag-placeholder"></div></article>
            } @empty { <div class="column-empty"><span>*</span><b>Nothing here yet</b><small>Drop a task or create one</small></div> }
          </div>
        </div>
      }
    </section>
    <aside class="board-detail-panel" aria-label="Selected task details">
      @if (selectedTask(); as task) {
        <div class="detail-panel-head"><div><span class="eyebrow">TASK DETAILS</span><h2>At a glance</h2></div><button class="icon-button" type="button" aria-label="Clear selected task" (click)="selectTask(null)">x</button></div>
        <div class="detail-task-title"><span class="priority-badge" [class]="'priority-'+task.priority.toLowerCase()"><i></i>{{ task.priority }}</span><h3>{{ task.title }}</h3><p>{{ task.description || 'No description added yet.' }}</p></div>
        <label class="detail-status">Status<select [value]="task.status" [disabled]="saving()" (change)="changeStatus(task, $any($event.target).value)">@for (status of statusOptions; track status) { <option [value]="status">{{ status }}</option> }</select></label>
        <dl class="detail-fields"><div><dt>Story points</dt><dd>{{ task.storyPoints }} pts</dd></div><div><dt>Planned</dt><dd>{{ task.plannedDate }}</dd></div><div><dt>Due date</dt><dd>{{ task.dueDate }}</dd></div></dl>
        <button class="button button-primary detail-edit" type="button" (click)="edit(task)">Edit task details <span>&gt;</span></button>
      } @else {
        <div class="detail-empty"><span class="detail-empty-icon">âœ¦</span><span class="eyebrow">QUICK VIEW</span><h2>Task details, right here.</h2><p>Select any task card to see its description, status, points and dates without leaving the board.</p></div>
      }
    </aside>
    </div>
    @if (dialogOpen()) { <app-task-form [task]="editing()" [saving]="saving()" (close)="closeDialog()" (submitTask)="save($event)" /> }
    @if (error()) { <div class="error-banner">{{ error() }} <button (click)="load()">Reload board</button></div> }`
})
export class BoardComponent implements OnInit {
  private api = inject(TaskService); private toast = inject(ToastService);
  statusOptions: TaskStatus[] = ['Backlog', 'Planned', 'In Progress', 'Completed'];
  columns = [{ status: 'Backlog' as TaskStatus }, { status: 'Planned' as TaskStatus }, { status: 'In Progress' as TaskStatus }, { status: 'Completed' as TaskStatus }];
  tasks = signal<Task[]>([]); groupedTasks = computed(() => {
    const groups: Record<TaskStatus, Task[]> = { Backlog: [], Planned: [], 'In Progress': [], Completed: [] };
    for (const task of this.tasks()) groups[task.status].push(task);
    return groups;
  });
  loading = signal(true); saving = signal(false); error = signal(''); dialogOpen = signal(false); editing = signal<Task | null>(null); selectedTask = signal<Task | null>(null);
  ngOnInit() { this.load(); }
  listFor(status: TaskStatus) { return this.groupedTasks()[status]; }
  load() { this.loading.set(true); this.api.listAll().subscribe({ next: (tasks) => { tasks.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)); this.tasks.set(tasks); this.loading.set(false); }, error: () => { this.error.set('The board could not be loaded.'); this.loading.set(false); } }); }
  slug(status: string) { return status.toLowerCase().replace(' ', '-'); }
  initials(title: string) { return title.trim().split(/\s+/).slice(0,2).map((s) => s[0]).join('').toUpperCase(); }
  selectTask(task: Task | null) { this.selectedTask.set(task); }
  changeStatus(task: Task, status: TaskStatus) {
    if (status === task.status) return;
    this.saving.set(true);
    this.api.update({ ...task, status }).subscribe({
      next: ({ data, capacity }) => { this.tasks.update((all) => all.map((item) => item.id === data.id ? data : item)); this.selectedTask.set(data); this.saving.set(false); this.toast.show(`Task status updated. ${this.api.capacityMessage(capacity)}`); },
      error: (e) => { this.saving.set(false); this.toast.show(e.error?.error?.message ?? 'Could not update the task status.', 'error'); }
    });
  }
  drop(event: CdkDragDrop<Task[]>, target: TaskStatus) {
    if (event.previousContainer === event.container) { moveItemInArray(event.container.data, event.previousIndex, event.currentIndex); this.tasks.set([...this.tasks()]); return; }
    const task = event.item.data as Task; const oldStatus = task.status;
    if (oldStatus === 'Completed' && target === 'Backlog') { this.toast.show('Completed tasks cannot move back to Backlog.', 'error'); return; }
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const updated = { ...task, status: target }; this.tasks.update((all) => all.map((t) => t.id === task.id ? updated : t));
    this.api.update(updated).subscribe({ next: ({ data, capacity }) => { this.tasks.update((all) => all.map((t) => t.id === data.id ? data : t)); this.selectedTask.update((selected) => selected?.id === data.id ? data : selected); this.toast.show(`Task moved. ${this.api.capacityMessage(capacity)}`); }, error: (e) => { this.tasks.update((all) => all.map((t) => t.id === task.id ? { ...t, status: oldStatus } : t)); this.toast.show(e.error?.error?.message ?? 'Could not update the task status.', 'error'); } });
  }
  openCreate(status: TaskStatus = 'Backlog') { this.editing.set(null); this.dialogOpen.set(true); this.pendingStatus = status; }
  private pendingStatus: TaskStatus = 'Backlog';
  edit(task: Task) { this.editing.set(task); this.dialogOpen.set(true); }
  closeDialog() { this.dialogOpen.set(false); this.editing.set(null); }
  save(input: TaskInput) { this.saving.set(true); const payload = this.editing() ? { ...input, id: this.editing()!.id } as Task : { ...input, status: this.pendingStatus } as Task;
    const request = this.editing() ? this.api.update(payload) : this.api.create(input.status === 'Backlog' && this.pendingStatus !== 'Backlog' ? { ...input, status: this.pendingStatus } : input);
    request.subscribe({ next: ({ data, capacity }) => { const action = this.editing() ? 'Task updated.' : 'Task created.'; this.toast.show(`${action} ${this.api.capacityMessage(capacity)}`); this.closeDialog(); this.saving.set(false); this.load(); }, error: (e) => { this.saving.set(false); this.toast.show(e.error?.error?.message ?? 'Could not save task.', 'error'); } });
  }
}
