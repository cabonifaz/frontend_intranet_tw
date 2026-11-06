import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  COLOR_ESTADO_CAMPO, etiquetaEstadoCampo,
} from '../../../../core/services/seguimiento-operativo-mapper';
import {
  BandejaSeguimientoOperativo, EstadoTecnicoCampo, FaseDemora, ImpactoIncidencia, OrigenIncidencia,
  PuntoMapa, SeveridadAlerta,
} from '../../../../core/models/seguimiento-operativo.model';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalDetalleServicioComponent } from '../modal-detalle-servicio/modal-detalle-servicio.component';
import { MapaSeguimientoComponent, MarcadorMapa } from '../mapa-seguimiento.component';

type Tab = 'vista_principal' | 'servicios' | 'tecnicos' | 'incidencias';

/** Respaldo si el backend no manda RefrescoSegundos (parámetro SEG_REFRESCO_SEGUNDOS). */
const REFRESCO_POR_DEFECTO_SEG = 30;
/** Nunca se pide más seguido que esto, aunque el parámetro del backend venga muy bajo. */
const REFRESCO_MINIMO_SEG = 5;

/**
 * HU-51 — Bandeja de Seguimiento Operativo (Módulo 11 Control de Campo).
 * Vista del Asistente de Servicio Técnico. 4 tabs: Vista Principal (mapa + alertas +
 * hitos), Servicios en Campo (tabla), Técnicos Activos (cards), Incidencias del Día.
 * Datos reales del backend. Auto-refresh cada `kpis.refrescoSegundos` (SEG_REFRESCO_SEGUNDOS, 30 s por defecto).
 */
@Component({
  selector: 'app-lista-seguimiento-operativo',
  imports: [
    CommonModule, HeaderBandejaComponent, KpiGridComponent, KpiCardComponent, TablaPaginadaComponent,
    ButtonComponent, ModalDetalleServicioComponent, MapaSeguimientoComponent,
  ],
  templateUrl: './lista-seguimiento-operativo.component.html',
  styleUrl: './lista-seguimiento-operativo.component.scss',
})
export class ListaSeguimientoOperativoComponent implements OnInit, OnDestroy {
  private readonly svc   = inject(SeguimientoOperativoService);
  private readonly toast = inject(ToastService);
  readonly router        = inject(Router);

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private destruido = false;
  private cargandoAhora = false;

  readonly cargando = signal(true);
  readonly bandeja  = signal<BandejaSeguimientoOperativo | null>(null);
  /** Error de la primera carga (sin datos que mostrar): se pinta en pantalla en vez de dejarla en blanco. */
  readonly error    = signal<string | null>(null);
  /** Error de un refresco automático: la pantalla conserva los últimos datos y avisa en la franja superior. */
  readonly errorActualizacion = signal<string | null>(null);
  readonly tab      = signal<Tab>('vista_principal');
  readonly idDetalleAbierto = signal<number | null>(null);

  readonly kpis = computed(() => this.bandeja()?.kpis);
  readonly vistaPrincipal = computed(() => this.bandeja()?.vistaPrincipal);
  readonly servicios      = computed(() => this.bandeja()?.serviciosEnCampo ?? []);
  readonly tecnicos       = computed(() => this.bandeja()?.tecnicosActivos ?? []);
  readonly incidencias    = computed(() => this.bandeja()?.incidenciasDia ?? []);
  readonly tarjetasIncidencias = computed(() => this.bandeja()?.tarjetasIncidencias);
  readonly errores        = computed(() => this.bandeja()?.errores ?? {});

  /** Un pin por técnico con posición GPS; el color lo da su estado (leyenda de la pantalla). */
  readonly marcadoresMapa = computed<MarcadorMapa[]>(() =>
    (this.vistaPrincipal()?.mapa ?? [])
      .filter((p): p is PuntoMapa & { lat: number; lng: number } => p.lat !== null && p.lng !== null)
      .map(p => ({
        id:     p.idTecnico,
        lat:    p.lat,
        lng:    p.lng,
        tipo:   'tecnico' as const,
        color:  COLOR_ESTADO_CAMPO[p.estado],
        texto:  p.iniciales,
        titulo: `${p.tecnico} · ${etiquetaEstadoCampo(p.estado)}`,
        popup: [
          p.tecnico,
          p.numero ? `${p.numero}${p.cliente ? ' · ' + p.cliente : ''}` : 'Sin servicio asignado hoy',
          `Estado: ${etiquetaEstadoCampo(p.estado)}`,
          `Última posición: ${p.hace}`,
          ...(p.direccion ? [p.direccion] : []),
        ],
        accion:    p.idServicio !== null ? 'Ver servicio' : undefined,
        prioridad: p.estado === 'con_incidente' ? 200 : p.estado === 'con_demora' ? 100 : 0,
      })),
  );

