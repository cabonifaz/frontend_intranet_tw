import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestaDisponibleOs, TipoOrden } from '../../../../core/models/ordenes-servicio.model';

/**
 * Modal pequeño "+ Registrar OS" — lista las propuestas aceptadas disponibles
 * para generar una OS/OM. Reglas: propuesta en estado `aceptada` + sin OS/OM
 * activa (todas anuladas o ninguna).
 *
 * Al elegir una propuesta, emite el output `elegida(idPropuesta)` para que el
 * padre navegue a /crm/ordenes-servicio/nueva/:idPropuesta.
 */
@Component({
  selector: 'app-modal-elegir-propuesta-os',
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './modal-elegir-propuesta-os.component.html',
  styleUrl: './modal-elegir-propuesta-os.component.scss',
})
export class ModalElegirPropuestaOsComponent implements OnInit {
  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly cerrar  = output<void>();
  readonly elegida = output<number>();     // idPropuesta

  readonly cargando    = signal(true);
  readonly propuestas  = signal<PropuestaDisponibleOs[]>([]);

  busqueda = '';
  filtroTipo: TipoOrden | '' = '';

  readonly propuestasFiltradas = computed(() => {
    const q = this.busqueda.toLowerCase().trim();
    const t = this.filtroTipo;
    return this.propuestas().filter(p =>
      (!t || p.tipoOrden === t) &&
      (!q || (
        p.numero.toLowerCase().includes(q) ||
        p.razonSocial.toLowerCase().includes(q) ||
        p.ruc.includes(q) ||
        (p.numeroRequerimiento ?? '').toLowerCase().includes(q)
      )),
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.svc.obtenerPropuestasDisponibles();
      this.propuestas.set(list);
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudieron cargar las propuestas.');
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(p: PropuestaDisponibleOs): void {
    this.elegida.emit(p.idPropuesta);
  }

  claseChipTipo(t: TipoOrden): string {
    return t === 'OS' ? 'chip-tipo chip-tipo--os' : 'chip-tipo chip-tipo--om';
  }

  onCerrar(): void { this.cerrar.emit(); }

  limpiar(): void {
    this.busqueda = '';
    this.filtroTipo = '';
  }
}
