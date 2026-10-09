import { BreadcrumbItem } from '../../shared/ui/breadcrumb/breadcrumb.component';

const INICIO:   BreadcrumbItem = { label: 'Inicio',   ruta: '/dashboard' };
const MAESTROS: BreadcrumbItem = { label: 'Maestros', ruta: '/maestros'  };

/**
 * Prefijo estándar para vistas del módulo Maestros.
 * Uso: `breadcrumbMaestros('Clientes')` o `breadcrumbMaestros({ label: 'Clientes', ruta: '/maestros/clientes' }, 'Editar')`.
 */
export function breadcrumbMaestros(...cola: Array<string | BreadcrumbItem>): BreadcrumbItem[] {
  return [
    INICIO,
    MAESTROS,
    ...cola.map(x => typeof x === 'string' ? { label: x } : x),
  ];
}

export function breadcrumbDirectorio(...cola: Array<string | BreadcrumbItem>): BreadcrumbItem[] {
  return [
    INICIO,
    { label: 'Directorio', ruta: '/directorio' },
    ...cola.map(x => typeof x === 'string' ? { label: x } : x),
  ];
}

export function breadcrumbCrm(...cola: Array<string | BreadcrumbItem>): BreadcrumbItem[] {
  return [
    INICIO,
    { label: 'CRM' },
    ...cola.map(x => typeof x === 'string' ? { label: x } : x),
  ];
}
