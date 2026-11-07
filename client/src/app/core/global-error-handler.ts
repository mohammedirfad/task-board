import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);
  private router = inject(Router);
  handleError(error: unknown): void {
    console.error('Unhandled application error', error);
    this.toast.show('Something went wrong. Please refresh or try again.', 'error');
    void this.router.navigate(['/error']);
  }
}
