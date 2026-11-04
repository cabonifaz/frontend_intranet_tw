import { Component, OnInit, inject, signal } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { TextosBaseService } from '../../../../../core/services/textos-base.service';

/**
 * Feedback 2026-11-04: la sección de Condiciones ahora usa el mismo componente
 * `app-bloques-textos` que Detalle, Recomendaciones y Suministros Cliente, con
 * grupos jerárquicos, drag-and-drop y botón X.
 */
@Component({
  selector: 'app-seccion-condiciones',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="gavel"
      titulo="{{ draftSvc.numeroSecuencial('condiciones') }}. Condiciones del Servicio y Cláusulas Contractuales"
      subtitulo="Selecciona, ordena y personaliza los términos contractuales aplicables a esta cotización"
    >
      <app-bloques-textos
        tituloCatalogo="Textos Base / Cláusulas Disponibles"
        tituloSeleccion="Condiciones del Servicio (en la Propuesta)"
        filtroPlaceholder="Filtrar texto o cláusula contractual..."
        [textosCatalogo]="textos()"
        campoDraft="bloquesCondiciones"
      />
    </app-seccion>
  `,
})
export class CondicionesComponent implements OnInit {
  readonly draftSvc          = inject(PropuestaDraftService);
  private readonly textosSvc = inject(TextosBaseService);

  readonly textos = signal<TextoCatalogo[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.textosSvc.obtenerTextosBase(undefined, undefined, 'Activo', false, 1, 500);
      this.textos.set(r.items.map(t => ({
        id:        t.idTextoBase,
        texto:     t.textoClausula,
        categoria: t.tipoCategoriaLabel ?? 'Textos Base',
      })));
    } catch { /* silencioso */ }
  }
}
