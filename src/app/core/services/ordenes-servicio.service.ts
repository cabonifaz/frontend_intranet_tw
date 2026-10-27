import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  AnalisisImportacionOsOm,
  AnularOsRequest,
  BandejaOrdenesServicio,
  ConceptoCatalogoOs,
  DetalleOrdenServicio,
  EquipoCatalogoClienteOs,
  FiltrosBandejaOrdenesServicio,
  GuardarOrdenServicioRequest,
  ImpactoAnulacionOs,
  JefeComercialOs,
  MotivoAnulacionOs,
  MotivoEdicionOs,
  PreparacionEdicionOs,
  PreparacionNuevaOs,
  PropuestaDisponibleOs,
  ResultadoGuardarOrdenServicio,
  SolicitarEdicionOsRequest,
} from '../models/ordenes-servicio.model';
import {
  MOCK_ANALISIS_IMPORTACION_OS,
  MOCK_CONCEPTOS_CATALOGO,
  MOCK_CONCEPTOS_DE_PROPUESTA,
  MOCK_DETALLES_OS,
  MOCK_EQUIPOS_CATALOGO_CLIENTE,
  MOCK_EQUIPOS_DE_PROPUESTA,
  MOCK_JEFE_COMERCIAL_OS,
  MOCK_MOTIVOS_ANULACION_OS,
  MOCK_MOTIVOS_EDICION_OS,
  MOCK_PREPARACIONES_NUEVA_OS,
  MOCK_PROPUESTAS_DISPONIBLES_OS,
  MOCK_RESULTADO_GUARDAR_OS,
  filtrarBandejaOs,
  mockImpactoAnulacion,
} from './ordenes-servicio.mock';

/**
 * Módulo 9 — Órdenes de Servicio / Metrología (OS/OM). Sprint 4.
 * Alineado al controller `OrdenesServicioController` del back.
 *
 * Endpoints disponibles hoy (commit back `4ed1ce4`):
 *   GET /api/crm/ordenes-servicio            → HU-41 bandeja
 *   GET /api/crm/ordenes-servicio/exportar   → HU-41 export XLSX
 *
 * Pendientes del back (seguiremos con mock del front hasta que estén):
 *   GET /api/crm/ordenes-servicio/{id}       → HU-42 detalle
 *   POST   .../ (crear)                      → HU-40 nueva
 *   PUT    .../{id} (editar)                 → HU-40 editar
 *   POST   .../{id}/emitir                   → HU-40 emitir
 *   POST   .../{id}/solicitar-edicion        → HU-40 solicitar edición
 *   POST   .../{id}/anular                   → HU-40 anular
 */
