import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BusquedaTecnicos,
  TecnicoProgramacion,
} from '../../../../core/models/programacion-operativa.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

type TabRecurso = 'tecnico' | 'metrologo' | 'externo';

/**
 * Modal "Asignar Recurso" (HU-36): tabs Técnico / Metrólogo / Externo + buscador +
 * lista de recursos. El padre pasa el id de la OS, la fecha y horario, y la
 * selección actual (principal + apoyos). El modal emite la nueva selección al
 * cerrarse con el botón "Confirmar selección".
 */
@Component({
  selector: 'app-modal-asignar-recurso',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-asignar-recurso.component.html',
  styleUrl: './modal-asignar-recurso.component.scss',
})
export class ModalAsignarRecursoComponent implements OnInit {
  private readonly svc   = inject(ProgramacionOperativaService);
  private readonly toast = inject(ToastService);

  readonly idOs       = input.required<number>();
  readonly fecha      = input<string | null>(null);
  readonly horaInicio = input<string | null>(null);
  readonly horaFin    = input<string | null>(null);
  readonly idPrincipalInicial = input<number | null>(null);
  readonly idsApoyoInicial    = input<number[]>([]);
  // Contexto de cabecera (opcional)
  readonly razonSocial  = input<string | null>(null);
  readonly sede         = input<string | null>(null);
  readonly tipoServicio = input<string | null>(null);
  readonly zona         = input<string | null>(null);
  /** Nº recomendado de técnicos para este servicio (hint del footer). */
  readonly tecnicosRecomendados = input<number | null>(null);

  readonly cerrar      = output<void>();
  readonly confirmado  = output<{ idPrincipal: number | null; idsApoyo: number[] }>();

  readonly tab               = signal<TabRecurso>('tecnico');
  readonly busqueda          = signal('');
  readonly soloDisponibles   = signal(false);
  readonly soloSsomaConforme = signal(false);
  readonly cargando          = signal(false);

  readonly recursos    = signal<TecnicoProgramacion[]>([]);
  readonly contadores  = signal<BusquedaTecnicos['contadores']>(null);

  readonly idPrincipal = signal<number | null>(null);
  readonly idsApoyo    = signal<number[]>([]);

  /** Subtítulo del modal: Cliente · Rango horario. */
  readonly subtituloHeader = computed(() => {
    const parts: string[] = [];
    if (this.razonSocial()) parts.push(this.razonSocial()!);
    if (this.fecha() || this.horaInicio()) {
      const f = this.fecha() ?? '';
      const h = this.horaInicio() ? `${this.horaInicio()}${this.horaFin() ? '–' + this.horaFin() : ''}` : '';
      parts.push([f, h].filter(Boolean).join(' · '));
    }
    return parts.join(' · ');
  });

  /** Técnico focuseado (clicado en la tabla) → se muestra en el panel lateral. */
  readonly idFocus = signal<number | null>(null);
  readonly recursoFocus = computed<TecnicoProgramacion | null>(() => {
    const id = this.idFocus();
    if (id == null) return null;
    return this.recursos().find(t => t.idUsuario === id) ?? null;
  });

  readonly totalSeleccionados = computed(() =>
    (this.idPrincipal() != null ? 1 : 0) + this.idsApoyo().length
  );
  readonly tieneSeleccion = computed(() => this.idPrincipal() != null);

  async ngOnInit(): Promise<void> {
    this.idPrincipal.set(this.idPrincipalInicial());
    this.idsApoyo.set([...this.idsApoyoInicial()]);
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await this.svc.buscarTecnicos(this.idOs(), {
        fecha:            this.fecha(),
        horaInicio:       this.horaInicio(),
        horaFin:          this.horaFin(),
        soloDisponibles:  this.soloDisponibles(),
        soloSsomaConforme: this.soloSsomaConforme(),
        busqueda:         this.busqueda() || null,
        tipoRecurso:      this.tab(),
      });
      this.recursos.set(r.tecnicos);
      this.contadores.set(r.contadores ?? null);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los recursos.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: TabRecurso): void {
    this.tab.set(t);
    void this.cargar();
  }

