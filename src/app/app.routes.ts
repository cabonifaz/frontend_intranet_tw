import { Routes } from '@angular/router';
import { autenticacionGuard } from './core/guards/autenticacion.guard';
import { cambioContrasenaGuard } from './core/guards/cambio-contrasena.guard';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/autenticacion/login/login.component').then(
        m => m.LoginComponent
      ),
  },
  {
    // Pantalla standalone (sin AppLayout). Solo accesible si el usuario está autenticado.
    path: 'cambiar-contrasena',
    canActivate: [autenticacionGuard],
    loadComponent: () =>
      import('./features/autenticacion/cambiar-contrasena/cambiar-contrasena.component').then(
        m => m.CambiarContrasenaComponent
      ),
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [autenticacionGuard, cambioContrasenaGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            m => m.DashboardComponent
          ),
      },
      {
        path: 'styleguide',
        loadComponent: () =>
          import('./features/styleguide/styleguide.component').then(
            m => m.StyleguideComponent
          ),
      },
      {
        path: 'maestros',
        loadComponent: () =>
          import('./features/maestros/maestros-hub/maestros-hub.component').then(
            m => m.MaestrosHubComponent
          ),
      },
      {
        path: 'maestros/clientes',
        loadComponent: () =>
          import('./features/maestros/clientes/lista-clientes/lista-clientes.component').then(
            m => m.ListaClientesComponent
          ),
      },
      {
        path: 'maestros/clientes/nuevo',
        loadComponent: () =>
          import('./features/maestros/clientes/ficha-cliente/ficha-cliente.component').then(
            m => m.FichaClienteComponent
          ),
      },
      {
        path: 'maestros/clientes/:id',
        loadComponent: () =>
          import('./features/maestros/clientes/ficha-cliente/ficha-cliente.component').then(
            m => m.FichaClienteComponent
          ),
      },
      {
        path: 'maestros/categorias',
        loadComponent: () =>
          import('./features/maestros/categorias/lista-categorias/lista-categorias.component').then(
            m => m.ListaCategoriasComponent
          ),
      },
      {
        path: 'maestros/requisitos-ssoma',
        loadComponent: () =>
          import('./features/maestros/requisitos-ssoma/lista-requisitos-ssoma/lista-requisitos-ssoma.component').then(
            m => m.ListaRequisitosSsomaComponent
          ),
      },
      {
        path: 'maestros/usuarios',
        loadComponent: () =>
          import('./features/maestros/usuarios/lista-usuarios/lista-usuarios.component').then(
            m => m.ListaUsuariosComponent
          ),
      },
      {
        path: 'maestros/usuarios/nuevo',
        loadComponent: () =>
          import('./features/maestros/usuarios/ficha-usuario/ficha-usuario.component').then(
            m => m.FichaUsuarioComponent
          ),
      },
      {
        path: 'maestros/usuarios/:id',
        loadComponent: () =>
          import('./features/maestros/usuarios/ficha-usuario/ficha-usuario.component').then(
            m => m.FichaUsuarioComponent
          ),
      },
      {
        path: 'maestros/textos-base',
        loadComponent: () =>
          import('./features/maestros/textos-base/lista-textos-base/lista-textos-base.component').then(
            m => m.ListaTextosBaseComponent
          ),
      },
      {
        path: 'maestros/textos-base/nuevo',
        loadComponent: () =>
          import('./features/maestros/textos-base/ficha-texto-base/ficha-texto-base.component').then(
            m => m.FichaTextoBaseComponent
          ),
      },
      {
        path: 'maestros/textos-base/:id',
        loadComponent: () =>
          import('./features/maestros/textos-base/ficha-texto-base/ficha-texto-base.component').then(
            m => m.FichaTextoBaseComponent
          ),
      },
      {
        path: 'maestros/suministros',
        loadComponent: () =>
          import('./features/maestros/suministros/lista-suministros/lista-suministros.component').then(
            m => m.ListaSuministrosComponent
          ),
      },
      {
        path: 'maestros/suministros/nuevo',
        loadComponent: () =>
          import('./features/maestros/suministros/ficha-suministro/ficha-suministro.component').then(
            m => m.FichaSuministroComponent
          ),
      },
      {
        path: 'maestros/suministros/:id',
        loadComponent: () =>
          import('./features/maestros/suministros/ficha-suministro/ficha-suministro.component').then(
            m => m.FichaSuministroComponent
          ),
      },
      {
        path: 'maestros/procedimientos',
        loadComponent: () =>
          import('./features/maestros/procedimientos/lista-procedimientos/lista-procedimientos.component').then(
            m => m.ListaProcedimientosComponent
          ),
      },
      {
        path: 'maestros/procedimientos/nuevo',
        loadComponent: () =>
          import('./features/maestros/procedimientos/ficha-procedimiento/ficha-procedimiento.component').then(
            m => m.FichaProcedimientoComponent
          ),
      },
      {
        path: 'maestros/procedimientos/:id',
        loadComponent: () =>
          import('./features/maestros/procedimientos/ficha-procedimiento/ficha-procedimiento.component').then(
            m => m.FichaProcedimientoComponent
          ),
      },
      {
        path: 'maestros/equipos',
        loadComponent: () =>
          import('./features/maestros/equipos-cliente/lista-equipos-cliente/lista-equipos-cliente.component').then(
            m => m.ListaEquiposClienteComponent
          ),
      },
      {
        path: 'maestros/equipos/nuevo',
        loadComponent: () =>
          import('./features/maestros/equipos-cliente/ficha-equipo-cliente/ficha-equipo-cliente.component').then(
            m => m.FichaEquipoClienteComponent
          ),
      },
      {
        path: 'maestros/equipos/:id',
        loadComponent: () =>
          import('./features/maestros/equipos-cliente/ficha-equipo-cliente/ficha-equipo-cliente.component').then(
            m => m.FichaEquipoClienteComponent
          ),
      },
      {
        path: 'crm/propuestas',
        loadComponent: () =>
          import('./features/crm/propuestas/lista-propuestas/lista-propuestas.component').then(
            m => m.ListaPropuestasComponent
          ),
      },
      {
        path: 'crm/propuestas/nueva',
        loadComponent: () =>
          import('./features/crm/propuestas/wizard/propuesta-wizard.component').then(
            m => m.PropuestaWizardComponent
          ),
        children: [
          { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
          { path: 'configuracion',       loadComponent: () => import('./features/crm/propuestas/secciones/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
          { path: 'propuesta',           loadComponent: () => import('./features/crm/propuestas/secciones/propuesta/propuesta.component').then(m => m.PropuestaComponent) },
          { path: 'opcionales',          loadComponent: () => import('./features/crm/propuestas/secciones/opcionales/opcionales.component').then(m => m.OpcionalesComponent) },
          { path: 'detalle',             loadComponent: () => import('./features/crm/propuestas/secciones/detalle/detalle.component').then(m => m.DetalleComponent) },
          { path: 'recomendaciones',     loadComponent: () => import('./features/crm/propuestas/secciones/recomendaciones/recomendaciones.component').then(m => m.RecomendacionesComponent) },
          { path: 'forma-pago',          loadComponent: () => import('./features/crm/propuestas/secciones/forma-pago/forma-pago.component').then(m => m.FormaPagoComponent) },
          { path: 'suministros-cliente', loadComponent: () => import('./features/crm/propuestas/secciones/suministros-cliente/suministros-cliente.component').then(m => m.SuministrosClienteComponent) },
          { path: 'condiciones',         loadComponent: () => import('./features/crm/propuestas/secciones/condiciones/condiciones.component').then(m => m.CondicionesComponent) },
          { path: 'listado-equipos',     loadComponent: () => import('./features/crm/propuestas/secciones/listado-equipos/listado-equipos.component').then(m => m.ListadoEquiposComponent) },
        ],
      },
      {
        path: 'crm/propuestas/:id/editar',
        loadComponent: () =>
          import('./features/crm/propuestas/wizard/propuesta-wizard.component').then(
            m => m.PropuestaWizardComponent
          ),
        children: [
          { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
          { path: 'configuracion',       loadComponent: () => import('./features/crm/propuestas/secciones/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
          { path: 'propuesta',           loadComponent: () => import('./features/crm/propuestas/secciones/propuesta/propuesta.component').then(m => m.PropuestaComponent) },
          { path: 'opcionales',          loadComponent: () => import('./features/crm/propuestas/secciones/opcionales/opcionales.component').then(m => m.OpcionalesComponent) },
          { path: 'detalle',             loadComponent: () => import('./features/crm/propuestas/secciones/detalle/detalle.component').then(m => m.DetalleComponent) },
          { path: 'recomendaciones',     loadComponent: () => import('./features/crm/propuestas/secciones/recomendaciones/recomendaciones.component').then(m => m.RecomendacionesComponent) },
          { path: 'forma-pago',          loadComponent: () => import('./features/crm/propuestas/secciones/forma-pago/forma-pago.component').then(m => m.FormaPagoComponent) },
          { path: 'suministros-cliente', loadComponent: () => import('./features/crm/propuestas/secciones/suministros-cliente/suministros-cliente.component').then(m => m.SuministrosClienteComponent) },
          { path: 'condiciones',         loadComponent: () => import('./features/crm/propuestas/secciones/condiciones/condiciones.component').then(m => m.CondicionesComponent) },
          { path: 'listado-equipos',     loadComponent: () => import('./features/crm/propuestas/secciones/listado-equipos/listado-equipos.component').then(m => m.ListadoEquiposComponent) },
        ],
      },
      {
        path: 'crm/requerimientos',
        loadComponent: () =>
          import('./features/crm/requerimientos/lista-requerimientos/lista-requerimientos.component').then(
            m => m.ListaRequerimientosComponent
          ),
      },
      {
        path: 'crm/requerimientos/nuevo',
        loadComponent: () =>
          import('./features/crm/requerimientos/ficha-requerimiento/ficha-requerimiento.component').then(
            m => m.FichaRequerimientoComponent
          ),
      },
      {
        path: 'crm/requerimientos/:id/editar',
        loadComponent: () =>
          import('./features/crm/requerimientos/ficha-requerimiento/ficha-requerimiento.component').then(
            m => m.FichaRequerimientoComponent
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
