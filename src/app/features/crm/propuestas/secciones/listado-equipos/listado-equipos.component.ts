import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { EquiposClienteService } from '../../../../../core/services/equipos-cliente.service';
import { EquipoVinculado } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ModalImportXlsIaComponent } from '../../modal-import-xls-ia/modal-import-xls-ia.component';
import { ToastService } from '../../../../../core/services/toast.service';

interface EquipoCatalogo {
  id:       number;
  local:    string;
  tipo:     string;
  subtipo:  string;
  marca:    string;
  modelo:   string;
  numSerie: string;
  codigoTw: string;
}

@Component({
  selector: 'app-seccion-listado-equipos',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent, ButtonComponent, ModalImportXlsIaComponent],
  templateUrl: './listado-equipos.component.html',
  styleUrl: './listado-equipos.component.scss',
})
export class ListadoEquiposComponent implements OnInit {
  readonly draftSvc           = inject(PropuestaDraftService);
  private readonly equiposSvc = inject(EquiposClienteService);

  readonly catalogo = signal<EquipoCatalogo[]>([]);
  readonly cargandoCatalogo = signal(false);
  readonly busqueda = signal('');
  readonly subtipoFiltro = signal<string>('');
  readonly seleccionado = signal<number | null>(null);
  readonly seleccionadoProp = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    const idCliente = this.draftSvc.draft().idCliente ?? undefined;
    this.cargandoCatalogo.set(true);
    try {
      // Trae los equipos del cliente de la propuesta (filtrados por idCliente
      // del draft) que estén vigentes/activos para servicio.
      const r = await this.equiposSvc.obtenerEquipos(undefined, idCliente, undefined, undefined, 'Activo', true, 1, 500);
      const items: EquipoCatalogo[] = r.items.map(e => ({
        id:       e.idEquipo,
        local:    e.sedeNombre || '—',
        tipo:     e.clasificacionLabel || 'Equipo',
        subtipo:  e.clasificacionLabel || '',
        marca:    e.marca,
        modelo:   e.modelo,
        numSerie: e.numSerie,
        codigoTw: e.codigoTw,
      }));
      this.catalogo.set(items);
    } catch { /* silencioso */ }
    finally { this.cargandoCatalogo.set(false); }
  }

  readonly subtipos = computed(() => Array.from(new Set(this.catalogo().map(c => c.subtipo))));

  readonly catalogoFiltrado = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const s = this.subtipoFiltro();
    return this.catalogo().filter(c =>
      (!q || c.numSerie.toLowerCase().includes(q) || c.codigoTw.toLowerCase().includes(q) ||
            c.marca.toLowerCase().includes(q) || c.modelo.toLowerCase().includes(q)) &&
      (!s || c.subtipo === s)
    );
  });

  readonly equipos = computed(() => this.draftSvc.draft().equiposVinculados);

  agregar(): void {
    const id = this.seleccionado();
    if (id == null) return;
    const e = this.catalogo().find(x => x.id === id);
    if (!e) return;
    if (this.equipos().some(x => x.idEquipo === e.id)) return;    // ya existe
    this.draftSvc.actualizar({
      equiposVinculados: [...this.equipos(), {
        idEquipo: e.id, numSerie: e.numSerie, codigoTw: e.codigoTw,
        local: e.local, tipo: e.tipo, subtipo: e.subtipo, marca: e.marca, modelo: e.modelo,
      } as EquipoVinculado],
    });
  }

  quitar(): void {
    const i = this.seleccionadoProp();
    if (i == null) return;
    this.draftSvc.actualizar({
      equiposVinculados: this.equipos().filter((_, idx) => idx !== i),
    });
    this.seleccionadoProp.set(null);
  }

  limpiarLista(): void {
    this.draftSvc.actualizar({ equiposVinculados: [] });
  }

  editarEquipos(): void {
    console.log('[listado-equipos] abrir modal edit (pendiente)');
  }

  readonly modalImportAbierto = signal(false);
  private readonly toast = inject(ToastService);

  importarXls(): void { this.modalImportAbierto.set(true); }
  cerrarModalImport(): void { this.modalImportAbierto.set(false); }

  onEquiposImportados(filas: any[]): void {
    // Mock: añade los equipos importados al listado del draft como vinculados.
    const draft = this.draftSvc.draft();
    const nuevos: EquipoVinculado[] = filas.map((f, i) => ({
      idEquipo: Date.now() + i,
      numSerie: f.nsXls,
      codigoTw: f.codigoTwAsignado,
      local:    f.ubicacion,
      tipo:     f.equipo,
      subtipo:  '',
      marca:    '',
      modelo:   '',
    }));
    this.draftSvc.actualizar({
      equiposVinculados: [...draft.equiposVinculados, ...nuevos],
    });
    this.cerrarModalImport();
    this.toast.exito(`Se importaron ${filas.length} equipos a la propuesta.`);
  }

  exportarLista(): void {
    console.log('[listado-equipos] exportar XLS');
  }
}
