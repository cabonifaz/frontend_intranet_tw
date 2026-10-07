import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.component';

interface MaestroCard {
  icono:       string;
  titulo:      string;
  descripcion: string;
  ruta:        string | null;
}

@Component({
  selector: 'app-maestros-hub',
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './maestros-hub.component.html',
  styleUrl: './maestros-hub.component.scss',
})
export class MaestrosHubComponent {
  readonly breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio',    ruta: '/dashboard' },
    { label: 'Maestros' },
  ];

  readonly maestros: MaestroCard[] = [
    {
      icono:       'business',
      titulo:      'Clientes',
      descripcion: 'Directorio de clientes corporativos, sedes operativas y contactos autorizados.',
      ruta:        '/maestros/clientes',
    },
    {
      icono:       'category',
      titulo:      'Categorías de Cliente',
      descripcion: 'Clasificación comercial: nivel VIP, prioridad de atención y reglas de rentabilidad.',
      ruta:        '/maestros/categorias',
    },
    {
      icono:       'manage_accounts',
      titulo:      'Usuarios',
      descripcion: 'Gestión de cuentas, roles, permisos y suplencias temporales del personal interno.',
      ruta:        '/maestros/usuarios',
    },
    {
      icono:       'article',
      titulo:      'Textos Base',
      descripcion: 'Catálogo maestro de cláusulas, saludos y recomendaciones reutilizables en propuestas comerciales.',
      ruta:        '/maestros/textos-base',
    },
    {
      icono:       'inventory_2',
      titulo:      'Suministros',
      descripcion: 'Catálogo técnico-comercial de suministros, insumos, repuestos, equipos y servicios asignables a propuestas.',
      ruta:        '/maestros/suministros',
    },
    {
      icono:       'menu_book',
      titulo:      'Procedimientos',
      descripcion: 'Catálogo de procedimientos metrológicos, normas técnicas y documentos aprobados para calibración y mantenimiento.',
      ruta:        '/maestros/procedimientos',
    },
    {
      icono:       'precision_manufacturing',
      titulo:      'Equipos de Cliente',
      descripcion: 'Parque de instrumentos y balanzas en campo por cliente y sede operativa, con hoja de vida y trazabilidad ISO 17025.',
      ruta:        '/maestros/equipos',
    },
    {
      icono:       'health_and_safety',
      titulo:      'Requisitos SSOMA',
      descripcion: 'Catálogo maestro de requisitos de seguridad asignables a los clientes (SCTR, EPP, inducciones, exámenes médicos).',
      ruta:        '/maestros/requisitos-ssoma',
    },
  ];
}
