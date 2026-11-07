import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && !request.url.includes('/api/login')) {
      localStorage.removeItem('taskboard.access-token'); localStorage.removeItem('taskboard.user');
      void router.navigate(['/login'], { queryParams: { expired: '1' } });
    }
    return throwError(() => error);
  }));
};
