import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RevisionInformesService } from '../../../../core/services/revision-informes.service';
import { SuministrosService } from '../../../../core/services/suministros.service';
import { SuministroListaItem } from '../../../../core/models/suministros.model';
import { ToastService } from '../../../../core/services/toast.service';
import {
  DetalleComplementarioApi, FotoInformeApi, GuardarComplementarioPayload,
  ItemPrecotizacionApi, ItemPrecotizacionGuardarPayload, NivelObservacion,
  ObservacionComplementarioApi, PrioridadRecomendacion, RecomendacionInformeApi,
} from '../../../../core/models/revision-informes-api.model';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EnViewportDirective } from '../../../../shared/directives/en-viewport.directive';

/**
 * HU-58 (reescrita 2026-11-23) — Ficha del Informe Complementario.
 *
 * El supervisor YA NO edita el informe original (es inmutable). En cambio, genera
 * un complementario como entidad aparte que trae precargados los datos del original
 * y permite modificar: fotos/videos, observaciones, recomendaciones y precotización.
 * Los ensayos, procedimiento y datos generales del original quedan en SOLO LECTURA
 * como referencia.
 *
 * Endpoint de carga: GET /api/servicio-tecnico/informes/complementarios/{id}
 * Endpoint de guardado: PUT /api/servicio-tecnico/informes/complementarios/{id}
 * Fotos: POST/DELETE /api/servicio-tecnico/informes/complementarios/{id}/fotos[/{id}]
 */
