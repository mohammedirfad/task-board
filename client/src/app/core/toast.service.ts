import { Injectable, signal } from '@angular/core';

export interface ToastMessage { id: number; text: string; type: 'success' | 'error' | 'info'; }
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  show(text: string, type: ToastMessage['type'] = 'success') {
    const id = Date.now() + Math.random(); this.messages.update((items) => [...items, { id, text, type }]);
    setTimeout(() => this.messages.update((items) => items.filter((item) => item.id !== id)), 4200);
  }
  dismiss(id: number) { this.messages.update((items) => items.filter((item) => item.id !== id)); }
}
