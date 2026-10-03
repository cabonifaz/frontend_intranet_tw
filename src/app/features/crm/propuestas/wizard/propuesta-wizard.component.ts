import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { PropuestaDraftService } from '../../../../core/services/propuesta-draft.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { mapDetalleToDraft, mapDraftToGuardarDto, prellenarDraftDesdeRq } from '../../../../core/services/propuesta-mapper';
import { PASOS_WIZARD, PasoWizard } from '../../../../core/models/propuesta-detalle.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-propuesta-wizard',
  imports: [RouterOutlet, RouterLink, BreadcrumbComponent, PageHeaderComponent, ButtonComponent, ModalBorradorComponent],
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

  // Modal "Restaurar borrador" cuando existe uno previo en localStorage.
  readonly borradorDisponible = signal<{ fechaGuardado: string } | null>(null);
  // Datos pendientes de aplicar si el usuario decide descartar el borrador.
  private pendienteCargarRq: number = 0;

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

    // Setea pasoActual al segmento actual (importante al refrescar la página,
    // sin esto el stepper + sidebar quedan apuntando al paso por defecto).
    const segInicial = this.router.url.split('?')[0].split('/').pop() ?? '';
    const pasoInicial = this.pasos.find(p => p.ruta === segInicial);
    if (pasoInicial) this.pasoActual.set(pasoInicial.id);

    // Observa cambios del child outlet para pintar el stepper activo.
    // Importante: comparar contra el ÚLTIMO segmento del path, no un includes,
    // porque `/propuestas/` contiene `/propuesta` como substring y marcaba
    // mal el paso activo cuando estabas en cualquier otra sección.
    this.router.events.subscribe(() => {
      const segLast = this.router.url.split('?')[0].split('/').pop() ?? '';
      const paso = this.pasos.find(p => p.ruta === segLast);
      if (paso) this.pasoActual.set(paso.id);
    });

    // Si no hay segmento válido en el path, redirect a configuración
    if (!pasoInicial) {
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
        // Si el usuario ya decidió (Restaurar/Descartar) en esta sesión del wizard,
        // respetamos la decisión y no volvemos a mostrar el modal.
        const flagResumido = sessionStorage.getItem('tw-propuesta-wizard-resumido');
        const borrador = this.draftSvc.peekBorrador('nueva');
        const esDelMismoRq = borrador?.idRequerimiento === idRequerimiento &&
                             (borrador?.idPropuesta ?? null) === null;

        if (esDelMismoRq && !flagResumido) {
          // Hay borrador para este RQ y no se resolvió aún → mostramos modal.
          this.pendienteCargarRq = idRequerimiento;
          this.borradorDisponible.set({ fechaGuardado: borrador!.ultimaModificacion });
          this.draftSvc.cargarDesdeStorage('nueva');
          // La signal se carga ya para que mientras el modal esté abierto el sidebar
          // y los campos no quede en blanco. Si descarta, hard-reload resetea todo.
        } else if (esDelMismoRq && flagResumido) {
          // Usuario ya eligió "Restaurar" en esta sesión → cargar directo sin preguntar.
          sessionStorage.removeItem('tw-propuesta-wizard-resumido');
          this.draftSvc.cargarDesdeStorage('nueva');
        } else {
          // Sin borrador útil → cargar fresco desde el RQ.
          if (borrador) this.draftSvc.limpiarStorage('nueva');
          const datos = await this.propuestasSvc.obtenerDatosNueva(idRequerimiento);
          this.draftSvc.cargarDraft(prellenarDraftDesdeRq(datos));
          if (datos.propuestaExistente) {
            this.propuestaPrevia.set({
              codigo:           datos.propuestaExistente.numero,
              versionSiguiente: `v${datos.propuestaExistente.version + 1}`,
            });
          }
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

  // Posición (1-based) del paso activo dentro de las secciones visibles.
  pasoActivoNumero = computed(() => {
    const idx = this.pasosVisibles().findIndex(p => p.id === this.pasoActual());
    return idx >= 0 ? idx + 1 : 1;
  });

  pasosVisibles = computed(() => this.pasos.filter(p => this.esPasoIncluido(p)));

  // Las secciones con tablas multi-columna ocupan todo el ancho (sin sidebar).
  // Las de texto y formularios conservan el sidebar.
  readonly mostrarSidebar = computed(() => {
    const sinSidebar = new Set(['propuesta', 'opcionales', 'listado-equipos']);
    return !sinSidebar.has(this.pasoActual());
  });

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

  /**
   * Persiste el draft completo al back. Comportamiento según modo:
   *  - CREATE  (esNuevo=true)   → "Generar Propuesta": guarda + navega a la bandeja.
   *  - EDIT    (esNuevo=false)  → "Guardar cambios": guarda + se queda en la misma vista.
   */
  private async persistir(): Promise<boolean> {
    const draft = this.draftSvc.draft();
    if (!draft.idRequerimiento) {
      this.toast.error('No se puede guardar: falta vincular un requerimiento.');
      return false;
    }
    this.guardando.set(true);
    try {
      const dto       = mapDraftToGuardarDto(draft);
      const resultado = await this.propuestasSvc.guardarPropuesta(dto);

      // Refrescar draft con los IDs y totales recalculados que devolvió el back
      this.draftSvc.actualizar({
        idPropuesta: resultado.idPropuesta,
        codigo:      resultado.numero,
        version:     `v${resultado.version}`,
      });

      return true;
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al guardar.');
      return false;
    } finally {
      this.guardando.set(false);
    }
  }

  /** Último paso en modo CREATE: guarda la propuesta como borrador y vuelve a la bandeja. */
  async generarPropuesta(): Promise<void> {
    const ok = await this.persistir();
    if (!ok) return;
    const codigo = this.draftSvc.draft().codigo;
    // Ya quedó persistida en el back → limpio el borrador local.
    this.draftSvc.limpiarStorage('nueva');
    this.toast.exito(`Propuesta ${codigo} creada como borrador.`);
    this.router.navigate(['/crm/propuestas']);
  }

  /**
   * El usuario eligió restaurar el borrador. Como los <form> internos de las
   * secciones no se re-patchean automáticamente al cambiar la signal `draft`,
   * forzamos un reload de la página con un flag en sessionStorage para
   * que el wizard cargue el draft sin volver a mostrar el modal.
   */
  restaurarBorrador(): void {
    sessionStorage.setItem('tw-propuesta-wizard-resumido', '1');
    this.borradorDisponible.set(null);
    window.location.reload();
  }

  /**
   * El usuario eligió descartar el borrador: lo borro de localStorage y hago
   * hard reload para que las secciones re-inicialicen con la data fresca del RQ.
   */
  descartarBorrador(): void {
    this.draftSvc.limpiarStorage('nueva');
    this.borradorDisponible.set(null);
    window.location.reload();
  }

  /** Modo EDIT: guarda los cambios y se queda en el mismo paso. */
  async guardarCambios(): Promise<void> {
    const ok = await this.persistir();
    if (ok) this.toast.exito('Cambios guardados.');
  }

  /** Último paso en modo EDIT: abre modal "Enviar a Visto Bueno" (HU futura). */
  enviarAVistoBueno(): void {
    this.toast.exito('Modal "Enviar a Visto Bueno" — pendiente, otra HU.');
    console.log('[propuesta] enviar a visto bueno (modal pendiente)');
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
