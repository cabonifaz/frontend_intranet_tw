import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, filter, switchMap } from 'rxjs';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { CampoComponent } from '../campo/campo.component';
import {
  CampoVerificable,
  ValorSimilar,
  VerificarDuplicadosService,
} from '../../../core/services/verificar-duplicados.service';

/**
 * Modal genérico para agregar un item nuevo a un catálogo de tabla_maestra
 * (Tipo, Subtipo, Marca, Modelo, etc.). UI pura — la lógica de persistencia
 * (POST al back) la maneja el padre vía (guardar).
 *
 * Si se pasa `campoVerificable`, mientras el usuario escribe se consulta
 * `/api/maestros/similares` (ticket #4290) y se detectan duplicados
 * exactos (bloquea guardar) o similares (warning sugerencia).
 */
@Component({
  selector: 'app-modal-nuevo-item-catalogo',
  imports: [FormsModule, ModalComponent, ButtonComponent, CampoComponent],
  templateUrl: './modal-nuevo-item-catalogo.component.html',
  styleUrl: './modal-nuevo-item-catalogo.component.scss',
})
export class ModalNuevoItemCatalogoComponent {
  private readonly duplicadosSvc = inject(VerificarDuplicadosService);
  private readonly destroyRef    = inject(DestroyRef);

  readonly titulo            = input.required<string>();
  readonly etiquetaCampo     = input<string>('Nombre');
  readonly placeholder       = input<string>('');
  readonly minCaracteres     = input<number>(2);
  readonly guardando         = input<boolean>(false);
  /** Si se pasa, activa la verificación de duplicados contra el back. */
  readonly campoVerificable  = input<CampoVerificable | null>(null);
  /** Requerido solo si campoVerificable === 'area_cliente'. */
  readonly idCliente         = input<number | null>(null);

  readonly guardar  = output<string>();
  readonly cancelar = output<void>();

  readonly nombre            = signal('');
  readonly existeExacto      = signal(false);
  readonly valorExactoLabel  = signal('');
  readonly similares         = signal<ValorSimilar[]>([]);
  readonly verificando       = signal(false);

  private readonly consulta$ = new Subject<string>();

  constructor() {
    // Debounce + llamada al back para verificar duplicados.
    this.consulta$
      .pipe(
        debounceTime(300),
        filter(t => t.length >= this.minCaracteres() && !!this.campoVerificable()),
        switchMap(t => {
          this.verificando.set(true);
          return this.duplicadosSvc
            .verificar(this.campoVerificable()!, t, this.idCliente() ?? undefined)
            .catch(() => ({ texto: t, existeExacto: false, similares: [] }));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(r => {
        this.verificando.set(false);
        this.existeExacto.set(r.existeExacto);
        this.valorExactoLabel.set(
          r.existeExacto ? (r.similares.find(s => s.similitud === 100)?.valor ?? r.texto) : ''
        );
        this.similares.set(r.similares.filter(s => s.similitud < 100).slice(0, 3));
      });

    // Reset cuando se vacía el input (debajo del mínimo).
    effect(() => {
      if (this.nombre().trim().length < this.minCaracteres()) {
        this.existeExacto.set(false);
        this.valorExactoLabel.set('');
        this.similares.set([]);
      }
    });
  }

  onCambioNombre(valor: string): void {
    this.nombre.set(valor);
    const t = valor.trim();
    if (t.length >= this.minCaracteres()) this.consulta$.next(t);
  }

  get valido(): boolean {
    return this.nombre().trim().length >= this.minCaracteres()
        && !this.existeExacto()
        && !this.verificando();
  }

  onGuardar(): void {
    const n = this.nombre().trim();
    if (n.length < this.minCaracteres()) return;
    if (this.existeExacto() || this.verificando()) return;
    this.guardar.emit(n);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
