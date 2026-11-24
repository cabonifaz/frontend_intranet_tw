import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { RegistroInformeIntranetService } from '../../../../core/services/registro-informe-intranet.service';
import {
  ConstanciaApi,
  FirmasApi,
  ResponsableFirmaApi,
} from '../../../../core/models/registro-informe-intranet-api.model';

type TabFC = 'firma' | 'constancia';

/**
 * HU-55 Fase 6 — Firma de informes + Constancia de atención (nivel OS).
 *
 * Vista independiente del wizard de registro: se abre desde el seguimiento
 * operativo cuando ya hay informes generados y hay que cerrar la OS.
 *
 * Dos pestañas:
 *   - Firma de informes: por responsable del cliente, firma física (foto + nombre)
 *     o marca "cliente ausente" con motivo.
 *   - Constancia de atención: equipos atendidos, firmantes faltantes, firma de la
 *     constancia y generación del PDF final.
 */
@Component({
  selector: 'app-ficha-firma-constancia',
  imports: [
    CommonModule, FormsModule, HeroHeaderComponent, BreadcrumbComponent, ButtonComponent,
  ],
  templateUrl: './ficha-firma-constancia.component.html',
  styleUrl: './ficha-firma-constancia.component.scss',
})
export class FichaFirmaConstanciaComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly toast      = inject(ToastService);
  private readonly svc        = inject(RegistroInformeIntranetService);
  private readonly sanitizer  = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly idOs = signal<number | null>(null);
  readonly tab  = signal<TabFC>('firma');

  readonly firmas     = signal<FirmasApi | null>(null);
  readonly constancia = signal<ConstanciaApi | null>(null);
  readonly cargando   = signal(false);

  /** Blob URLs cacheadas para la foto de la constancia. */
  private readonly previews = new Map<string, string>();
  readonly fotoConstancia = signal<SafeUrl | null>(null);

  // ─── Modal: firmar físico ─────────────────────────────────────────────
  readonly mostrarModalFirmar = signal(false);
  readonly responsableActivo  = signal<ResponsableFirmaApi | null>(null);
  readonly nombreFirma        = signal('');
  readonly archivoFirma       = signal<File | null>(null);
  readonly firmando           = signal(false);

  // ─── Modal: cliente ausente ───────────────────────────────────────────
  readonly mostrarModalAusente = signal(false);
  readonly motivoAusente       = signal('');
  readonly marcandoAusente     = signal(false);

  // ─── Modal: firmar constancia ─────────────────────────────────────────
  readonly mostrarModalConstanciaFoto = signal(false);
  readonly nombreConstancia           = signal('');
  readonly archivoConstancia          = signal<File | null>(null);
  readonly firmandoConstancia         = signal(false);

  readonly generandoConstancia = signal(false);

  readonly cabFirma = computed(() => this.firmas()?.cabecera ?? null);
  readonly cabCons  = computed(() => this.constancia()?.cabecera ?? null);

  async ngOnInit(): Promise<void> {
    const idOs = Number(this.route.snapshot.paramMap.get('idOs'));
    if (!idOs) {
      this.toast.error('Ruta inválida.');
      this.router.navigate(['/operaciones/seguimiento-operativo']);
      return;
    }
    this.idOs.set(idOs);
    await this.recargar();
    this.destroyRef.onDestroy(() => this.limpiarPreviews());
  }

  async recargar(): Promise<void> {
    const idOs = this.idOs(); if (!idOs) return;
    this.cargando.set(true);
    try {
      const [f, c] = await Promise.all([
        this.svc.obtenerFirmaInformes(idOs),
        this.svc.obtenerConstancia(idOs),
      ]);
      this.firmas.set(f);
      this.constancia.set(c);
      await this.cargarFotoConstancia();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo cargar la firma / constancia.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Firmar informe (físico) ──────────────────────────────────────────

  abrirFirmar(r: ResponsableFirmaApi): void {
    this.responsableActivo.set(r);
    this.nombreFirma.set(r.nombre);
    this.archivoFirma.set(null);
    this.mostrarModalFirmar.set(true);
  }
  cerrarFirmar(): void {
    if (this.firmando()) return;
    this.mostrarModalFirmar.set(false);
  }
  onArchivoFirma(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoFirma.set(file);
  }

  async confirmarFirmar(): Promise<void> {
    const r = this.responsableActivo();
    const file = this.archivoFirma();
    const nombre = this.nombreFirma().trim();
    if (!r?.clave) return;
    if (!file) { this.toast.error('Adjuntá la foto del papel firmado.'); return; }
    if (!nombre) { this.toast.error('Indicá el nombre del firmante.'); return; }
    this.firmando.set(true);
    try {
      await this.svc.firmarInformeFisico(this.idOs()!, r.clave, file, nombre);
      this.toast.exito('Firma registrada.');
      this.mostrarModalFirmar.set(false);
      await this.recargar();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo registrar la firma.');
    } finally {
      this.firmando.set(false);
    }
  }

  // ─── Cliente ausente ──────────────────────────────────────────────────

  abrirAusente(r: ResponsableFirmaApi): void {
    this.responsableActivo.set(r);
    this.motivoAusente.set('');
    this.mostrarModalAusente.set(true);
  }
  cerrarAusente(): void {
    if (this.marcandoAusente()) return;
    this.mostrarModalAusente.set(false);
  }

  async confirmarAusente(): Promise<void> {
    const r = this.responsableActivo();
    const motivo = this.motivoAusente().trim();
    if (!r?.clave) return;
    if (motivo.length < 5) { this.toast.error('El motivo debe tener al menos 5 caracteres.'); return; }
    this.marcandoAusente.set(true);
    try {
      await this.svc.firmarInformeAusente(this.idOs()!, r.clave, { motivo });
      this.toast.exito('Cliente ausente registrado.');
      this.mostrarModalAusente.set(false);
      await this.recargar();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo registrar el ausente.');
    } finally {
      this.marcandoAusente.set(false);
    }
  }

  // ─── Constancia ───────────────────────────────────────────────────────

  abrirFirmarConstancia(): void {
    this.nombreConstancia.set(this.cabCons()?.contactoNombre ?? '');
    this.archivoConstancia.set(null);
    this.mostrarModalConstanciaFoto.set(true);
  }
  cerrarFirmarConstancia(): void {
    if (this.firmandoConstancia()) return;
    this.mostrarModalConstanciaFoto.set(false);
  }
  onArchivoConstancia(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoConstancia.set(file);
  }

  async confirmarFirmarConstancia(): Promise<void> {
    const file = this.archivoConstancia();
    const nombre = this.nombreConstancia().trim();
    if (!file)   { this.toast.error('Adjuntá la foto del papel firmado.'); return; }
    if (!nombre) { this.toast.error('Indicá el nombre del firmante.'); return; }
    this.firmandoConstancia.set(true);
    try {
      await this.svc.firmarConstanciaFisico(this.idOs()!, file, nombre);
      this.toast.exito('Constancia firmada.');
      this.mostrarModalConstanciaFoto.set(false);
      await this.recargar();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo registrar la firma de la constancia.');
    } finally {
      this.firmandoConstancia.set(false);
    }
  }

  async generarConstancia(): Promise<void> {
    if (!this.cabCons()?.puedeGenerar) {
      this.toast.error('Todavía hay informes sin firmar; no se puede generar la constancia.');
      return;
    }
    this.generandoConstancia.set(true);
    try {
      await this.svc.generarConstancia(this.idOs()!);
      this.toast.exito('Constancia generada. Se envió al cliente.');
      await this.recargar();
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo generar la constancia.');
    } finally {
      this.generandoConstancia.set(false);
    }
  }

  async descargarConstancia(tipo: 'pdf' | 'foto'): Promise<void> {
    try {
      const blob = await this.svc.obtenerArchivoConstancia(this.idOs()!, tipo);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `constancia-${this.cabCons()?.numeroOs ?? 'os'}.${tipo === 'pdf' ? 'pdf' : 'jpg'}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error((e as Error)?.message || 'No se pudo descargar el archivo.');
    }
  }

  // ─── Previews ─────────────────────────────────────────────────────────

  private async cargarFotoConstancia(): Promise<void> {
    if (!this.cabCons()?.tieneFoto) return;
    const key = `foto-${this.idOs()}`;
    if (this.previews.has(key)) return;
    try {
      const blob = await this.svc.obtenerArchivoConstancia(this.idOs()!, 'foto');
      const url = URL.createObjectURL(blob);
      this.previews.set(key, url);
      this.fotoConstancia.set(this.sanitizer.bypassSecurityTrustUrl(url));
    } catch { /* silencioso */ }
  }

  private limpiarPreviews(): void {
    for (const url of this.previews.values()) URL.revokeObjectURL(url);
    this.previews.clear();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const n = this.cabFirma()?.numeroOs ?? this.cabCons()?.numeroOs;
    const items: BreadcrumbItem[] = [
      { label: 'Inicio',                ruta: '/dashboard' },
      { label: 'Operaciones' },
      { label: 'Seguimiento Operativo', ruta: '/operaciones/seguimiento-operativo' },
    ];
    if (n) items.push({ label: n });
    items.push({ label: 'Firma y Constancia' });
    return items;
  });

  readonly subtitulo = computed(() => {
    const c = this.cabFirma()?.cliente ?? this.cabCons()?.cliente;
    const n = this.cabFirma()?.numeroOs ?? this.cabCons()?.numeroOs;
    return `${n ?? '—'} · ${c ?? '—'}`;
  });

  claseFirma(f: string): string {
    switch (f) {
      case 'firmado':    return 'chip chip--verde';
      case 'ausente':    return 'chip chip--ambar';
      case 'pendiente':  return 'chip chip--azul';
      default:           return 'chip chip--gris';
    }
  }
  labelFirma(f: string): string {
    switch (f) {
      case 'firmado':    return 'Firmado';
      case 'ausente':    return 'Ausente';
      case 'pendiente':  return 'Pendiente';
      case 'incompleto': return 'Incompleto';
      default:           return f;
    }
  }

  formatearHoras(seg: number | null | undefined): string {
    if (seg == null) return '—';
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    if (h <= 0 && m <= 0) return 'Plazo cumplido';
    if (h === 0) return `${m} min restantes`;
    return `${h} h ${m} min restantes`;
  }

  volver(): void {
    this.router.navigate(['/operaciones/seguimiento-operativo']);
  }
}
