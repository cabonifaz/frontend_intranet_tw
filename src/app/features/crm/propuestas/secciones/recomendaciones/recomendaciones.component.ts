import { Component, OnInit, inject, signal } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { TextosBaseService } from '../../../../../core/services/textos-base.service';

@Component({
  selector: 'app-seccion-recomendaciones',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="lightbulb"
      titulo="{{ draftSvc.numeroSecuencial('recomendaciones') }}. Recomendaciones Técnicas y Operativas"
      subtitulo="Buenas prácticas y advertencias que acompañan la propuesta técnica para el cliente"
    >
      <app-bloques-textos
        tituloCatalogo="Catálogo de Textos Base (Recomendaciones)"
        tituloSeleccion="C) Recomendaciones Técnicas y Operativas"
        filtroPlaceholder="Filtrar recomendación..."
        [textosCatalogo]="textos()"
        campoDraft="bloquesRecomendaciones"
      />
    </app-seccion>
  `,
})
export class RecomendacionesComponent implements OnInit {
  readonly draftSvc          = inject(PropuestaDraftService);
  private readonly textosSvc = inject(TextosBaseService);

  readonly textos = signal<TextoCatalogo[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.textosSvc.obtenerTextosBase(undefined, 'recomendaciones', 'Activo', false, 1, 200);
      this.textos.set(r.items.map(t => ({
        id:        t.idTextoBase,
        texto:     t.textoClausula,
        categoria: t.tipoCategoriaLabel ?? 'Textos Base',
      })));
    } catch { /* silencioso */ }
  }
}
