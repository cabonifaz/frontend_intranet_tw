import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { SuplentesService } from '../../../../core/services/suplentes.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { UsuarioListaItem } from '../../../../core/models/usuarios.model';
import { SuplenteListaItem } from '../../../../core/models/suplentes.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';
import { PageHeaderComponent }  from '../../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent }  from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent }  from '../../../../shared/ui/paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../../../../shared/ui/badge-estado/badge-estado.component';
import { PermisoDirective } from '../../../../shared/directives/permiso.directive';
import { ESTADO, ESTADO_OPCIONES } from '../../../../core/constants/estados';

const POR_PAGINA = 20;

interface RolOpcion {
  value: string;
  label: string;
}

type TabActivo = 'usuarios' | 'suplentes';

@Component({
  selector: 'app-lista-usuarios',
  imports: [
    FormsModule,
    BreadcrumbComponent,
    PageHeaderComponent,
    FiltrosBarComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
    PaginacionComponent,
    BadgeEstadoComponent,
    PermisoDirective,
  ],
  templateUrl: './lista-usuarios.component.html',
  styleUrl: './lista-usuarios.component.scss',
})
export class ListaUsuariosComponent implements OnInit {
  private readonly usuariosSvc  = inject(UsuariosService);
  private readonly suplentesSvc = inject(SuplentesService);
  private readonly maestrosSvc  = inject(MaestrosService);
  private readonly router       = inject(Router);

  readonly tabActivo = signal<TabActivo>('usuarios');

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly usuarios  = signal<UsuarioListaItem[]>([]);
  readonly suplentes = signal<SuplenteListaItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;

  readonly breadcrumb = breadcrumbMaestros('Usuarios');

  readonly estadoOpciones = ESTADO_OPCIONES;

  // Cargados desde ROL_SISTEMA (tabla_maestra IdMaestro=68, migración 34 del back).
  // Nivel aprobado por el cliente: administrador / supervisor / usuario / visor.
  readonly rolOpciones = signal<RolOpcion[]>([{ value: '', label: 'Todos los roles' }]);

  busqueda = '';
  rolFiltro = '';
  estadoFiltro = '';

  async ngOnInit(): Promise<void> {
    this.maestrosSvc.obtenerCatalogo('ROL_SISTEMA')
      .then(roles => this.rolOpciones.set([
        { value: '', label: 'Todos los roles' },
        ...roles.map(r => ({ value: r.codigo ?? r.nombre, label: r.nombre })),
      ]))
      .catch(() => { /* el filtro se queda con "Todos los roles" si falla */ });
    await this.cargar();
  }

  async cambiarTab(tab: TabActivo): Promise<void> {
    if (this.tabActivo() === tab) return;
    this.tabActivo.set(tab);
    this.pagina.set(1);
    this.busqueda = '';
    this.rolFiltro = '';
    this.estadoFiltro = '';
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      if (this.tabActivo() === 'usuarios') {
        const r = await this.usuariosSvc.obtenerUsuarios(
          this.busqueda    || undefined,
          this.rolFiltro   || undefined,
          this.estadoFiltro || undefined,
          this.pagina(),
          this.porPagina,
        );
        this.usuarios.set(r.items);
        this.total.set(r.total);
      } else {
        const r = await this.suplentesSvc.obtenerSuplentes(
          this.busqueda || undefined,
          this.estadoFiltro || undefined,
          this.pagina(),
          this.porPagina,
        );
        this.suplentes.set(r.items);
        this.total.set(r.total);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  irAFicha(idUsuario: number): void {
    this.router.navigate(['/maestros/usuarios', idUsuario]);
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/usuarios/nuevo']);
  }

  irAFichaTitular(idTitular: number): void {
    this.router.navigate(['/maestros/usuarios', idTitular]);
  }

  async toggleEstadoUsuario(usuario: UsuarioListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = usuario.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.usuariosSvc.cambiarEstadoUsuario({
        idUsuario: usuario.idUsuario,
        estado:    nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }

  async toggleEstadoSuplente(s: SuplenteListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = s.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.suplentesSvc.cambiarEstadoSuplente({
        idAsignacion: s.idAsignacion,
        estado:       nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }

  iniciales(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }

  formatearAnexo(anexo?: string | null, troncal?: string | null): string {
    if (!anexo) return '—';
    if (troncal && anexo.startsWith(troncal)) {
      const interno = anexo.substring(troncal.length);
      return interno ? `${troncal} - ${interno}` : troncal;
    }
    return anexo;
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin límite';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearUltimoAcceso(fecha: string | null): string {
    if (!fecha) return 'Nunca';
    const diff = Date.now() - new Date(fecha).getTime();
    const mins  = Math.floor(diff / 60_000);
    const horas = Math.floor(diff / 3_600_000);
    const dias  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'Ahora mismo';
    if (mins  < 60) return `Hace ${mins} min`;
    if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    if (dias  < 30) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    return new Date(fecha).toLocaleDateString('es-PE');
  }
}
