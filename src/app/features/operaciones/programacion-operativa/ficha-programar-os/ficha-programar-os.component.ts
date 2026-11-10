import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CrearProgramacionRequest,
  FichaProgramacion,
  TecnicoProgramacion,
} from '../../../../core/models/programacion-operativa.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { ModalAsignarRecursoComponent } from '../modal-asignar-recurso/modal-asignar-recurso.component';

/** HU-36 — Ficha "Programar Servicio". Crea la Programación activa de una OS. */
@Component({
  selector: 'app-ficha-programar-os',
  imports: [
    CommonModule, FormsModule,
    BreadcrumbComponent, HeroHeaderComponent, ButtonComponent, SeccionComponent,
    ModalAsignarRecursoComponent,
  ],
  templateUrl: './ficha-programar-os.component.html',
  styleUrl: './ficha-programar-os.component.scss',
})
export class FichaProgramarOsComponent implements OnInit {
  private readonly svc    = inject(ProgramacionOperativaService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  readonly breadcrumb = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'Operaciones' },
    { label: 'Programación', ruta: '/operaciones/programacion' },
    { label: 'Programar Servicio' },
  ];

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly ficha    = signal<FichaProgramacion | null>(null);

  // ─── Form state ─────────────────────────────────────────────────────────
  readonly fechaEjecucion     = signal<string>('');     // yyyy-MM-dd
  readonly horaInicio         = signal<string>('08:00');
  readonly horaFin            = signal<string>('17:00');
  readonly idTecnicoPrincipal = signal<number | null>(null);
  readonly idsTecnicosApoyo   = signal<number[]>([]);
  readonly idsEquipos         = signal<number[]>([]);
  readonly observaciones      = signal<string>('');

  // ─── Modal "Asignar Recurso" ────────────────────────────────────────────
  readonly modalAsignarAbierto = signal(false);
  // Info persistente de los técnicos ya seleccionados (para mostrar en el resumen)
  readonly tecnicosSeleccionadosInfo = signal<Map<number, TecnicoProgramacion>>(new Map());

  readonly orden    = computed(() => this.ficha()?.orden);
  readonly equipos  = computed(() => this.ficha()?.equipos ?? []);
  readonly conceptos = computed(() => this.ficha()?.conceptos ?? []);
  readonly requisitosSsoma = computed(() => this.ficha()?.requisitosSsoma ?? []);

  readonly tecnicoPrincipalSeleccionado = computed<TecnicoProgramacion | null>(() => {
    const id = this.idTecnicoPrincipal();
    if (id == null) return null;
    return this.tecnicosSeleccionadosInfo().get(id) ?? null;
  });

  readonly tecnicoPrincipalResumen = computed<TecnicoProgramacion | null>(() =>
    this.tecnicoPrincipalSeleccionado()
  );

  readonly apoyosResumen = computed<TecnicoProgramacion[]>(() => {
    const mapa = this.tecnicosSeleccionadosInfo();
    return this.idsTecnicosApoyo()
      .map(id => mapa.get(id))
      .filter((t): t is TecnicoProgramacion => !!t);
  });

  readonly puedeGuardar = computed(() => {
    return (
      !!this.fechaEjecucion()
      && !!this.horaInicio()
      && !!this.horaFin()
      && this.idTecnicoPrincipal() != null
      && this.idsEquipos().length > 0
    );
  });

  // ─── Checks del sidebar ─────────────────────────────────────────────────
  readonly checkCronograma = computed(() =>
    !!this.fechaEjecucion() && !!this.horaInicio() && !!this.horaFin() && this.horaFin() > this.horaInicio()
  );
  readonly checkTecnico = computed(() => this.idTecnicoPrincipal() != null);
  readonly checkEquipos = computed(() => this.idsEquipos().length > 0);
  readonly checkSsoma   = computed(() => true); // placeholder: back valida al crear

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

  fechaCorta(f: string): string {
    if (!f) return '';
    const p = f.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : f;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const idOs = Number(this.route.snapshot.paramMap.get('idOs'));
    if (!idOs || isNaN(idOs)) {
      this.toast.error('ID de OS inválido.');
      this.router.navigate(['/operaciones/programacion']);
      return;
    }
    await this.cargarFicha(idOs);
  }

  private async cargarFicha(idOs: number): Promise<void> {
    this.cargando.set(true);
    try {
      const f = await this.svc.prepararProgramacion(idOs);
      this.ficha.set(f);
      // Pre-cargar todos los equipos de la OS como seleccionados (usamos idEquipo del maestro)
      this.idsEquipos.set(f.equipos.map(e => e.idEquipo));
      // Fecha tentativa inicial = primer día del rango si existe
      if (f.orden.fechaProgramadaDesde) {
        this.fechaEjecucion.set(f.orden.fechaProgramadaDesde.substring(0, 10));
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la ficha.');
      this.router.navigate(['/operaciones/programacion']);
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Handlers UI ─────────────────────────────────────────────────────────

  toggleEquipo(idEquipo: number): void {
    const list = this.idsEquipos();
    if (list.includes(idEquipo)) {
      this.idsEquipos.set(list.filter(id => id !== idEquipo));
    } else {
      this.idsEquipos.set([...list, idEquipo]);
    }
  }

  abrirModalAsignar(): void {
    this.modalAsignarAbierto.set(true);
  }

  async onRecursosConfirmados(sel: { idPrincipal: number | null; idsApoyo: number[] }): Promise<void> {
    this.idTecnicoPrincipal.set(sel.idPrincipal);
    this.idsTecnicosApoyo.set(sel.idsApoyo);
    this.modalAsignarAbierto.set(false);

    // Guardamos la info de cada seleccionado para el resumen (volvemos a consultar el back)
    try {
      const idOs = this.ficha()?.orden.idOs;
      if (!idOs) return;
      const r = await this.svc.buscarTecnicos(idOs, {
        fecha:            this.fechaEjecucion() || null,
        horaInicio:       this.horaInicio()     || null,
        horaFin:          this.horaFin()        || null,
      });
      const mapa = new Map<number, TecnicoProgramacion>();
      for (const t of r.tecnicos) mapa.set(t.idUsuario, t);
      this.tecnicosSeleccionadosInfo.set(mapa);
    } catch {
      // Silencioso: aunque no tengamos el detalle en el resumen, la selección queda hecha.
    }
  }

  async programar(): Promise<void> {
    if (!this.puedeGuardar() || this.guardando()) return;
    const idOs = this.ficha()?.orden.idOs;
    if (!idOs) return;
    this.guardando.set(true);
    try {
      const dto: CrearProgramacionRequest = {
        idOs,
        fechaEjecucion:     this.fechaEjecucion(),
        horaInicio:         this.horaInicio(),
        horaFin:            this.horaFin(),
        idTecnicoPrincipal: this.idTecnicoPrincipal()!,
        idsTecnicosApoyo:   this.idsTecnicosApoyo(),
        idsEquipos:         this.idsEquipos(),
        observaciones:      this.observaciones() || null,
      };
      const r = await this.svc.crearProgramacion(dto);
      this.toast.exito(`Programación ${r.codigo} creada.`);
      this.router.navigate(['/operaciones/programacion']);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo crear la programación.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/operaciones/programacion']);
  }

}
