import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { Priority, Task, TaskInput, TaskStatus } from '../core/models';

@Component({
  selector: 'app-task-form', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()">
      <section class="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" (click)="$event.stopPropagation()">
        <div class="modal-head"><div><span class="eyebrow">TASK DETAILS</span><h2 id="task-modal-title">{{ task ? 'Edit task' : 'Create a task' }}</h2><p>Make the next step clear and manageable.</p></div><button type="button" class="icon-button close-button" aria-label="Close" (click)="close.emit()">×</button></div>
        <form [formGroup]="form" (ngSubmit)="save()" class="task-form">
          <label>Task title <span>*</span><input formControlName="title" maxlength="160" placeholder="e.g. Refresh onboarding experience"><small class="field-error" *ngIf="form.controls.title.touched && form.controls.title.invalid">A title is required (up to 160 characters).</small></label>
          <label>Description <textarea formControlName="description" rows="3" placeholder="Add a little context for your team"></textarea></label>
          <div class="form-grid"><label>Story points <span>*</span><input formControlName="storyPoints" type="number" min="1" step="1" inputmode="numeric" placeholder="3"><small class="field-error" *ngIf="form.controls.storyPoints.touched && form.controls.storyPoints.invalid">Enter a whole number of at least 1.</small></label>
          <label>Priority <span>*</span><select formControlName="priority"><option value="">Choose priority</option>@for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }</select></label></div>
          <div class="form-grid"><label>Planned date <span>*</span><input formControlName="plannedDate" type="date" (input)="form.setErrors(null)"></label><label>Due date <span>*</span><input formControlName="dueDate" type="date" (input)="form.setErrors(null)"><small class="field-error" *ngIf="form.errors?.['dates']">Due date must be on or after the planned date.</small></label></div>
          @if (task) { <label>Status<select formControlName="status">@for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }</select></label> }
          <div class="modal-actions"><button type="button" class="button button-quiet" (click)="close.emit()">Cancel</button><button class="button button-primary" [disabled]="form.invalid || saving">{{ saving ? 'Saving…' : task ? 'Save changes' : 'Create task' }}</button></div>
        </form>
      </section>
    </div>`
})
export class TaskFormComponent implements OnChanges {
  @Input() task: Task | null = null; @Input() saving = false;
  @Output() close = new EventEmitter<void>(); @Output() submitTask = new EventEmitter<TaskInput>();
  priorities: Priority[] = ['Low','Medium','High','Critical']; statuses: TaskStatus[] = ['Backlog','Planned','In Progress','Completed'];
  private readonly fb = inject(FormBuilder);
  form = this.fb.group({ title: ['', [Validators.required, Validators.maxLength(160)]], description: [''], storyPoints: [1, [Validators.required, Validators.min(1), Validators.pattern(/^[1-9]\d*$/)]], priority: ['', Validators.required], status: ['Backlog'], plannedDate: ['', Validators.required], dueDate: ['', Validators.required] });
  ngOnChanges(changes: SimpleChanges) {
    if (changes['task']) this.form.patchValue(this.task ? { ...this.task } : { title: '', description: '', storyPoints: 1, priority: '', status: 'Backlog', plannedDate: this.today(), dueDate: this.today() });
  }
  save() {
    this.form.markAllAsTouched(); const value = this.form.getRawValue();
    if (value.dueDate && value.plannedDate && value.dueDate < value.plannedDate) { this.form.setErrors({ dates: true }); return; }
    if (this.form.invalid) return;
    this.submitTask.emit({ ...value, storyPoints: Number(value.storyPoints), title: value.title!.trim(), description: value.description ?? '', priority: value.priority as Priority, status: value.status as TaskStatus, plannedDate: value.plannedDate!, dueDate: value.dueDate! });
  }
  private today() { return new Date().toISOString().slice(0, 10); }
}
