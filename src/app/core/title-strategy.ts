import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Formatea el titulo de la pestania como "CRYSTAL | <SECCION>".
 * La seccion sale del `title` de la ruta activa (en mayusculas).
 */
@Injectable({ providedIn: 'root' })
export class CrystalTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(
      pageTitle ? `CRYSTAL | ${pageTitle.toUpperCase()}` : 'CRYSTAL',
    );
  }
}
