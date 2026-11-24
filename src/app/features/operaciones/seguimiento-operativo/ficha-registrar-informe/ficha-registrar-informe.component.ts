import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { RegistroInformeIntranetService } from '../../../../core/services/registro-informe-intranet.service';
import {
  CatalogoItemRegistroApi,
  ContextoRegistroApi,
  EstadoEtapa as EstadoEtapaApi,
  EtapaRegistroApi,
} from '../../../../core/models/registro-informe-intranet-api.model';
import { PasoVariablesComponent } from './paso-variables/paso-variables.component';
import { PasoEvidenciasComponent } from './paso-evidencias/paso-evidencias.component';
import { PasoEnsayosComponent } from './paso-ensayos/paso-ensayos.component';
import { PasoCabeceraComponent } from './paso-cabecera/paso-cabecera.component';
import { PasoCorrelativoComponent } from './paso-correlativo/paso-correlativo.component';

type PasoWizard = 1 | 2 | 3 | 4 | 5;

interface EtapaMeta {
  n:         PasoWizard;
  codigo:    EtapaRegistroApi['codigo'];
  titulo:    string;
  subtitulo: string;
  icono:     string;
}

/**
 * HU-55 — Ficha "Registrar Informe Técnico" (Mód 11 Control de Campo).
 *
 * Pantalla a la que llega la Asistente de Seguimiento (o el Jefe de Operaciones)
 * desde el Modal Detalle del Servicio → tab Avance por Equipos → "Registrar informe".
 *
 * Wizard espejo del flujo móvil, en 5 etapas:
 *   1) Variables ambientales
 *   2) Registro fotográfico (8 o 9 evidencias según informe físico Sí/No + extras)
 *   3) Ensayos y calibración (pesaje + excentricidad)
 *   4) Cabecera del informe (responsable, detalle, observaciones, recoms, diagnóstico)
 *   5) Correlativo y certificado (hard-stop + POST /informe que genera el N°)
 *
 * El informe queda a nombre del técnico asignado; se guarda id_registrado_por para
 * trazabilidad. Si otra persona ya tiene el equipo abierto, el back responde 409
 * y mostramos el aviso correspondiente.
 */
