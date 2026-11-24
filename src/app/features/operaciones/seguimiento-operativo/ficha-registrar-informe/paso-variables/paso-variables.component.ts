import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../core/services/toast.service';
import { RegistroInformeIntranetService } from '../../../../../core/services/registro-informe-intranet.service';
import {
  CatalogoItemRegistroApi,
  VariablesAmbientalesApi,
} from '../../../../../core/models/registro-informe-intranet-api.model';

/**
 * HU-55 Paso 1 — Variables ambientales del equipo.
 *
 * Pequeño formulario de 3 campos (temperatura °C, humedad %, procedencia).
 * Si ya hay valores (porque la Asistente retomó el borrador o el técnico cargó
 * algo antes), los pre-carga desde /informe-en-curso.
 */
@Component({
  selector: 'app-paso-variables',
  imports: [CommonModule, FormsModule],
  templateUrl: './paso-variables.component.html',
  styleUrl: './paso-variables.component.scss',
})
export class PasoVariablesComponent implements OnInit {
  private readonly svc   = inject(RegistroInformeIntranetService);
  private readonly toast = inject(ToastService);

  readonly idOs       = input.required<number>();
  readonly idOsEquipo = input.required<number>();
  readonly procedencias = input<CatalogoItemRegistroApi[]>([]);

  /** Se emite cuando el formulario se guarda, para que el padre avance. */
  readonly guardado = output<VariablesAmbientalesApi>();

  readonly temperatura = signal<string>('');
  readonly humedad     = signal<string>('');
  readonly procedencia = signal<string>('');

  readonly registradoEn = signal<string | null>(null);
  readonly cargando     = signal(false);
  readonly guardando    = signal(false);

  readonly puedeGuardar = computed(() => {
    const t = Number(this.temperatura()), h = Number(this.humedad());
    if (!Number.isFinite(t) || !Number.isFinite(h)) return false;
    if (t < -40 || t > 80)   return false;
    if (h < 0   || h > 100)  return false;
    if (!this.procedencia()) return false;
    return !this.guardando();
  });

  async ngOnInit(): Promise<void> {
    await this.precargar();
  }

  async precargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const curso = await this.svc.informeEnCurso(this.idOs(), this.idOsEquipo());
      const v = curso.trabajo?.variables ?? null;
      if (v) {
        this.temperatura.set(this.formatNum(v.temperatura));
        this.humedad.set(this.formatNum(v.humedad));
        this.procedencia.set(v.procedencia ?? '');
        this.registradoEn.set(v.registradoEn);
      } else {
        // Valor por defecto razonable del primer ítem del combo.
        const first = this.procedencias()[0]?.codigo ?? '';
        if (first && !this.procedencia()) this.procedencia.set(first);
      }
    } catch {
      // Silencioso: si no hay informe en curso, se carga vacío.
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) return;
    this.guardando.set(true);
    try {
      const trabajo = await this.svc.guardarVariablesAmbientales(this.idOs(), this.idOsEquipo(), {
        temperatura: Number(this.temperatura()),
        humedad:     Number(this.humedad()),
        procedencia: this.procedencia(),
      });
      const v = trabajo.variables;
      if (v) {
        this.registradoEn.set(v.registradoEn);
        this.guardado.emit(v);
        this.toast.exito('Variables ambientales guardadas.');
      }
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudieron guardar las variables ambientales.');
    } finally {
      this.guardando.set(false);
    }
  }

  private formatNum(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '';
    return Number.isInteger(n) ? String(n) : String(n);
  }
}