  readonly tecnicosSinGps = computed(() =>
    (this.vistaPrincipal()?.mapa ?? []).filter(p => p.lat === null || p.lng === null).length);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.limpiarTemporizador();
  }

  async cargar(silencioso = false): Promise<void> {
    if (this.cargandoAhora) return;   // un refresco no se solapa con otra carga en curso
    this.cargandoAhora = true;
    this.limpiarTemporizador();
    if (!silencioso) this.cargando.set(true);
    try {
      const r = await this.svc.obtenerBandeja();
      this.bandeja.set(r);
      this.error.set(null);
      this.errorActualizacion.set(null);
    } catch (e: unknown) {
      const mensaje = e instanceof Error && e.message ? e.message : 'No se pudo cargar la bandeja.';
      if (!this.bandeja()) {
        this.error.set(mensaje);
      } else if (silencioso) {
        this.errorActualizacion.set(mensaje);
      } else {
        this.toast.error(mensaje);
      }
    } finally {
      this.cargando.set(false);
      this.cargandoAhora = false;
      this.programarRefresco();
    }
  }

  /** Auto-refresh con el intervalo que indica el backend (RefrescoSegundos) en cada respuesta. */
  private programarRefresco(): void {
    if (this.destruido) return;
    const seg = Math.max(REFRESCO_MINIMO_SEG, this.kpis()?.refrescoSegundos ?? REFRESCO_POR_DEFECTO_SEG);
    this.temporizador = setTimeout(() => void this.cargar(true), seg * 1000);
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  cambiarTab(t: Tab): void { this.tab.set(t); }

  verDetalleServicio(idServicio: number): void {
    this.idDetalleAbierto.set(idServicio);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  async onDetalleActualizado(): Promise<void> {
    await this.cargar(true);
  }

  verAlerta(idServicio: number): void {
    this.verDetalleServicio(idServicio);
  }

  /** Clic en "Ver servicio" del popup de un pin del mapa (el id del marcador es el del técnico). */
  abrirServicioDesdeMapa(idTecnico: string | number): void {
    const pin = this.vistaPrincipal()?.mapa.find(p => p.idTecnico === idTecnico);
    if (pin?.idServicio) this.verDetalleServicio(pin.idServicio);
  }

  /** La bandeja no trae teléfonos: solo el detalle del servicio (botón "Llamar al técnico"). */
  llamarTecnico(telefono: string | null, nombre: string): void {
    if (!telefono) {
      this.toast.info(`La bandeja no trae el teléfono de ${nombre}. Ábrelo desde el detalle del servicio.`);
      return;
    }
    window.open(`tel:${telefono.replace(/[^\d+]/g, '')}`, '_self');
  }

  // ─── Helpers de estado ───────────────────────────────────────────────────

  claseEstado(e: EstadoTecnicoCampo): string {
    switch (e) {
      case 'sin_salir':      return 'chip chip--gris';
      case 'en_ruta':        return 'chip chip--azul';
      case 'en_planta':
      case 'en_ejecucion':   return 'chip chip--verde';
      case 'con_demora':     return 'chip chip--ambar';
      case 'con_incidente':  return 'chip chip--rojo';
      case 'finalizado':     return 'chip chip--gris-oscuro';
      default:                return 'chip';
    }
  }

  etiquetaEstado(e: EstadoTecnicoCampo): string {
    return etiquetaEstadoCampo(e);
  }

  chipSeveridad(s: SeveridadAlerta): string {
    switch (s) {
      case 'critica':      return 'chip chip--rojo';
      case 'advertencia':  return 'chip chip--ambar';
      case 'info':         return 'chip chip--azul';
      default:              return 'chip';
    }
  }

  labelSeveridad(s: SeveridadAlerta): string {
    switch (s) {
      case 'critica':      return 'Crítica';
      case 'advertencia':  return 'Advertencia';
      case 'info':         return 'Info';
      default:              return s;
    }
  }

  chipImpacto(i: ImpactoIncidencia): string {
    return i === 'detiene' ? 'chip chip--rojo' : 'chip chip--ambar';
  }

  labelImpacto(i: ImpactoIncidencia): string {
    return i === 'detiene' ? 'Detiene' : 'Retrasa';
  }

  /** Momento de la demora: en ruta (azul) vs ingreso a planta (morado), igual que los pines del mapa del servicio. */
  chipMomento(f: FaseDemora | null): string {
    return f === 'ingreso' ? 'chip chip--morado' : 'chip chip--azul';
  }

  labelOrigen(o: OrigenIncidencia): string {
    switch (o) {
      case 'asistente': return 'Asistente';
      case 'sistema':   return 'Sistema';
      default:          return 'Técnico (app)';
    }
  }

  progresoSubtitulo(ejecutados: number, equipos: number): string {
    return `${ejecutados}/${equipos} equipos`;
  }
}
