import { Injectable, inject, linkedSignal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private readonly revision = signal(0);
  readonly generation = this.revision.asReadonly();

  reset(): void {
    this.revision.update((value) => value + 1);
  }
}

/** Resets private cached data synchronously whenever the authenticated session changes. */
export function sessionSignal<T>(initialValue: T) {
  const session = inject(SessionStateService);
  return linkedSignal({ source: session.generation, computation: () => initialValue });
}
