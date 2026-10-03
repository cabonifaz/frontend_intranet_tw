import { Component, OnInit, inject, signal } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { TextosBaseService } from '../../../../../core/services/textos-base.service';

@Component({
  selector: 'app-seccion-detalle',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="list_alt"
      titulo="{{ draftSvc.numeroSecuencial('detalle') }}. Detalle (Textos Base)"
      subtitulo="Organiza los textos del catálogo en bloques jerárquicos: cada grupo tiene un título y una lista de viñetas"
    >
      <app-bloques-textos
        tituloCatalogo="Catálogo de Textos Base"
        tituloSeleccion="B) Condiciones del Servicio"
        filtroPlaceholder="Filtrar texto base o cláusula..."
        [textosCatalogo]="textos()"
        campoDraft="bloquesDetalle"
      />
    </app-seccion>
  `,
})
export class DetalleComponent implements OnInit {
  readonly draftSvc           = inject(PropuestaDraftService);
  private readonly textosSvc  = inject(TextosBaseService);

  readonly textos = signal<TextoCatalogo[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.textosSvc.obtenerTextosBase(undefined, 'propuesta', 'Activo', false, 1, 200);
      this.textos.set(r.items.map(t => ({
        id:        t.idTextoBase,
        texto:     t.textoClausula,
        categoria: t.tipoCategoriaLabel ?? 'Textos Base',
      })));
    } catch { /* silencioso */ }
  }
}
