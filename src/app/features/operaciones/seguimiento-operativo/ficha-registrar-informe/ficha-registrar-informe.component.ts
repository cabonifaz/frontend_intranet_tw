import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

type PasoWizard = 1 | 2 | 3 | 4 | 5;
type EstadoEtapa = 'pendiente' | 'en_curso' | 'completada' | 'bloqueada';

interface EtapaMeta {
  n:        PasoWizard;
  titulo:   string;
  subtitulo: string;
  icono:    string;
}

/**
 * HU-55 — Ficha "Registrar Informe Técnico" (Mód 11 Control de Campo).
 *
 * Pantalla completa a la que llega la Asistente de Seguimiento (o el Jefe de Operaciones)
 * desde el Modal Detalle del Servicio → tab Avance por Equipos → botón "Registrar informe".
 *
 * Wizard espejo del flujo móvil del técnico, dividido en 5 etapas:
 *   1) Variables ambientales
 *   2) Registro fotográfico (8 o 9 evidencias según informe físico Sí/No + extras)
 *   3) Ensayos y calibración (pesaje + excentricidad)
 *   4) Cabecera del informe (responsable, detalle, observaciones, recoms, diagnóstico)
 *   5) Correlativo y certificado (hard-stop + POST /informe que genera el N°)
 *
 * El guardado es parcial (borrador) — la Asistente puede cerrar la pantalla y retomar.
 * El informe queda a nombre del técnico asignado; se guarda id_registrado_por para trazabilidad.
 *
 * Estado del front hoy: SHELL con mocks. Los formularios de cada paso y la integración con
 * los endpoints espejo (`/api/intranet/...`) se arman cuando Bryan tenga listo el back.
 */
@Component({
  selector: 'app-ficha-registrar-informe',
  imports: [
    CommonModule, FormsModule, HeroHeaderComponent, BreadcrumbComponent, ButtonComponent,
  ],
  templateUrl: './ficha-registrar-informe.component.html',
  styleUrl: './ficha-registrar-informe.component.scss',
})
export class FichaRegistrarInformeComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);

  readonly idOs     = signal<number | null>(null);
  readonly idEquipo = signal<number | null>(null);

  readonly paso        = signal<PasoWizard>(1);
  readonly guardando   = signal(false);

  // Mock del contexto hasta que Bryan tenga el GET /contexto-registro listo
  readonly contextoMock = signal({
    numeroOs:         'OS-000021',
    razonSocial:      'COMPAÑIA MINERA ANTAMINA S.A.',
    planta:           'Planta Concentradora Las Bambas',
    equipo:           { codigoTw: 'EQ-TW-2026-0001', modelo: 'PDX50', numeroSerie: 'MT-PDX50-2024-00123' },
    tecnicoAsignado:  { idTecnico: 7, nombre: 'Pedro Salazar Quispe' },
    asistenteActual:  'Jazir Olivera',
    informeFisico:    true,
    estadoEtapas:     {
      variables:  'pendiente' as EstadoEtapa,
      fotos:      'pendiente' as EstadoEtapa,
      ensayos:    'bloqueada' as EstadoEtapa,
      cabecera:   'pendiente' as EstadoEtapa,
      correlativo:'bloqueada' as EstadoEtapa,
    },
  });

  readonly ETAPAS: EtapaMeta[] = [
    { n: 1, titulo: 'Variables ambientales',  subtitulo: 'Temperatura, humedad y procedencia',       icono: 'thermostat' },
    { n: 2, titulo: 'Registro fotográfico',   subtitulo: '8 u 9 evidencias obligatorias + extras',   icono: 'photo_camera' },
    { n: 3, titulo: 'Ensayos y calibración',  subtitulo: 'Pesaje y excentricidad',                   icono: 'science' },
    { n: 4, titulo: 'Cabecera del informe',   subtitulo: 'Datos, detalle, obs. y diagnóstico',       icono: 'description' },
    { n: 5, titulo: 'Correlativo y certificado', subtitulo: 'Hard-stop y generar N° de informe',     icono: 'verified' },
  ];

  readonly etapaActual = computed(() => this.ETAPAS[this.paso() - 1]);

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const ctx = this.contextoMock();
    return [
      { label: 'Inicio',      ruta: '/dashboard' },
      { label: 'Operaciones' },
      { label: 'Seguimiento Operativo', ruta: '/operaciones/seguimiento-operativo' },
      { label: ctx.numeroOs },
      { label: ctx.equipo.codigoTw },
      { label: 'Registrar informe' },
    ];
  });

  readonly subtitulo = computed(() => {
    const c = this.contextoMock();
    return `${c.razonSocial} · ${c.planta} · ${c.equipo.modelo} (Serie ${c.equipo.numeroSerie})`;
  });

  readonly puedeAvanzar = computed(() => !this.guardando() && this.paso() < 5);
  readonly puedeRetroceder = computed(() => !this.guardando() && this.paso() > 1);

  async ngOnInit(): Promise<void> {
    const idOs     = Number(this.route.snapshot.paramMap.get('idOs'));
    const idEquipo = Number(this.route.snapshot.paramMap.get('idEquipo'));
    if (!idOs || !idEquipo) {
      this.toast.error('Ruta inválida.');
      this.router.navigate(['/operaciones/seguimiento-operativo']);
      return;
    }
    this.idOs.set(idOs);
    this.idEquipo.set(idEquipo);
    // TODO: await this.svc.obtenerContexto(idOs, idEquipo) cuando Bryan tenga el endpoint
  }

  irAPaso(p: PasoWizard): void {
    if (this.guardando()) return;
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
    // TODO cuando haya back: llamar al endpoint correspondiente al paso actual.
    this.toast.info(`Paso ${this.paso()}: guardado (mock). Integración con back pendiente.`);
    this.avanzar();
  }

  cancelar(): void {
    this.router.navigate(['/operaciones/seguimiento-operativo']);
  }

  generarInforme(): void {
    // Paso 5: POST /informe. Mock.
    this.toast.info('Generar informe: pendiente de integración con back.');
  }

  claseChipEtapa(e: EstadoEtapa): string {
    switch (e) {
      case 'completada': return 'chip-etapa chip-etapa--verde';
      case 'en_curso':   return 'chip-etapa chip-etapa--azul';
      case 'bloqueada':  return 'chip-etapa chip-etapa--gris';
      default:           return 'chip-etapa chip-etapa--ambar';
    }
  }

  labelEtapa(e: EstadoEtapa): string {
    switch (e) {
      case 'completada': return 'Completada';
      case 'en_curso':   return 'En curso';
      case 'bloqueada':  return 'Bloqueada';
      default:           return 'Pendiente';
    }
  }
}
