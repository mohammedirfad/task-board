import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ standalone: true, imports: [RouterLink], template: `<main class="not-found"><div class="not-found-mark">!</div><span class="eyebrow">WE HIT A SNAG</span><h1>Your workspace is<br><em>still right here.</em></h1><p>Something unexpected happened while showing this page. Try again or return to your workspace.</p><div class="modal-actions"><button class="button button-quiet" (click)="reload()">Try again</button><a routerLink="/" class="button button-primary">Back to workspace <span>→</span></a></div></main>` })
export class ErrorComponent { reload() { window.location.reload(); } }
