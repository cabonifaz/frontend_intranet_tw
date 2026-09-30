import { Routes } from '@angular/router';
import { autenticacionGuard } from './core/guards/autenticacion.guard';
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
    path: '',
    component: AppLayoutComponent,
    canActivate: [autenticacionGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            m => m.DashboardComponent
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
