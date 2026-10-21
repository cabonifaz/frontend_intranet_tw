import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ModalVerComparacionOcComponent } from '../modal-ver-comparacion-oc/modal-ver-comparacion-oc.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import {
  CampoCorregidoDto,
  ComparacionOrdenCompraDto,
  CondicionPagoDto,
  DatosOrdenCompraDto,
  MonedaOrdenCompraDto,
  PreparacionEdicionOrdenCompraDto,
  PreparacionOrdenCompraDto,
  PropuestaDisponibleOcDto,
  VinculacionOrdenCompraDto,
} from '../../../../core/models/ordenes-compra.model';

type Decision = 'validar' | 'observar' | 'correccion_cliente' | 'nueva_version';

interface PropuestaVinculadaLocal {
  idPropuesta:   number;
  numero:        string;
  version:       number;
  total:         number;
  saldo:         number;
  idMoneda:      number;
  monedaSimbolo?: string | null;
  montoAsignado: number;
  esOrigen:      boolean;
  contacto?:     string | null;
  numeroRq?:     string | null;
  servicios?:    number;
  estadoValidacion?: string;
}

/**
 * HU-23 — Página "Registrar Orden de Compra".
 * Ruta: /crm/ordenes-compra/nueva/:idPropuesta  (o /:idOc/editar)
 *
 * Layout de página (NO modal) con 6 secciones numeradas + sidebar lateral.
 */
