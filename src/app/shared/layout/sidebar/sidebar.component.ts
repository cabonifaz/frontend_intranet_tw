import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  icono:    string;
  etiqueta: string;
  ruta:     string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() colapsado = false;

  readonly navItems: NavItem[] = [
    { icono: 'dashboard',         etiqueta: 'Dashboard',            ruta: '/dashboard'      },
    { icono: 'support_agent',     etiqueta: 'CRM / Requerimientos', ruta: '/crm/requerimientos' },
    { icono: 'folder_open',       etiqueta: 'Expediente Digital',   ruta: '/expedientes'    },
    { icono: 'calendar_month',    etiqueta: 'Programación',         ruta: '/programacion'   },
    { icono: 'health_and_safety', etiqueta: 'SSOMA',                ruta: '/ssoma'          },
    { icono: 'track_changes',     etiqueta: 'Seguimiento',          ruta: '/seguimiento'    },
    { icono: 'build',             etiqueta: 'Revisión Técnica',     ruta: '/revision'       },
    { icono: 'request_quote',     etiqueta: 'Precotización',        ruta: '/precotizacion'  },
    { icono: 'scale',             etiqueta: 'Metrología',           ruta: '/metrologia'     },
    { icono: 'receipt_long',      etiqueta: 'Facturación',          ruta: '/facturacion'    },
    { icono: 'analytics',         etiqueta: 'Reportes SLA',         ruta: '/reportes-sla'   },
    { icono: 'settings',          etiqueta: 'Maestros',             ruta: '/maestros/clientes' },
    { icono: 'headset_mic',       etiqueta: 'Helpdesk',             ruta: '/helpdesk'       },
    { icono: 'leaderboard',       etiqueta: 'Scorecard',            ruta: '/scorecard'      },
  ];
}
