import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { routes } from "./app/app.routes";
import { AppComponent } from "./app/app.component";
import { authInterceptor } from "./app/core/auth.interceptor";
import { errorInterceptor } from "./app/core/error.interceptor";
import { GlobalErrorHandler } from "./app/core/global-error-handler";
import { ErrorHandler } from "@angular/core";

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: "top" }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
}).catch((error) => console.error(error));