@Component({
  selector: 'app-registrar-oc',
  imports: [
    CommonModule, FormsModule,
    ButtonComponent, SeccionComponent, PageHeaderComponent, EstadoVacioComponent,
    ModalVerComparacionOcComponent,
    MonedaPipe,
  ],
  templateUrl: './registrar-oc.component.html',
  styleUrl: './registrar-oc.component.scss',
})
export class RegistrarOcComponent {
  private readonly svc    = inject(OrdenesCompraService);
  private readonly toast  = inject(ToastService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly modo = signal<'crear' | 'editar'>('crear');
  readonly idPropuestaOrigen = signal<number | null>(null);
  readonly idOcEditar        = signal<number | null>(null);
  /** idOc de la OC autogenerada de respaldo (creada al llegar a la ficha). Si registramos OC real, esta se reemplaza. */
  readonly idOcReemplaza     = signal<number | null>(null);
  readonly modalComparacionAbierto = signal(false);

  readonly cargando    = signal(true);
  readonly guardando   = signal(false);
  readonly extrayendoIa = signal(false);
  readonly comparando  = signal(false);
  readonly error       = signal('');

  readonly preparacion        = signal<PreparacionOrdenCompraDto | null>(null);
  readonly preparacionEdicion = signal<PreparacionEdicionOrdenCompraDto | null>(null);
  readonly comparacion        = signal<ComparacionOrdenCompraDto | null>(null);

  readonly archivo       = signal<File | null>(null);
  readonly nombreArchivo = signal<string>('');
  readonly dragActive    = signal<boolean>(false);
  readonly extraccionIaDisponible = signal<boolean>(false);

  readonly datos = signal<DatosOrdenCompraDto>({
    numeroOc: null, fechaEmision: null, fechaRecepcion: new Date().toISOString().slice(0, 10),
    idMoneda: null, montoTotal: null, idCondicionPago: null, formaPago: null,
    igvIncluido: null, igvPct: null, descuento: null,
    ruc: null, razonSocial: null, numeroPropuesta: null, vigenciaHasta: null,
    referencia: null, observaciones: null,
    facturaIgualOc: true, conceptos: [], camposIa: {}, camposManuales: [],
  });

  readonly camposIaOriginales = signal<Record<string, string | null>>({});
  readonly extraccionExitosa  = signal<boolean>(false);
  readonly extraccionFallo    = signal<string | null>(null);
  readonly vinculadas         = signal<PropuestaVinculadaLocal[]>([]);
  readonly otrasPropuestas    = signal<PropuestaDisponibleOcDto[]>([]);
  readonly monedas            = signal<MonedaOrdenCompraDto[]>([]);
  readonly condicionesPago    = signal<CondicionPagoDto[]>([]);

  readonly breadcrumb = breadcrumbCrm('Órdenes de Compra', 'Registrar OC');

  readonly totalAsignado = computed(() => this.vinculadas().reduce((s, p) => s + (p.montoAsignado || 0), 0));
  readonly saldoOc = computed(() => (this.datos().montoTotal ?? 0) - this.totalAsignado());
  readonly monedaSimbolo = computed(() => this.monedas().find(m => m.id === this.datos().idMoneda)?.simbolo ?? '');
  readonly resumenValidacion = computed(() => this.comparacion()?.resumen ?? null);
  readonly asignadoPct = computed(() => {
    const m = this.datos().montoTotal ?? 0;
    return m > 0 ? Math.round((this.totalAsignado() / m) * 100) : 0;
  });

  /** Severidad global para pintar el sidebar / banners. */
  readonly severidadValidacion = computed<'ok' | 'advertencia' | 'critico' | null>(() => {
    const r = this.resumenValidacion();
    if (!r) return null;
    if (r.criticas > 0)    return 'critico';
    if (r.advertencias > 0) return 'advertencia';
    return 'ok';
  });

  /** Conceptos extraídos del PDF (sección 4). */
  readonly conceptos = computed(() => this.datos().conceptos ?? []);
  readonly subtotalConceptos = computed(() =>
    this.conceptos().reduce((s, c) => s + (c.subtotal ?? 0), 0),
  );

  /** Campos comparados por propuesta (para card de validación detallada). */
  readonly camposCriticos = computed(() =>
    (this.comparacion()?.campos ?? []).filter(c => c.severidad === 'critico'),
  );
  readonly camposAdvertencia = computed(() =>
    (this.comparacion()?.campos ?? []).filter(c => c.severidad === 'advertencia'),
  );

  readonly formularioValido = computed(() => {
    const d = this.datos();
    const basico = (d.numeroOc?.trim().length ?? 0) > 0
      && !!d.fechaEmision && d.idMoneda != null
      && (d.montoTotal ?? 0) > 0 && this.vinculadas().length > 0;
    if (this.modo() === 'crear') return basico && !!this.archivo();
    return basico;
  });

  constructor() {
    const params = this.route.snapshot.params;
    const query  = this.route.snapshot.queryParamMap;
    if (params['idOc']) {
      this.modo.set('editar');
      this.idOcEditar.set(Number(params['idOc']));
    } else if (params['idPropuesta']) {
      this.modo.set('crear');
      this.idPropuestaOrigen.set(Number(params['idPropuesta']));
      const reemplazar = query.get('reemplazar');
      if (reemplazar) this.idOcReemplaza.set(Number(reemplazar));
    }
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      if (this.modo() === 'editar' && this.idOcEditar()) {
        const p = await this.svc.prepararEdicion(this.idOcEditar()!);
        this.preparacionEdicion.set(p);
        this.monedas.set(p.monedas);
        this.condicionesPago.set(p.condicionesPago);
        this.otrasPropuestas.set(p.otrasPropuestas);
        this.extraccionIaDisponible.set(p.extraccionIaDisponible);
        this.datos.set({ ...p.oc.datos });
        this.camposIaOriginales.set({ ...(p.oc.datos.camposIa ?? {}) });
        this.nombreArchivo.set(p.oc.nombreArchivoPdf ?? '');
        this.vinculadas.set(p.vinculaciones.map(v => ({
          idPropuesta: v.idPropuesta, numero: v.numero, version: v.version,
          total: v.total, saldo: v.saldo, idMoneda: v.idMoneda,
          monedaSimbolo: this.monedas().find(m => m.id === v.idMoneda)?.simbolo,
          montoAsignado: v.montoAsignado, esOrigen: v.idPropuesta === p.oc.idPropuesta,
          contacto: v.contacto, numeroRq: v.numeroRq, estadoValidacion: v.estadoValidacion,
        })));
      } else {
        const pre = this.idPropuestaOrigen();
        if (pre == null) { this.error.set('Falta la propuesta de origen.'); return; }
        const p = await this.svc.prepararRegistro(pre, this.idOcReemplaza());
        this.preparacion.set(p);
        this.monedas.set(p.monedas);
        this.condicionesPago.set(p.condicionesPago);
        this.otrasPropuestas.set(p.otrasPropuestas);
        this.extraccionIaDisponible.set(p.extraccionIaDisponible);
        // Los datos extraídos del PDF se llenan SOLO con la IA al subir el PDF.
        // Aquí solo guardamos referencia a la propuesta de origen (va al sidebar).
        this.datos.update(d => ({
          ...d,
          numeroPropuesta: p.propuesta.numero,
        }));
        this.vinculadas.set([{
          idPropuesta: p.propuesta.idPropuesta, numero: p.propuesta.numero, version: p.propuesta.version,
          total: p.propuesta.total, saldo: p.propuesta.saldo, idMoneda: p.propuesta.idMoneda,
          monedaSimbolo: p.propuesta.monedaSimbolo, montoAsignado: p.propuesta.saldo, esOrigen: true,
          contacto: p.propuesta.contacto, numeroRq: p.propuesta.numeroRq, servicios: p.propuesta.items,
        }]);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar la ficha.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Drag & drop + extracción IA ───────────────────────────────────────

  onDragOver(ev: DragEvent): void { ev.preventDefault(); this.dragActive.set(true); }
  onDragLeave(ev: DragEvent): void { ev.preventDefault(); this.dragActive.set(false); }

  async onDrop(ev: DragEvent): Promise<void> {
    ev.preventDefault(); this.dragActive.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) await this.aceptarArchivo(file);
  }

  async onArchivoSeleccionado(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.aceptarArchivo(file);
  }

  private async aceptarArchivo(file: File): Promise<void> {
    if (!/\.pdf$/i.test(file.name)) { this.toast.error('Solo se admite PDF.'); return; }
    if (file.size > 10 * 1024 * 1024) { this.toast.error('El PDF supera los 10 MB.'); return; }
    this.archivo.set(file);
    this.nombreArchivo.set(file.name);
    if (this.extraccionIaDisponible()) await this.extraerConIa(file);
  }

  private async extraerConIa(file: File): Promise<void> {
    this.extrayendoIa.set(true);
    this.extraccionExitosa.set(false);
    this.extraccionFallo.set(null);
    try {
      const r = await this.svc.extraerPdf(file);
      this.datos.update(d => ({
        ...r.datos,
        fechaRecepcion: d.fechaRecepcion ?? r.datos.fechaRecepcion,
        facturaIgualOc: d.facturaIgualOc,
        camposManuales: [],
      }));
      this.camposIaOriginales.set({ ...(r.datos.camposIa ?? {}) });
      this.extraccionExitosa.set(true);
      if (r.advertencias.length > 0) this.toast.error(`Advertencias IA: ${r.advertencias.join(' · ')}`);
      else this.toast.exito(`PDF leído por ${r.motor}${r.confianza ? ' (' + Math.round(r.confianza * 100) + '%)' : ''}.`);

      // Validación automática contra la(s) propuesta(s) vinculada(s) — sin esperar click del usuario.
      await this.validarAhora();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'La IA no pudo leer el PDF.';
      this.extraccionFallo.set(msg);
      this.toast.error(msg);
    } finally {
      this.extrayendoIa.set(false);
    }
  }

  quitarArchivo(): void { this.archivo.set(null); this.nombreArchivo.set(''); }

  // ─── Edición de campos ─────────────────────────────────────────────────
  // Los campos se llenan automáticamente por IA al subir el PDF.
  // Después de la extracción, el usuario puede corregir (quedan marcados como ✋ manual).

  esCampoIa(campo: string): boolean {
    const originales = this.camposIaOriginales();
    if (!(campo in originales)) return false;
    return !this.datos().camposManuales.find(m => m.campo === campo);
  }

  esCampoCorregido(campo: string): boolean {
    return !!this.datos().camposManuales.find(m => m.campo === campo);
  }

  marcarCorregido(campo: string, valorNuevo: string | null): void {
    const originales = this.camposIaOriginales();
    if (!(campo in originales)) return;
    const valorIa = originales[campo];
    if (valorIa === valorNuevo) return;
    this.datos.update(d => {
      const idx = d.camposManuales.findIndex(m => m.campo === campo);
      const correccion: CampoCorregidoDto = { campo, valorIa, valorNuevo };
      const camposManuales = idx >= 0
        ? d.camposManuales.map((m, i) => i === idx ? correccion : m)
        : [...d.camposManuales, correccion];
      return { ...d, camposManuales };
    });
  }

  actualizarCampo<K extends keyof DatosOrdenCompraDto>(campo: K, valor: DatosOrdenCompraDto[K], codigoIa?: string): void {
    this.datos.update(d => ({ ...d, [campo]: valor }));
    if (codigoIa) this.marcarCorregido(codigoIa, valor as unknown as string | null);
  }

  // ─── Multi-propuesta ───────────────────────────────────────────────────

  agregarPropuesta(idx: string): void {
    const n = Number(idx);
    const p = this.otrasPropuestas()[n];
    if (!p) return;
    if (this.vinculadas().some(v => v.idPropuesta === p.idPropuesta)) {
      this.toast.error('Esta propuesta ya está vinculada.'); return;
    }
    this.vinculadas.update(list => [...list, {
      idPropuesta: p.idPropuesta, numero: p.numero, version: p.version,
      total: p.total, saldo: p.saldo, idMoneda: p.idMoneda,
      monedaSimbolo: p.monedaSimbolo, montoAsignado: p.saldo, esOrigen: false,
      contacto: p.contacto, numeroRq: p.numeroRq,
    }]);
    this.otrasPropuestas.update(list => list.filter(x => x.idPropuesta !== p.idPropuesta));
  }

  quitarPropuesta(idPropuesta: number): void {
    const v = this.vinculadas().find(x => x.idPropuesta === idPropuesta);
    if (!v || v.esOrigen) return;
    this.vinculadas.update(list => list.filter(x => x.idPropuesta !== idPropuesta));
    this.otrasPropuestas.update(list => [...list, {
      idPropuesta: v.idPropuesta, numero: v.numero, version: v.version,
      total: v.total, saldo: v.saldo, idMoneda: v.idMoneda,
      monedaSimbolo: v.monedaSimbolo, tieneOc: false,
    } as PropuestaDisponibleOcDto]);
  }

  actualizarMontoAsignado(idPropuesta: number, monto: number): void {
    this.vinculadas.update(list => list.map(v =>
      v.idPropuesta === idPropuesta ? { ...v, montoAsignado: monto } : v));
  }

  // ─── Validar en vivo ───────────────────────────────────────────────────

  async validarAhora(): Promise<void> {
    this.comparando.set(true);
    try {
      const r = await this.svc.comparar({
        idOc: this.modo() === 'editar' ? this.idOcEditar() : null,
        idPropuesta: this.modo() === 'crear' ? this.vinculadas().find(v => v.esOrigen)?.idPropuesta ?? null : null,
        idOcReemplaza: null,
        datos: this.datos(),
        vinculaciones: this.vinculadas().map(v => ({ idPropuesta: v.idPropuesta, montoAsignado: v.montoAsignado })),
      }, true);
      this.comparacion.set(r);
      this.toast.exito(`Validación lista: ${r.resumen.resultado}`);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo validar.');
    } finally {
      this.comparando.set(false);
    }
  }

  // ─── Guardar ───────────────────────────────────────────────────────────

  async guardar(decision: Decision): Promise<void> {
    if (!this.formularioValido() || this.guardando()) return;
    this.guardando.set(true);
    try {
      const vinculaciones: VinculacionOrdenCompraDto[] = this.vinculadas().map(v => ({
        idPropuesta: v.idPropuesta, montoAsignado: v.montoAsignado,
      }));
      if (this.modo() === 'editar' && this.idOcEditar()) {
        const r = await this.svc.editarOrdenCompra(this.idOcEditar()!, {
          datos: this.datos(), vinculaciones, decision,
        }, this.archivo());
        this.toast.exito(r.avisoIa ?? 'OC actualizada.');
      } else {
        const idPropOrigen = this.vinculadas().find(v => v.esOrigen)?.idPropuesta;
        if (!idPropOrigen) throw new Error('Falta la propuesta de origen.');
        const r = await this.svc.registrarOrdenCompra(idPropOrigen, {
          idOcReemplaza: this.idOcReemplaza(),  // ← Reemplaza la OC autogenerada de respaldo si existe
          datos: this.datos(), vinculaciones, decision,
        }, this.archivo()!);
        this.toast.exito(r.avisoIa ?? 'OC registrada.');
      }
      void this.router.navigate(['/crm/ordenes-compra']);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al guardar la OC.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void { void this.router.navigate(['/crm/ordenes-compra']); }

  abrirDetalleComparacion(): void {
    if (this.comparacion()) this.modalComparacionAbierto.set(true);
  }

  cerrarDetalleComparacion(): void { this.modalComparacionAbierto.set(false); }

  formatearMonto(monto: number | null | undefined, simbolo?: string | null): string {
    if (monto == null) return '—';
    const s = simbolo ?? '';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`.trim();
  }
}
