import { Component, OnInit, inject, signal } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { TextosBaseService } from '../../../../../core/services/textos-base.service';

@Component({
  selector: 'app-seccion-suministros-cliente',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="handshake"
      titulo="{{ draftSvc.numeroSecuencial('suministros-cliente') }}. Suministros y Facilidades a Cargo del Cliente"
      subtitulo="Recursos logísticos, servicios eléctricos y permisos que el cliente debe disponer para la ejecución del servicio"
    >
      <app-bloques-textos
        tituloCatalogo="Catálogo de Textos Base (Suministros)"
        tituloSeleccion="D) Suministros y Facilidades a Cargo del Cliente"
        filtroPlaceholder="Filtrar suministro / facilidad..."
        [textosCatalogo]="textos()"
        campoDraft="bloquesSuministrosCliente"
      />
    </app-seccion>
  `,
})
export class SuministrosClienteComponent implements OnInit {
  readonly draftSvc          = inject(PropuestaDraftService);
  private readonly textosSvc = inject(TextosBaseService);

  readonly textos = signal<TextoCatalogo[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      // Sin filtro de categoría: en el maestro de textos base todavía no existe
      // una categoría propia para 'Suministros a cargo del Cliente'. Mientras
      // tanto mostramos todos los textos activos y el usuario elige los que
      // apliquen. Pendiente: definir categoría 'suministros_cliente' en el back.
      const r = await this.textosSvc.obtenerTextosBase(undefined, undefined, 'Activo', false, 1, 200);
      this.textos.set(r.items.map(t => ({
        id:        t.idTextoBase,
        texto:     t.textoClausula,
        categoria: t.tipoCategoriaLabel ?? 'Textos Base',
      })));
    } catch { /* silencioso */ }
  }
}
