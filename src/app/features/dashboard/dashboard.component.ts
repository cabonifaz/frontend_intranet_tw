import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { AutenticacionService } from '../../core/services/autenticacion.service';
import { AlertaOperativa, KpisDashboard } from '../../core/models/dashboard.model';
import { HeroHeaderComponent } from '../../shared/ui/hero-header/hero-header.component';
import { SeccionComponent }    from '../../shared/ui/seccion/seccion.component';
import { ButtonComponent }     from '../../shared/ui/button/button.component';
import { EstadoVacioComponent } from '../../shared/ui/estado-vacio/estado-vacio.component';
import { KpiCardComponent }    from '../../shared/ui/kpi-card/kpi-card.component';

interface TarjetaKpi {
  etiqueta: string;
  valor:    number;
  icono:    string;
  variante: 'azul' | 'verde' | 'ambar' | 'rojo';
}

interface ZonaOperativa {
  nombre:    string;
  servicios: number;
  tecnicos:  number;
  total:     number;
}

@Component({
  selector: 'app-dashboard',
  imports: [NgClass, HeroHeaderComponent, SeccionComponent, ButtonComponent, EstadoVacioComponent, KpiCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardSvc = inject(DashboardService);
  readonly autenticacion        = inject(AutenticacionService);

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly kpis     = signal<KpisDashboard | null>(null);
  readonly alertas  = signal<AlertaOperativa[]>([]);
  readonly tarjetas = signal<TarjetaKpi[]>([]);

  readonly zonas: ZonaOperativa[] = [
    { nombre: 'Lima Norte',  servicios: 5, tecnicos: 3, total: 6 },
    { nombre: 'Lima Centro', servicios: 4, tecnicos: 2, total: 6 },
    { nombre: 'Callao',      servicios: 3, tecnicos: 1, total: 6 },
    { nombre: 'Lima Sur',    servicios: 3, tecnicos: 2, total: 6 },
    { nombre: 'Lima Este',   servicios: 2, tecnicos: 1, total: 6 },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const [kpisData, alertasData] = await Promise.all([
        this.dashboardSvc.obtenerResumen(),
        this.dashboardSvc.obtenerAlertas(),
      ]);
      this.kpis.set(kpisData);
      this.alertas.set(alertasData);
      this.tarjetas.set(this.construirTarjetas(kpisData));
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el dashboard.');
    } finally {
      this.cargando.set(false);
    }
  }

  private construirTarjetas(k: KpisDashboard): TarjetaKpi[] {
    return [
      { etiqueta: 'SERVICIOS PROGRAMADOS',  valor: k.serviciosProgramados,  icono: 'calendar_month',    variante: 'azul'  },
      { etiqueta: 'EN EJECUCIÓN',            valor: k.serviciosEnEjecucion,  icono: 'play_circle',       variante: 'azul'  },
      { etiqueta: 'EXPEDIENTES BLOQUEADOS',  valor: k.expedientesBloqueados, icono: 'lock',              variante: 'rojo'  },
      { etiqueta: 'PENDIENTES SSOMA',        valor: k.pendientesSsoma,       icono: 'health_and_safety', variante: 'ambar' },
      { etiqueta: 'PENDIENTES CONFORMIDAD',  valor: k.pendientesConformidad, icono: 'pending_actions',   variante: 'ambar' },
      { etiqueta: 'LISTOS PARA FACTURAR',    valor: k.listosFacturar,        icono: 'receipt_long',      variante: 'verde' },
      { etiqueta: 'SLA VENCIDOS',            valor: k.slaVencidos,           icono: 'timer_off',         variante: 'rojo'  },
      { etiqueta: 'TÉCNICOS EN RUTA',        valor: k.tecnicosEnRuta,        icono: 'location_on',       variante: 'azul'  },
    ];
  }

  nivelClase(nivel: string): string {
    return { 'CRÍTICA': 'badge-pill--critica', 'ALTA': 'badge-pill--alta', 'MEDIA': 'badge-pill--media' }[nivel] ?? '';
  }

  estadoClase(estado: string): string {
    return estado === 'Vencido' ? 'estado-dot--rojo' : 'estado-dot--ambar';
  }

  accion(alerta: AlertaOperativa): string {
    if (alerta.nivel === 'CRÍTICA') return 'Resolver alerta';
    if (alerta.areaResponsable === 'Sin asignar') return 'Reasignar';
    return 'Ver expediente';
  }

  pctZona(zona: ZonaOperativa): number {
    return Math.round((zona.servicios / zona.total) * 100);
  }
}
