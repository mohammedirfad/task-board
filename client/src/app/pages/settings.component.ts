import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Settings } from '../core/models';
import { TaskService } from '../core/task.service';
import { ToastService } from '../core/toast.service';

@Component({
  standalone: true, imports: [ReactiveFormsModule],
  template: `
    <section class="page-heading"><div><span class="eyebrow">MAKE ROOM FOR GOOD WORK</span><h1>Set your <em>own pace.</em></h1><p>Choose workload limits that help your team do sustainable work.</p></div></section>
    @if (loading()) { <div class="loading-card"><span class="spinner"></span> Loading your planning limits…</div> }
    <div class="settings-layout"><section class="panel settings-panel"><div class="settings-panel-head"><span class="settings-hero-icon">⚙</span><div><span class="eyebrow">CAPACITY PLANNING</span><h2>Planning limits</h2><p>These limits apply when work is moved into the Planned column.</p></div></div>
      <form [formGroup]="form" (ngSubmit)="save()"><label>Daily story point limit <span>*</span><div class="number-input"><input type="number" min="0.1" step="0.5" formControlName="dailyStoryPointLimit" (input)="clearError()"><span>points / day</span></div><small>Maximum workload scheduled for a single day.</small></label>
        <label>Weekly story point limit <span>*</span><div class="number-input"><input type="number" min="0.1" step="0.5" formControlName="weeklyStoryPointLimit" (input)="clearError()"><span>points / week</span></div><small>Maximum workload scheduled from Monday through Sunday.</small></label>
        @if (form.errors?.['dailyGreater']) { <div class="inline-alert">The daily limit cannot be greater than the weekly limit.</div> }
        <div class="settings-actions"><span>Changes are saved for the whole workspace.</span><button class="button button-primary" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save limits' }}</button></div></form>
    </section><aside class="settings-aside"><div class="panel settings-tip"><div class="tip-icon">✦</div><span class="eyebrow">A THOUGHTFUL REMINDER</span><h3>Points are for planning.</h3><p>Story points describe the effort involved in a task. They help you spread work fairly, but they aren't an estimate of hours or a measure of someone's value.</p></div><div class="panel settings-example"><span class="eyebrow">YOUR CURRENT PLAN</span><h3>A little breathing room</h3><div class="example-row"><span>Today</span><b>{{ form.value.dailyStoryPointLimit || 8 }} <small>points max</small></b></div><div class="example-row"><span>This week</span><b>{{ form.value.weeklyStoryPointLimit || 40 }} <small>points max</small></b></div></div></aside></div>`
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder); private api = inject(TaskService); private toast = inject(ToastService);
  loading = signal(true); saving = signal(false); form = this.fb.group({ dailyStoryPointLimit: [8, [Validators.required, Validators.min(0.1)]], weeklyStoryPointLimit: [40, [Validators.required, Validators.min(0.1)]] });
  ngOnInit() { this.api.settings().subscribe({ next: ({ data }) => { this.form.patchValue(data); this.loading.set(false); }, error: () => { this.loading.set(false); this.toast.show('Could not load settings.', 'error'); } }); }
  clearError() { if (this.form.errors) this.form.setErrors(null); }
  save() { this.form.markAllAsTouched(); const { dailyStoryPointLimit, weeklyStoryPointLimit } = this.form.getRawValue(); if (this.form.invalid) return; if (dailyStoryPointLimit! > weeklyStoryPointLimit!) { this.form.setErrors({ dailyGreater: true }); return; } this.form.setErrors(null); this.saving.set(true); this.api.saveSettings({ dailyStoryPointLimit: dailyStoryPointLimit!, weeklyStoryPointLimit: weeklyStoryPointLimit! }).subscribe({ next: ({ data }) => { this.form.patchValue(data); this.form.setErrors(null); this.saving.set(false); this.toast.show('Planning limits saved.'); }, error: (e) => { this.saving.set(false); this.toast.show(e.error?.error?.message ?? 'Could not save limits.', 'error'); } }); }
}
