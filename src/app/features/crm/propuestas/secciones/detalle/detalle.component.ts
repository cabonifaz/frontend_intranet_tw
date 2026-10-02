import { Component } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';

const TEXTOS_DETALLE: TextoCatalogo[] = [
  { id: 1, categoria: 'Textos Base', texto: 'Servicio de calibración por nuestro laboratorio acreditado TW SAC.' },
  { id: 2, categoria: 'Textos Base', texto: 'Transporte de módulos desde taller de fabricación a su lugar de instalación en planta (Lima).' },
  { id: 3, categoria: 'Textos Base', texto: '42 metros de jebes de protección tipo T para todo el perímetro de la balanza.' },
  { id: 4, categoria: 'Textos Base', texto: 'Rotura de piso de concreto o asfalto, de existir el mismo en futura ubicación del sistema.' },
  { id: 5, categoria: 'Textos Base', texto: 'Caseta de pesaje.' },
  { id: 6, categoria: 'Textos Base', texto: 'Mejoramiento del terreno.' },
  { id: 7, categoria: 'Textos Base', texto: 'Suministro de PC e impresora.' },
  { id: 8, categoria: 'Textos Base', texto: 'Entrega e instalación en planta cliente (Lima / Callao).' },
  { id: 9, categoria: 'Textos Base', texto: 'Se considera realizar instalación de balanza sobre piso.' },
  { id: 10, categoria: 'Textos Base', texto: 'Trabajos de obra civil e instalación de balanza a ras del piso.' },
];

@Component({
  selector: 'app-seccion-detalle',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="list_alt"
      titulo="4. Detalle (Textos Base)"
      subtitulo="Organiza los textos del catálogo en bloques jerárquicos: cada grupo tiene un título y una lista de viñetas"
    >
      <app-bloques-textos
        tituloCatalogo="Catálogo de Textos Base"
        tituloSeleccion="B) Condiciones del Servicio"
        filtroPlaceholder="Filtrar texto base o cláusula..."
        [textosCatalogo]="textos"
        campoDraft="bloquesDetalle"
      />
    </app-seccion>
  `,
})
export class DetalleComponent {
  readonly textos = TEXTOS_DETALLE;
}
