import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../core/services/toast.service';
import { RegistroInformeIntranetService } from '../../../../../core/services/registro-informe-intranet.service';
import {
  CargaExcentricidadEnvio,
  CargaPesajeEnvio,
  EnsayosApi,
  FormaPlato,
  GuardarEnsayosApi,
  LecturaExcentricidadApi,
  LecturaPesajeApi,
} from '../../../../../core/models/registro-informe-intranet-api.model';

type SubTab = 'pesaje' | 'excentricidad' | 'encargado';

/**
 * HU-55 Paso 3 — Ensayos y calibración.
 *
 * Subtabs:
 *   - Pesaje: tabla orden × (carga, indicación, error, EMP, resultado). Carga/indicación editables.
 *   - Excentricidad: forma del plato + grupos con N posiciones (centro + laterales).
 *   - Encargado: datos del encargado del cliente (readonly; viene del back).
 *
 * El back calcula error, EMP y resultado al guardar. Si hay error crítico y la
 * Asistente quiere finalizar, pide un motivo.
 */
@Component({
  selector: 'app-paso-ensayos',
  imports: [CommonModule, FormsModule],
  templateUrl: './paso-ensayos.component.html',
  styleUrl: './paso-ensayos.component.scss',
})
export class PasoEnsayosComponent implements OnInit {
  private readonly svc   = inject(RegistroInformeIntranetService);
  private readonly toast = inject(ToastService);

  readonly idOs       = input.required<number>();
  readonly idOsEquipo = input.required<number>();

  readonly completado = output<void>();

