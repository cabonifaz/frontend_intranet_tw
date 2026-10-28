import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { CampoComponent } from '../../../../shared/ui/campo/campo.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import {
  AnalisisImportacionOsOm,
  ConceptoCatalogoOs,
  ConceptoDetalleOs,
  DatosCertificadoOm,
  EquipoCatalogoClienteOs,
  EquipoDetalleOs,
  EstrategiaMergeImportacion,
  GuardarOrdenServicioRequest,
  PreparacionEdicionOs,
  PreparacionNuevaOs,
  PropuestaOrigenOs,
  TipoOrden,
} from '../../../../core/models/ordenes-servicio.model';
import { ModalAgregarConceptoOsComponent } from '../modal-agregar-concepto-os/modal-agregar-concepto-os.component';
import { ModalAgregarEquipoOsComponent } from '../modal-agregar-equipo-os/modal-agregar-equipo-os.component';
import { ModalImportarExcelOsComponent } from '../modal-importar-excel-os/modal-importar-excel-os.component';
import { ModalSolicitarEdicionOsComponent } from '../modal-solicitar-edicion-os/modal-solicitar-edicion-os.component';
import { ModalAnularOsComponent } from '../modal-anular-os/modal-anular-os.component';

type ModoFicha = 'nueva' | 'editar';

/**
 * HU-40 — Ficha Nueva/Editar OS/OM.
 *
 * 7 secciones apiladas full-width (sin panel lateral):
 *   1. Datos del Cliente (solo contacto editable)
 *   2. Propuesta Origen (card celeste solo-lectura)
 *   3. Datos del Documento (fecha programada en rango — solo OS; opcional)
 *   4. Conceptos del Servicio (vinculación inline — se activa en HU-43)
 *   5. Equipos / Instrumentos (vinculación inline — se activa en HU-43)
 *   6. Observaciones (textarea libre)
 *   7. Datos del Certificado (solo si tipo = OM)
 *
 * Footer sticky: Cancelar · Guardar borrador · Emitir OS/OM (o Guardar y re-emitir en modo editar).
 *
 * Modo "editar" requiere que exista una solicitud de edición aprobada por el Jefe Comercial;
 * en ese caso se muestra el banner verde "Edición autorizada".
 */
