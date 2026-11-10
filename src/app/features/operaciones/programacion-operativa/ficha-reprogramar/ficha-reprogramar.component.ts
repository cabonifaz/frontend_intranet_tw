import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  ProgramacionPreparada,
  ReprogramarRequest,
  TecnicoProgramacion,
} from '../../../../core/models/programacion-operativa.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { ModalAsignarRecursoComponent } from '../modal-asignar-recurso/modal-asignar-recurso.component';

/**
 * HU-38 — Ficha "Reprogramar". Carga la programación activa y permite modificar
 * cronograma, técnicos, equipos + motivo + comentario. Ambos roles (Jefe y
 * Asistente) reprograman directo. Si el back aún responde `solicitud` por falta
 * del permiso, el front avisa en el toast.
 */
@Component({
  selector: 'app-ficha-reprogramar',
  imports: [
    CommonModule, FormsModule,
    BreadcrumbComponent, HeroHeaderComponent, ButtonComponent, SeccionComponent,
    ModalAsignarRecursoComponent,
  ],
  templateUrl: './ficha-reprogramar.component.html',
  styleUrl: './ficha-reprogramar.component.scss',
})
export class FichaReprogramarComponent implements OnInit {
  private readonly svc    = inject(ProgramacionOperativaService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  readonly breadcrumb = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'Operaciones' },
    { label: 'Programación', ruta: '/operaciones/programacion' },
    { label: 'Reprogramar' },
  ];

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly datos     = signal<ProgramacionPreparada | null>(null);

  // ─── Form state ─────────────────────────────────────────────────────────
  readonly fechaEjecucion     = signal<string>('');
  readonly horaInicio         = signal<string>('');
  readonly horaFin            = signal<string>('');
  readonly idTecnicoPrincipal = signal<number | null>(null);
  readonly idsTecnicosApoyo   = signal<number[]>([]);
  readonly idsEquipos         = signal<number[]>([]);
  readonly idMotivo           = signal<number | null>(null);
  readonly comentario         = signal<string>('');

  // Modal Asignar Recurso
  readonly modalAsignarAbierto       = signal(false);
  readonly tecnicosSeleccionadosInfo = signal<Map<number, TecnicoProgramacion>>(new Map());

  // ─── Computeds ──────────────────────────────────────────────────────────
  readonly tecnicoPrincipalResumen = computed<TecnicoProgramacion | null>(() => {
    const id = this.idTecnicoPrincipal();
    if (id == null) return null;
    return this.tecnicosSeleccionadosInfo().get(id) ?? null;
  });

  readonly apoyosResumen = computed<TecnicoProgramacion[]>(() => {
    const mapa = this.tecnicosSeleccionadosInfo();
    return this.idsTecnicosApoyo()
      .map(id => mapa.get(id))
      .filter((t): t is TecnicoProgramacion => !!t);
  });

  readonly cambiaFechaHora = computed(() => {
    const d = this.datos();
    if (!d) return false;
    return (
      (this.fechaEjecucion() && this.fechaEjecucion() !== (d.fechaEjecucion ?? '').substring(0, 10)) ||
      (this.horaInicio()     && this.horaInicio()     !== (d.horaInicio     ?? '').substring(0, 5))  ||
      (this.horaFin()        && this.horaFin()        !== (d.horaFin        ?? '').substring(0, 5))
    );
  });

  readonly puedeGuardar = computed(() => {
    const d = this.datos();
    if (!d || !d.puedeReprogramar) return false;
    if (this.idMotivo() == null) return false;
    if (!this.fechaEjecucion() || !this.horaInicio() || !this.horaFin()) return false;
    if (this.idTecnicoPrincipal() == null) return false;
    if (this.idsEquipos().length === 0) return false;
    const com = this.comentario().trim();
    if (com.length > (d.comentarioMaximo ?? 500)) return false;
    return !this.guardando();
  });

  // ─── Sidebar checks ─────────────────────────────────────────────────────
  readonly checkCronograma = computed(() =>
    !!this.fechaEjecucion() && !!this.horaInicio() && !!this.horaFin() && this.horaFin() > this.horaInicio()
  );
  readonly checkTecnico = computed(() => this.idTecnicoPrincipal() != null);
  readonly checkEquipos = computed(() => this.idsEquipos().length > 0);
  readonly checkMotivo  = computed(() => this.idMotivo() != null);

  readonly totalTecnicos = computed(() =>
    (this.idTecnicoPrincipal() != null ? 1 : 0) + this.idsTecnicosApoyo().length
  );

  readonly duracionCalculada = computed(() => {
    const ini = this.horaInicio();
    const fin = this.horaFin();
    if (!ini || !fin || fin <= ini) return '—';
    const [h1, m1] = ini.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    const horas = Math.floor(mins / 60);
    const rest  = mins % 60;
    return `${horas}h ${rest.toString().padStart(2, '0')}min`;
  });

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    const idProgramacion = Number(this.route.snapshot.paramMap.get('idProgramacion'));
    if (!idProgramacion || isNaN(idProgramacion)) {
      this.toast.error('ID de programación inválido.');
      this.router.navigate(['/operaciones/programacion']);
      return;
    }
    await this.cargar(idProgramacion);
  }

  private async cargar(idProgramacion: number): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.prepararReprogramacion(idProgramacion);
      this.datos.set(d);

      // Pre-cargar los campos con el estado actual
      if (d.fechaEjecucion) this.fechaEjecucion.set(d.fechaEjecucion.substring(0, 10));
      if (d.horaInicio)     this.horaInicio.set(d.horaInicio.substring(0, 5));
      if (d.horaFin)        this.horaFin.set(d.horaFin.substring(0, 5));
      if (d.idTecnicoPrincipal) this.idTecnicoPrincipal.set(d.idTecnicoPrincipal);

      // Técnicos de apoyo (del resumen del back)
      const apoyos = d.tecnicos.filter(t => t.rol === 'apoyo').map(t => t.idUsuario);
      this.idsTecnicosApoyo.set(apoyos);

      // Equipos ya reservados
      const eqReservados = d.equipos.filter(e => e.reservado).map(e => e.idEquipo);
      this.idsEquipos.set(eqReservados);

      // Guardar info de técnicos para el resumen
      const mapa = new Map<number, TecnicoProgramacion>();
      for (const t of d.tecnicos) {
        mapa.set(t.idUsuario, {
          idUsuario: t.idUsuario,
          nombre: t.nombre,
          cargo: t.cargo ?? null,
          area: null,
          tipoRecurso: 'tecnico',
          sedeOperativa: null,
          sedeOperativaNombre: null,
          disponibilidad: 'disponible',
          serviciosDia: 0,
          horasDia: 0,
          serviciosMaxDia: 0,
          cupoLibre: 0,
          horasLibres: 0,
          ssomaEstado: 'conforme',
          ssomaRequeridos: 0,
          ssomaCumplidos: 0,
          serviciosCliente: 0,
          experienciaCliente: 'sin_experiencia',
          documentosSsoma: [],
        });
      }
      this.tecnicosSeleccionadosInfo.set(mapa);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la ficha de reprogramación.');
      this.router.navigate(['/operaciones/programacion']);
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Handlers UI ────────────────────────────────────────────────────────
  toggleEquipo(idEquipo: number): void {
    const list = this.idsEquipos();
    if (list.includes(idEquipo)) {
      this.idsEquipos.set(list.filter(id => id !== idEquipo));
    } else {
      this.idsEquipos.set([...list, idEquipo]);
    }
  }

  abrirModalAsignar(): void { this.modalAsignarAbierto.set(true); }

  async onRecursosConfirmados(sel: { idPrincipal: number | null; idsApoyo: number[] }): Promise<void> {
    this.idTecnicoPrincipal.set(sel.idPrincipal);
    this.idsTecnicosApoyo.set(sel.idsApoyo);
    this.modalAsignarAbierto.set(false);

    // Refrescar info de técnicos
    try {
      const d = this.datos();
      if (!d) return;
      const r = await this.svc.buscarTecnicos(d.idOs, {
        fecha:      this.fechaEjecucion() || null,
        horaInicio: this.horaInicio()     || null,
        horaFin:    this.horaFin()        || null,
      });
      const mapa = new Map<number, TecnicoProgramacion>();
      for (const t of r.tecnicos) mapa.set(t.idUsuario, t);
      // Merge con existentes para no perder los apoyos
      const actuales = this.tecnicosSeleccionadosInfo();
      for (const [k, v] of actuales) if (!mapa.has(k)) mapa.set(k, v);
      this.tecnicosSeleccionadosInfo.set(mapa);
    } catch { /* silencioso */ }
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) return;
    const d = this.datos();
    if (!d) return;
    this.guardando.set(true);
    try {
      const dto: ReprogramarRequest = {
        fecha:              this.fechaEjecucion(),
        horaInicio:         this.horaInicio(),
        horaFin:            this.horaFin(),
        idTecnicoPrincipal: this.idTecnicoPrincipal(),
        idsTecnicosApoyo:   this.idsTecnicosApoyo(),
        idsEquipos:         this.idsEquipos(),
        idMotivo:           this.idMotivo()!,
        comentario:         this.comentario().trim() || null,
      };
      const r = await this.svc.reprogramar(d.idProgramacion, dto);
      if (r.modo === 'directa') {
        this.toast.exito(`Programación ${r.codigo} reprogramada.`);
      } else {
        this.toast.info('Solicitud enviada. Queda pendiente de aprobación del Jefe.');
      }
      this.router.navigate(['/operaciones/programacion']);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo reprogramar.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/operaciones/programacion']);
  }

  fechaCorta(f: string): string {
    if (!f) return '';
    const p = f.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : f;
  }
}
