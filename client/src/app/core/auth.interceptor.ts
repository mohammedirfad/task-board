import { HttpInterceptorFn } from "@angular/common/http";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem("taskboard.access-token");
  if (!token || request.url.includes("/api/login")) return next(request);
  return next(
    request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
