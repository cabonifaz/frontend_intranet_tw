import { Component } from '@angular/core';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { BloquesTextosComponent, TextoCatalogo } from '../bloques-textos/bloques-textos.component';

const SUMINISTROS_CLIENTE: TextoCatalogo[] = [
  { id: 1, categoria: 'Textos Base', texto: 'Suministro de energía eléctrica estabilizada 220V / 440V trifásica a pie de balanza con pozo a tierra menor a 5 Ohmios.' },
  { id: 2, categoria: 'Textos Base', texto: 'Disponibilidad de grúa o montacargas certificado con operador para maniobras de descarga y posicionamiento de pesas patrón.' },
  { id: 3, categoria: 'Textos Base', texto: 'Suministro de agua a presión y punto de desagüe para lavado y limpieza integral de la losa de pesaje.' },
  { id: 4, categoria: 'Textos Base', texto: 'Provisión de personal de apoyo operativo / vigía de seguridad acreditado para la jornada de trabajo.' },
  { id: 5, categoria: 'Textos Base', texto: 'Facilidades de pase médico, inducción SSOMA y permiso de alto riesgo (PETAR) autorizados previo al ingreso.' },
  { id: 6, categoria: 'Textos Base', texto: 'Vehículo escolta y camioneta 4×4 para traslado interno de técnicos y equipos dentro de la unidad minera.' },
  { id: 7, categoria: 'Textos Base', texto: 'Camión cargado o volquete con carga homogénea para pruebas de calibración en peso muerto y repetibilidad de balanza de camiones.' },
  { id: 8, categoria: 'Textos Base', texto: 'Espacio techado, seco y seguro para custodia temporal de patrones de calibración e instrumentación técnica.' },
  { id: 9, categoria: 'Textos Base', texto: 'Puntos de red Ethernet o cobertura Wi-Fi industrial para transmisión del indicador digital.' },
];

@Component({
  selector: 'app-seccion-suministros-cliente',
  imports: [SeccionComponent, BloquesTextosComponent],
  styles: `:host { display: block; }`,
  template: `
    <app-seccion
      icono="handshake"
      titulo="7. Suministros y Facilidades a Cargo del Cliente"
      subtitulo="Recursos logísticos, servicios eléctricos y permisos que el cliente debe disponer para la ejecución del servicio"
    >
      <app-bloques-textos
        tituloCatalogo="Catálogo de Textos Base (Suministros)"
        tituloSeleccion="D) Suministros y Facilidades a Cargo del Cliente"
        filtroPlaceholder="Filtrar suministro / facilidad..."
        [textosCatalogo]="textos"
        campoDraft="bloquesSuministrosCliente"
      />
    </app-seccion>
  `,
})
export class SuministrosClienteComponent {
  readonly textos = SUMINISTROS_CLIENTE;
}
