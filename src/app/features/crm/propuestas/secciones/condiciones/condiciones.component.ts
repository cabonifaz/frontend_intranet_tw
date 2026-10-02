import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';

interface Clausula {
  id:      number;
  codigo:  string;
  subtipo: string;
  texto:   string;
}

const CLAUSULAS: Clausula[] = [
  { id: 1,  codigo: 'TB-05', subtipo: 'Alcance',    texto: 'Se incluye el certificado de calibración.' },
  { id: 2,  codigo: 'TB-06', subtipo: 'Alcance',    texto: 'Total Weight podrá almacenar los equipos del cargo cliente por un plazo máximo de 30 días luego de enviado al cliente la propuesta comercial. Vencido el plazo, se cargará S/.10.00 diarios. A los 90 días TW obtendría el derecho de adjudicación.' },
  { id: 3,  codigo: 'TB-07', subtipo: 'Ejecución',  texto: 'Se procederá a la ejecución si el cliente acepta la cotización, en caso contrario, se cobrará revisión y diagnóstico de S/.200.00 + IGV.' },
  { id: 4,  codigo: 'TB-08', subtipo: 'Horario',    texto: 'Si se solicita la atención fuera de los horarios normales, se tendrá que coordinar con el área comercial.' },
  { id: 5,  codigo: 'TB-09', subtipo: 'Pago',       texto: 'La factura se emite al término del servicio, con copia del acta de conformidad firmada por el cliente.' },
  { id: 6,  codigo: 'TB-10', subtipo: 'Garantía',   texto: 'La garantía aplica únicamente sobre el servicio prestado, no sobre deterioro posterior por mal uso del equipo.' },
  { id: 7,  codigo: 'TB-11', subtipo: 'SSOMA',      texto: 'Nuestro personal porta EPP certificado y SCTR vigente para labores en campo e instalaciones del cliente.' },
  { id: 8,  codigo: 'TB-12', subtipo: 'Fuerza mayor', texto: 'En caso de huelga, bloqueo de accesos u otro evento de fuerza mayor, el cronograma se reprograma sin penalidad.' },
];

const PRECARGADAS: Clausula[] = [
  { id: 101, codigo: 'MARCO-01', subtipo: 'Alcance',   texto: 'Se procederá a realizar el servicio con la recepción de la OC y de este presupuesto firmado y sellado por la empresa.' },
  { id: 102, codigo: 'MARCO-02', subtipo: 'Garantía',  texto: 'La garantía del servicio es aplicable sobre el alcance de la reparación y repuestos utilizados. Duración de 3 meses.' },
  { id: 103, codigo: 'MARCO-03', subtipo: 'Validez',   texto: 'La garantía parte válida se determina intervención de personal ajeno a Total Weight & Systems S.A.C.' },
  { id: 104, codigo: 'MARCO-04', subtipo: 'Garantía',  texto: 'Garantía para condiciones normales de uso. No cubre daños por instalaciones defectuosas, rayos, picos o inundaciones.' },
  { id: 105, codigo: 'MARCO-05', subtipo: 'Repuestos', texto: 'Equipos operativos sin mantenimiento ni calibración. Si requieren repuestos, se cotizarán por separado.' },
];

@Component({
  selector: 'app-seccion-condiciones',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent],
  templateUrl: './condiciones.component.html',
  styleUrl: './condiciones.component.scss',
})
export class CondicionesComponent {
  readonly draftSvc = inject(PropuestaDraftService);

  readonly catalogo = signal<Clausula[]>(CLAUSULAS);
  readonly busqueda = signal('');
  readonly subtipoFiltro = signal<string>('');
  readonly seleccionada = signal<number | null>(null);
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

  constructor() {
    // Si el draft está vacío, carga las cláusulas marco
    if ((this.draftSvc.draft().clausulasContrato ?? []).length === 0) {
      this.draftSvc.actualizar({
        clausulasContrato: PRECARGADAS.map(c => ({ id: c.codigo, titulo: c.subtipo, texto: c.texto })),
      });
    }
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
    this.draftSvc.actualizar({
      clausulasContrato: PRECARGADAS.map(c => ({ id: c.codigo + '_' + Date.now(), titulo: c.subtipo, texto: c.texto })),
    });
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