@Component({
  selector: 'app-ficha-informe-complementario',
  imports: [
    CommonModule, FormsModule, HeroHeaderComponent, BreadcrumbComponent, SeccionComponent,
    ButtonComponent, FormFooterComponent, EnViewportDirective,
  ],
  templateUrl: './ficha-informe-complementario.component.html',
  styleUrl: './ficha-informe-complementario.component.scss',
})
export class FichaInformeComplementarioComponent implements OnInit {
  private readonly svc          = inject(RevisionInformesService);
  private readonly sumSvc       = inject(SuministrosService);
  private readonly toast        = inject(ToastService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly sanitizer    = inject(DomSanitizer);

  // ─── Estado base ────────────────────────────────────────────────────────
  readonly idComplementario = signal<number | null>(null);
  readonly cargando         = signal(true);
  readonly guardando        = signal(false);
  readonly error            = signal<string | null>(null);
  readonly detalle          = signal<DetalleComplementarioApi | null>(null);

  // ─── Tabs (5): 3 readonly del técnico + 2 editables del supervisor ─────
  readonly TABS = [
    { id: 'datos',       label: 'Datos del Servicio',       icono: 'info',         editable: false },
    { id: 'detalle',     label: 'Detalle y Procedimiento',  icono: 'checklist',    editable: false },
    { id: 'ensayos',     label: 'Ensayos',                  icono: 'science',      editable: false },
    { id: 'fotos',       label: 'Fotos',                    icono: 'photo_library', editable: true  },
    { id: 'hallazgos',   label: 'Hallazgos y Precotización', icono: 'receipt_long', editable: true },
  ] as const;
  readonly tab = signal<typeof this.TABS[number]['id']>('datos');

  // ─── Secciones editables (drafts locales) ──────────────────────────────
  readonly observacionesGenerales = signal('');
  readonly observaciones   = signal<ObservacionComplementarioApi[]>([]);
  readonly recomendaciones = signal<RecomendacionInformeApi[]>([]);
  readonly precotizacion   = signal<ItemPrecotizacionApi[]>([]);
  readonly notaPrecot      = signal('');
  readonly fotos           = signal<FotoInformeApi[]>([]);

  // ─── Fotos: caché de blobs ─────────────────────────────────────────────
  readonly estadoFotos = signal<Record<number, { estado: string; safeUrl?: SafeUrl }>>({});
  private readonly MAX_CONCURRENTES = 4;
  private activas = 0;
  private cola: number[] = [];

  // ─── Modal evidencia (ver / editar / nuevo) ────────────────────────────
  readonly modalEvidencia     = signal<null | 'ver' | 'editar' | 'nuevo'>(null);
  readonly evidenciaActual    = signal<FotoInformeApi | null>(null);
  readonly descripcionDraft   = signal<string>('');
  readonly archivoDraft       = signal<File | null>(null);
  readonly previewDraft       = signal<SafeUrl | null>(null);
  readonly guardandoEvidencia = signal<boolean>(false);

  // ─── Niveles y prioridades para dropdowns ──────────────────────────────
  readonly NIVELES: { v: NivelObservacion; label: string }[] = [
    { v: 'critico', label: 'Crítico' },
    { v: 'alto',    label: 'Alto' },
    { v: 'medio',   label: 'Medio' },
    { v: 'bajo',    label: 'Bajo' },
  ];
  readonly PRIORIDADES: { v: PrioridadRecomendacion; label: string }[] = [
    { v: 'alta',  label: 'Alta' },
    { v: 'media', label: 'Media' },
    { v: 'baja',  label: 'Baja' },
  ];

  // ─── Derivados ──────────────────────────────────────────────────────────
  readonly cabecera = computed(() => this.detalle()?.cabecera);

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const c = this.cabecera();
    return [
      { label: 'Inicio', ruta: '/dashboard' },
      { label: 'Servicio Técnico' },
      { label: 'Revisión de Informes', ruta: '/servicio-tecnico/revision-informes' },
      { label: c?.numeroOs ?? '—' },
      { label: 'Informe Complementario' },
    ];
  });

  readonly subtitulo = computed(() => {
    const c = this.cabecera();
    if (!c) return '';
    const partes = [c.razonSocial, c.equipo, c.tecnico].filter(Boolean);
    return partes.join(' · ');
  });

  readonly puedeGuardar = computed(() => {
    const tieneFotosNuevas = this.fotos().some(f => f.origen === 'supervisor');
    const tieneObsGen = this.observacionesGenerales().trim().length > 0;
    const tieneObs    = this.observaciones().length > 0;
    const tieneRecs   = this.recomendaciones().length > 0;
    const tienePrecot = this.precotizacion().length > 0;
    // Regla acordada con Bryan: el complementario no puede quedar vacío
    return !this.guardando() && (tieneFotosNuevas || tieneObsGen || tieneObs || tieneRecs || tienePrecot);
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('idComplementario'));
    if (!id || isNaN(id)) {
      this.error.set('Ruta inválida: falta el id del complementario.');
      this.cargando.set(false);
      return;
    }
    this.idComplementario.set(id);
    await this.cargar(id);
  }

  async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const d = await this.svc.obtenerComplementario(id);
      this.detalle.set(d);
      this.observacionesGenerales.set(d.cabecera.observacionesGenerales ?? '');
      this.observaciones.set([...(d.observaciones ?? [])]);
      this.recomendaciones.set([...(d.recomendaciones ?? [])]);
      this.precotizacion.set([...(d.precotizacionDetalle?.items ?? [])]);
      this.notaPrecot.set(d.precotizacionDetalle?.nota ?? '');
      this.fotos.set([...(d.fotos ?? [])]);
      // Carga eager (limitada por MAX_CONCURRENTES): el usuario suele ver todas las fotos al abrir el tab.
      for (const f of (d.fotos ?? [])) this.solicitarFoto(f.idEvidencia);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el informe complementario.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Observaciones ─────────────────────────────────────────────────────
  agregarObservacion(): void {
    this.observaciones.update(xs => [
      ...xs,
      {
        idObservacion:       0, // nueva, el back asigna id
        codigo:              null,
        orden:               xs.length + 1,
        titulo:              '',
        descripcion:         '',
        ubicacion:           null,
        detalleExtra:        null,
        nivelAfectacion:     'medio',
        idEvidencia:         null,
        urlFoto:             null,
        origen:              'supervisor',
        clasificacion:       null,
        clasificacionNombre: null,
        componente:          null,
        componenteNombre:    null,
      },
    ]);
  }

  actualizarObservacion<K extends keyof ObservacionComplementarioApi>(i: number, campo: K, valor: ObservacionComplementarioApi[K]): void {
    this.observaciones.update(xs => xs.map((o, idx) => idx === i ? { ...o, [campo]: valor } : o));
  }

  eliminarObservacion(i: number): void {
    this.observaciones.update(xs => xs.filter((_, idx) => idx !== i));
  }

  // ─── Recomendaciones ───────────────────────────────────────────────────
  agregarRecomendacion(): void {
    this.recomendaciones.update(xs => [
      ...xs,
      {
        idRecomendacion:   0,
        codigo:            null,
        orden:             xs.length + 1,
        titulo:            '',
        descripcion:       '',
        prioridad:         'media',
        plazo:             null,
        idObservacion:     null,
        codigoObservacion: null,
        origen:            'supervisor',
      },
    ]);
  }

  actualizarRecomendacion<K extends keyof RecomendacionInformeApi>(i: number, campo: K, valor: RecomendacionInformeApi[K]): void {
    this.recomendaciones.update(xs => xs.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r));
  }

  eliminarRecomendacion(i: number): void {
    this.recomendaciones.update(xs => xs.filter((_, idx) => idx !== i));
  }

  // ─── Precotización ─────────────────────────────────────────────────────
  agregarItemPrecot(): void {
    this.precotizacion.update(xs => [
      ...xs,
      {
        idItem:             0,
        orden:              xs.length + 1,
        concepto:           '',
        codigo:             null,
        idSuministro:       null,
        descripcionTecnica: null,
        cantidad:           1,
        unidad:             null,
        prioridad:          'media',
        idObservacion:      null,
        codigoObservacion:  null,
        precioReferencia:   null,
      },
    ]);
  }

  actualizarItemPrecot<K extends keyof ItemPrecotizacionApi>(i: number, campo: K, valor: ItemPrecotizacionApi[K]): void {
    this.precotizacion.update(xs => xs.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it));
  }

  eliminarItemPrecot(i: number): void {
    this.precotizacion.update(xs => xs.filter((_, idx) => idx !== i));
    if (this.conceptoDropdownIdx() === i) this.cerrarConceptoDropdown();
  }

  // ─── Precotización: autocompletado del campo "Concepto" (Obs #4479) ─────
  // El input admite texto libre, pero sugiere suministros del maestro
  // (clases: servicio, equipo, instrumento, pesa) al tipear 2+ caracteres.
  readonly conceptoDropdownIdx  = signal<number | null>(null);
  readonly conceptoSugerencias  = signal<SuministroListaItem[]>([]);
  readonly conceptoBuscandoIdx  = signal<number | null>(null);
  private conceptoTimer: ReturnType<typeof setTimeout> | null = null;
  private conceptoSeq           = 0;

  onConceptoInput(i: number, texto: string): void {
    // Edición libre: se guarda tal cual y se desacopla de un suministro previamente elegido.
    this.actualizarItemPrecot(i, 'concepto',     texto);
    this.actualizarItemPrecot(i, 'idSuministro', null);
    this.actualizarItemPrecot(i, 'codigo',       null);

    if (this.conceptoTimer) { clearTimeout(this.conceptoTimer); this.conceptoTimer = null; }
    const q = (texto ?? '').trim();
    if (q.length < 2) {
      this.conceptoSugerencias.set([]);
      this.conceptoDropdownIdx.set(null);
      this.conceptoBuscandoIdx.set(null);
      return;
    }
    this.conceptoDropdownIdx.set(i);
    this.conceptoBuscandoIdx.set(i);
    const mioSeq = ++this.conceptoSeq;
    this.conceptoTimer = setTimeout(async () => {
      try {
        const { items } = await this.sumSvc.obtenerSuministros(q, undefined, undefined, 'Activo', false, 1, 8);
        if (mioSeq !== this.conceptoSeq) return;
        this.conceptoSugerencias.set(items);
      } catch {
        if (mioSeq !== this.conceptoSeq) return;
        this.conceptoSugerencias.set([]);
      } finally {
        if (mioSeq === this.conceptoSeq) this.conceptoBuscandoIdx.set(null);
      }
    }, 300);
  }

  onConceptoFocus(i: number): void {
    const txt = (this.precotizacion()[i]?.concepto ?? '').trim();
    if (txt.length >= 2 && this.conceptoSugerencias().length > 0) this.conceptoDropdownIdx.set(i);
  }

  cerrarConceptoDropdown(): void {
    this.conceptoDropdownIdx.set(null);
  }

  seleccionarSugerencia(i: number, s: SuministroListaItem): void {
    const it = this.precotizacion()[i];
    this.actualizarItemPrecot(i, 'concepto',     s.descripcion);
    this.actualizarItemPrecot(i, 'idSuministro', s.idSuministro);
    this.actualizarItemPrecot(i, 'codigo',       String(s.idSuministro));
    // Autollena descripción técnica si está vacía, para evitar doble tipeo.
    if (!it?.descripcionTecnica?.trim()) {
      this.actualizarItemPrecot(i, 'descripcionTecnica', s.descripcion);
    }
    this.cerrarConceptoDropdown();
  }

  // ─── Modal evidencia: aperturas ────────────────────────────────────────
  abrirModalVer(f: FotoInformeApi): void {
    this.evidenciaActual.set(f);
    this.descripcionDraft.set(f.descripcion ?? '');
    this.modalEvidencia.set('ver');
    // Si no estaba descargado aún (no visible en grilla), lo pedimos.
    this.solicitarFoto(f.idEvidencia);
  }

  pasarAEditar(): void {
    const f = this.evidenciaActual();
    if (!f) return;
    this.descripcionDraft.set(f.descripcion ?? '');
    this.modalEvidencia.set('editar');
  }

  abrirModalNuevo(): void {
    this.evidenciaActual.set(null);
    this.descripcionDraft.set('');
    this.archivoDraft.set(null);
    this.previewDraft.set(null);
    this.modalEvidencia.set('nuevo');
  }

  cerrarModalEvidencia(): void {
    if (this.guardandoEvidencia()) return;
    this.modalEvidencia.set(null);
    this.evidenciaActual.set(null);
    this.descripcionDraft.set('');
    this.archivoDraft.set(null);
    this.previewDraft.set(null);
  }

  // ─── Modal evidencia: selección de archivo (modo nuevo) ────────────────
  onSeleccionarArchivo(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    this.archivoDraft.set(file);
    const url = URL.createObjectURL(file);
    this.previewDraft.set(this.sanitizer.bypassSecurityTrustUrl(url));
  }

  // ─── Modal evidencia: guardar (nuevo o editar) ─────────────────────────
  async guardarEvidencia(): Promise<void> {
    const id = this.idComplementario();
    if (!id) return;
    const modo = this.modalEvidencia();
    const desc = this.descripcionDraft().trim();

    if (modo === 'nuevo') {
      const archivo = this.archivoDraft();
      if (!archivo) { this.toast.error('Seleccioná un archivo.'); return; }
      this.guardandoEvidencia.set(true);
      try {
        await this.svc.subirFotoComplementario(id, archivo, desc || null);
        this.toast.exito('Evidencia subida.');
        this.guardandoEvidencia.set(false);
        this.cerrarModalEvidencia();
        await this.cargar(id);
      } catch (e: unknown) {
        this.guardandoEvidencia.set(false);
        this.toast.error(e instanceof Error ? e.message : 'No se pudo subir la evidencia.');
      }
      return;
    }

    if (modo === 'editar') {
      const f = this.evidenciaActual();
      if (!f) return;
      this.guardandoEvidencia.set(true);
      try {
        await this.svc.actualizarDescripcionFotoComplementario(id, f.idEvidencia, desc || null);
        this.toast.exito('Descripción actualizada.');
        this.guardandoEvidencia.set(false);
        this.cerrarModalEvidencia();
        await this.cargar(id);
      } catch (e: unknown) {
        this.guardandoEvidencia.set(false);
        this.toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la descripción.');
      }
      return;
    }
  }

  async eliminarFoto(idEvidencia: number): Promise<void> {
    const id = this.idComplementario();
    if (!id) return;
    if (!confirm('¿Eliminar esta evidencia del complementario?')) return;
    try {
      await this.svc.eliminarFotoComplementario(id, idEvidencia);
      this.toast.exito('Evidencia eliminada.');
      await this.cargar(id);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la evidencia.');
    }
  }

  // ─── Fotos: carga diferida (miniaturas) ────────────────────────────────
  estadoFotoDe(idEvidencia: number): { estado: string; safeUrl?: SafeUrl } {
    return this.estadoFotos()[idEvidencia] ?? { estado: 'pendiente' };
  }

  solicitarFoto(idEvidencia: number): void {
    const actual = this.estadoFotos()[idEvidencia];
    if (actual && actual.estado !== 'pendiente') return;
    this.estadoFotos.update(m => ({ ...m, [idEvidencia]: { estado: 'cola' } }));
    this.cola.push(idEvidencia);
    this.procesarCola();
  }

  private procesarCola(): void {
    while (this.activas < this.MAX_CONCURRENTES && this.cola.length > 0) {
      const idEv = this.cola.shift()!;
      this.activas++;
      this.estadoFotos.update(m => ({ ...m, [idEv]: { estado: 'cargando' } }));
      const idComp = this.idComplementario()!;
      this.svc.obtenerArchivoFotoComplementario(idComp, idEv)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
          this.estadoFotos.update(m => ({ ...m, [idEv]: { estado: 'listo', safeUrl } }));
        })
        .catch(() => {
          this.estadoFotos.update(m => ({ ...m, [idEv]: { estado: 'error' } }));
        })
        .finally(() => {
          this.activas--;
          this.procesarCola();
        });
    }
  }

  // ─── Acciones principales ──────────────────────────────────────────────
  async guardar(): Promise<void> {
    const id = this.idComplementario();
    if (!id || !this.puedeGuardar()) return;
    this.guardando.set(true);
    try {
      const payload: GuardarComplementarioPayload = {
        observacionesGenerales: this.observacionesGenerales().trim() || null,
        observaciones: this.observaciones().map(o => ({
          id:              o.idObservacion || null,
          titulo:          o.titulo,
          descripcion:     o.descripcion,
          ubicacion:       o.ubicacion,
          detalleExtra:    o.detalleExtra,
          nivelAfectacion: o.nivelAfectacion,
          idEvidencia:     o.idEvidencia,
        })),
        recomendaciones: this.recomendaciones().map(r => ({
          id:            r.idRecomendacion || null,
          titulo:        r.titulo,
          descripcion:   r.descripcion,
          prioridad:     r.prioridad,
          plazo:         r.plazo,
          idObservacion: r.idObservacion,
        })),
        precotizacion: {
          nota: this.notaPrecot() || null,
          items: this.precotizacion().map<ItemPrecotizacionGuardarPayload>(it => ({
            id:                 it.idItem || null,
            concepto:           it.concepto,
            codigo:             it.codigo,
            idSuministro:       it.idSuministro,
            descripcionTecnica: it.descripcionTecnica,
            cantidad:           it.cantidad,
            unidad:             it.unidad,
            prioridad:          it.prioridad,
            idObservacion:      it.idObservacion,
          })),
        },
      };
      await this.svc.guardarComplementario(id, payload);
      this.toast.exito('Informe complementario guardado.');
      this.router.navigate(['/servicio-tecnico/revision-informes']);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo guardar el complementario.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/servicio-tecnico/revision-informes']);
  }

  /**
   * HU-58 — PDF del informe del técnico.
   * Bryan confirmó que hoy el PDF del informe original NO existe aún (ni la app
   * ni el back lo generan). Dejamos el botón como "próximamente" hasta que se
   * defina quién lo hace. Cuando exista, el back traerá `pdfInformeOriginalUrl`.
   */
  descargarPdfTecnico(): void {
    this.toast.info('Próximamente: el PDF del informe del técnico aún no está disponible.');
  }

  /**
   * Descarta el complementario en borrador. Útil cuando la Asistente / Supervisor
   * abrió "Generar complementario" por error y no quiere dejarlo sin guardar
   * (un borrador bloquea la revisión del original).
   */
  async descartarBorrador(): Promise<void> {
    const id = this.idComplementario();
    if (!id) return;
    const confirmar = confirm('¿Descartar este borrador? Se perderán todos los cambios y el informe original volverá a estar disponible para revisión.');
    if (!confirmar) return;
    try {
      await this.svc.descartarBorradorComplementario(id);
      this.toast.exito('Borrador descartado.');
      this.router.navigate(['/servicio-tecnico/revision-informes']);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo descartar el borrador.');
    }
  }
}