  seleccionarPrincipal(idUsuario: number): void {
    this.idPrincipal.set(idUsuario);
    // Si estaba en apoyo, quitarlo
    this.idsApoyo.set(this.idsApoyo().filter(id => id !== idUsuario));
  }

  toggleApoyo(idUsuario: number): void {
    if (this.idPrincipal() === idUsuario) return;
    const list = this.idsApoyo();
    this.idsApoyo.set(
      list.includes(idUsuario) ? list.filter(id => id !== idUsuario) : [...list, idUsuario]
    );
  }

  confirmar(): void {
    this.confirmado.emit({ idPrincipal: this.idPrincipal(), idsApoyo: this.idsApoyo() });
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Chips helpers ──────────────────────────────────────────────────────
  claseDisponibilidad(d: string): string {
    switch (d) {
      case 'disponible':  return 'chip chip--verde';
      case 'ocupado':     return 'chip chip--rojo';
      case 'sin_horario': return 'chip chip--gris';
      default:             return 'chip';
    }
  }
  claseSsoma(e: string): string {
    switch (e) {
      case 'conforme':   return 'chip chip--verde';
      case 'por_vencer': return 'chip chip--ambar';
      case 'incompleto': return 'chip chip--ambar';
      case 'pendiente':  return 'chip chip--rojo';
      case 'bloqueado':  return 'chip chip--rojo';
      default:            return 'chip';
    }
  }
  etiquetaDisponibilidad(d: string): string {
    switch (d) {
      case 'disponible':  return 'Disponible';
      case 'ocupado':     return 'Ocupado';
      case 'sin_horario': return 'Sin horario';
      default:             return d;
    }
  }
  etiquetaSsoma(e: string): string {
    switch (e) {
      case 'conforme':   return 'SSOMA OK';
      case 'por_vencer': return 'SSOMA por vencer';
      case 'incompleto': return 'SSOMA incompleto';
      case 'pendiente':  return 'SSOMA pendiente';
      case 'bloqueado':  return 'SSOMA bloqueado';
      default:            return e;
    }
  }

  etiquetaExp(e: string): string {
    switch (e) {
      case 'alta':             return 'Alta';
      case 'media':            return 'Media';
      case 'sin_experiencia':  return 'Nueva';
      default:                  return e;
    }
  }

  claseExp(e: string): string {
    switch (e) {
      case 'alta':  return 'chip chip--verde';
      case 'media': return 'chip chip--ambar';
      default:       return 'chip chip--gris';
    }
  }

  /** Porcentaje de carga (serviciosDia / serviciosMaxDia) → entero 0-100. */
  pctCarga(t: TecnicoProgramacion): number {
    if (!t.serviciosMaxDia) return 0;
    const p = Math.round((t.serviciosDia / t.serviciosMaxDia) * 100);
    return Math.min(100, Math.max(0, p));
  }

  /** Clase del progress bar según carga (verde / ámbar / rojo). */
  claseCarga(t: TecnicoProgramacion): string {
    const p = this.pctCarga(t);
    if (p >= 90) return 'bar--rojo';
    if (p >= 70) return 'bar--ambar';
    return 'bar--verde';
  }

  /** Array de 5 estrellas: 'full' | 'half' | 'empty' a partir de scorecardPct (0-100). */
  estrellas(pct: number | null | undefined): Array<'full' | 'half' | 'empty'> {
    const total = (pct ?? 0) / 20;  // 100% → 5 estrellas
    const arr: Array<'full' | 'half' | 'empty'> = [];
    for (let i = 1; i <= 5; i++) {
      if (total >= i)          arr.push('full');
      else if (total >= i - 0.5) arr.push('half');
      else                       arr.push('empty');
    }
    return arr;
  }

  iconoRol(t: TecnicoProgramacion): string {
    if (this.idPrincipal() === t.idUsuario) return 'Principal';
    if (this.idsApoyo().includes(t.idUsuario)) return 'Apoyo';
    return '';
  }

  /** Iniciales para el avatar circular. */
  iniciales(nombre: string): string {
    const parts = nombre.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }
}
