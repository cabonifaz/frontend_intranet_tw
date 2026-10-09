import { Component, computed, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * Modal que se abre al intentar crear una propuesta sobre un RQ que ya tiene
 * una propuesta vinculada. Las opciones cambian según el estado de la propuesta:
 *   - borrador: "Editar propuesta existente" + "Propuesta independiente"
 *   - enviada/aprobada/rechazada/vencida: "Nueva versión (vN+1)" + "Propuesta independiente"
 *   - anulada: solo "Propuesta independiente" (la anulada ya no se puede retomar)
 */
type Opcion = 'editar-existente' | 'nueva-version' | 'independiente';

@Component({
  selector: 'app-modal-propuesta-existente',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './modal-propuesta-existente.component.html',
  styleUrl: './modal-propuesta-existente.component.scss',
})
export class ModalPropuestaExistenteComponent {
  readonly codigoRq         = input.required<string>();
  readonly codigoPropuesta  = input.required<string>();
  readonly versionActual    = input<number>(1);
  /** Estado actual de la propuesta existente. Determina qué cards se muestran. */
  readonly estadoPropuesta  = input<string>('');

  readonly editarExistente = output<void>();
  readonly nuevaVersion    = output<void>();
  readonly independiente   = output<void>();
  readonly cerrar          = output<void>();

  readonly opcion = signal<Opcion | null>(null);

  get versionSiguiente(): string {
    return `v${this.versionActual() + 1}`;
  }

  /** Primera card: ¿se puede editar directo (borrador) o se genera nueva versión? */
  readonly modo = computed<'editar' | 'nueva-version' | 'ninguno'>(() => {
    const e = this.estadoPropuesta();
    if (e === 'borrador') return 'editar';
    if (e === 'anulado')  return 'ninguno';           // No se puede retomar; solo independiente
    return 'nueva-version';                           // pendiente_vb / aprobado / enviado / rechazado / vencido
  });

  /** Texto del botón de confirmación según la opción elegida. */
  readonly textoConfirmar = computed<string>(() => {
    switch (this.opcion()) {
      case 'editar-existente': return 'Editar propuesta';
      case 'nueva-version':    return `Crear nueva versión (v${this.versionActual() + 1})`;
      case 'independiente':    return 'Crear propuesta';
      default:                 return 'Continuar';
    }
  });

  /** Ícono del botón de confirmación según la opción elegida. */
  readonly iconoConfirmar = computed<string>(() => {
    switch (this.opcion()) {
      case 'editar-existente': return 'edit';
      case 'nueva-version':    return 'sync';
      case 'independiente':    return 'add';
      default:                 return 'arrow_forward';
    }
  });

  seleccionar(op: Opcion): void {
    this.opcion.set(op);
  }

  confirmar(): void {
    const op = this.opcion();
    if (op === 'editar-existente') this.editarExistente.emit();
    else if (op === 'nueva-version') this.nuevaVersion.emit();
    else if (op === 'independiente') this.independiente.emit();
  }
}
