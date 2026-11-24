import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ToastService } from '../../../../../core/services/toast.service';
import { RegistroInformeIntranetService } from '../../../../../core/services/registro-informe-intranet.service';
import {
  EvidenciaApi,
  EvidenciasApi,
} from '../../../../../core/models/registro-informe-intranet-api.model';

/**
 * HU-55 Paso 2 — Registro fotográfico.
 *
 * Grid de 8 ó 9 slots obligatorios (según informe físico) + hasta 20 fotos adicionales.
 * Cada slot:
 *   - sube archivo (foto o video)
 *   - la IA valida y responde aprobada / rechazada / omitida (si IA cayó)
 *   - si rechazada, la Asistente puede FORZAR con motivo escrito (HU-12)
 *   - para QR: pide un texto del QR para que el back lo compare
 *   - para encendido: es video con duracionSeg obligatoria
 *
 * Nota: para Fase 3 implementamos la subida básica (foto + PDF informe). El
 * microvideo y el QR quedan con placeholders hasta que haya pruebas en campo.
 */
@Component({
  selector: 'app-paso-evidencias',
  imports: [CommonModule, FormsModule],
  templateUrl: './paso-evidencias.component.html',
  styleUrl: './paso-evidencias.component.scss',
})
export class PasoEvidenciasComponent implements OnInit {
  private readonly svc       = inject(RegistroInformeIntranetService);
  private readonly toast     = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly idOs       = input.required<number>();
  readonly idOsEquipo = input.required<number>();

  /** Se emite cuando se llega a "puede guardar" (8/9 completas) y se da OK a avanzar. */
  readonly completado = output<void>();

  readonly panel = signal<EvidenciasApi | null>(null);
  readonly cargando = signal(false);
  readonly subiendoCodigo = signal<string | null>(null);

  /** Blob URLs cacheadas por idEvidencia para preview. */
  private readonly previewUrls = new Map<number, string>();
  readonly previewPorId = signal<Record<number, SafeUrl>>({});

  /** Modal "Forzar evidencia". */
  readonly mostrarForzar  = signal(false);
  readonly evidenciaForzar = signal<EvidenciaApi | null>(null);
  readonly motivoForzar    = signal<string>('');
  readonly forzando        = signal(false);

  readonly puedeGuardar = computed(() => this.panel()?.cabecera.puedeGuardar ?? false);
  readonly resumenCabecera = computed(() => this.panel()?.cabecera ?? null);

  async ngOnInit(): Promise<void> {
    await this.recargar();
    this.destroyRef.onDestroy(() => this.limpiarPreviewUrls());
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const p = await this.svc.obtenerEvidencias(this.idOs(), this.idOsEquipo());
      this.panel.set(p);
      await this.cargarPreviews(p);
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudieron cargar las evidencias.');
    } finally {
      this.cargando.set(false);
    }
  }

  async seleccionarArchivo(ev: Event, evidencia: EvidenciaApi): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.subiendoCodigo.set(evidencia.codigo);
    try {
      const res = await this.svc.subirEvidencia(this.idOs(), this.idOsEquipo(), {
        codigo: evidencia.codigo,
        archivo: file,
      });
      if (res.estado === 'rechazada') {
        this.toast.info(res.mensaje || 'La IA rechazó la evidencia. Podés forzar si estás seguro.');
      } else if (res.estado === 'omitida') {
        this.toast.info(res.mensaje || 'La IA no está disponible; la evidencia quedó registrada.');
      } else {
        this.toast.exito('Evidencia subida correctamente.');
      }
      await this.recargar();
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudo subir la evidencia.');
    } finally {
      this.subiendoCodigo.set(null);
    }
  }

  abrirForzar(e: EvidenciaApi): void {
    this.evidenciaForzar.set(e);
    this.motivoForzar.set('');
    this.mostrarForzar.set(true);
  }

  cerrarForzar(): void {
    if (this.forzando()) return;
    this.mostrarForzar.set(false);
  }

  async confirmarForzar(): Promise<void> {
    const ev = this.evidenciaForzar();
    const motivo = this.motivoForzar().trim();
    if (!ev || !ev.idEvidencia) return;
    if (motivo.length < 10) { this.toast.error('El motivo debe tener al menos 10 caracteres.'); return; }
    this.forzando.set(true);
    try {
      const p = await this.svc.forzarEvidencia(this.idOs(), this.idOsEquipo(), ev.idEvidencia, motivo);
      this.panel.set(p);
      this.toast.exito('Evidencia forzada.');
      this.mostrarForzar.set(false);
      await this.cargarPreviews(p);
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudo forzar la evidencia.');
    } finally {
      this.forzando.set(false);
    }
  }

  async quitarAdicional(id: number): Promise<void> {
    try {
      const p = await this.svc.quitarEvidenciaAdicional(this.idOs(), this.idOsEquipo(), id);
      this.panel.set(p);
      this.toast.exito('Foto adicional quitada.');
      this.revocarUrl(id);
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudo quitar la foto adicional.');
    }
  }

  async subirAdicional(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.subiendoCodigo.set('adicional');
    try {
      await this.svc.subirEvidencia(this.idOs(), this.idOsEquipo(), { codigo: 'adicional', archivo: file });
      await this.recargar();
      this.toast.exito('Foto adicional subida.');
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudo subir la foto adicional.');
    } finally {
      this.subiendoCodigo.set(null);
    }
  }

  continuar(): void {
    if (!this.puedeGuardar()) return;
    this.completado.emit();
  }

  // ─── Previews ───────────────────────────────────────────────────────

  private async cargarPreviews(p: EvidenciasApi): Promise<void> {
    const todos = [
      ...p.evidencias.filter(e => e.idEvidencia != null),
      ...p.adicionales,
    ];
    for (const e of todos) {
      const id = (e as { idEvidencia: number }).idEvidencia;
      if (!id || this.previewUrls.has(id)) continue;
      try {
        const blob = await this.svc.obtenerArchivoEvidencia(this.idOs(), this.idOsEquipo(), id);
        const url = URL.createObjectURL(blob);
        this.previewUrls.set(id, url);
        this.previewPorId.update(m => ({ ...m, [id]: this.sanitizer.bypassSecurityTrustUrl(url) }));
      } catch { /* silencioso: puede ser video o archivo grande */ }
    }
  }

  private revocarUrl(id: number): void {
    const url = this.previewUrls.get(id);
    if (url) { URL.revokeObjectURL(url); this.previewUrls.delete(id); }
    this.previewPorId.update(m => { const n = { ...m }; delete n[id]; return n; });
  }

  private limpiarPreviewUrls(): void {
    for (const url of this.previewUrls.values()) URL.revokeObjectURL(url);
    this.previewUrls.clear();
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  claseChipEstado(e: EvidenciaApi['estado']): string {
    switch (e) {
      case 'aprobada':  return 'chip chip--verde';
      case 'forzada':   return 'chip chip--azul';
      case 'rechazada': return 'chip chip--rojo';
      case 'omitida':   return 'chip chip--gris';
      default:          return 'chip chip--ambar';
    }
  }

  labelEstado(e: EvidenciaApi['estado']): string {
    switch (e) {
      case 'aprobada':  return 'Aprobada';
      case 'forzada':   return 'Forzada';
      case 'rechazada': return 'Rechazada';
      case 'omitida':   return 'IA no disp.';
      default:          return 'Pendiente';
    }
  }

  acepta(evid: EvidenciaApi): string {
    if (evid.codigo === 'informe') return 'image/*,application/pdf';
    if (evid.medio === 'video')    return 'video/*';
    return 'image/*';
  }
}
