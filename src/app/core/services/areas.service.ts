import { Injectable, inject } from '@angular/core';
import { MaestrosService } from './maestros.service';

export interface AreaItem {
  codigo: string;   // String2 de tabla_maestra (identificador estable usado en usuario.area)
  nombre: string;   // String1 de tabla_maestra (etiqueta visible)
}

/**
 * Mantenimiento del catálogo "Áreas" (compartido entre Usuarios, Clientes/Sedes y
 * Equipos del Cliente).
 *
 * Backend: tabla_maestra con `Descripcion = 'AREA_USUARIO'` (IdMaestro=79).
 *   - Listar: GET /api/maestros/catalogos/AREA_USUARIO
 *   - Crear:  POST /api/maestros/catalogos/AREA_USUARIO
 *   - Renombrar: pendiente de endpoint (hoy el back solo expone insertar).
 */
@Injectable({ providedIn: 'root' })
export class AreasService {
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly CATEGORIA  = 'AREA_USUARIO';

  async listar(): Promise<AreaItem[]> {
    const r = await this.maestrosSvc.obtenerCatalogo(this.CATEGORIA);
    // Filtramos items sin String2 — un área sin código estable no es usable como value
    // del <select> (el back lo garantiza con el slug, pero el tipo es string | null).
    return r
      .filter(c => !!c.codigo)
      .map(c => ({ codigo: c.codigo!, nombre: c.nombre }));
  }

  async crear(nombre: string): Promise<AreaItem> {
    const r = await this.maestrosSvc.agregarItemCatalogo(this.CATEGORIA, nombre.trim());
    return { codigo: r.codigo, nombre: r.nombre };
  }

  /**
   * Pendiente de endpoint en el back. Hoy devuelve el area sin cambios y notifica
   * para que el componente muestre un aviso.
   */
  async renombrar(_codigo: string, _nombreNuevo: string): Promise<AreaItem | null> {
    throw new Error('Renombrar áreas aún no está disponible. Bryan tiene que crear el endpoint PATCH /api/maestros/catalogos/AREA_USUARIO/:codigo.');
  }
}
