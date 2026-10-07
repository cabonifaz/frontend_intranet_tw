import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoProcedimientoRequest,
  GuardarProcedimientoRequest,
  ProcedimientoDetalle,
  ProcedimientosPaginado,
  OpcionCatalogo,
} from '../models/procedimientos.model';

const USAR_MOCK = environment.usarMocks;

@Injectable({ providedIn: 'root' })
export class ProcedimientosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerProcedimientos(
    busqueda?: string,
    anio?: number,
    estado?: string,
    pagina = 1,
    porPagina = 15,
  ): Promise<ProcedimientosPaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, anio, estado, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (anio)     params['anio']     = anio.toString();
    if (estado)   params['estado']   = estado;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ProcedimientosPaginado>>(`${this.base}/procedimientos`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerProcedimientoPorId(id: number): Promise<ProcedimientoDetalle> {
    if (USAR_MOCK) return this.mockObtenerPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ProcedimientoDetalle>>(`${this.base}/procedimientos/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarProcedimiento(dto: GuardarProcedimientoRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardar(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/procedimientos`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoProcedimiento(dto: CambiarEstadoProcedimientoRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstado(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/procedimientos/${dto.idProcedimiento}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  // Usado por HU-86 (dropdown en ficha Suministro clase Servicio).
  // Cuando usarMocks=false, llama al endpoint GET /maestros/procedimientos/opciones del back.
  async obtenerProcedimientosParaDropdown(): Promise<OpcionCatalogo[]> {
    if (USAR_MOCK) {
      return ProcedimientosService.mockData
        .filter(p => p.esActivo)
        .map(p => ({
          value: p.codigo,
          label: `${p.codigo} · ${p.descripcion.substring(0, 70)}${p.descripcion.length > 70 ? '…' : ''}`,
        }));
    }

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<OpcionCatalogo[]>>(`${this.base}/procedimientos/opciones`),
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static mockData: ProcedimientoDetalle[] = [
    {
      idProcedimiento: 89, codigo: 'EDW-B-2', anio: 2016, version: 1,
      autorNorma: 'ASTM International', normaBase: 'ASTM E4 · ISO 7500',
      descripcion: 'Standard Practice for Force Verification of Testing Machines.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2016-05-14T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'JROCA', pcRegistro: 'COM06',
      fechaModificacion: '2024-03-20T15:20:00Z', totalEdiciones: 5,
    },
    {
      idProcedimiento: 141, codigo: 'VJMDR', anio: 2009, version: 2,
      autorNorma: 'INDECOPI', normaBase: 'OIML R76-1 · NMP 002:2009',
      descripcion: 'Procedimiento General para la Calibración de Balanzas de Funcionamiento No Automático.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2009-11-30T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'MTORRES', pcRegistro: 'COM121',
      fechaModificacion: '2023-08-15T10:00:00Z', totalEdiciones: 8,
    },
    {
      idProcedimiento: 162, codigo: 'PA-A', anio: 2015, version: 3,
      autorNorma: 'OIML', normaBase: 'OIML R111-1:2004',
      descripcion: 'Procedimiento para la calibración de pesas patrón clase E1, E2, F1 y F2.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2015-08-22T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'CMENDOZA', pcRegistro: 'SISTEMAS',
      fechaModificacion: '2024-01-10T11:30:00Z', totalEdiciones: 6,
    },
    {
      idProcedimiento: 44, codigo: 'PC-MT-01', anio: 2019, version: 1,
      autorNorma: 'Interno TW', normaBase: 'ISO/IEC 17025:2017',
      descripcion: 'Calibración de peso patrón con comparador de masas de precisión.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2019-04-05T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'LVARGAS', pcRegistro: 'COM06',
      fechaModificacion: '2024-05-12T14:00:00Z', totalEdiciones: 4,
    },
    {
      idProcedimiento: 71, codigo: 'PC-MT-02', anio: 2008, version: 2,
      autorNorma: 'Interno TW', normaBase: 'OIML R76-1',
      descripcion: 'Verificación técnica de báscula camionera con carga de referencia y método comparativo.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2008-09-14T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'CMENDOZA', pcRegistro: 'COM121',
      fechaModificacion: '2023-04-22T16:00:00Z', totalEdiciones: 7,
    },
    {
      idProcedimiento: 84, codigo: 'PC-001', anio: 2025, version: 2,
      autorNorma: 'INACAL-DM', normaBase: 'OIML R76 · NMP 002',
      descripcion: 'Procedimiento para la calibración de instrumentos de pesaje de funcionamiento no automático de clase III-IIII.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2025-01-15T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'JROCA', pcRegistro: 'COM06',
      fechaModificacion: '2026-08-10T09:00:00Z', totalEdiciones: 3,
    },
    {
      idProcedimiento: 53, codigo: 'POST10', anio: 2016, version: 1,
      autorNorma: 'Interno TW', normaBase: 'ISO 9001:2015',
      descripcion: 'Mantenimiento preventivo de balanzas clase III-IIII con verificación de sensibilidad y excentricidad.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2016-03-11T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'LVARGAS', pcRegistro: 'SISTEMAS',
      fechaModificacion: '2020-11-28T15:00:00Z', totalEdiciones: 2,
    },
    {
      idProcedimiento: 87, codigo: 'PC-BAL-01', anio: 2016, version: 2,
      autorNorma: 'Interno TW', normaBase: 'OIML R76',
      descripcion: 'Mantenimiento preventivo integral de balanza camionera modular con celdas de carga.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2016-06-20T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'CMENDOZA', pcRegistro: 'COM121',
      fechaModificacion: '2023-01-15T09:00:00Z', totalEdiciones: 3,
    },
    {
      idProcedimiento: 38, codigo: 'PC-INST-01', anio: 2007, version: 3,
      autorNorma: 'Interno TW', normaBase: 'NEC 2020',
      descripcion: 'Instalación de sistema de pesaje industrial con celdas digitales POWERCELL.',
      estado: 'Activo', esFormatoDigitalIso: false, fechaRegistro: '2007-05-10T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'LVARGAS', pcRegistro: 'COM06',
      fechaModificacion: '2019-02-08T14:00:00Z', totalEdiciones: 4,
    },
    {
      idProcedimiento: 52, codigo: 'PE-A2S', anio: 2011, version: 2,
      autorNorma: 'INDECOPI', normaBase: 'NMP 010:2011',
      descripcion: 'Procedimiento para la verificación periódica de balanzas comerciales tipo mostrador.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2011-07-18T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'MTORRES', pcRegistro: 'COM121',
      fechaModificacion: '2021-03-10T11:00:00Z', totalEdiciones: 3,
    },
    {
      idProcedimiento: 21, codigo: 'MK-C', anio: 2018, version: 1,
      autorNorma: 'Interno TW', normaBase: 'ISO/IEC 17025:2017',
      descripcion: 'Manual de calidad para operaciones de calibración en laboratorio central según ISO 17025.',
      estado: 'Activo', esFormatoDigitalIso: true, fechaRegistro: '2018-11-05T09:00:00Z',
      esActivo: true,
      urlPdfAprobado: '',
      usuarioRegistro: 'ATORRES', pcRegistro: 'SISTEMAS',
      fechaModificacion: '2024-08-12T10:00:00Z', totalEdiciones: 2,
    },
    {
      idProcedimiento: 39, codigo: 'RB-B-B2S', anio: 2009, version: 1,
      autorNorma: 'Retirado', normaBase: '',
      descripcion: 'Procedimiento de revisión anual de básculas (retirado - reemplazado por PC-001 Ed.2 2025).',
      estado: 'Inactivo', esFormatoDigitalIso: false, fechaRegistro: '2009-02-14T09:00:00Z',
      esActivo: false,
      urlPdfAprobado: '',
      usuarioRegistro: 'CMENDOZA', pcRegistro: 'SISTEMAS',
      fechaModificacion: '2015-01-30T09:00:00Z', totalEdiciones: 5,
    },
  ];

  private static nextId = 200;

  private async mockObtener(
    busqueda?: string,
    anio?: number,
    estado?: string,
    pagina = 1,
    porPagina = 15,
  ): Promise<ProcedimientosPaginado> {
    await this.mockDelay();
    let filtered = [...ProcedimientosService.mockData];

    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(p =>
        String(p.idProcedimiento).includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.autorNorma.toLowerCase().includes(q) ||
        String(p.anio).includes(q)
      );
    }
    if (anio)         filtered = filtered.filter(p => p.anio === anio);
    if (estado)       filtered = filtered.filter(p => p.estado === estado);

    const total  = filtered.length;
    const inicio = (pagina - 1) * porPagina;
    const items  = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockObtenerPorId(id: number): Promise<ProcedimientoDetalle> {
    await this.mockDelay();
    const found = ProcedimientosService.mockData.find(p => p.idProcedimiento === id);
    if (!found) throw new Error('Procedimiento no encontrado.');
    return { ...found };
  }

  private async mockGuardar(dto: GuardarProcedimientoRequest): Promise<number> {
    await this.mockDelay();

    if (dto.idProcedimiento === 0) {
      const nuevoId = ProcedimientosService.nextId++;
      ProcedimientosService.mockData.push({
        idProcedimiento:   nuevoId,
        codigo:            dto.codigo,
        anio:              dto.anio,
        version:           dto.version,
        autorNorma:        dto.autorNorma,
        normaBase:         dto.normaBase,
        descripcion:       dto.descripcion,
        estado:            dto.guardarComoBorrador ? 'Borrador' : (dto.esActivo ? 'Activo' : 'Inactivo'),
        esFormatoDigitalIso: dto.esFormatoDigitalIso,
        fechaRegistro:     new Date().toISOString(),
        esActivo:          dto.esActivo,
        urlPdfAprobado:    dto.urlPdfAprobado,
        usuarioRegistro:   'Admin TW',
        pcRegistro:        'WEB',
        fechaModificacion: new Date().toISOString(),
        totalEdiciones:    1,
      });
      return nuevoId;
    }

    const existing = ProcedimientosService.mockData.find(p => p.idProcedimiento === dto.idProcedimiento);
    if (!existing) throw new Error('Procedimiento no encontrado.');
    Object.assign(existing, {
      codigo:            dto.codigo,
      anio:              dto.anio,
      version:           dto.version,
      autorNorma:        dto.autorNorma,
      descripcion:       dto.descripcion,
      esFormatoDigitalIso: dto.esFormatoDigitalIso,
      normaBase:         dto.normaBase,
      esActivo:          dto.esActivo,
      estado:            dto.esActivo ? 'Activo' : 'Inactivo',
      urlPdfAprobado:    dto.urlPdfAprobado,
      fechaModificacion: new Date().toISOString(),
      totalEdiciones:    existing.totalEdiciones + 1,
    });
    return dto.idProcedimiento;
  }

  private async mockCambiarEstado(dto: CambiarEstadoProcedimientoRequest): Promise<void> {
    await this.mockDelay();
    const existing = ProcedimientosService.mockData.find(p => p.idProcedimiento === dto.idProcedimiento);
    if (!existing) throw new Error('Procedimiento no encontrado.');
    existing.estado = dto.estado;
    existing.esActivo = dto.estado === 'Activo';
  }

  private mockDelay(ms = 220): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
