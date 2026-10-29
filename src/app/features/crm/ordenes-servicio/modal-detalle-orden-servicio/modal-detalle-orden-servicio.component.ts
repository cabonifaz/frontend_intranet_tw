import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TabsComponent, Tab } from '../../../../shared/ui/tabs/tabs.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  DetalleOrdenServicio,
  EstadoEjecucionEquipo,
  EstadoGrupoOrdenServicio,
  TipoOrden,
} from '../../../../core/models/ordenes-servicio.model';

type TabInterno =
  | 'resumen'
  | 'propuesta'
  | 'equipos'
  | 'conceptos'
  | 'observaciones'
  | 'programacion'
  | 'certificado';

/**
 * HU-42 — Modal de detalle unificado de OS/OM (solo lectura).
 *
 * 6 tabs base + 7mo "Certificado" solo si tipo = OM.
 * Las acciones (Solicitar Edición / Anular) se emiten como output para que el padre
 * decida qué modal abrir (modales independientes definidos en HU-40).
 *
 * Documentos y Auditoría se abren desde el header; reusan los modales de HU-31 / HU-32.
 */
@Component({
  selector: 'app-modal-detalle-orden-servicio',
  imports: [CommonModule, ModalComponent, ButtonComponent, TabsComponent],
  templateUrl: './modal-detalle-orden-servicio.component.html',
  styleUrl: './modal-detalle-orden-servicio.component.scss',
})
export class ModalDetalleOrdenServicioComponent {
  readonly idOs = input.required<number>();

  readonly cerrar             = output<void>();
  readonly solicitarEdicion   = output<DetalleOrdenServicio>();
  readonly resolverSolicitud  = output<DetalleOrdenServicio>();
  readonly editar             = output<DetalleOrdenServicio>();
  readonly anular             = output<DetalleOrdenServicio>();
  readonly abrirDocumentos    = output<number | null>();  // idExpediente
  readonly abrirAuditoria     = output<number | null>();

