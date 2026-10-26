import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExpedientesDigitalesService } from '../../../../core/services/expedientes-digitales.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  AlertaSlaHistorialDto,
  BloqueoHistorialDto,
  EventoExpedienteDto,
  FiltrosHistorialExpedienteDto,
  HistorialExpedienteDto,
  ReasignacionHistorialDto,
} from '../../../../core/models/expedientes-digitales.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';

type TabAud = 'timeline' | 'reasignaciones' | 'bloqueos' | 'alertas_sla';

/** HU-32 — Modal Historial de Auditoría del Expediente. */
@Component({
  selector: 'app-modal-auditoria-expediente',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-auditoria-expediente.component.html',
  styleUrl: './modal-auditoria-expediente.component.scss',
})
export class ModalAuditoriaExpedienteComponent implements OnInit {
  private readonly svc   = inject(ExpedientesDigitalesService);
  private readonly toast = inject(ToastService);

  readonly idExpediente     = input.required<number>();
  readonly numeroExpediente = input<string>('');
  readonly cerrar           = output<void>();

  readonly cargando   = signal(true);
  readonly data       = signal<HistorialExpedienteDto | null>(null);
  readonly exportando = signal(false);

  readonly tabActivo = signal<TabAud>('timeline');
  readonly busqueda  = signal<string>('');
  readonly desde     = signal<string>('');
  readonly hasta     = signal<string>('');
  readonly idUsuario = signal<number | null>(null);
  readonly etapa     = signal<string>('');
  readonly tipoEvento = signal<string>('');

  readonly totalEventos = computed(() => this.data()?.timeline.length ?? 0);

  async ngOnInit(): Promise<void> { await this.cargar(); }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const f: FiltrosHistorialExpedienteDto = {
        busqueda:   this.busqueda() || undefined,
        desde:      this.desde() || undefined,
        hasta:      this.hasta() || undefined,
        idUsuario:  this.idUsuario() ?? undefined,
        etapa:      this.etapa() || undefined,
        tipoEvento: this.tipoEvento() || undefined,
      };
      this.data.set(await this.svc.obtenerHistorial(this.idExpediente(), f));
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo cargar el historial.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: TabAud): void { this.tabActivo.set(t); }
  aplicarFiltros(): void { void this.cargar(); }

  /** Extrae el mensaje real del back cuando el request de blob falla. */
  private async mensajeErrorBlob(e: unknown, fallback: string): Promise<string> {
    const err = e as { error?: unknown; status?: number; message?: string };
    const body = err?.error;
    if (body instanceof Blob) {
      try {
        const texto = await body.text();
        try {
          const json = JSON.parse(texto) as { mensaje?: string; message?: string };
          return json.mensaje || json.message || fallback;
        } catch {
          return texto || fallback;
        }
      } catch {
        return fallback;
      }
    }
    if (err?.status === 404) return 'No se encontró el archivo.';
    if (err?.status === 403) return 'No tienes permisos para exportar.';
    if (err?.status === 401) return 'Sesión expirada. Volvé a iniciar sesión.';
    return err?.message || fallback;
  }

  async exportar(formato: 'xlsx' | 'pdf'): Promise<void> {
    this.exportando.set(true);
    try {
      const blob = await this.svc.descargarHistorial(
        this.idExpediente(), this.tabActivo(), formato,
        {
          busqueda:   this.busqueda() || undefined,
          desde:      this.desde() || undefined,
          hasta:      this.hasta() || undefined,
          idUsuario:  this.idUsuario() ?? undefined,
          etapa:      this.etapa() || undefined,
          tipoEvento: this.tipoEvento() || undefined,
        },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial_${this.numeroExpediente() || this.idExpediente()}.${formato}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.error(await this.mensajeErrorBlob(e, 'No se pudo exportar.'));
    } finally {
      this.exportando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Helpers ────────────────────────────────────────────────────────

  cantidadTab(codigo: string): number {
    const d = this.data();
    if (!d) return 0;
    return d.tabs.find(t => t.codigo === codigo)?.cantidad ?? 0;
  }

  /** Icono por tipo de evento / acción. */
  iconoEvento(ev: EventoExpedienteDto): string {
    const t = ((ev.tipoEvento ?? '') + ' ' + (ev.accion ?? '') + ' ' + (ev.titulo ?? '')).toLowerCase();
    if (t.includes('reasign')) return 'swap_horiz';
    if (t.includes('bloqueo') || t.includes('bloque')) return 'block';
    if (t.includes('aprob') || t.includes('acept')) return 'check_circle';
    if (t.includes('rechaz')) return 'cancel';
    if (t.includes('solicit')) return 'help';
    if (t.includes('propuest') && t.includes('gener')) return 'request_page';
    if (t.includes('rq') || t.includes('requer')) return 'description';
    if (t.includes('propuest')) return 'request_page';
    if (t.includes('vb') || t.includes('visto')) return 'how_to_reg';
    if (t.includes('seguim')) return 'phone_in_talk';
    if (t.includes('oc') || t.includes('compra')) return 'receipt_long';
    if (t.includes('os') || t.includes('servicio')) return 'engineering';
    if (t.includes('sla') || t.includes('alerta')) return 'warning';
    return 'bolt';
  }

  colorEvento(ev: EventoExpedienteDto): string {
    const t = ((ev.tipoEvento ?? '') + ' ' + (ev.accion ?? '') + ' ' + (ev.etapa ?? '')).toLowerCase();
    if (t.includes('bloque')) return 'rojo';
    if (t.includes('reasign')) return 'ambar';
    if (t.includes('rechaz')) return 'rojo';
    if (t.includes('aprob') || t.includes('acept')) return 'verde';
    if (t.includes('sla')) return 'ambar';
    if (ev.urgente) return 'rojo';
    return 'azul';
  }

  chipEtapa(etapa?: string | null): string {
    const e = (etapa || '').toLowerCase();
    if (e.includes('rq') || e.includes('requer')) return 'azul';
    if (e.includes('propuest')) return 'violeta';
    if (e.includes('vb') || e.includes('visto')) return 'violeta';
    if (e.includes('seg')) return 'cian';
    if (e.includes('oc') || e.includes('compra')) return 'ambar';
    if (e.includes('os') || e.includes('servicio')) return 'verde';
    if (e.includes('ssoma')) return 'rojo';
    if (e.includes('reasign')) return 'ambar';
    if (e.includes('bloque')) return 'rojo';
    return 'neutro';
  }

  nivelAlerta(nivel: string): string {
    const n = (nivel || '').toLowerCase();
    if (n === 'vencido') return 'rojo';
    if (n === 'riesgo') return 'ambar';
    return 'azul';
  }

  formatearFechaHora(fecha?: string | null): { fecha: string; hora: string } {
    if (!fecha) return { fecha: '—', hora: '' };
    const d = new Date(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return { fecha: `${dd}/${mm}/${yy}`, hora: `${hh}:${mi}` };
  }

  iniciales(nombre?: string | null): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

  // Casters para el template
  asReasignacion(r: unknown): ReasignacionHistorialDto { return r as ReasignacionHistorialDto; }
  asBloqueo(b: unknown): BloqueoHistorialDto { return b as BloqueoHistorialDto; }
  asAlerta(a: unknown): AlertaSlaHistorialDto { return a as AlertaSlaHistorialDto; }
}
