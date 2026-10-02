import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { EquipoVinculado } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';

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

const EQUIPOS_SEDE: EquipoCatalogo[] = [
  { id: 1,  local: 'DIR. FISCAL',  tipo: 'Equipo', subtipo: 'Uncella de Piso',    marca: 'Mettler',   modelo: 'IND780',    numSerie: 'MT-984429-2923', codigoTw: 'EQ-TW-2026-0001' },
  { id: 2,  local: 'PLANTA CONC.', tipo: 'Equipo', subtipo: 'Balanza Camionera', marca: 'Rice Lake', modelo: 'SURVIVOR',  numSerie: 'RL-77919-A22',   codigoTw: 'EQ-TW-2026-0002' },
  { id: 3,  local: 'TOLVA 2',      tipo: 'Equipo', subtipo: 'Tolva de Pesaje',   marca: 'Flintec',   modelo: 'RC3-30T',   numSerie: 'FL-55401-99',    codigoTw: 'EQ-TW-2026-0003' },
  { id: 4,  local: 'LABORATORIO',  tipo: 'Equipo', subtipo: 'Balanza Analítica', marca: 'Sartorius', modelo: 'BC-ANTA',   numSerie: 'SA-9901-X',      codigoTw: 'EQ-TW-2026-0004' },
  { id: 5,  local: 'ALMACÉN GRAL.', tipo: 'Equipo', subtipo: 'Uncella de Piso',   marca: 'Ohaus',     modelo: 'DEF-3000',  numSerie: 'OH-8807-B1',     codigoTw: 'EQ-TW-2026-0005' },
  { id: 6,  local: 'MUESTREO',     tipo: 'Equipo', subtipo: 'Balanza de Humedad', marca: 'Shimadzu',  modelo: 'MOC63u',    numSerie: 'SH-7721-M',      codigoTw: 'EQ-TW-2026-0006' },
  { id: 7,  local: 'DIR. FISCAL',  tipo: 'Equipo', subtipo: 'Uncella de Piso',    marca: 'Mettler',   modelo: 'IND570',    numSerie: 'MT-6600-Z',      codigoTw: 'EQ-TW-2026-0007' },
  { id: 8,  local: 'PLANTA CONC.', tipo: 'Equipo', subtipo: 'Balanza Envasadora', marca: 'Ohaus',     modelo: 'TRX-500',   numSerie: 'OH-1234-A',      codigoTw: 'EQ-TW-2026-0008' },
];

@Component({
  selector: 'app-seccion-listado-equipos',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent],
  templateUrl: './listado-equipos.component.html',
  styleUrl: './listado-equipos.component.scss',
})
export class ListadoEquiposComponent {
  readonly draftSvc = inject(PropuestaDraftService);

  readonly catalogo = signal<EquipoCatalogo[]>(EQUIPOS_SEDE);
  readonly busqueda = signal('');
  readonly subtipoFiltro = signal<string>('');
  readonly seleccionado = signal<number | null>(null);
  readonly seleccionadoProp = signal<number | null>(null);

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

  importarXls(): void {
    console.log('[listado-equipos] abrir modal HU-89 (pendiente)');
  }

  exportarLista(): void {
    console.log('[listado-equipos] exportar XLS');
  }
}
