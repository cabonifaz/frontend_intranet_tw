import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../core/services/toast.service';
import { RegistroInformeIntranetService } from '../../../../../core/services/registro-informe-intranet.service';
import {
  CierreEquipoApi,
  SolicitudCorrelativoApi,
} from '../../../../../core/models/registro-informe-intranet-api.model';

/**
 * HU-55 Paso 5 — Correlativo, Hard Stop y generación del informe.
 *
 * Carga en paralelo:
 *   - /correlativo       → datos del certificado (tipos, asignado, reserva libre, puedeSolicitar)
 *   - /cierre            → checklist de las 5 etapas (Hard Stop) + puedeGenerar
 *
 * Acciones:
 *   - Solicitar correlativo (si OM): abre un ticket al área de Metrología
 *   - Guardar certificado manualmente (si OS o si ya hay número asignado)
 *   - Generar informe: POST /informe (ejecuta el Hard Stop en el back y crea el N° NNNN-AAAA)
 */
@Component({
  selector: 'app-paso-correlativo',
  imports: [CommonModule, FormsModule],
  templateUrl: './paso-correlativo.component.html',
  styleUrl: './paso-correlativo.component.scss',
})
export class PasoCorrelativoComponent implements OnInit {
  private readonly svc   = inject(RegistroInformeIntranetService);
  private readonly toast = inject(ToastService);

  readonly idOs       = input.required<number>();
  readonly idOsEquipo = input.required<number>();

  /** Se emite cuando el informe quedó generado (número NNNN-AAAA). */
  readonly generado = output<string>();

  readonly correlativo = signal<SolicitudCorrelativoApi | null>(null);
  readonly cierre      = signal<CierreEquipoApi | null>(null);
  readonly cargando    = signal(false);

  /** Modal: solicitar correlativo. */
  readonly mostrarModalSolicitar = signal(false);
  readonly idTipoCertificado     = signal<number | null>(null);
  readonly observacionSolicitud  = signal('');
  readonly solicitando           = signal(false);

  /** Modal: ingresar número de certificado manualmente. */
  readonly mostrarModalNumero = signal(false);
  readonly numeroCertificado   = signal('');
  readonly guardandoNumero     = signal(false);

  /** Generando el informe (POST /informe). */
  readonly generando = signal(false);

  readonly cabCorrelativo = computed(() => this.correlativo()?.cabecera ?? null);

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  async recargar(): Promise<void> {
    const idOs = this.idOs(), idEq = this.idOsEquipo();
    this.cargando.set(true);
    try {
      const [corr, cie] = await Promise.all([
        this.svc.obtenerCorrelativo(idOs, idEq),
        this.svc.verificarCierre(idOs, idEq),
      ]);
      this.correlativo.set(corr);
      this.cierre.set(cie);
      if (corr.asignado?.correlativo) this.numeroCertificado.set(corr.asignado.correlativo);
      if (corr.tipos.length && this.idTipoCertificado() == null) {
        this.idTipoCertificado.set(corr.tipos[0].idTipo);
      }
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo cargar el correlativo / cierre.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Solicitar correlativo (OM) ───────────────────────────────────────

  abrirSolicitar(): void {
    this.observacionSolicitud.set('');
    this.mostrarModalSolicitar.set(true);
  }
  cerrarSolicitar(): void {
    if (this.solicitando()) return;
    this.mostrarModalSolicitar.set(false);
  }

  async confirmarSolicitar(): Promise<void> {
    const idTipo = this.idTipoCertificado();
    if (!idTipo) { this.toast.error('Elegí el tipo de certificado.'); return; }
    this.solicitando.set(true);
    try {
      await this.svc.solicitarCorrelativo(this.idOs(), this.idOsEquipo(), {
        idTipoCertificado: idTipo,
        observacion: this.observacionSolicitud().trim() || null,
      });
      this.toast.exito('Solicitud enviada a Metrología.');
      this.mostrarModalSolicitar.set(false);
      await this.recargar();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo solicitar el correlativo.');
    } finally {
      this.solicitando.set(false);
    }
  }

  // ─── Guardar número manual del certificado ───────────────────────────

  abrirGuardarNumero(): void {
    this.numeroCertificado.set(this.correlativo()?.asignado?.correlativo ?? '');
    this.mostrarModalNumero.set(true);
  }
  cerrarGuardarNumero(): void {
    if (this.guardandoNumero()) return;
    this.mostrarModalNumero.set(false);
  }

  async confirmarGuardarNumero(): Promise<void> {
    const n = this.numeroCertificado().trim();
    if (!n) { this.toast.error('Indicá el número de certificado.'); return; }
    this.guardandoNumero.set(true);
    try {
      await this.svc.guardarCertificado(this.idOs(), this.idOsEquipo(), { numeroCertificado: n });
      this.toast.exito('Número de certificado guardado.');
      this.mostrarModalNumero.set(false);
      await this.recargar();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo guardar el certificado.');
    } finally {
      this.guardandoNumero.set(false);
    }
  }

  // ─── Generar informe ─────────────────────────────────────────────────

  async generarInforme(): Promise<void> {
    if (!this.cierre()?.puedeGenerar) {
      this.toast.error('Todavía hay etapas pendientes. Completalas antes de generar.');
      return;
    }
    this.generando.set(true);
    try {
      const r = await this.svc.generarInforme(this.idOs(), this.idOsEquipo());
      this.toast.exito(r.repetida
        ? `Informe ya estaba generado: N° ${r.numeroInforme}.`
        : `Informe generado: N° ${r.numeroInforme}.`);
      this.generado.emit(r.numeroInforme);
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo generar el informe.');
    } finally {
      this.generando.set(false);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  claseEtapa(e: string): string {
    switch (e) {
      case 'conforme':     return 'chip chip--verde';
      case 'en_curso':     return 'chip chip--azul';
      case 'bloqueado':    return 'chip chip--gris';
      case 'no_conforme':  return 'chip chip--rojo';
      default:             return 'chip chip--ambar';
    }
  }
  labelEtapa(e: string): string {
    switch (e) {
      case 'conforme':     return 'Conforme';
      case 'en_curso':     return 'En curso';
      case 'bloqueado':    return 'Bloqueada';
      case 'no_conforme':  return 'No conforme';
      default:             return 'Pendiente';
    }
  }

  esOm(): boolean {
    return (this.cabCorrelativo()?.tipoOrden ?? '').toUpperCase() === 'OM';
  }
}
