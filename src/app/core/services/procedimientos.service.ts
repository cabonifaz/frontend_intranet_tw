import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoProcedimientoRequest,
  GuardarProcedimientoRequest,
  ProcedimientoDetalle,
  ProcedimientoListaItem,
  ProcedimientosPaginado,
  OpcionCatalogo,
} from '../models/procedimientos.model';

const USAR_MOCK = true;

@Injectable({ providedIn: 'root' })
export class ProcedimientosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerProcedimientos(
    busqueda?: string,
    anio?: number,
    estado?: string,
    soloVigentes = false,
    pagina = 1,
    porPagina = 15,
  ): Promise<ProcedimientosPaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, anio, estado, soloVigentes, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda)      params['busqueda']      = busqueda;
    if (anio)          params['anio']          = anio.toString();
    if (estado)        params['estado']        = estado;
    if (soloVigentes)  params['soloVigentes']  = 'true';

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

  // Método usado por HU-86 (dropdown de procedimientos en ficha Suministro clase Servicio).
  // Reemplaza al catálogo estático PROCEDIMIENTOS_CATALOGO que estaba en suministros.model.ts
  obtenerProcedimientosParaDropdown(): OpcionCatalogo[] {
    return ProcedimientosService.mockData
      .filter(p => p.esActivo && p.esVigente)
      .map(p => ({
        value: p.codigo,
        label: `${p.codigo} · ${p.descripcion.substring(0, 70)}${p.descripcion.length > 70 ? '…' : ''}`,
      }));
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static mockData: ProcedimientoDetalle[] = [
    {
      idProcedimiento: 89, codigo: 'EDW-B-2', anio: 2016, version: 1, revision: 2,
      norma: 'INTM (Internacional)',
      descripcion: 'Standard Practice for Force Verification of Testing Machines (Prácticas para verificación de máquinas de ensayo).',
      estado: 'Activo', esVigente: true, fechaRevision: '2018-10-10T00:00:00Z',
      anioEmision: 2016, versionOficial: 1, alcanceNorma: 'ASTM E4 · ISO 7500',
      tipoSegmentoRegulado: 'iso_17025', tipoSegmentoMetrologico: 'presion',
      alcanceTitulo: 'Standard Practice for Force Verification of Testing Machines',
      normaNacionalRangoSuperior: 'ASTM International', normaNacionalRangoInferior: 'NMP 001:2015',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: 'https://www.astm.org/e0004-21',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: true, aplicaVerificacionCampo: false, aplicaMantenimiento: false, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'metrologia_cientif',
      usuarioRegistro: 'JROCA', fechaRegistro: '2016-05-14T09:00:00Z',
      fechaModificacion: '2024-03-20T15:20:00Z', totalEdiciones: 5,
    },
    {
      idProcedimiento: 141, codigo: 'VJMDR', anio: 2009, version: 2, revision: 4,
      norma: 'INDECOPI', descripcion: 'Procedimiento General para la Calibración de Balanzas de Funcionamiento No Automático.',
      estado: 'Activo', esVigente: true, fechaRevision: '2020-06-12T00:00:00Z',
      anioEmision: 2009, versionOficial: 2, alcanceNorma: 'NMP 002:2009',
      tipoSegmentoRegulado: 'wacal_em', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Procedimiento General para la Calibración de Balanzas',
      normaNacionalRangoSuperior: 'INDECOPI · Dirección de Metrología', normaNacionalRangoInferior: 'OIML R76-1',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: true, aplicaVerificacionCampo: true, aplicaMantenimiento: false, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'metrologia_legal',
      usuarioRegistro: 'MTORRES', fechaRegistro: '2009-11-30T09:00:00Z',
      fechaModificacion: '2023-08-15T10:00:00Z', totalEdiciones: 8,
    },
    {
      idProcedimiento: 162, codigo: 'PA-A', anio: 2015, version: 3, revision: 3,
      norma: 'OIML R111', descripcion: 'Procedimiento para la calibración de pesas patrón clase E1, E2, F1 y F2.',
      estado: 'Activo', esVigente: true, fechaRevision: '2022-02-01T00:00:00Z',
      anioEmision: 2015, versionOficial: 3, alcanceNorma: 'OIML R111-1:2004',
      tipoSegmentoRegulado: 'oiml_r111', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Calibración de pesas patrón clase E1/E2/F1/F2',
      normaNacionalRangoSuperior: 'OIML · Organización Internacional', normaNacionalRangoInferior: 'ASTM E617',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: 'https://www.oiml.org/r111',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: true, aplicaVerificacionCampo: false, aplicaMantenimiento: false, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'metrologia_cientif',
      usuarioRegistro: 'CMENDOZA', fechaRegistro: '2015-08-22T09:00:00Z',
      fechaModificacion: '2024-01-10T11:30:00Z', totalEdiciones: 6,
    },
    {
      idProcedimiento: 44, codigo: 'PC-MT-01', anio: 2019, version: 1, revision: 2,
      norma: 'Interno TW', descripcion: 'Calibración de peso patrón con comparador de masas de precisión.',
      estado: 'Activo', esVigente: true, fechaRevision: '2023-11-20T00:00:00Z',
      anioEmision: 2019, versionOficial: 1, alcanceNorma: 'PC-INT-TW-001',
      tipoSegmentoRegulado: 'wacal_em', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Calibración de peso patrón con comparador',
      normaNacionalRangoSuperior: 'ISO/IEC 17025:2017', normaNacionalRangoInferior: 'INDECOPI NMP-005',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: true, aplicaVerificacionCampo: true, aplicaMantenimiento: false, aplicaCertificacionExterna: false,
      areaTecnicaResponsable: 'metrologia_legal',
      usuarioRegistro: 'LVARGAS', fechaRegistro: '2019-04-05T09:00:00Z',
      fechaModificacion: '2024-05-12T14:00:00Z', totalEdiciones: 4,
    },
    {
      idProcedimiento: 71, codigo: 'PC-MT-02', anio: 2008, version: 2, revision: 3,
      norma: 'Interno TW', descripcion: 'Verificación técnica de báscula camionera con carga de referencia y método comparativo.',
      estado: 'Activo', esVigente: true, fechaRevision: '2021-07-30T00:00:00Z',
      anioEmision: 2008, versionOficial: 2, alcanceNorma: 'PC-INT-TW-002',
      tipoSegmentoRegulado: 'wacal_em', tipoSegmentoMetrologico: 'masa_ia',
      alcanceTitulo: 'Verificación técnica de báscula de camión',
      normaNacionalRangoSuperior: 'OIML R76-1', normaNacionalRangoInferior: 'INDECOPI Metrología Legal',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: false, aplicaVerificacionCampo: true, aplicaMantenimiento: true, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'servicio_tecnico',
      usuarioRegistro: 'CMENDOZA', fechaRegistro: '2008-09-14T09:00:00Z',
      fechaModificacion: '2023-04-22T16:00:00Z', totalEdiciones: 7,
    },
    {
      idProcedimiento: 84, codigo: 'PC-001', anio: 2025, version: 2, revision: 1,
      norma: 'PC-001 Ed.2', descripcion: 'Procedimiento para la calibración de instrumentos de pesaje de funcionamiento no automático de clase de exactitud III-IIII.',
      estado: 'Activo', esVigente: true, fechaRevision: '2025-01-15T00:00:00Z',
      anioEmision: 2025, versionOficial: 2, alcanceNorma: 'OIML R76 · NMP 002',
      tipoSegmentoRegulado: 'wacal_em', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Calibración de instrumentos de pesaje no automático',
      normaNacionalRangoSuperior: 'OIML R76-1 (2006)', normaNacionalRangoInferior: 'INDECOPI NMP-002',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: 'https://www.indecopi.gob.pe/metrologia',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: true, aplicaVerificacionCampo: true, aplicaMantenimiento: false, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'metrologia_legal',
      usuarioRegistro: 'JROCA', fechaRegistro: '2025-01-15T09:00:00Z',
      fechaModificacion: '2026-08-10T09:00:00Z', totalEdiciones: 3,
    },
    {
      idProcedimiento: 53, codigo: 'POST10', anio: 2016, version: 1, revision: 2,
      norma: 'ISO 9001', descripcion: 'Mantenimiento preventivo de balanzas clase III - IIII con verificación de sensibilidad y excentricidad.',
      estado: 'Activo', esVigente: true, fechaRevision: '2019-05-08T00:00:00Z',
      anioEmision: 2016, versionOficial: 1, alcanceNorma: 'ISO 9001:2015',
      tipoSegmentoRegulado: 'iso_17025', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Mantenimiento de balanzas clase III-IIII',
      normaNacionalRangoSuperior: 'ISO 9001', normaNacionalRangoInferior: 'PC-INT-TW-003',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: false, aplicaVerificacionCampo: true, aplicaMantenimiento: true, aplicaCertificacionExterna: false,
      areaTecnicaResponsable: 'servicio_tecnico',
      usuarioRegistro: 'LVARGAS', fechaRegistro: '2016-03-11T09:00:00Z',
      fechaModificacion: '2020-11-28T15:00:00Z', totalEdiciones: 2,
    },
    {
      idProcedimiento: 87, codigo: 'PC-BAL-01', anio: 2016, version: 2, revision: 2,
      norma: 'Interno TW', descripcion: 'Mantenimiento preventivo integral de balanza camionera modular con celdas de carga.',
      estado: 'Activo', esVigente: true, fechaRevision: '2022-12-05T00:00:00Z',
      anioEmision: 2016, versionOficial: 2, alcanceNorma: 'PC-INT-TW-004',
      tipoSegmentoRegulado: 'iso_17025', tipoSegmentoMetrologico: 'masa_ia',
      alcanceTitulo: 'Mantenimiento preventivo balanza camionera',
      normaNacionalRangoSuperior: 'ISO/IEC 17025', normaNacionalRangoInferior: 'OIML R76',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: false,
      aplicaCalibracionLab: false, aplicaVerificacionCampo: true, aplicaMantenimiento: true, aplicaCertificacionExterna: false,
      areaTecnicaResponsable: 'servicio_tecnico',
      usuarioRegistro: 'CMENDOZA', fechaRegistro: '2016-06-20T09:00:00Z',
      fechaModificacion: '2023-01-15T09:00:00Z', totalEdiciones: 3,
    },
    {
      idProcedimiento: 38, codigo: 'PC-INST-01', anio: 2007, version: 3, revision: 2,
      norma: 'Interno TW', descripcion: 'Instalación de sistema de pesaje industrial con celdas digitales POWERCELL.',
      estado: 'Activo', esVigente: true, fechaRevision: '2018-09-14T00:00:00Z',
      anioEmision: 2007, versionOficial: 3, alcanceNorma: 'PC-INT-TW-005',
      tipoSegmentoRegulado: 'iso_17025', tipoSegmentoMetrologico: 'masa_ia',
      alcanceTitulo: 'Instalación de sistema de pesaje industrial',
      normaNacionalRangoSuperior: 'ISO/IEC 17025', normaNacionalRangoInferior: 'NEC 2020',
      esFormatoDigitalIso: false, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: false, sincronizarAppMovil: false,
      aplicaCalibracionLab: false, aplicaVerificacionCampo: true, aplicaMantenimiento: false, aplicaCertificacionExterna: false,
      areaTecnicaResponsable: 'servicio_tecnico',
      usuarioRegistro: 'LVARGAS', fechaRegistro: '2007-05-10T09:00:00Z',
      fechaModificacion: '2019-02-08T14:00:00Z', totalEdiciones: 4,
    },
    {
      idProcedimiento: 52, codigo: 'PE-A2S', anio: 2011, version: 2, revision: 1,
      norma: 'INDECOPI', descripcion: 'Procedimiento para la verificación periódica de balanzas comerciales tipo mostrador.',
      estado: 'Activo', esVigente: true, fechaRevision: '2020-04-22T00:00:00Z',
      anioEmision: 2011, versionOficial: 2, alcanceNorma: 'NMP 010:2011',
      tipoSegmentoRegulado: 'sunat_metrolo', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Verificación periódica balanzas comerciales',
      normaNacionalRangoSuperior: 'INDECOPI Metrología Legal', normaNacionalRangoInferior: 'OIML R76-2',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: false, sincronizarAppMovil: true,
      aplicaCalibracionLab: false, aplicaVerificacionCampo: true, aplicaMantenimiento: false, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'metrologia_legal',
      usuarioRegistro: 'MTORRES', fechaRegistro: '2011-07-18T09:00:00Z',
      fechaModificacion: '2021-03-10T11:00:00Z', totalEdiciones: 3,
    },
    {
      idProcedimiento: 21, codigo: 'MK-C', anio: 2018, version: 1, revision: 1,
      norma: 'Interno TW', descripcion: 'Manual de calidad para operaciones de calibración en laboratorio central según ISO 17025.',
      estado: 'Activo', esVigente: true, fechaRevision: '2023-06-01T00:00:00Z',
      anioEmision: 2018, versionOficial: 1, alcanceNorma: 'MK-TW-C-001',
      tipoSegmentoRegulado: 'iso_17025', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Manual de Calidad · Calibración Lab Central',
      normaNacionalRangoSuperior: 'ISO/IEC 17025:2017', normaNacionalRangoInferior: 'ISO 9001:2015',
      esFormatoDigitalIso: true, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: true, esVigenteIso17025: true, sincronizarAppMovil: false,
      aplicaCalibracionLab: true, aplicaVerificacionCampo: false, aplicaMantenimiento: false, aplicaCertificacionExterna: true,
      areaTecnicaResponsable: 'calidad',
      usuarioRegistro: 'ATORRES', fechaRegistro: '2018-11-05T09:00:00Z',
      fechaModificacion: '2024-08-12T10:00:00Z', totalEdiciones: 2,
    },
    {
      idProcedimiento: 39, codigo: 'RB-B-B2S', anio: 2009, version: 1, revision: 3,
      norma: 'Retirado', descripcion: 'Procedimiento de revisión anual de básculas (retirado - reemplazado por PC-001 Ed.2 2025).',
      estado: 'Inactivo', esVigente: false, fechaRevision: '2015-01-30T00:00:00Z',
      anioEmision: 2009, versionOficial: 1, alcanceNorma: 'Legado histórico',
      tipoSegmentoRegulado: 'wacal_em', tipoSegmentoMetrologico: 'masa_iana',
      alcanceTitulo: 'Revisión anual de básculas (retirado)',
      normaNacionalRangoSuperior: 'INDECOPI · versión histórica', normaNacionalRangoInferior: '—',
      esFormatoDigitalIso: false, urlPdfAprobado: '', enlaceCatalogoExterno: '',
      esActivo: false, esVigenteIso17025: false, sincronizarAppMovil: false,
      aplicaCalibracionLab: false, aplicaVerificacionCampo: false, aplicaMantenimiento: false, aplicaCertificacionExterna: false,
      areaTecnicaResponsable: 'metrologia_legal',
      usuarioRegistro: 'CMENDOZA', fechaRegistro: '2009-02-14T09:00:00Z',
      fechaModificacion: '2015-01-30T09:00:00Z', totalEdiciones: 5,
    },
  ];

  private static nextId = 200;

  private async mockObtener(
    busqueda?: string,
    anio?: number,
    estado?: string,
    soloVigentes = false,
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
        p.norma.toLowerCase().includes(q) ||
        String(p.anio).includes(q)
      );
    }
    if (anio)         filtered = filtered.filter(p => p.anio === anio);
    if (estado)       filtered = filtered.filter(p => p.estado === estado);
    if (soloVigentes) filtered = filtered.filter(p => p.esVigente);

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
        revision:          dto.revision,
        norma:             dto.norma,
        descripcion:       dto.descripcion,
        estado:            dto.guardarComoBorrador ? 'Borrador' : (dto.esActivo ? 'Activo' : 'Inactivo'),
        esVigente:         dto.esVigente,
        fechaRevision:     new Date().toISOString(),
        anioEmision:               dto.anioEmision,
        versionOficial:            dto.versionOficial,
        alcanceNorma:              dto.alcanceNorma,
        tipoSegmentoRegulado:      dto.tipoSegmentoRegulado,
        tipoSegmentoMetrologico:   dto.tipoSegmentoMetrologico,
        alcanceTitulo:             dto.alcanceTitulo,
        normaNacionalRangoSuperior: dto.normaNacionalRangoSuperior,
        normaNacionalRangoInferior: dto.normaNacionalRangoInferior,
        esFormatoDigitalIso:       dto.esFormatoDigitalIso,
        urlPdfAprobado:            dto.urlPdfAprobado,
        enlaceCatalogoExterno:     dto.enlaceCatalogoExterno,
        esActivo:                  dto.esActivo,
        esVigenteIso17025:         dto.esVigenteIso17025,
        sincronizarAppMovil:       dto.sincronizarAppMovil,
        aplicaCalibracionLab:      dto.aplicaCalibracionLab,
        aplicaVerificacionCampo:   dto.aplicaVerificacionCampo,
        aplicaMantenimiento:       dto.aplicaMantenimiento,
        aplicaCertificacionExterna: dto.aplicaCertificacionExterna,
        areaTecnicaResponsable:    dto.areaTecnicaResponsable,
        usuarioRegistro:   'Admin TW',
        fechaRegistro:     new Date().toISOString(),
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
      revision:          dto.revision,
      norma:             dto.norma,
      descripcion:       dto.descripcion,
      esVigente:         dto.esVigente,
      anioEmision:               dto.anioEmision,
      versionOficial:            dto.versionOficial,
      alcanceNorma:              dto.alcanceNorma,
      tipoSegmentoRegulado:      dto.tipoSegmentoRegulado,
      tipoSegmentoMetrologico:   dto.tipoSegmentoMetrologico,
      alcanceTitulo:             dto.alcanceTitulo,
      normaNacionalRangoSuperior: dto.normaNacionalRangoSuperior,
      normaNacionalRangoInferior: dto.normaNacionalRangoInferior,
      esFormatoDigitalIso:       dto.esFormatoDigitalIso,
      urlPdfAprobado:            dto.urlPdfAprobado,
      enlaceCatalogoExterno:     dto.enlaceCatalogoExterno,
      esActivo:                  dto.esActivo,
      esVigenteIso17025:         dto.esVigenteIso17025,
      sincronizarAppMovil:       dto.sincronizarAppMovil,
      aplicaCalibracionLab:      dto.aplicaCalibracionLab,
      aplicaVerificacionCampo:   dto.aplicaVerificacionCampo,
      aplicaMantenimiento:       dto.aplicaMantenimiento,
      aplicaCertificacionExterna: dto.aplicaCertificacionExterna,
      areaTecnicaResponsable:    dto.areaTecnicaResponsable,
      fechaModificacion:  new Date().toISOString(),
      totalEdiciones:     existing.totalEdiciones + 1,
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
