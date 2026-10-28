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
import { ResultadoImportacionEquipos } from '../../../../../core/models/importacion-equipos.model';

interface EquipoCatalogo {
  id:        number;
  local:     string;   // sede
  tipo:      string;
  subtipo:   string;
  marca:     string;
  modelo:    string;
  numSerie:  string;
  codigoTw:  string;
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
        id:        e.idEquipo,
        local:     e.sedeNombre || '—',
        tipo:      e.clasificacionLabel || 'Equipo',
        subtipo:   e.clasificacionLabel || '',
        marca:     e.marca,
        modelo:    e.modelo,
        numSerie:  e.numSerie,
        codigoTw:  e.codigoTw,
      }));
      this.catalogo.set(items);
    } catch { /* silencioso */ }
    finally { this.cargandoCatalogo.set(false); }
  }

  readonly subtipos = computed(() => Array.from(new Set(this.catalogo().map(c => c.subtipo))));

  readonly catalogoFiltrado = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const s = this.subtipoFiltro();
    const yaEnPropuesta = new Set(this.equipos().map(e => e.idEquipo).filter(id => id > 0));
    return this.catalogo().filter(c =>
      !yaEnPropuesta.has(c.id) &&
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
        idEquipo: e.id,
        numSerie: e.numSerie,
        codigoTw: e.codigoTw,
        local:    e.local,
        tipo:     e.tipo,
        subtipo:  e.subtipo,
        marca:    e.marca,
        modelo:   e.modelo,
        esNuevo:  false,
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

  /** Series ya presentes en el listado — para que el back no las sugiera como match. */
  readonly seriesEnPropuesta = computed(() =>
    this.equipos().map(e => e.numSerie).filter(Boolean),
  );
  readonly idsEnPropuesta = computed(() =>
    this.equipos().map(e => e.idEquipo).filter(id => id > 0),
  );

  onEquiposImportados(r: ResultadoImportacionEquipos): void {
    const draft = this.draftSvc.draft();
    const yaVinculados = new Set(draft.equiposVinculados.map(e => e.idEquipo));

    const nuevos: EquipoVinculado[] = r.equipos
      .filter(e => !yaVinculados.has(e.idEquipo))
      .map(e => ({
        idEquipo: e.idEquipo,
        numSerie: e.numSerie,
        codigoTw: e.codigoTw,
        local:    e.sedeNombre || e.ubicacion || '',
        tipo:     e.tipo || e.clasificacionLabel || 'Equipo',
        subtipo:  e.subtipo || '',
        marca:    e.marca,
        modelo:   e.modelo,
        esNuevo:  e.resultado === 'creado',
      }));

    this.draftSvc.actualizar({
      equiposVinculados: [...draft.equiposVinculados, ...nuevos],
    });
    this.cerrarModalImport();
  }

  exportarLista(): void {
    console.log('[listado-equipos] exportar XLS');
  }
}