  readonly ensayos  = signal<EnsayosApi | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);

  readonly subtab = signal<SubTab>('pesaje');

  /** Cargas pesaje editables (indexadas por orden). */
  readonly pesajeEdit = signal<Record<number, { carga: string; indicacion: string }>>({});

  /** Forma del plato (editable). */
  readonly formaPlato = signal<FormaPlato>('rectangular');

  /** Grupos de excentricidad editables (indexados por grupo). */
  readonly excEdit = signal<Record<number, { carga: string; lecturas: string[] }>>({});

  /** Modal de confirmación finalizar con error crítico. */
  readonly mostrarModalCritico = signal(false);
  readonly motivoCritico       = signal<string>('');

  readonly cab = computed(() => this.ensayos()?.cabecera ?? null);
  readonly finalizado = computed(() => this.cab()?.finalizado ?? false);

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const e = await this.svc.obtenerEnsayos(this.idOs(), this.idOsEquipo());
      this.ensayos.set(e);
      this.formaPlato.set(e.cabecera.formaPlato ?? 'rectangular');
      // Prefill editables con los valores actuales.
      const pe: Record<number, { carga: string; indicacion: string }> = {};
      for (const p of e.pesaje) {
        pe[p.orden] = {
          carga: this.toStr(p.carga),
          indicacion: this.toStr(p.indicacion),
        };
      }
      this.pesajeEdit.set(pe);

      // Agrupar excentricidad por grupo.
      const grupos: Record<number, { carga: string; lecturas: string[] }> = {};
      for (const x of e.excentricidad) {
        if (!grupos[x.grupo]) grupos[x.grupo] = { carga: this.toStr(x.carga), lecturas: [] };
        grupos[x.grupo].lecturas[x.posicion] = this.toStr(x.indicacion);
      }
      this.excEdit.set(grupos);
    } catch (err: unknown) {
      this.toast.error((err as Error)?.message || 'No se pudieron cargar los ensayos.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Guardado parcial ────────────────────────────────────────────────

  async guardar(finalizar: boolean): Promise<void> {
    const cab = this.cab(); if (!cab) return;

    // Si pide finalizar y ya hay error crítico, pedir motivo.
    if (finalizar && this.tieneErrorCritico() && !this.motivoCritico()) {
      this.mostrarModalCritico.set(true);
      return;
    }
    await this.enviar(finalizar, this.motivoCritico().trim() || null);
  }

  private async enviar(finalizar: boolean, motivoErrorCritico: string | null): Promise<void> {
    this.guardando.set(true);
    try {
      const pesaje: CargaPesajeEnvio[] = Object.entries(this.pesajeEdit()).map(([, v]) => ({
        carga:      this.parseNum(v.carga),
        indicacion: this.parseNum(v.indicacion),
      }));
      const excentricidad: CargaExcentricidadEnvio[] = Object.entries(this.excEdit()).map(([, v]) => ({
        carga:    this.parseNum(v.carga),
        lecturas: v.lecturas.map(l => this.parseNum(l)),
      }));
      const payload: GuardarEnsayosApi = {
        formaPlato: this.formaPlato(),
        pesaje,
        excentricidad,
        motivoErrorCritico,
        finalizar,
      };
      await this.svc.guardarEnsayos(this.idOs(), this.idOsEquipo(), payload);
      this.toast.exito(finalizar ? 'Ensayos finalizados.' : 'Ensayos guardados.');
      this.mostrarModalCritico.set(false);
      this.motivoCritico.set('');
      if (finalizar) this.completado.emit();
      else await this.recargar();
    } catch (err: unknown) {
      this.toast.error((err as Error)?.message || 'No se pudieron guardar los ensayos.');
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarFinalizarCritico(): Promise<void> {
    if (this.motivoCritico().trim().length < 10) {
      this.toast.error('El motivo debe tener al menos 10 caracteres.');
      return;
    }
    await this.enviar(true, this.motivoCritico().trim());
  }

  cerrarModalCritico(): void {
    if (this.guardando()) return;
    this.mostrarModalCritico.set(false);
  }

  // ─── Edición pesaje / excentricidad ─────────────────────────────────

  setPesaje(orden: number, campo: 'carga' | 'indicacion', valor: string): void {
    this.pesajeEdit.update(m => ({ ...m, [orden]: { ...m[orden], [campo]: valor } }));
  }

  setExcCarga(grupo: number, valor: string): void {
    this.excEdit.update(m => ({ ...m, [grupo]: { ...m[grupo], carga: valor } }));
  }

  setExcLectura(grupo: number, pos: number, valor: string): void {
    this.excEdit.update(m => {
      const g = { ...m[grupo] };
      const lect = [...(g.lecturas ?? [])];
      lect[pos] = valor;
      g.lecturas = lect;
      return { ...m, [grupo]: g };
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  tieneErrorCritico(): boolean {
    const e = this.ensayos();
    if (!e) return false;
    return e.pesaje.some(p => p.critico) || e.excentricidad.some(x => x.critico);
  }

  pesajeOrdenado(): LecturaPesajeApi[] {
    return [...(this.ensayos()?.pesaje ?? [])].sort((a, b) => a.orden - b.orden);
  }

  gruposExc(): { grupo: number; lecturas: LecturaExcentricidadApi[] }[] {
    const exc = this.ensayos()?.excentricidad ?? [];
    const map = new Map<number, LecturaExcentricidadApi[]>();
    for (const x of exc) {
      if (!map.has(x.grupo)) map.set(x.grupo, []);
      map.get(x.grupo)!.push(x);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([grupo, lecturas]) => ({
        grupo,
        lecturas: lecturas.sort((a, b) => a.posicion - b.posicion),
      }));
  }

  claseResultado(r: 'conforme' | 'no_conforme' | null): string {
    if (r === 'conforme')     return 'chip chip--verde';
    if (r === 'no_conforme')  return 'chip chip--rojo';
    return 'chip chip--gris';
  }

  labelResultado(r: 'conforme' | 'no_conforme' | null): string {
    if (r === 'conforme')    return 'Conforme';
    if (r === 'no_conforme') return 'No conforme';
    return '—';
  }

  private toStr(n: number | null | undefined): string {
    return n == null || !Number.isFinite(n) ? '' : String(n);
  }

  private parseNum(s: string | null | undefined): number | null {
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
}