@Component({
  selector: 'app-ficha-registrar-informe',
  imports: [
    CommonModule, FormsModule, HeroHeaderComponent, BreadcrumbComponent,
    ButtonComponent, ModalComponent,
    PasoVariablesComponent, PasoEvidenciasComponent,
    PasoEnsayosComponent, PasoCabeceraComponent, PasoCorrelativoComponent,
  ],
  templateUrl: './ficha-registrar-informe.component.html',
  styleUrl: './ficha-registrar-informe.component.scss',
})
export class FichaRegistrarInformeComponent implements OnInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);
  private readonly svc    = inject(RegistroInformeIntranetService);

  readonly idOs       = signal<number | null>(null);
  readonly idOsEquipo = signal<number | null>(null);

  readonly paso      = signal<PasoWizard>(1);
  readonly cargando  = signal(false);
  readonly guardando = signal(false);

  /** Contexto crudo del back. null mientras carga / error. */
  readonly contexto = signal<ContextoRegistroApi | null>(null);
  /** Mensaje de error de la carga inicial (si hubo). */
  readonly errorCarga = signal<string | null>(null);

  /** Modal "Comenzar registro". */
  readonly mostrarModalIniciar = signal(false);
  readonly iniciando           = signal(false);
  readonly motivoIniciar       = signal<string>('');
  readonly inicioIniciar       = signal<string>('');   // yyyy-MM-ddTHH:mm (datetime-local)
  readonly finIniciar          = signal<string>('');
  readonly comentarioIniciar   = signal<string>('');

  /** Modal "Pausar otro equipo abierto". */
  readonly mostrarModalPausar = signal(false);
  readonly motivoPausar       = signal<string>('');
  readonly pausando           = signal(false);

  readonly ETAPAS: EtapaMeta[] = [
    { n: 1, codigo: 'variables',   titulo: 'Variables ambientales',     subtitulo: 'Temperatura, humedad y procedencia',   icono: 'thermostat'   },
    { n: 2, codigo: 'fotos',       titulo: 'Registro fotográfico',       subtitulo: '8 u 9 evidencias obligatorias + extras', icono: 'photo_camera' },
    { n: 3, codigo: 'ensayos',     titulo: 'Ensayos y calibración',      subtitulo: 'Pesaje y excentricidad',                icono: 'science'      },
    { n: 4, codigo: 'cabecera',    titulo: 'Cabecera del informe',       subtitulo: 'Datos, detalle, obs. y diagnóstico',    icono: 'description'  },
    { n: 5, codigo: 'correlativo', titulo: 'Correlativo y certificado',  subtitulo: 'Hard-stop y generar N° de informe',     icono: 'verified'     },
  ];

  readonly etapaActual = computed(() => this.ETAPAS[this.paso() - 1]);

  readonly fila = computed(() => this.contexto()?.contexto ?? null);

  /** Catálogo de motivos para el combo "Comenzar registro". */
  readonly motivosDisponibles = computed<CatalogoItemRegistroApi[]>(
    () => this.contexto()?.catalogos?.motivo_manual ?? [],
  );

  /** Catálogo de procedencias para el paso 1 (variables ambientales). */
  readonly procedenciasDisponibles = computed<CatalogoItemRegistroApi[]>(
    () => this.contexto()?.catalogos?.procedencia ?? [],
  );

  /** Mapa codigo→EtapaRegistroApi para pintar los chips laterales. */
  readonly etapasPorCodigo = computed<Record<string, EtapaRegistroApi | undefined>>(() => {
    const out: Record<string, EtapaRegistroApi | undefined> = {};
    for (const e of this.contexto()?.etapas ?? []) out[e.codigo] = e;
    return out;
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const f = this.fila();
    const chips: BreadcrumbItem[] = [
      { label: 'Inicio',                ruta: '/dashboard' },
      { label: 'Operaciones' },
      { label: 'Seguimiento Operativo', ruta: '/operaciones/seguimiento-operativo' },
    ];
    if (f?.numeroOs) chips.push({ label: f.numeroOs });
    if (f?.codigoTw) chips.push({ label: f.codigoTw });
    chips.push({ label: 'Registrar informe' });
    return chips;
  });

  readonly subtitulo = computed(() => {
    const f = this.fila();
    if (!f) return '';
    const pedazos = [f.cliente, f.planta, f.modelo, f.numeroSerie ? `Serie ${f.numeroSerie}` : null]
      .filter(x => !!x);
    return pedazos.join(' · ');
  });

  readonly codigoFicha = computed(() => this.fila()?.codigoTw ?? this.fila()?.numeroOs ?? '');

  /** True cuando el back dice que todavía no se puede iniciar el registro. */
  readonly bloqueado = computed(() => {
    const f = this.fila();
    return !!f && !f.registroPropio && !f.puedeIniciar;
  });

  /** True cuando el informe ya está generado — nada por hacer acá. */
  readonly informeYaGenerado = computed(() => !!this.fila()?.informeGenerado);

  /** True cuando el técnico dejó OTRO equipo abierto y hay que pausarlo primero. */
  readonly debePausarOtro = computed(() => !!this.fila()?.otroEquipoAbierto);

  /** True cuando la sesión está activa y es propia (ya se puede trabajar). */
  readonly sesionActiva = computed(() => !!this.fila()?.registroPropio && !!this.fila()?.iniciado);

  readonly puedeAvanzar    = computed(() => !this.guardando() && this.sesionActiva() && this.paso() < 5);
  readonly puedeRetroceder = computed(() => !this.guardando() && this.paso() > 1);

  async ngOnInit(): Promise<void> {
    const idOs       = Number(this.route.snapshot.paramMap.get('idOs'));
    const idOsEquipo = Number(this.route.snapshot.paramMap.get('idEquipo'));
    if (!idOs || !idOsEquipo) {
      this.toast.error('Ruta inválida.');
      this.router.navigate(['/operaciones/seguimiento-operativo']);
      return;
    }
    this.idOs.set(idOs);
    this.idOsEquipo.set(idOsEquipo);
    await this.cargarContexto();
  }

  /** Libera el bloqueo al salir, para no retenerle el equipo a nadie 30 min. */
  async ngOnDestroy(): Promise<void> {
    if (this.sesionActiva() && this.idOs() && this.idOsEquipo()) {
      try { await this.svc.liberarRegistro(this.idOs()!, this.idOsEquipo()!); }
      catch { /* best-effort */ }
    }
  }

  // ─── Carga del contexto ──────────────────────────────────────────────

  async cargarContexto(): Promise<void> {
    const idOs = this.idOs(), idEq = this.idOsEquipo();
    if (!idOs || !idEq) return;

    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const ctx = await this.svc.contextoRegistro(idOs, idEq);
      this.contexto.set(ctx);

      // Si el informe ya está generado, avisamos y dejamos solo-lectura.
      if (ctx.contexto.informeGenerado) {
        this.toast.info(`El informe de este equipo ya fue generado (N° ${ctx.contexto.numeroInforme ?? '—'}).`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar el contexto del registro.';
      this.errorCarga.set(msg);
      this.toast.error(msg);
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Iniciar / liberar registro ──────────────────────────────────────

  abrirModalIniciar(): void {
    // Prefill: fin = ahora, inicio = ahora - 2h (valor razonable, editable).
    const ahora = new Date();
    const dosHorasAntes = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);
    this.finIniciar.set(this.aIsoLocal(ahora));
    this.inicioIniciar.set(this.aIsoLocal(dosHorasAntes));

    // Motivo por defecto: primero del catálogo si existe.
    const def = this.motivosDisponibles()[0]?.codigo ?? '';
    this.motivoIniciar.set(def);
    this.comentarioIniciar.set('');
    this.mostrarModalIniciar.set(true);
  }

  cerrarModalIniciar(): void {
    if (this.iniciando()) return;
    this.mostrarModalIniciar.set(false);
  }

  async confirmarIniciar(): Promise<void> {
    const idOs = this.idOs(), idEq = this.idOsEquipo();
    if (!idOs || !idEq) return;

    const inicio = this.inicioIniciar().trim();
    const fin    = this.finIniciar().trim();
    const motivo = this.motivoIniciar().trim();
    if (!inicio || !fin) { this.toast.error('Indica la hora de inicio y fin del trabajo.'); return; }
    if (new Date(inicio) >= new Date(fin)) { this.toast.error('El inicio debe ser anterior al fin.'); return; }
    if (!motivo) { this.toast.error('Selecciona el motivo por el que registras tú.'); return; }

    this.iniciando.set(true);
    try {
      await this.svc.iniciarRegistro(idOs, idEq, {
        inicio, fin, motivo,
        comentario: this.comentarioIniciar().trim() || null,
      });
      this.mostrarModalIniciar.set(false);
      this.toast.exito('Registro iniciado. Podés avanzar por las etapas.');
      await this.cargarContexto();
    } catch (e: unknown) {
      const err = e as Error & { conflicto?: boolean };
      if (err?.conflicto) {
        this.toast.error(err.message || 'Otra persona está registrando este equipo.');
        this.mostrarModalIniciar.set(false);
        await this.cargarContexto();
      } else {
        this.toast.error(err?.message || 'No se pudo iniciar el registro.');
      }
    } finally {
      this.iniciando.set(false);
    }
  }

  // ─── Pausar otro equipo abierto ──────────────────────────────────────

  abrirModalPausar(): void {
    this.motivoPausar.set('');
    this.mostrarModalPausar.set(true);
  }

  cerrarModalPausar(): void {
    if (this.pausando()) return;
    this.mostrarModalPausar.set(false);
  }

  async confirmarPausar(): Promise<void> {
    const idOs = this.idOs(), idEq = this.idOsEquipo();
    if (!idOs || !idEq) return;
    this.pausando.set(true);
    try {
      await this.svc.pausarEquipoAbierto(idOs, idEq, this.motivoPausar().trim() || null);
      this.mostrarModalPausar.set(false);
      this.toast.exito('Se pausó el otro equipo. Ahora podés iniciar el registro.');
      await this.cargarContexto();
    } catch (e: unknown) {
      const err = e as Error;
      this.toast.error(err?.message || 'No se pudo pausar el otro equipo.');
    } finally {
      this.pausando.set(false);
    }
  }

  // ─── Navegación del wizard ───────────────────────────────────────────

  irAPaso(p: PasoWizard): void {
    if (this.guardando() || !this.sesionActiva()) return;
    this.paso.set(p);
  }

  avanzar(): void {
    if (!this.puedeAvanzar()) return;
    this.paso.update(p => Math.min(5, p + 1) as PasoWizard);
  }

  retroceder(): void {
    if (!this.puedeRetroceder()) return;
    this.paso.update(p => Math.max(1, p - 1) as PasoWizard);
  }

  guardarYContinuar(): void {
    // Cada paso tiene su propio submit interno. Este botón solo sirve
    // para forzar avance manual (para pasos pendientes de implementar).
    this.toast.info(`Paso ${this.paso()}: formulario pendiente (Fase 4+).`);
    this.avanzar();
  }

  /** El hijo nos avisa que guardó. Recargamos contexto para actualizar chips y avanzamos. */
  async onPasoGuardado(): Promise<void> {
    await this.cargarContexto();
    this.avanzar();
  }

  async cancelar(): Promise<void> {
    // Liberamos antes de salir (ngOnDestroy también libera por si acaso).
    if (this.sesionActiva() && this.idOs() && this.idOsEquipo()) {
      try { await this.svc.liberarRegistro(this.idOs()!, this.idOsEquipo()!); }
      catch { /* best-effort */ }
    }
    this.router.navigate(['/operaciones/seguimiento-operativo']);
  }

  /** El paso 5 ya emitió el informe generado; recargamos el contexto para marcarlo arriba. */
  async onInformeGenerado(_numeroInforme: string): Promise<void> {
    await this.cargarContexto();
  }

  // ─── Helpers de UI ───────────────────────────────────────────────────

  claseChipEtapa(codigo: EtapaRegistroApi['codigo']): string {
    const e = this.etapasPorCodigo()[codigo]?.estado ?? 'pendiente';
    return this.claseChipEtapaDesde(e);
  }

  labelEtapa(codigo: EtapaRegistroApi['codigo']): string {
    const e = this.etapasPorCodigo()[codigo]?.estado ?? 'pendiente';
    return this.labelEtapaDesde(e);
  }

  private claseChipEtapaDesde(e: EstadoEtapaApi): string {
    switch (e) {
      case 'conforme':     return 'chip-etapa chip-etapa--verde';
      case 'en_curso':     return 'chip-etapa chip-etapa--azul';
      case 'bloqueado':    return 'chip-etapa chip-etapa--gris';
      case 'no_conforme':  return 'chip-etapa chip-etapa--rojo';
      default:             return 'chip-etapa chip-etapa--ambar';
    }
  }

  private labelEtapaDesde(e: EstadoEtapaApi): string {
    switch (e) {
      case 'conforme':     return 'Conforme';
      case 'en_curso':     return 'En curso';
      case 'bloqueado':    return 'Bloqueada';
      case 'no_conforme':  return 'No conforme';
      default:             return 'Pendiente';
    }
  }

  /** Date → "yyyy-MM-ddTHH:mm" (hora local). */
  private aIsoLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
