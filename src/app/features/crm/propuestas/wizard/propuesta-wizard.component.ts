import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { PropuestaDraftService } from '../../../../core/services/propuesta-draft.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { mapDetalleToDraft, mapDraftToGuardarDto, prellenarDraftDesdeRq } from '../../../../core/services/propuesta-mapper';
import { PASOS_WIZARD, PasoWizard } from '../../../../core/models/propuesta-detalle.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-propuesta-wizard',
  imports: [RouterOutlet, RouterLink, BreadcrumbComponent, PageHeaderComponent],
  templateUrl: './propuesta-wizard.component.html',
  styleUrl: './propuesta-wizard.component.scss',
})
export class PropuestaWizardComponent implements OnInit {
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly propuestasSvc = inject(PropuestasService);
  private readonly toast         = inject(ToastService);
  readonly draftSvc              = inject(PropuestaDraftService);

  readonly pasos: PasoWizard[] = PASOS_WIZARD;

  readonly idParam = signal<string>('nueva');
  readonly esNuevo = computed(() => this.idParam() === 'nueva');

  readonly pasoActual    = signal<string>('configuracion');
  readonly guardando     = signal(false);
  readonly cargandoDatos = signal(false);

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

    // Fuente de datos del draft según modo:
    //   - Edición: GET /api/crm/propuestas/{id} → mapDetalleToDraft
    //   - Nueva con ?idRequerimiento: GET /api/crm/propuestas/nueva → prellenar
    //   - Nueva sin query: localStorage (continuar borrador en progreso)
    const qp = this.route.snapshot.queryParamMap;
    const idRequerimiento = Number(qp.get('idRequerimiento') ?? 0);

    this.cargandoDatos.set(true);
    try {
      if (!this.esNuevo()) {
        const detalle = await this.propuestasSvc.obtenerPropuestaPorId(Number(this.idParam()));
        this.draftSvc.cargarDraft(mapDetalleToDraft(detalle));
        if (detalle.idPropuestaPadre) {
          this.propuestaPrevia.set({
            codigo:           detalle.numero,
            versionSiguiente: `v${detalle.version}`,
          });
        }
      } else if (idRequerimiento > 0) {
        const datos = await this.propuestasSvc.obtenerDatosNueva(idRequerimiento);
        this.draftSvc.cargarDraft(prellenarDraftDesdeRq(datos));
        if (datos.propuestaExistente) {
          this.propuestaPrevia.set({
            codigo:           datos.propuestaExistente.numero,
            versionSiguiente: `v${datos.propuestaExistente.version + 1}`,
          });
        }
      } else {
        this.draftSvc.cargarDesdeStorage(this.idParam());
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar la propuesta.');
      this.draftSvc.cargarDesdeStorage(this.idParam());
    } finally {
      this.cargandoDatos.set(false);
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

  async guardarBorrador(): Promise<void> {
    const draft = this.draftSvc.draft();
    if (!draft.idRequerimiento) {
      this.toast.error('No se puede guardar: falta vincular un requerimiento.');
      return;
    }
    this.guardando.set(true);
    try {
      const dto      = mapDraftToGuardarDto(draft);
      const resultado = await this.propuestasSvc.guardarPropuesta(dto);

      // Refrescar draft con los IDs y totales recalculados que devolvió el back
      this.draftSvc.actualizar({
        idPropuesta: resultado.idPropuesta,
        codigo:      resultado.numero,
        version:     `v${resultado.version}`,
      });

      this.toast.exito(
        this.esNuevo() ? `Propuesta ${resultado.numero} creada como borrador.` : 'Cambios guardados.',
      );

      // Si era "nueva", pasamos a la ruta de edición ya con el id real
      if (this.esNuevo() && resultado.idPropuesta > 0) {
        this.idParam.set(String(resultado.idPropuesta));
        this.router.navigate(['/crm/propuestas', resultado.idPropuesta, 'editar', this.pasoActual()], {
          replaceUrl: true,
        });
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      this.guardando.set(false);
    }
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
