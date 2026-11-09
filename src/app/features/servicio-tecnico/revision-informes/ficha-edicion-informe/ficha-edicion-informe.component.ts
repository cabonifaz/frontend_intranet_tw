import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RevisionInformesService } from '../../../../core/services/revision-informes.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  DetalleInformeApi, EnsayoGuardarPayload, GuardarInformePayload, GuardarPrecotizacionPayload,
  ItemPrecotizacionGuardarPayload, NivelObservacion, ObservacionGuardarPayload, PasoGuardarPayload,
  PrioridadItemPrecot, PrioridadRecomendacion, RecomendacionGuardarPayload, ResultadoEnsayosGuardarPayload,
} from '../../../../core/models/revision-informes-api.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InicialesPipe } from '../../../../shared/pipes/iniciales.pipe';

type Paso = 1 | 2 | 3 | 4;

/**
 * HU-58 — Edición del Informe de Servicio Técnico (Módulo 12).
 * Stepper horizontal 4 pasos:
 *   1. Datos y Procedimiento  (datos locked + checklist editable)
 *   2. Ensayos                 (pesaje + excentricidad, tabla editable)
 *   3. Fotos y Descripción     (galería solo lectura + textarea complementaria)
 *   4. Hallazgos y Precotización (observaciones + recomendaciones + precotización condicional)
 *
 * Los pasos 1-3 persisten vía PUT /informes/{id} (GuardarInformeTecnicoDto).
 * El paso 4 persiste en dos llamadas: PUT /informes/{id} (observaciones/recomendaciones) + PUT /informes/{id}/precotizacion.
 */
@Component({
  selector: 'app-ficha-edicion-informe',
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, InicialesPipe],
  templateUrl: './ficha-edicion-informe.component.html',
  styleUrl: './ficha-edicion-informe.component.scss',
})
export class FichaEdicionInformeComponent implements OnInit {
  private readonly svc    = inject(RevisionInformesService);
  private readonly toast  = inject(ToastService);
  private readonly route  = inject(ActivatedRoute);
  readonly router         = inject(Router);

  readonly idInforme = signal(0);
  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly error     = signal<string | null>(null);
  readonly detalle   = signal<DetalleInformeApi | null>(null);
  readonly paso      = signal<Paso>(1);
  readonly ultimoGuardado = signal<Date | null>(null);

