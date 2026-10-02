import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { PropuestaDraftService } from '../../../../core/services/propuesta-draft.service';
import { PASOS_WIZARD, PasoWizard } from '../../../../core/models/propuesta-detalle.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-propuesta-wizard',
  imports: [RouterOutlet, RouterLink, BreadcrumbComponent, PageHeaderComponent],
  templateUrl: './propuesta-wizard.component.html',
  styleUrl: './propuesta-wizard.component.scss',
})
export class PropuestaWizardComponent implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  readonly draftSvc          = inject(PropuestaDraftService);

  readonly pasos: PasoWizard[] = PASOS_WIZARD;

  readonly idParam = signal<string>('nueva');
  readonly esNuevo = computed(() => this.idParam() === 'nueva');

  readonly pasoActual = signal<string>('configuracion');

  readonly bannerCerrado = signal(false);

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'CRM' },
    { label: 'Propuestas', ruta: '/crm/propuestas' },
    { label: this.esNuevo() ? 'Nueva Propuesta' : `Editar ${this.draftSvc.draft().codigo || this.idParam()}` },
  ]);

  // Banner "Propuesta existente detectada" — se muestra si venimos del flujo
  // de creación desde un RQ que ya tenía una propuesta previa (query param
  // ?versionDe=PROP-002581). En el prototipo aparece siempre arriba.
  readonly propuestaPrevia = signal<{ codigo: string; versionSiguiente: string } | null>(null);

  async ngOnInit(): Promise<void> {
    this.idParam.set(this.route.snapshot.paramMap.get('id') ?? 'nueva');
    this.draftSvc.cargarDesdeStorage(this.idParam());

    // Query params para detectar vinculación a RQ y propuesta previa
    const qp = this.route.snapshot.queryParamMap;
    const versionDe = qp.get('versionDe');
    if (versionDe) {
      // En producción esto viene del back; aquí lo faketeamos.
      const version = /v(\d+)/.exec(versionDe)?.[1];
      const siguiente = version ? `v${Number(version) + 1}` : 'v2';
      this.propuestaPrevia.set({ codigo: versionDe, versionSiguiente: siguiente });
    }

    // Observa cambios del child outlet para pintar el stepper activo
    this.router.events.subscribe(() => {
      const url = this.router.url;
      const seg = this.pasos.find(p => url.includes(`/${p.ruta}`));
      if (seg) this.pasoActual.set(seg.id);
    });

    // Si no hay segmento, redirect a configuración
    const url = this.router.url;
    if (!this.pasos.some(p => url.includes(`/${p.ruta}`))) {
      this.router.navigate([this.rutaBase(), 'configuracion'], { replaceUrl: true });
    }
  }

  rutaBase(): string {
    return `/crm/propuestas/${this.idParam()}/${this.esNuevo() ? '' : 'editar'}`.replace(/\/$/, '');
  }

  rutaPaso(paso: PasoWizard): string[] {
    return [this.rutaBase(), paso.ruta];
  }

  esPasoIncluido(paso: PasoWizard): boolean {
    const s = this.draftSvc.draft().seccionesIncluidas;
    const mapa: Record<string, boolean> = {
      configuracion:        s.configuracion,
      propuesta:            s.propuesta,
      opcionales:           s.opcionales,
      detalle:              s.detalle,
      recomendaciones:      s.recomendaciones,
      'forma-pago':         s.formaPago,
      'suministros-cliente': s.suministrosCliente,
      condiciones:          s.condicionesServicio,
      'listado-equipos':    s.listadoEquipos,
    };
    return mapa[paso.id] ?? true;
  }

  pasoActivoNumero = computed(() => {
    const activo = this.pasos.find(p => p.id === this.pasoActual());
    return activo?.numero ?? 1;
  });

  pasosVisibles = computed(() => this.pasos.filter(p => this.esPasoIncluido(p)));

  irAnterior(): void {
    const idx = this.pasos.findIndex(p => p.id === this.pasoActual());
    if (idx > 0) {
      this.router.navigate([this.rutaBase(), this.pasos[idx - 1].ruta]);
    } else {
      this.router.navigate(['/crm/propuestas']);
    }
  }

  irSiguiente(): void {
    const idx = this.pasos.findIndex(p => p.id === this.pasoActual());
    if (idx < this.pasos.length - 1) {
      this.router.navigate([this.rutaBase(), this.pasos[idx + 1].ruta]);
    }
  }

  guardarBorrador(): void {
    // Draft ya está persistido en localStorage en cada mutación.
    // Aquí solo mostramos feedback.
    console.log('[propuesta] borrador guardado', this.draftSvc.draft());
  }

  verPreviaPdf(): void {
    console.log('[propuesta] vista previa PDF (pendiente)');
  }

  formatearMonto(valor: number): string {
    const moneda = this.draftSvc.draft().tipoMoneda || 'USD';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
    }).format(valor);
  }

  esUltimoPaso(): boolean {
    return this.pasoActual() === this.pasos[this.pasos.length - 1].id;
  }
}
