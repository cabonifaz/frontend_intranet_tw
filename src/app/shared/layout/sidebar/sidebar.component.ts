import { Component, Input, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface SubNavItem {
  etiqueta: string;
  ruta:     string;
}

interface NavItem {
  icono:    string;
  etiqueta: string;
  ruta?:    string;          // Link directo
  hijos?:   SubNavItem[];    // Agrupador expandible
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() colapsado = false;

  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    {
      icono:    'dashboard',
      etiqueta: 'Dashboard',
      ruta:     '/dashboard',
    },
    {
      icono:    'support_agent',
      etiqueta: 'CRM',
      hijos: [
        { etiqueta: 'Requerimientos', ruta: '/crm/requerimientos' },
        { etiqueta: 'Propuestas',     ruta: '/crm/propuestas' },
        { etiqueta: 'Visto Bueno',    ruta: '/crm/visto-bueno' },
      ],
    },
    {
      icono:    'settings',
      etiqueta: 'Maestros',
      ruta:     '/maestros',
    },
    {
      icono:    'contact_phone',
      etiqueta: 'Directorio',
      ruta:     '/directorio',
    },
  ];

  readonly expandidos = signal<Set<string>>(this.calcularExpandidosIniciales());

  private calcularExpandidosIniciales(): Set<string> {
    const url = this.router.url;
    const set = new Set<string>();
    for (const item of this.navItems) {
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
