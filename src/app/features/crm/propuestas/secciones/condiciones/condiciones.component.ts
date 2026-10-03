import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { TextosBaseService } from '../../../../../core/services/textos-base.service';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';

interface Clausula {
  id:      number;
  codigo:  string;
  subtipo: string;
  texto:   string;
}

@Component({
  selector: 'app-seccion-condiciones',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent, ButtonComponent],
  templateUrl: './condiciones.component.html',
  styleUrl: './condiciones.component.scss',
})
export class CondicionesComponent implements OnInit {
  readonly draftSvc           = inject(PropuestaDraftService);
  private readonly textosSvc  = inject(TextosBaseService);

  readonly catalogo       = signal<Clausula[]>([]);
  readonly busqueda       = signal('');
  readonly subtipoFiltro  = signal<string>('');
  readonly seleccionada   = signal<number | null>(null);
  readonly seleccionadaProp = signal<number | null>(null);

  readonly subtipos = computed(() => Array.from(new Set(this.catalogo().map(c => c.subtipo))));

  readonly catalogoFiltrado = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const s = this.subtipoFiltro();
    return this.catalogo().filter(c =>
      (!q || c.texto.toLowerCase().includes(q)) &&
      (!s || c.subtipo === s)
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      // Trae todos los textos base activos. El usuario filtra en el dropdown
      // "Buscar por: Subtipo" por tipoCategoriaLabel.
      // Pendiente: cuando el maestro tenga categorías específicas para condiciones
      //           contractuales, restringir aquí (condiciones, garantía, legal).
      const r = await this.textosSvc.obtenerTextosBase(undefined, undefined, 'Activo', false, 1, 500);
      const items: Clausula[] = r.items.map(t => ({
        id:      t.idTextoBase,
        codigo:  t.codigoCorto,
        subtipo: t.tipoCategoriaLabel ?? t.tipoCategoria,
        texto:   t.textoClausula,
      }));
      this.catalogo.set(items);
      // Nota: la precarga de cláusulas marco se quitó porque el flag
      // `esPredeterminado` en el maestro de textos base todavía marca saludos
      // y textos genéricos, no específicamente cláusulas contractuales.
      // Pendiente: cuando el maestro tenga categoría propia + flag específico
      //           para "marco contractual", reactivar la precarga aquí.
    } catch { /* silencioso */ }
  }

  readonly clausulas = computed(() => this.draftSvc.draft().clausulasContrato ?? []);

  agregar(): void {
    const id = this.seleccionada();
    if (id == null) return;
    const c = this.catalogo().find(x => x.id === id);
    if (!c) return;
    this.draftSvc.actualizar({
      clausulasContrato: [...this.clausulas(), { id: c.codigo + '_' + Date.now(), titulo: c.subtipo, texto: c.texto }],
    });
  }

  quitar(): void {
    const i = this.seleccionadaProp();
    if (i == null) return;
    this.draftSvc.actualizar({
      clausulasContrato: this.clausulas().filter((_, idx) => idx !== i),
    });
    this.seleccionadaProp.set(null);
  }

  restablecerMarco(): void {
    const marco = this.catalogo()
      // El flag esPredeterminado no viaja hasta Clausula; usamos el catálogo original
      // y lo volvemos a cargar como estaban al mount.
      .map(c => ({ id: c.codigo + '_' + Date.now(), titulo: c.subtipo, texto: c.texto }));
    this.draftSvc.actualizar({ clausulasContrato: marco });
  }

  moverArriba(i: number): void {
    if (i === 0) return;
    const arr = [...this.clausulas()];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    this.draftSvc.actualizar({ clausulasContrato: arr });
  }

  moverAbajo(i: number): void {
    const arr = [...this.clausulas()];
    if (i === arr.length - 1) return;
    [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    this.draftSvc.actualizar({ clausulasContrato: arr });
  }

  actualizarTexto(i: number, texto: string): void {
    const arr = [...this.clausulas()];
    arr[i] = { ...arr[i], texto };
    this.draftSvc.actualizar({ clausulasContrato: arr });
  }
}
