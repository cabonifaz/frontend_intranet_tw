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
