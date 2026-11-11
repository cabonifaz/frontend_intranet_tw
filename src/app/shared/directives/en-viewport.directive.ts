import { Directive, ElementRef, OnDestroy, OnInit, inject, input, output } from '@angular/core';

/**
 * Emite `(entra)` la primera vez que el elemento cruza el viewport.
 * Diseñado para disparar cargas diferidas (ej. HU-57 blobs de fotos del informe).
 *
 * Uso:
 *   <li appEnViewport (entra)="solicitarFoto(f.idEvidencia)"> ... </li>
 *
 * Opciones:
 *   - rootMargin: por defecto "100px 0px" para pre-cargar antes de que llegue a pantalla.
 *   - unaSolaVez: por defecto true; si false, emite cada vez que entra.
 */
@Directive({ selector: '[appEnViewport]', standalone: true })
export class EnViewportDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<Element>);

  readonly rootMargin  = input<string>('100px 0px');
  readonly unaSolaVez  = input<boolean>(true);

  readonly entra = output<void>();

  private observer?: IntersectionObserver;
  private disparado = false;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: entornos sin IO (SSR, tests) → emitimos directo una vez.
      this.entra.emit();
      this.disparado = true;
      return;
    }
    this.observer = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        if (this.unaSolaVez() && this.disparado) continue;
        this.entra.emit();
        this.disparado = true;
        if (this.unaSolaVez()) this.observer?.disconnect();
      }
    }, { rootMargin: this.rootMargin() });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