  private readonly svc    = inject(OrdenesServicioService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly cargando = signal(true);
  readonly error    = signal<string | null>(null);
  readonly detalle  = signal<DetalleOrdenServicio | null>(null);

  readonly tabActivo = signal<TabInterno>('resumen');

  /** Tabs lazy ya cargados — para no re-fetchear al cambiar entre tabs. */
  private readonly tabsCargados = new Set<TabInterno>(['resumen']);
  readonly cargandoTab = signal<TabInterno | null>(null);

  readonly tituloModal = computed(() => {
    const d = this.detalle();
    const nombreTipo = d?.tipo === 'OM' ? 'Orden de Metrología' : 'Orden de Servicio';
    return d ? `Detalle de ${nombreTipo}` : 'Detalle de OS/OM';
  });

  /** Número del documento (OS-000001) pintado en azul al lado del título. */
  readonly numeroDoc = computed(() => this.detalle()?.numero ?? '');

  readonly subtituloModal = computed(() => {
    const d = this.detalle();
    if (!d) return '';
    const partes: string[] = [d.datosGenerales.razonSocial];
    partes.push(`Responsable: ${d.responsable}`);
    if (d.datosGenerales.fechaEmision) {
      partes.push(`Emisión: ${this.formatearFecha(d.datosGenerales.fechaEmision)}`);
    }
    return partes.join(' · ');
  });

  private formatearFecha(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  // Tabs se arman según detalle (el 7mo "Certificado" solo si OM).
  // Sin íconos — homologado al patrón de propuestas y requerimientos.
  readonly tabs = computed<Tab[]>(() => {
    const d = this.detalle();
    const esOm = d?.tipo === 'OM';
    const tabs: Tab[] = [
      { codigo: 'resumen',       label: 'Resumen' },
      { codigo: 'propuesta',     label: 'Propuesta Origen' },
      { codigo: 'equipos',       label: `Equipos / Instrumentos${d ? ' (' + d.equipos.length + ')' : ''}` },
      { codigo: 'conceptos',     label: `Conceptos${d ? ' (' + d.conceptos.length + ')' : ''}` },
      { codigo: 'observaciones', label: 'Observaciones' },
      { codigo: 'programacion',  label: 'Programación' },
    ];
    if (esOm) tabs.push({ codigo: 'certificado', label: 'Certificado' });
    return tabs;
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const d = await this.svc.obtenerDetalle(this.idOs());
      this.detalle.set(d);
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudo cargar el detalle de la OS/OM.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarTab(codigo: string): Promise<void> {
    const tab = codigo as TabInterno;
    this.tabActivo.set(tab);
    if (!this.tabsCargados.has(tab)) {
      await this.cargarTab(tab);
    }
  }

  /** Carga lazy el tab recién activado y hace merge en `detalle()`. */
  private async cargarTab(tab: TabInterno): Promise<void> {
    const idOs = this.idOs();
    this.cargandoTab.set(tab);
    try {
      switch (tab) {
        case 'propuesta': {
          const p = await this.svc.obtenerTabPropuesta(idOs);
          this.detalle.update(d => d ? { ...d, propuestaOrigen: p } : null);
          break;
        }
        case 'equipos':
        case 'conceptos': {
          // Equipos y conceptos van juntos: necesitamos ambos para resolver
          // la relación "conceptos aplicados a cada equipo".
          const { equipos, conceptos } = await this.svc.obtenerTabEquiposYConceptos(idOs);
          this.detalle.update(d => d ? { ...d, equipos, conceptos } : null);
          this.tabsCargados.add('equipos');
          this.tabsCargados.add('conceptos');
          break;
        }
        case 'observaciones': {
          const obs = await this.svc.obtenerTabObservaciones(idOs);
          this.detalle.update(d => d ? { ...d, observaciones: obs } : null);
          break;
        }
        case 'programacion': {
          const prog = await this.svc.obtenerTabProgramacion(idOs);
          this.detalle.update(d => d ? { ...d, programacion: prog } : null);
          break;
        }
        case 'certificado': {
          const cert = await this.svc.obtenerTabCertificado(idOs);
          this.detalle.update(d => d ? { ...d, datosCertificado: cert } : null);
          break;
        }
      }
      this.tabsCargados.add(tab);
    } catch (e: any) {
      this.toast.error(e?.message ?? `No se pudo cargar el tab ${tab}.`);
    } finally {
      this.cargandoTab.set(null);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Botones de acción del header ───────────────────────────────────────
  onDocumentos(): void {
    this.abrirDocumentos.emit(this.detalle()?.idExpediente ?? null);
  }

  onAuditoria(): void {
    this.abrirAuditoria.emit(this.detalle()?.idExpediente ?? null);
  }

  onSolicitarEdicion(): void {
    const d = this.detalle();
    if (d) this.solicitarEdicion.emit(d);
  }

  onResolverSolicitud(): void {
    const d = this.detalle();
    if (d) this.resolverSolicitud.emit(d);
  }

  onEditar(): void {
    const d = this.detalle();
    if (d) this.editar.emit(d);
  }

  onAnular(): void {
    const d = this.detalle();
    if (d) this.anular.emit(d);
  }

  irAPropuesta(): void {
    const d = this.detalle();
    if (!d) return;
    this.router.navigate(['/crm/propuestas'], { queryParams: { idPropuesta: d.propuestaOrigen.idPropuesta } });
    this.onCerrar();
  }

  irAProgramacion(): void {
    const d = this.detalle();
    if (!d?.programacion.idProgramacion) {
      this.toast.info('Esta OS/OM todavía no fue programada. Operaciones la verá en el Módulo 8.');
      return;
    }
    this.toast.info('Navegación a Módulo 8 Programación (pendiente).');
  }

  // ─── Helpers visuales ───────────────────────────────────────────────────
  claseChipTipo(t: TipoOrden): string {
    return t === 'OS' ? 'chip-tipo chip-tipo--os' : 'chip-tipo chip-tipo--om';
  }

  claseEstado(e: EstadoGrupoOrdenServicio): string {
    return {
      borrador:     'badge--gris',
      emitida:      'badge--azul',
      programada:   'badge--morado',
      en_ejecucion: 'badge--ambar',
      finalizada:   'badge--verde',
      anulada:      'badge--rojo',
    }[e] ?? 'badge--gris';
  }

  claseEjecucion(e: EstadoEjecucionEquipo): string {
    return {
      pendiente:  'chip-ejec chip-ejec--pendiente',
      en_proceso: 'chip-ejec chip-ejec--enProceso',
      ejecutado:  'chip-ejec chip-ejec--ejecutado',
      observado:  'chip-ejec chip-ejec--observado',
    }[e] ?? 'chip-ejec';
  }

  conceptosLabel(codigos: string[]): string {
    if (codigos.length === 0) return 'General';
    return codigos.join(' · ');
  }

  equiposLabel(codigos: string[]): string {
    if (codigos.length === 0) return 'General';
    if (codigos.length <= 3) return codigos.join(' · ');
    return codigos.slice(0, 3).join(' · ') + ` · +${codigos.length - 3} más`;
  }
}
