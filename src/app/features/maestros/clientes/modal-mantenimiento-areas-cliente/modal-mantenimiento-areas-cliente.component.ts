import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { AreasClienteService } from '../../../../core/services/areas-cliente.service';
import { AreaCliente } from '../../../../core/models/maestros.model';

/**
 * Mantenimiento de áreas por cliente (ej. "Zona de carnes", "Patio norte").
 *
 * Dos modos de operación:
 *  - **Edición de cliente existente** (`idCliente > 0`): cada acción pega al back
 *    real (SP_GuardarAreaCliente / SP_CambiarEstadoAreaCliente).
 *  - **Cliente nuevo** (`idCliente = 0`): mantiene las áreas en memoria y las
 *    emite al cerrar. La ficha-cliente las cascada contra el back después de
 *    crear el cliente. En este modo no se puede renombrar/desactivar — solo
 *    agregar o quitar de la lista local (son items temporales con idArea < 0).
 */
@Component({
  selector: 'app-modal-mantenimiento-areas-cliente',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-mantenimiento-areas-cliente.component.html',
  styleUrl: './modal-mantenimiento-areas-cliente.component.scss',
})
export class ModalMantenimientoAreasClienteComponent implements OnInit {
  private readonly areasSvc = inject(AreasClienteService);
  private readonly toast    = inject(ToastService);

  /** 0 = cliente nuevo (modo cascada local). >0 = cliente persistido (CRUD contra back). */
  readonly idCliente       = input.required<number>();
  /** Lista inicial a hidratar. Para cliente nuevo son las temporales ya acumuladas. */
  readonly areasIniciales  = input<AreaCliente[]>([]);

  readonly cerrar      = output<void>();
  /** Al cerrar emite la lista actualizada (útil en modo cascada local). */
  readonly actualizado = output<AreaCliente[]>();

  readonly areas          = signal<AreaCliente[]>([]);
  readonly cargando       = signal(false);
  readonly guardando      = signal(false);
  readonly nombreNuevo    = signal('');
  readonly idEditando     = signal<number | null>(null);
  readonly nombreEditando = signal('');

  readonly modoLocal = computed(() => this.idCliente() <= 0);

  private tempIdSeq = -1;

  async ngOnInit(): Promise<void> {
    if (this.modoLocal()) {
      // Clona el array de entrada para no mutar externo.
      this.areas.set([...this.areasIniciales()]);
      return;
    }
    this.cargando.set(true);
    try {
      this.areas.set(await this.areasSvc.listar(this.idCliente(), false));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar áreas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(): Promise<void> {
    const nombre = this.nombreNuevo().trim();
    if (nombre.length < 2) {
      this.toast.error('El nombre del área debe tener al menos 2 caracteres.');
      return;
    }

    // Validación local de duplicado (el back también valida — este es solo UX).
    if (this.areas().some(a => a.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      this.toast.error('Este cliente ya tiene un área con ese nombre.');
      return;
    }

    this.guardando.set(true);
    try {
      if (this.modoLocal()) {
        const item: AreaCliente = {
          idArea:    this.tempIdSeq--,
          idCliente: 0,
          nombre,
          estado:    'Activo',
          equipos:   0,
        };
        this.areas.update(list => [...list, item]);
      } else {
        const res = await this.areasSvc.guardar(this.idCliente(), { idArea: 0, nombre });
        this.areas.update(list => [...list, {
          idArea:    res.idArea,
          idCliente: this.idCliente(),
          nombre:    res.nombre,
          estado:    'Activo',
          equipos:   0,
        }]);
      }
      this.nombreNuevo.set('');
      this.toast.exito(`Área "${nombre}" registrada.`);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al crear el área.');
    } finally {
      this.guardando.set(false);
    }
  }

  comenzarEdicion(area: AreaCliente): void {
    // En modo local permitimos editar items temporales (idArea<0). Las ya persistidas
    // sin BD no se tocan — pero en modo local no debería haber persistidas.
    this.idEditando.set(area.idArea);
    this.nombreEditando.set(area.nombre);
  }

  cancelarEdicion(): void {
    this.idEditando.set(null);
    this.nombreEditando.set('');
  }

  async confirmarEdicion(): Promise<void> {
    const idArea = this.idEditando();
    const nombre = this.nombreEditando().trim();
    if (idArea == null || nombre.length < 2) {
      this.toast.error('El nombre del área debe tener al menos 2 caracteres.');
      return;
    }
    this.guardando.set(true);
    try {
      if (this.modoLocal() || idArea < 0) {
        this.areas.update(list => list.map(a => a.idArea === idArea ? { ...a, nombre } : a));
      } else {
        await this.areasSvc.guardar(this.idCliente(), { idArea, nombre });
        this.areas.update(list => list.map(a => a.idArea === idArea ? { ...a, nombre } : a));
      }
      this.cancelarEdicion();
      this.toast.exito('Área renombrada.');
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al renombrar el área.');
    } finally {
      this.guardando.set(false);
    }
  }

  async toggleEstado(area: AreaCliente): Promise<void> {
    const nuevoEstado = area.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.guardando.set(true);
    try {
      if (this.modoLocal() || area.idArea < 0) {
        // En modo local toggle solo cambia el flag en memoria.
        this.areas.update(list => list.map(a => a.idArea === area.idArea ? { ...a, estado: nuevoEstado } : a));
      } else {
        await this.areasSvc.cambiarEstado(area.idArea, { estado: nuevoEstado });
        this.areas.update(list => list.map(a => a.idArea === area.idArea ? { ...a, estado: nuevoEstado } : a));
      }
      this.toast.exito(`Área "${area.nombre}" ${nuevoEstado === 'Activo' ? 'activada' : 'desactivada'}.`);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cambiar estado.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Solo en modo local: quitar un ítem temporal de la lista. */
  quitarLocal(idArea: number): void {
    if (!this.modoLocal() && idArea >= 0) return;
    this.areas.update(list => list.filter(a => a.idArea !== idArea));
  }

  cerrarYNotificar(): void {
    this.actualizado.emit(this.areas());
    this.cerrar.emit();
  }
}
