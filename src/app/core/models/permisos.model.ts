/**
 * Acción del sistema y si el usuario actual puede ejecutarla.
 * Viene de GET /api/autenticacion/acciones (ticket #4301, migración 41).
 */
export interface AccionPermitida {
  accion:          string;    // ej. "rq_guardar", "usuario_cambiar_estado"
  accionLabel:     string;    // ej. "Crear / editar requerimiento"
  modulo:          string;    // ej. "requerimientos"
  nivelRequerido:  string;    // 'ver' | 'editar' | 'supervisar' | 'administrar'
  permitido:       boolean;
}

/**
 * Permiso de módulo (una celda de la matriz área×rol×módulo).
 * Viene de GET /api/autenticacion/permisos.
 */
export interface PermisoModulo {
  modulo:      string;
  moduloLabel: string;
  areaModulo:  string;
  acceso:      'ninguno' | 'ver' | 'editar' | 'supervisar' | 'administrar';
  esExcepcion: boolean;
}