@Component({
  selector: 'app-ficha-orden-servicio',
  imports: [
    CommonModule, FormsModule, HeroHeaderComponent, BreadcrumbComponent, SeccionComponent, CampoComponent, ButtonComponent,
    ModalAgregarConceptoOsComponent, ModalAgregarEquipoOsComponent, ModalImportarExcelOsComponent,
    ModalSolicitarEdicionOsComponent, ModalAnularOsComponent,
  ],
  templateUrl: './ficha-orden-servicio.component.html',
  styleUrl: './ficha-orden-servicio.component.scss',
})
export class FichaOrdenServicioComponent implements OnInit {
  private readonly svc    = inject(OrdenesServicioService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  readonly modo        = signal<ModoFicha>('nueva');
  readonly cargando    = signal(true);
  readonly emitiendo   = signal(false);
  readonly error       = signal<string | null>(null);

  // Modo "nueva"
  readonly preparacion = signal<PreparacionNuevaOs | null>(null);

  // Modo "editar"
  readonly edicion     = signal<PreparacionEdicionOs | null>(null);

  // Equipos / conceptos originales de la propuesta — se cargan en ambos modos
  // (en Nueva vienen de preparacion.equiposSugeridos; en Editar hacemos un fetch extra
  // porque PreparacionEdicionOs no los expone). Workaround: back aún no marca DeLaPropuesta.
  private readonly idsEquiposPropuestaOrigen   = signal<number[]>([]);
  private readonly codigosEquiposPropuestaTw   = signal<string[]>([]);
  private readonly codigosConceptosPropuesta   = signal<string[]>([]);

  // Form editable
  readonly idContactoSel = signal<number | null>(null);
  readonly fechaDesde    = signal<string>('');     // ISO YYYY-MM-DD
  readonly fechaHasta    = signal<string>('');
  readonly observaciones = signal<string>('');
  readonly datosCertificado = signal<DatosCertificadoOm | null>(null);

  // Datos derivados
  readonly tipo = computed<TipoOrden>(() =>
    this.preparacion()?.tipo ?? this.edicion()?.detalle.tipo ?? 'OS',
  );

  readonly esOs = computed(() => this.tipo() === 'OS');
  readonly esOm = computed(() => this.tipo() === 'OM');

  readonly propuestaOrigen = computed<PropuestaOrigenOs | null>(() =>
    this.preparacion()?.propuestaOrigen ?? this.edicion()?.detalle.propuestaOrigen ?? null,
  );

  readonly numeroDocumento = computed(() =>
    this.preparacion()?.numeroSugerido ?? this.edicion()?.detalle.numero ?? '',
  );

  readonly titulo = computed(() => {
    const t = this.tipo();
    return this.modo() === 'nueva'
      ? `Nueva Orden de ${t === 'OM' ? 'Metrología' : 'Servicio'}`
      : `Editar Orden de ${t === 'OM' ? 'Metrología' : 'Servicio'}`;
  });

  readonly subtitulo = computed(() => {
    const p = this.propuestaOrigen();
    if (!p) return '';
    return this.modo() === 'nueva'
      ? `Generar ${this.tipo()} a partir de la propuesta aceptada ${p.codigo} v${p.version}`
      : `Editar ${this.tipo()} ${this.numeroDocumento()}`;
  });

  readonly contactos = computed(() =>
    this.preparacion()?.contactos ?? this.edicion()?.contactos ?? [],
  );

  readonly razonSocial = computed(() =>
    this.preparacion()?.razonSocial ?? this.edicion()?.detalle.datosGenerales.razonSocial ?? '',
  );

  readonly ruc = computed(() =>
    this.preparacion()?.ruc ?? this.edicion()?.detalle.datosGenerales.ruc ?? '',
  );

  readonly direccion = computed(() =>
    this.preparacion()?.direccionOperaciones ?? this.edicion()?.detalle.datosGenerales.direccionOperaciones ?? '',
  );

  readonly comercialResponsable = computed(() =>
    this.preparacion()?.nombreResponsable ?? this.edicion()?.detalle.responsable ?? '',
  );

  readonly numeroRequerimiento = computed(() =>
    this.preparacion()?.numeroRequerimiento ?? this.edicion()?.detalle.datosGenerales.numeroRequerimiento ?? null,
  );

  readonly fechaEmision = computed(() =>
    this.preparacion()?.fechaEmision ?? this.edicion()?.detalle.datosGenerales.fechaEmision ?? '',
  );

  readonly esTercerizado = computed(() =>
    this.preparacion()?.rqEsTercerizado ?? this.edicion()?.detalle.datosCertificado?.esTercerizado ?? false,
  );

  readonly diasHabiles = computed(() => {
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    if (!desde || !hasta) return 0;
    const d1 = new Date(desde);
    const d2 = new Date(hasta);
    if (d2 < d1) return 0;
    let n = 0;
    const cur = new Date(d1);
    while (cur <= d2) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) n++;
      cur.setDate(cur.getDate() + 1);
    }
    return n;
  });

  readonly breadcrumb = computed(() => breadcrumbCrm(
    { label: 'Órdenes de Servicio', ruta: '/crm/ordenes-servicio' },
    this.modo() === 'nueva' ? 'Nueva OS/OM' : this.numeroDocumento(),
  ));

  readonly puedeGuardar = computed(() => !!this.idContactoSel());

  // Conceptos + equipos editables (HU-43)
  readonly conceptos = signal<ConceptoDetalleOs[]>([]);
  readonly equipos   = signal<EquipoDetalleOs[]>([]);

  // Flags de modales
  readonly modalAgregarConceptoAbierto = signal(false);
  readonly modalAgregarEquipoAbierto   = signal(false);
  readonly modalImportarExcelAbierto   = signal(false);
  readonly modalSolicitarEdicionAbierto = signal(false);
  readonly modalAnularAbierto           = signal(false);

  /** idEquipo cuyo popover "+ Vincular" está abierto. null = cerrado. */
  readonly popoverVincularAbierto = signal<number | null>(null);

  togglePopoverVincular(idEquipo: number, evt?: Event): void {
    evt?.stopPropagation();
    this.popoverVincularAbierto.update(cur => cur === idEquipo ? null : idEquipo);
  }

  cerrarPopoverVincular(): void {
    this.popoverVincularAbierto.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.popoverVincularAbierto() != null) this.popoverVincularAbierto.set(null);
  }

  /** idPropuesta actual (de preparación o edición). Se pasa a los modales de agregar. */
  idPropuestaActual(): number | null {
    return this.preparacion()?.propuestaOrigen?.idPropuesta
        ?? this.edicion()?.detalle.propuestaOrigen?.idPropuesta
        ?? null;
  }

  /**
   * Ids de equipos que están en la propuesta origen — se usa en el modal "Agregar equipo"
   * para marcar los que vienen de la propuesta (el back no expone ese flag en el DTO).
   */
  idsEquiposDePropuestaOrigen(): number[] {
    return (this.preparacion()?.equiposSugeridos ?? []).map(e => e.idEquipo);
  }

  /** Códigos TW de los equipos de la propuesta — se usa en el modal Importar Excel. */
  codigosTwDePropuestaOrigen(): string[] {
    return this.codigosEquiposPropuestaTw();
  }

  /** Códigos de los conceptos de la propuesta — se usa en el modal Importar Excel. */
  codigosConceptosDePropuestaOrigen(): string[] {
    return this.codigosConceptosPropuesta();
  }

  // ─── Flags "En propuesta" para las tablas de la ficha ────────────────────
  esEquipoDePropuesta(idEquipo: number): boolean {
    return this.idsEquiposPropuestaOrigen().includes(idEquipo);
  }
  esConceptoDePropuesta(codigo: string): boolean {
    return this.codigosConceptosPropuesta().includes(codigo);
  }

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.params;
    if (params['idPropuesta']) {
      await this.cargarNueva(+params['idPropuesta']);
    } else if (params['idOs']) {
      await this.cargarEdicion(+params['idOs']);
    } else {
      this.error.set('Ruta inválida.');
      this.cargando.set(false);
    }
  }

  private async cargarNueva(idPropuesta: number): Promise<void> {
    this.modo.set('nueva');
    this.cargando.set(true);
    try {
      const p = await this.svc.prepararNueva(idPropuesta);
      this.preparacion.set(p);
      this.idContactoSel.set(p.idContactoDefault);
      if (p.tipo === 'OM' && p.datosCertificadoDefault) {
        this.datosCertificado.set({ ...p.datosCertificadoDefault });
      }
      this.conceptos.set([...(p.conceptosSugeridos ?? [])]);
      this.equipos.set([...(p.equiposSugeridos ?? [])]);
      this.idsEquiposPropuestaOrigen.set((p.equiposSugeridos ?? []).map(e => e.idEquipo));
      this.codigosEquiposPropuestaTw.set((p.equiposSugeridos ?? []).map(e => e.codigoTw));
      this.codigosConceptosPropuesta.set((p.conceptosSugeridos ?? []).map(c => c.codigo));
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudo cargar la preparación de la OS/OM.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarEdicion(idOs: number): Promise<void> {
    this.modo.set('editar');
    this.cargando.set(true);
    try {
      const ed = await this.svc.prepararEdicion(idOs);
      this.edicion.set(ed);
      const d = ed.detalle;
      this.idContactoSel.set(ed.idContactoActual);
      this.fechaDesde.set(d.datosGenerales.fechaProgramadaDesde ?? '');
      this.fechaHasta.set(d.datosGenerales.fechaProgramadaHasta ?? '');
      this.observaciones.set(d.observaciones ?? '');
      if (d.tipo === 'OM' && d.datosCertificado) {
        this.datosCertificado.set({ ...d.datosCertificado });
      }
      this.conceptos.set([...(d.conceptos ?? [])]);
      this.equipos.set([...(d.equipos ?? [])]);

      // NOTA: en modo edición no sabemos qué equipos/conceptos venían de la propuesta origen
      // porque PreparacionEdicionOs no expone esa info y prepararNueva() falla con "ya tiene OS".
      // Pedido abierto a Bryan: incluir equiposPropuesta/conceptosPropuesta (o DeLaPropuesta
      // en cada item) en PreparacionEdicionOs. Mientras tanto, la columna "EN PROPUESTA"
      // se oculta en modo edición (ver template con [esModoEdicion]).
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudo cargar la OS/OM para edición.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────────
  irAPropuesta(): void {
    const p = this.propuestaOrigen();
    if (!p) return;
    window.open(`/crm/propuestas?idPropuesta=${p.idPropuesta}`, '_blank');
  }

  verDetalleSolicitud(): void {
    this.toast.info('Detalle de la solicitud de edición — pendiente de modal (Fase C).');
  }

  cancelar(): void {
    this.router.navigate(['/crm/ordenes-servicio']);
  }

  async emitir(): Promise<void> {
    if (!this.idContactoSel()) {
      this.toast.error('Seleccioná el contacto del cliente antes de guardar.');
      return;
    }
    const p = this.propuestaOrigen();
    if (!p) return;

    this.emitiendo.set(true);
    try {
      const equipos  = this.obtenerEquiposActuales();
      const conceptos = this.obtenerConceptosActuales();

      const req: GuardarOrdenServicioRequest = {
        idOs:                 this.edicion()?.detalle.idOs ?? null,
        idPropuesta:          p.idPropuesta,
        tipo:                 this.tipo(),
        idContacto:           this.idContactoSel(),
        fechaProgramadaDesde: this.esOs() ? (this.fechaDesde() || null) : null,
        fechaProgramadaHasta: this.esOs() ? (this.fechaHasta() || null) : null,
        observaciones:        this.observaciones().trim(),
        equipos,
        conceptos,
        datosCertificado:     this.esOm() ? (this.datosCertificado() ?? undefined) : undefined,
        emitir:               true,
      };

      const r = await this.svc.guardar(req);
      const accion = this.modo() === 'editar' ? 'actualizada' : 'registrada';
      this.toast.exito(`${r.numero} ${accion} correctamente.`);
      this.router.navigate(['/crm/ordenes-servicio']);
    } catch (e: any) {
      const accion = this.modo() === 'editar' ? 'actualizar' : 'registrar';
      this.toast.error(e?.message ?? `No se pudo ${accion} la OS/OM.`);
    } finally {
      this.emitiendo.set(false);
    }
  }

  private obtenerEquiposActuales(): EquipoDetalleOs[] {
    return this.equipos();
  }

  private obtenerConceptosActuales(): ConceptoDetalleOs[] {
    return this.conceptos();
  }

  // ─── Conceptos & Equipos (HU-43) ────────────────────────────────────────
  readonly codigosConceptosYa = computed(() => this.conceptos().map(c => c.codigo));
  readonly idsEquiposYa       = computed(() => this.equipos().map(e => e.idEquipo));

  readonly idClienteActual = computed(() =>
    this.preparacion()?.idCliente ?? 0,
  );

  abrirAgregarConcepto(): void { this.modalAgregarConceptoAbierto.set(true); }
  abrirAgregarEquipo():   void { this.modalAgregarEquipoAbierto.set(true); }
  abrirImportarExcel():   void { this.modalImportarExcelAbierto.set(true); }
  abrirSolicitarEdicion(): void { this.modalSolicitarEdicionAbierto.set(true); }
  abrirAnular():          void { this.modalAnularAbierto.set(true); }

  onConceptosAgregados(lista: ConceptoCatalogoOs[]): void {
    const existentes = this.conceptos();
    const nuevos: ConceptoDetalleOs[] = lista.map(c => ({
      idConcepto:        c.idSuministro,
      codigo:            c.codigo,
      descripcion:       c.descripcion,
      clasificacion:     c.clasificacion,
      tipo:              c.tipo,
      subtipo:           c.subtipo,
      equiposAplicados:  [],
      deLaPropuesta:     c.deLaPropuesta,
    }));
    // Deduplicar por código
    const codsExist = new Set(existentes.map(e => e.codigo));
    const dedup = nuevos.filter(n => !codsExist.has(n.codigo));
    this.conceptos.set([...existentes, ...dedup]);
    this.modalAgregarConceptoAbierto.set(false);
    this.toast.exito(`${dedup.length} conceptos agregados.`);
  }

  onEquiposAgregados(lista: EquipoCatalogoClienteOs[]): void {
    const existentes = this.equipos();
    const sigItem = existentes.length;
    const nuevos: EquipoDetalleOs[] = lista.map((e, idx) => ({
      item:                sigItem + idx + 1,
      idEquipo:            e.idEquipo,
      clasificacion:       e.clasificacion,
      clasificacionLabel:  e.clasificacionLabel,
      marca:               e.marca,
      modelo:              e.modelo,
      numSerie:            e.numSerie,
      codigoTw:            e.codigoTw,
      alcance:             e.alcance,
      ubicacion:           e.ubicacion,
      conceptosAplicados:  [],
    }));
    const idsExist = new Set(existentes.map(x => x.idEquipo));
    const dedup = nuevos.filter(n => !idsExist.has(n.idEquipo));
    this.equipos.set([...existentes, ...dedup]);
    this.modalAgregarEquipoAbierto.set(false);
    this.toast.exito(`${dedup.length} equipos agregados.`);
  }

  quitarConcepto(idConcepto: number, evt: Event): void {
    evt.stopPropagation();
    const quitado = this.conceptos().find(c => c.idConcepto === idConcepto);
    this.conceptos.set(this.conceptos().filter(c => c.idConcepto !== idConcepto));
    // También quitar la referencia en los equipos
    if (quitado) {
      this.equipos.set(this.equipos().map(e => ({
        ...e,
        conceptosAplicados: e.conceptosAplicados.filter(c => c !== quitado.codigo),
      })));
    }
  }

  quitarEquipo(idEquipo: number, evt: Event): void {
    evt.stopPropagation();
    this.equipos.set(this.equipos().filter(e => e.idEquipo !== idEquipo));
  }

  toggleConceptoEnEquipo(idEquipo: number, codigo: string): void {
    this.equipos.set(this.equipos().map(e => {
      if (e.idEquipo !== idEquipo) return e;
      const tiene = e.conceptosAplicados.includes(codigo);
      return {
        ...e,
        conceptosAplicados: tiene
          ? e.conceptosAplicados.filter(c => c !== codigo)
          : [...e.conceptosAplicados, codigo],
      };
    }));
  }

  // Equipos aplicados por concepto (para la tabla de Conceptos)
  equiposQueAplican(codigoConcepto: string): string[] {
    return this.equipos()
      .filter(e => e.conceptosAplicados.includes(codigoConcepto))
      .map(e => e.codigoTw);
  }

  onExcelImportado(evt: { analisis: AnalisisImportacionOsOm; estrategia: EstrategiaMergeImportacion }): void {
    const { analisis: a, estrategia } = evt;

    // Convierte filas del Excel a entidades del dominio (ConceptoDetalleOs / EquipoDetalleOs).
    const conceptosNuevos: ConceptoDetalleOs[] = a.conceptos
      .filter(c => c.idSuministro != null)
      .map(c => ({
        idConcepto:       c.idSuministro!,
        codigo:           c.codigo,
        descripcion:      c.descripcion,
        clasificacion:    null,
        equiposAplicados: [],   // se completa abajo al cruzar con equipos
        deLaPropuesta:    false,
      }));

    const equiposNuevos: EquipoDetalleOs[] = a.equipos
      .filter(e => e.idEquipo != null)
      .map((e, i) => ({
        item:               i + 1,
        idEquipo:           e.idEquipo!,
        clasificacion:      e.tipo,
        clasificacionLabel: e.tipoLabel,
        marca:              e.marca,
        modelo:             e.modelo,
        numSerie:           e.numSerie,
        codigoTw:           e.codigoTw,
        alcance:            e.alcance,
        ubicacion:          e.ubicacion,
        conceptosAplicados: e.conceptosAplicados,
        d:                  e.d ?? null,
        e:                  e.e ?? null,
        clase:              e.clase ?? null,
        escala:             e.escala ?? null,
        puntosCalibracion:  e.puntosCalibracion ?? null,
      }));

    // Cruzar equipos ↔ conceptos: cada concepto reúne los códigos TW de equipos a los que aplica.
    for (const c of conceptosNuevos) {
      c.equiposAplicados = equiposNuevos
        .filter(e => e.conceptosAplicados.includes(c.codigo))
        .map(e => e.codigoTw);
    }

    if (estrategia === 'reemplazar') {
      this.conceptos.set(conceptosNuevos);
      this.equipos.set(equiposNuevos);
    } else if (estrategia === 'fusionar') {
      // Fusionar sin duplicar por idEquipo / idConcepto, pero actualizando las relaciones
      // (conceptosAplicados / equiposAplicados) de los items que ya existían.
      const indiceConceptosNuevos = new Map(conceptosNuevos.map(c => [c.idConcepto, c]));
      const indiceEquiposNuevos   = new Map(equiposNuevos.map(e => [e.idEquipo, e]));

      // Equipos: actualizar los existentes con los conceptosAplicados del Excel (unión);
      // los nuevos se agregan al final numerados.
      const equiposFusionados: EquipoDetalleOs[] = this.equipos().map(eExistente => {
        const nuevo = indiceEquiposNuevos.get(eExistente.idEquipo);
        if (!nuevo) return eExistente;
        const union = Array.from(new Set([...eExistente.conceptosAplicados, ...nuevo.conceptosAplicados]));
        return { ...eExistente, conceptosAplicados: union };
      });
      const equiposNuevosAgregados = equiposNuevos
        .filter(e => !this.equipos().some(ex => ex.idEquipo === e.idEquipo));
      equiposFusionados.push(...equiposNuevosAgregados.map((e, i) => ({
        ...e,
        item: equiposFusionados.length + i + 1,
      })));
      this.equipos.set(equiposFusionados);

      // Conceptos: actualizar los existentes con los equiposAplicados del Excel (unión).
      const conceptosFusionados: ConceptoDetalleOs[] = this.conceptos().map(cExistente => {
        const nuevo = indiceConceptosNuevos.get(cExistente.idConcepto);
        if (!nuevo) return cExistente;
        const union = Array.from(new Set([...cExistente.equiposAplicados, ...nuevo.equiposAplicados]));
        return { ...cExistente, equiposAplicados: union };
      });
      const conceptosNuevosAgregados = conceptosNuevos
        .filter(c => !this.conceptos().some(cx => cx.idConcepto === c.idConcepto));
      conceptosFusionados.push(...conceptosNuevosAgregados);
      this.conceptos.set(conceptosFusionados);
    }

    this.modalImportarExcelAbierto.set(false);
    this.toast.exito(
      estrategia === 'reemplazar'
        ? `Reemplazados: ${equiposNuevos.length} equipos + ${conceptosNuevos.length} conceptos.`
        : `Agregados: ${equiposNuevos.length} equipos + ${conceptosNuevos.length} conceptos.`,
    );
  }

  onEdicionSolicitada(): void {
    this.modalSolicitarEdicionAbierto.set(false);
    this.toast.exito('Solicitud de edición enviada al Jefe Comercial.');
    this.router.navigate(['/crm/ordenes-servicio']);
  }

  onAnulada(): void {
    this.modalAnularAbierto.set(false);
    this.router.navigate(['/crm/ordenes-servicio']);
  }

  // Datos para los modales
  obtenerIdClienteParaModal(): number {
    return this.preparacion()?.idCliente ?? this.edicion()?.detalle.idOs ?? 0;
  }

  // ─── Helpers UI ──────────────────────────────────────────────────────────
  claseChipTipo(t: TipoOrden): string {
    return t === 'OS' ? 'chip-tipo chip-tipo--os' : 'chip-tipo chip-tipo--om';
  }

  claseChipEstado(): string {
    const estado = this.edicion()?.detalle.estadoGrupo;
    if (!estado) return 'badge badge--gris';
    return 'badge badge--' + (estado === 'borrador' ? 'gris'
      : estado === 'emitida' ? 'azul'
      : estado === 'programada' ? 'morado'
      : estado === 'en_ejecucion' ? 'ambar'
      : estado === 'finalizada' ? 'verde'
      : 'rojo');
  }

  badgeHero(): string {
    if (this.modo() === 'nueva') return 'BORRADOR';
    const ed = this.edicion();
    return ed ? ed.detalle.estadoLabel.toUpperCase() : '';
  }

  badgeVariant(): 'verde-dot' | 'ambar-dot' | 'azul' | 'verde' | 'rojo' {
    if (this.modo() === 'nueva') return 'ambar-dot';
    const grupo = this.edicion()?.detalle.estadoGrupo;
    if (!grupo) return 'ambar-dot';
    if (grupo === 'borrador') return 'ambar-dot';
    if (grupo === 'emitida') return 'azul';
    if (grupo === 'programada') return 'azul';
    if (grupo === 'en_ejecucion') return 'ambar-dot';
    if (grupo === 'finalizada') return 'verde';
    return 'rojo';
  }
}