@Injectable({ providedIn: 'root' })
export class OrdenesServicioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm/ordenes-servicio`;

  async obtenerBandeja(f: FiltrosBandejaOrdenesServicio): Promise<BandejaOrdenesServicio> {
    // ⚠️ MOCK para demo. Reemplazar por la llamada HTTP real cuando se integre con el back.
    await new Promise(r => setTimeout(r, 200));
    return filtrarBandejaOs(f);
    /* Real:
    const params = this.armarParams(f);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BandejaOrdenesServicio>>(this.base, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la bandeja de órdenes de servicio.');
    return r.datos;
    */
  }

  /**
   * HU-42 — Detalle de la OS/OM para el modal.
   *
   * ⚠️ MOCK: el endpoint `GET /api/crm/ordenes-servicio/{id}` todavía no existe en el back.
   * Cuando Bryan lo implemente, reemplazar el cuerpo por:
   *   const r = await firstValueFrom(this.http.get<RespuestaApi<DetalleOrdenServicio>>(`${this.base}/${idOs}`));
   *   if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle.');
   *   return r.datos;
   */
  /**
   * HU-40 — Propuestas aceptadas disponibles para generar una OS/OM.
   *
   * ⚠️ MOCK: pedir a Bryan `GET /api/crm/ordenes-servicio/propuestas-disponibles`
   * que liste propuestas con estado = aceptada SIN OS/OM activa (todas anuladas o ninguna).
   */
  async obtenerPropuestasDisponibles(): Promise<PropuestaDisponibleOs[]> {
    await new Promise(r => setTimeout(r, 200));
    return MOCK_PROPUESTAS_DISPONIBLES_OS;
  }

  /**
   * HU-40 — Datos precargados al abrir "Nueva OS/OM" desde una propuesta aceptada.
   * ⚠️ MOCK: pedir a Bryan `GET /api/crm/ordenes-servicio/preparar-nueva?idPropuesta={id}`.
   */
  async prepararNueva(idPropuesta: number): Promise<PreparacionNuevaOs> {
    await new Promise(r => setTimeout(r, 220));
    const p = MOCK_PREPARACIONES_NUEVA_OS[idPropuesta];
    if (!p) throw new Error('Esta propuesta no está disponible para generar una OS/OM.');
    return p;
  }

  /**
   * HU-40 — Preparación para editar una OS/OM existente (requiere edición autorizada).
   * ⚠️ MOCK: pedir a Bryan `GET /api/crm/ordenes-servicio/{idOs}/preparar-edicion`.
   */
  async prepararEdicion(idOs: number): Promise<PreparacionEdicionOs> {
    await new Promise(r => setTimeout(r, 220));
    const detalle = MOCK_DETALLES_OS[idOs] ?? MOCK_DETALLES_OS[0];
    return {
      detalle: { ...detalle, idOs },
      contactos: [
        { idContacto: 1, nombre: 'Juan Pérez',  cargo: 'Gerente de Logística', esPrincipal: true  },
        { idContacto: 2, nombre: 'María López', cargo: 'Jefa de Operaciones',  esPrincipal: false },
      ],
      idContactoActual: 1,
      autorizacion: {
        jefeComercial:     'Carlos Chávez',
        fechaAutorizacion: '2026-10-17T10:34',
        motivoLabel:       'Agregar o quitar equipos',
        comentario:        'El cliente solicitó incluir 3 equipos adicionales en el servicio.',
        idSolicitud:       777,
      },
    };
  }

  /**
   * HU-40 — Guarda borrador o emite la OS/OM.
   * ⚠️ MOCK: pedir a Bryan `POST /api/crm/ordenes-servicio` (nueva) o `PUT /api/crm/ordenes-servicio/{idOs}` (editar).
   */
  async guardar(req: GuardarOrdenServicioRequest): Promise<ResultadoGuardarOrdenServicio> {
    await new Promise(r => setTimeout(r, 400));
    return {
      ...MOCK_RESULTADO_GUARDAR_OS,
      idOs:    req.idOs ?? MOCK_RESULTADO_GUARDAR_OS.idOs,
      estado:  req.emitir ? 'emitida' : 'borrador',
      emitida: req.emitir,
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-40 Fase C — Solicitar Edición
  // ───────────────────────────────────────────────────────────────────────

  async obtenerMotivosEdicion(): Promise<MotivoEdicionOs[]> {
    await new Promise(r => setTimeout(r, 100));
    return MOCK_MOTIVOS_EDICION_OS;
  }

  async obtenerJefeComercial(_idOs: number): Promise<JefeComercialOs> {
    await new Promise(r => setTimeout(r, 100));
    return MOCK_JEFE_COMERCIAL_OS;
  }

  async solicitarEdicion(_req: SolicitarEdicionOsRequest): Promise<void> {
    await new Promise(r => setTimeout(r, 400));
    // mock
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-40 Fase C — Anular OS/OM
  // ───────────────────────────────────────────────────────────────────────

  async obtenerMotivosAnulacion(): Promise<MotivoAnulacionOs[]> {
    await new Promise(r => setTimeout(r, 100));
    return MOCK_MOTIVOS_ANULACION_OS;
  }

  async obtenerImpactoAnulacion(idOs: number): Promise<ImpactoAnulacionOs> {
    await new Promise(r => setTimeout(r, 150));
    return mockImpactoAnulacion(idOs);
  }

  async anular(_req: AnularOsRequest): Promise<void> {
    await new Promise(r => setTimeout(r, 400));
    // mock
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-43 — Catálogos de equipos / conceptos
  // ───────────────────────────────────────────────────────────────────────

  /** @param idPropuesta Para marcar cuáles vienen de la propuesta origen (tab "De la propuesta"). */
  async obtenerConceptosCatalogo(idPropuesta?: number): Promise<ConceptoCatalogoOs[]> {
    await new Promise(r => setTimeout(r, 150));
    const idsDePropuesta = new Set(MOCK_CONCEPTOS_DE_PROPUESTA[idPropuesta ?? 0] ?? []);
    return MOCK_CONCEPTOS_CATALOGO.map(c => ({
      ...c,
      deLaPropuesta: idsDePropuesta.has(c.idSuministro),
    }));
  }

  /** @param idPropuesta Para marcar cuáles vienen de la propuesta origen. */
  async obtenerEquiposCatalogoCliente(_idCliente: number, idPropuesta?: number): Promise<EquipoCatalogoClienteOs[]> {
    await new Promise(r => setTimeout(r, 180));
    const idsDePropuesta = new Set(MOCK_EQUIPOS_DE_PROPUESTA[idPropuesta ?? 0] ?? []);
    return MOCK_EQUIPOS_CATALOGO_CLIENTE.map(e => ({
      ...e,
      deLaPropuesta: idsDePropuesta.has(e.idEquipo),
    }));
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-44 — Importación desde Excel (plantilla estructurada)
  // ───────────────────────────────────────────────────────────────────────

  async descargarPlantillaImportOs(): Promise<Blob> {
    await new Promise(r => setTimeout(r, 300));
    return new Blob(['Plantilla OS/OM (mock)'], { type: 'text/plain' });
  }

  async analizarImportOs(_archivo: File): Promise<AnalisisImportacionOsOm> {
    await new Promise(r => setTimeout(r, 500));
    return MOCK_ANALISIS_IMPORTACION_OS;
  }

  async obtenerDetalle(idOs: number): Promise<DetalleOrdenServicio> {
    await new Promise(r => setTimeout(r, 250));
    const d = MOCK_DETALLES_OS[idOs] ?? MOCK_DETALLES_OS[0];
    return { ...d, idOs };
  }

  async exportarXlsx(_f: FiltrosBandejaOrdenesServicio): Promise<Blob> {
    // ⚠️ MOCK para demo.
    await new Promise(r => setTimeout(r, 400));
    return new Blob(['Export OS/OM (mock)'], { type: 'text/plain' });
  }

  private armarParams(f: FiltrosBandejaOrdenesServicio): HttpParams {
    let p = new HttpParams()
      .set('pagina',    (f.pagina ?? 1).toString())
      .set('porPagina', (f.porPagina ?? 10).toString());
    if (f.estado)        p = p.set('estado',        f.estado);
    if (f.tipo)          p = p.set('tipo',          f.tipo);
    if (f.idCliente)     p = p.set('idCliente',     String(f.idCliente));
    if (f.idResponsable) p = p.set('idResponsable', String(f.idResponsable));
    if (f.fechaDesde)    p = p.set('fechaDesde',    f.fechaDesde);
    if (f.fechaHasta)    p = p.set('fechaHasta',    f.fechaHasta);
    if (f.busqueda)      p = p.set('busqueda',      f.busqueda);
    return p;
  }
}
