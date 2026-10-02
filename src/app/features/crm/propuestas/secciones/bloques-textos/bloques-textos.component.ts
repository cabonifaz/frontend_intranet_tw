import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { GrupoBloque } from '../../../../../core/models/propuesta-detalle.model';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';

export interface TextoCatalogo {
  id:       number;
  texto:    string;
  categoria: string;
}

/**
 * Componente interno compartido por las secciones 4 (Detalle), 5 (Recomendaciones),
 * 7 (Suministros Cliente) y 8 (Condiciones). Todas usan el mismo patrón:
 *   catálogo de textos a la izq ↔ bloques jerárquicos editables a la der.
 */
@Component({
  selector: 'app-bloques-textos',
  imports: [FormsModule, DoblePanelComponent],
  templateUrl: './bloques-textos.component.html',
  styleUrl: './bloques-textos.component.scss',
})
export class BloquesTextosComponent {
  readonly draftSvc = inject(PropuestaDraftService);

  readonly tituloCatalogo    = input<string>('Catálogo de Textos Base');
  readonly tituloSeleccion   = input<string>('Bloques en la Propuesta');
  readonly filtroPlaceholder = input<string>('Filtrar...');
  readonly categoriaFiltro   = input<string>('Textos Base');
  readonly textosCatalogo    = input<TextoCatalogo[]>([]);
  readonly campoDraft        = input.required<'bloquesDetalle' | 'bloquesRecomendaciones' | 'bloquesSuministrosCliente'>();

  readonly cambios = output<GrupoBloque[]>();

  readonly busqueda = signal('');
  readonly textoSeleccionado = signal<number | null>(null);
  readonly grupoActivo = signal<string | null>(null);

  readonly textosFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    return q ? this.textosCatalogo().filter(t => t.texto.toLowerCase().includes(q)) : this.textosCatalogo();
  });

  readonly grupos = computed(() =>
    (this.draftSvc.draft()[this.campoDraft()] as GrupoBloque[]) ?? []
  );

  private updateDraft(grupos: GrupoBloque[]): void {
    this.draftSvc.actualizar({ [this.campoDraft()]: grupos } as Partial<ReturnType<typeof this.draftSvc.draft>>);
  }

  onBuscar(q: string): void { this.busqueda.set(q); }

  agregarGrupo(): void {
    const nuevos = [...this.grupos(), {
      id: 'g_' + Date.now(),
      titulo: 'Nuevo título / grupo',
      vinetas: [],
    }];
    this.updateDraft(nuevos);
  }

  agregarVinetaAlActivo(): void {
    const id = this.grupoActivo();
    const textoId = this.textoSeleccionado();
    if (!id || textoId == null) return;
    const texto = this.textosCatalogo().find(t => t.id === textoId);
    if (!texto) return;
    const nuevos = this.grupos().map(g =>
      g.id === id
        ? { ...g, vinetas: [...g.vinetas, { id: 'v_' + Date.now(), texto: texto.texto }] }
        : g
    );
    this.updateDraft(nuevos);
  }

  agregar(): void {
    // Si no hay grupo activo, crea uno vacío y agrega la viñeta ahí
    if (!this.grupoActivo()) {
      const nuevoGrupoId = 'g_' + Date.now();
      const textoId = this.textoSeleccionado();
      if (textoId == null) {
        this.agregarGrupo();
        return;
      }
      const texto = this.textosCatalogo().find(t => t.id === textoId);
      if (!texto) return;
      this.updateDraft([...this.grupos(), {
        id: nuevoGrupoId,
        titulo: 'Nuevo grupo',
        vinetas: [{ id: 'v_' + Date.now(), texto: texto.texto }],
      }]);
      this.grupoActivo.set(nuevoGrupoId);
    } else {
      this.agregarVinetaAlActivo();
    }
  }

  quitar(): void {
    const id = this.grupoActivo();
    if (!id) return;
    this.updateDraft(this.grupos().filter(g => g.id !== id));
    this.grupoActivo.set(null);
  }

  eliminarVineta(grupoId: string, vinetaId: string): void {
    this.updateDraft(this.grupos().map(g =>
      g.id === grupoId ? { ...g, vinetas: g.vinetas.filter(v => v.id !== vinetaId) } : g
    ));
  }

  actualizarTituloGrupo(grupoId: string, titulo: string): void {
    this.updateDraft(this.grupos().map(g => g.id === grupoId ? { ...g, titulo } : g));
  }

  actualizarTextoVineta(grupoId: string, vinetaId: string, texto: string): void {
    this.updateDraft(this.grupos().map(g =>
      g.id === grupoId
        ? { ...g, vinetas: g.vinetas.map(v => v.id === vinetaId ? { ...v, texto } : v) }
        : g
    ));
  }

  totalVinetas = computed(() => this.grupos().reduce((acc, g) => acc + g.vinetas.length, 0));
}
