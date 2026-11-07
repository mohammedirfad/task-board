import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ standalone: true, imports: [RouterLink], template: `<main class="not-found"><div class="not-found-mark">t.</div><span class="eyebrow">404 · PAGE NOT FOUND</span><h1>This page took<br><em>a different turn.</em></h1><p>The address may have changed, or the page may have moved.</p><a routerLink="/" class="button button-primary">Back to your workspace <span>→</span></a></main>` })
export class NotFoundComponent {}
