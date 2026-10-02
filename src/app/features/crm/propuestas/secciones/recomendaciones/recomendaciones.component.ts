import { Component } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';

const RECOMENDACIONES: TextoCatalogo[] = [
  { id: 1, categoria: 'Textos Base', texto: 'Se recomienda calibración periódica trimestral para balanzas en línea crítica de producción.' },
  { id: 2, categoria: 'Textos Base', texto: 'Verificar estabilidad y nivelación de la base de concreto previa a la puesta en marcha.' },
  { id: 3, categoria: 'Textos Base', texto: 'Evitar el uso de agua a presión directa sobre las celdas de carga IP67/IP68 sin blindaje de protección.' },
  { id: 4, categoria: 'Textos Base', texto: 'Capacitar al personal operativo en buenas prácticas de pesaje y cuidado de cables de señal.' },
  { id: 5, categoria: 'Textos Base', texto: 'Instalar supresores de transitorios y estabilizador de voltaje dedicado en el gabinete del indicador.' },
  { id: 6, categoria: 'Textos Base', texto: 'Realizar limpieza diaria de residuos acumulados debajo de la plataforma de la balanza de camiones.' },
  { id: 7, categoria: 'Textos Base', texto: 'Mantener las pesas patrón certificadas en ambiente climatizado de 20°C a 25°C y humedad controlada.' },
];

@Component({
  selector: 'app-seccion-recomendaciones',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="lightbulb"
      titulo="5. Recomendaciones Técnicas y Operativas"
      subtitulo="Buenas prácticas y advertencias que acompañan la propuesta técnica para el cliente"
    >
      <app-bloques-textos
        tituloCatalogo="Catálogo de Textos Base (Recomendaciones)"
        tituloSeleccion="C) Recomendaciones Técnicas y Operativas"
        filtroPlaceholder="Filtrar recomendación..."
        [textosCatalogo]="textos"
        campoDraft="bloquesRecomendaciones"
      />
    </app-seccion>
  `,
})
export class RecomendacionesComponent {
  readonly textos = RECOMENDACIONES;
}
