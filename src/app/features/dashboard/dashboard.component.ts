import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { AutenticacionService } from '../../core/services/autenticacion.service';
import { AlertaOperativa, KpisDashboard } from '../../core/models/dashboard.model';

interface TarjetaKpi {
  etiqueta: string;
  valor:    number;
  icono:    string;
  variante: 'normal' | 'alerta' | 'peligro' | 'exito';
}

interface ZonaOperativa {
  nombre:    string;
  servicios: number;
  tecnicos:  number;
  total:     number;
}

@Component({
  selector: 'app-dashboard',
  imports: [NgClass],
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
      { etiqueta: 'SERVICIOS PROGRAMADOS',  valor: k.serviciosProgramados,  icono: 'calendar_month',    variante: 'normal'  },
      { etiqueta: 'EN EJECUCIÓN',            valor: k.serviciosEnEjecucion,  icono: 'play_circle',       variante: 'normal'  },
      { etiqueta: 'EXPEDIENTES BLOQUEADOS',  valor: k.expedientesBloqueados, icono: 'lock',              variante: 'peligro' },
      { etiqueta: 'PENDIENTES SSOMA',        valor: k.pendientesSsoma,       icono: 'health_and_safety', variante: 'alerta'  },
      { etiqueta: 'PENDIENTES CONFORMIDAD',  valor: k.pendientesConformidad, icono: 'pending_actions',   variante: 'alerta'  },
      { etiqueta: 'LISTOS PARA FACTURAR',    valor: k.listosFacturar,        icono: 'receipt_long',      variante: 'exito'   },
      { etiqueta: 'SLA VENCIDOS',            valor: k.slaVencidos,           icono: 'timer_off',         variante: 'peligro' },
      { etiqueta: 'TÉCNICOS EN RUTA',        valor: k.tecnicosEnRuta,        icono: 'location_on',       variante: 'normal'  },
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