  // ─── Drafts editables ───────────────────────────────────────────────────
  procedimientoDraft:   PasoGuardarPayload[]          = [];
  ensayosDraft:         EnsayoGuardarPayload[]        = [];
  observacionesDraft:   ObservacionGuardarPayload[]   = [];
  recomendacionesDraft: RecomendacionGuardarPayload[] = [];
  precotizacionDraft:   ItemPrecotizacionGuardarPayload[] = [];
  descripcionDraft      = '';
  notaPrecotDraft       = '';
  resultadoDraft:       ResultadoEnsayosGuardarPayload = {};

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const os = this.detalle()?.cabecera.numeroOs ?? '—';
    return [
      { label: 'Inicio', ruta: '/dashboard' },
      { label: 'Servicio Técnico' },
      { label: 'Revisión de Informes', ruta: '/servicio-tecnico/revision-informes' },
      { label: os },
      { label: 'Edición' },
    ];
  });

  readonly cabecera        = computed(() => this.detalle()?.cabecera ?? null);
  readonly fotos           = computed(() => this.detalle()?.fotos ?? []);
  readonly historialReciente = computed(() => this.detalle()?.historialReciente ?? []);

  /** Observaciones son el eje de la precotización: si hay observaciones, el paso 4 es obligatorio. */
  readonly requierePrecotizacion = computed(() => this.observacionesDraft.length > 0);

  readonly pasosEjecutados = computed(() =>
    this.procedimientoDraft.filter(p => p.realizado).length);

  readonly ensayosNoConformes = computed(() =>
    this.ensayosDraft.filter(e => e.resultado === 'no_conforme').length);

  readonly chipEstado = computed(() => {
    const c = this.cabecera();
    if (!c) return 'chip chip--gris';
    switch (c.grupoEstado) {
      case 'pendiente_revision':      return 'chip chip--ambar';
      case 'pendiente_precotizacion': return 'chip chip--rojo';
      case 'revisado_con_precot':     return 'chip chip--verde';
      case 'revisado_sin_precot':     return 'chip chip--gris-oscuro';
      default:                        return 'chip chip--gris';
    }
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('El informe indicado no es válido.');
      this.cargando.set(false);
      return;
    }
    this.idInforme.set(id);
    const pasoInicial = Number(this.route.snapshot.queryParamMap.get('paso'));
    if ([1, 2, 3, 4].includes(pasoInicial)) this.paso.set(pasoInicial as Paso);
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const d = await this.svc.obtenerDetalle(this.idInforme());
      this.detalle.set(d);
      this.cargarDrafts(d);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el informe.');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Precarga los drafts a partir del detalle traído del back. */
  private cargarDrafts(d: DetalleInformeApi): void {
    this.procedimientoDraft = d.procedimiento.map(p => ({
      id: p.idPaso, titulo: p.titulo, detalle: p.detalle, realizado: p.realizado, nota: p.nota,
    }));
    this.ensayosDraft = d.ensayos.map(e => ({
      id: e.idEnsayo, tipo: e.tipo, punto: e.punto, notaPunto: e.notaPunto,
      carga: e.carga, lectura: e.lectura, error: e.error, tolerancia: e.tolerancia, resultado: e.resultado,
    }));
    this.observacionesDraft = d.observaciones.map(o => ({
      id: o.idObservacion, titulo: o.titulo, descripcion: o.descripcion, ubicacion: o.ubicacion,
      detalleExtra: o.detalleExtra, nivelAfectacion: o.nivelAfectacion, idEvidencia: o.idEvidencia,
    }));
    this.recomendacionesDraft = d.recomendaciones.map(r => ({
      id: r.idRecomendacion, titulo: r.titulo, descripcion: r.descripcion,
      prioridad: r.prioridad, plazo: r.plazo, idObservacion: r.idObservacion,
    }));
    this.precotizacionDraft = d.precotizacion.map(i => ({
      id: i.idItem, concepto: i.concepto, codigo: i.codigo, idSuministro: i.idSuministro,
      descripcionTecnica: i.descripcionTecnica, cantidad: i.cantidad, unidad: i.unidad,
      prioridad: i.prioridad, idObservacion: i.idObservacion,
    }));
    this.descripcionDraft = d.cabecera.descripcionComplementaria ?? '';
    this.notaPrecotDraft  = d.cabecera.notaPrecotizacion ?? '';
    this.resultadoDraft = {
      normativa:               d.cabecera.normativa,
      patronEnsayo:            d.cabecera.patronEnsayo,
      toleranciaExcentricidad: d.cabecera.toleranciaExcentricidad,
      resultadoGlobal:         d.cabecera.resultadoGlobal,
      errorMaximo:             d.cabecera.errorMaximo,
      errorMaximoDetalle:      d.cabecera.errorMaximoDetalle,
      incertidumbre:           d.cabecera.incertidumbre,
      factorK:                 d.cabecera.factorK,
      decisionTecnica:         d.cabecera.decisionTecnica,
    };
  }

  // ─── Navegación del stepper ─────────────────────────────────────────────
  irPaso(p: Paso): void { this.paso.set(p); }
  siguientePaso(): void { if (this.paso() < 4) this.paso.set((this.paso() + 1) as Paso); }
  anteriorPaso(): void  { if (this.paso() > 1) this.paso.set((this.paso() - 1) as Paso); }

  // ─── Procedimiento ──────────────────────────────────────────────────────
  togglePaso(i: number): void { this.procedimientoDraft[i].realizado = !this.procedimientoDraft[i].realizado; }
  agregarPaso(): void {
    this.procedimientoDraft = [
      ...this.procedimientoDraft,
      { id: null, titulo: '', detalle: '', realizado: true, nota: null },
    ];
  }
  eliminarPaso(i: number): void { this.procedimientoDraft = this.procedimientoDraft.filter((_, k) => k !== i); }

  // ─── Ensayos ────────────────────────────────────────────────────────────
  agregarEnsayo(tipo: 'pesaje' | 'excentricidad'): void {
    this.ensayosDraft = [
      ...this.ensayosDraft,
      { id: null, tipo, punto: '', notaPunto: null, carga: null, lectura: null, error: null, tolerancia: null, resultado: null },
    ];
  }
  eliminarEnsayo(i: number): void { this.ensayosDraft = this.ensayosDraft.filter((_, k) => k !== i); }

  // ─── Observaciones ──────────────────────────────────────────────────────
  agregarObservacion(): void {
    this.observacionesDraft = [
      ...this.observacionesDraft,
      { id: null, titulo: '', descripcion: '', ubicacion: '', detalleExtra: '', nivelAfectacion: 'medio', idEvidencia: null },
    ];
  }
  eliminarObservacion(i: number): void {
    this.observacionesDraft = this.observacionesDraft.filter((_, k) => k !== i);
    // Si hay recomendaciones vinculadas a una obs nueva por índice, re-alinear
    this.recomendacionesDraft = this.recomendacionesDraft.map(r => {
      if (r.indiceObservacion == null) return r;
      if (r.indiceObservacion === i) return { ...r, indiceObservacion: null };
      if (r.indiceObservacion > i) return { ...r, indiceObservacion: r.indiceObservacion - 1 };
      return r;
    });
  }

  // ─── Recomendaciones ────────────────────────────────────────────────────
  agregarRecomendacion(): void {
    this.recomendacionesDraft = [
      ...this.recomendacionesDraft,
      { id: null, titulo: '', descripcion: '', prioridad: 'media', plazo: null, idObservacion: null, indiceObservacion: null },
    ];
  }
  eliminarRecomendacion(i: number): void { this.recomendacionesDraft = this.recomendacionesDraft.filter((_, k) => k !== i); }

  // ─── Precotización ──────────────────────────────────────────────────────
  agregarItemPrecot(): void {
    this.precotizacionDraft = [
      ...this.precotizacionDraft,
      { id: null, concepto: '', codigo: '', idSuministro: null, descripcionTecnica: '', cantidad: 1, unidad: 'un', prioridad: 'media', idObservacion: null },
    ];
  }
  eliminarItemPrecot(i: number): void { this.precotizacionDraft = this.precotizacionDraft.filter((_, k) => k !== i); }

  // ─── Guardar ────────────────────────────────────────────────────────────
  async guardar(): Promise<void> {
    this.guardando.set(true);
    try {
      // Pasos 1-3 + hallazgos → PUT principal
      const payload: GuardarInformePayload = {
        descripcionComplementaria: this.descripcionDraft,
        resultado:                 this.resultadoDraft,
        procedimiento:             this.procedimientoDraft,
        ensayos:                   this.ensayosDraft,
        observaciones:             this.observacionesDraft,
        recomendaciones:           this.recomendacionesDraft,
      };
      await this.svc.guardarInforme(this.idInforme(), payload);

      // Paso 4: precotización (si corresponde)
      if (this.requierePrecotizacion() && this.precotizacionDraft.length > 0) {
        const payPrecot: GuardarPrecotizacionPayload = {
          nota:  this.notaPrecotDraft || null,
          items: this.precotizacionDraft,
        };
        await this.svc.guardarPrecotizacion(this.idInforme(), payPrecot);
      }

      this.ultimoGuardado.set(new Date());
      this.toast.exito('Cambios guardados correctamente.');
      await this.cargar();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/servicio-tecnico/revision-informes']);
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────

  clasePrioridadRecom(p: PrioridadRecomendacion | null | undefined): string {
    switch (p) {
      case 'alta':  return 'chip chip--rojo';
      case 'media': return 'chip chip--ambar';
      case 'baja':  return 'chip chip--azul';
      default:      return 'chip chip--gris';
    }
  }
  claseNivel(n: NivelObservacion | null | undefined): string {
    switch (n) {
      case 'critico':
      case 'alto':  return 'chip chip--rojo';
      case 'medio': return 'chip chip--ambar';
      case 'bajo':  return 'chip chip--azul';
      default:      return 'chip chip--gris';
    }
  }
  clasePrioridadPrecot(p: PrioridadItemPrecot | null | undefined): string {
    switch (p) {
      case 'alta':     return 'chip chip--rojo';
      case 'media':    return 'chip chip--ambar';
      case 'opcional': return 'chip chip--gris';
      default:         return 'chip chip--gris';
    }
  }
}
