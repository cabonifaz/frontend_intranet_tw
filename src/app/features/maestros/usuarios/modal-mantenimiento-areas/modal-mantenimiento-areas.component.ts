import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { AreasService, AreaItem } from '../../../../core/services/areas.service';

/**
 * Modal de mantenimiento del catálogo "Áreas" usado en Usuarios, Clientes/Sedes y
 * Equipos del Cliente. Lista todas las áreas, permite crear nuevas y editar las
 * existentes (renombrar). No permite eliminar: se desactiva si hiciera falta.
 *
 * Persiste contra tabla_maestra (categoria AREA_USUARIO) via AreasService.
 * Renombrar requiere endpoint PATCH que Bryan todavía no expuso.
 */
@Component({
  selector: 'app-modal-mantenimiento-areas',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-mantenimiento-areas.component.html',
  styleUrl: './modal-mantenimiento-areas.component.scss',
})
export class ModalMantenimientoAreasComponent implements OnInit {
  private readonly areasSvc = inject(AreasService);
  private readonly toast    = inject(ToastService);

  readonly cerrar      = output<void>();
  /** Emitido tras guardar: la lista actualizada de áreas para que el padre recargue. */
  readonly actualizado = output<AreaItem[]>();

  readonly areas          = signal<AreaItem[]>([]);
  readonly cargando       = signal(false);
  readonly guardando      = signal(false);
  readonly nombreNuevo    = signal('');
  readonly idEditando     = signal<string | null>(null);
  readonly nombreEditando = signal('');

  async ngOnInit(): Promise<void> {
    this.cargando.set(true);
    try {
      this.areas.set(await this.areasSvc.listar());
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
    this.guardando.set(true);
    try {
      const nueva = await this.areasSvc.crear(nombre);
      this.areas.set(await this.areasSvc.listar());
      this.nombreNuevo.set('');
      this.toast.exito(`Área "${nueva.nombre}" creada.`);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al crear el área.');
    } finally {
      this.guardando.set(false);
    }
  }

  comenzarEdicion(area: AreaItem): void {
    this.idEditando.set(area.codigo);
    this.nombreEditando.set(area.nombre);
  }

  cancelarEdicion(): void {
    this.idEditando.set(null);
    this.nombreEditando.set('');
  }

  async confirmarEdicion(): Promise<void> {
    const codigo = this.idEditando();
    const nombre = this.nombreEditando().trim();
    if (!codigo || nombre.length < 2) {
      this.toast.error('El nombre del área debe tener al menos 2 caracteres.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.areasSvc.renombrar(codigo, nombre);
      this.areas.set(await this.areasSvc.listar());
      this.cancelarEdicion();
      this.toast.exito('Área renombrada.');
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al renombrar el área.');
    } finally {
      this.guardando.set(false);
    }
  }

  cerrarYNotificar(): void {
    this.actualizado.emit(this.areas());
    this.cerrar.emit();
  }
}
