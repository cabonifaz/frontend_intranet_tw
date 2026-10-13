import { Component, Input, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PermisosService } from '../../../core/services/permisos.service';

interface SubNavItem {
  etiqueta: string;
  ruta:     string;
  /** Acción específica requerida (del catálogo `accion`). Para botones de acción. */
  accion?:  string;
  /** Módulo requerido: se muestra si el usuario tiene cualquier nivel de acceso ≥ ver.
   *  Útil para maestros donde los visores también pueden ver en modo lectura. */
  modulo?:  string;
}

interface NavItem {
  icono:    string;
  etiqueta: string;
  ruta?:    string;          // Link directo
  hijos?:   SubNavItem[];    // Agrupador expandible
  accion?:  string;
  modulo?:  string;
  /** Any-of módulos: el item se muestra si el usuario tiene acceso a cualquiera. */
  modulosCualquiera?: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() colapsado = false;

  private readonly router   = inject(Router);
  private readonly permisos = inject(PermisosService);

  /**
   * Mapa de todos los items del menú con la acción que los habilita.
   * Si un item no define `accion`, siempre se muestra (ej. Dashboard, Directorio).
   */
  private readonly navItemsAll: NavItem[] = [
    {
      icono:    'dashboard',
      etiqueta: 'Dashboard',
      ruta:     '/dashboard',
    },
    {
      icono:    'support_agent',
      etiqueta: 'CRM',
      hijos: [
        { etiqueta: 'Requerimientos', ruta: '/crm/requerimientos', accion: 'rq_ver' },
        { etiqueta: 'Propuestas',     ruta: '/crm/propuestas',     accion: 'propuesta_ver' },
        { etiqueta: 'Visto Bueno',    ruta: '/crm/visto-bueno',    accion: 'propuesta_vb_bandeja' },
        { etiqueta: 'Seguimiento',    ruta: '/crm/seguimiento',    accion: 'propuesta_seguimiento_bandeja' },
      ],
    },
    {
      icono:    'settings',
      etiqueta: 'Maestros',
      ruta:     '/maestros',
      // Any-of módulos: el item se muestra si tiene acceso al menos a uno.
      modulosCualquiera: [
        'maestro_clientes', 'maestro_usuarios', 'maestro_suministros',
        'maestro_procedimientos', 'maestro_textos_base', 'maestro_equipos_cliente',
      ],
    },
    {
      icono:    'contact_phone',
      etiqueta: 'Directorio',
      ruta:     '/directorio',
    },
  ];

  /**
   * Items visibles: filtra sub-items que requieran una acción que el usuario no tiene,
   * y oculta grupos que quedan vacíos. Si los permisos aún no cargaron, se muestra todo
   * (el guard de ruta corta igual al navegar; evitamos un parpadeo en el refresh).
   */
  readonly navItems = computed<NavItem[]>(() => {
    if (!this.permisos.cargado()) return this.navItemsAll;
    const visible = (accion?: string, modulo?: string, modulosCualquiera?: string[]) =>
      (!accion && !modulo && !modulosCualquiera) ||
      (accion ? this.permisos.puede(accion) : false) ||
      (modulo ? this.permisos.tieneAccesoModulo(modulo) : false) ||
      (modulosCualquiera ? modulosCualquiera.some(m => this.permisos.tieneAccesoModulo(m)) : false);
    return this.navItemsAll
      .map(item => {
        if (item.hijos) {
          const hijos = item.hijos.filter(h => visible(h.accion, h.modulo));
          return hijos.length > 0 ? { ...item, hijos } : null;
        }
        return visible(item.accion, item.modulo, item.modulosCualquiera) ? item : null;
      })
      .filter((x): x is NavItem => x !== null);
  });

  readonly expandidos = signal<Set<string>>(this.calcularExpandidosIniciales());

  private calcularExpandidosIniciales(): Set<string> {
    const url = this.router.url;
    const set = new Set<string>();
    for (const item of this.navItemsAll) {
      if (item.hijos?.some(h => url.startsWith(h.ruta))) {
        set.add(item.etiqueta);
      }
    }
    return set;
  }

  toggleGrupo(etiqueta: string): void {
    const set = new Set(this.expandidos());
    if (set.has(etiqueta)) set.delete(etiqueta);
    else set.add(etiqueta);
    this.expandidos.set(set);
  }

  estaExpandido(etiqueta: string): boolean {
    return this.expandidos().has(etiqueta);
  }

  // Un grupo se marca como activo si alguno de sus hijos está en la ruta actual.
  grupoActivo(item: NavItem): boolean {
    if (!item.hijos) return false;
    const url = this.router.url;
    return item.hijos.some(h => url.startsWith(h.ruta));
  }
}
