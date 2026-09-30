import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoSuministroRequest,
  GuardarSuministroRequest,
  SuministroDetalle,
  SuministroListaItem,
  SuministrosPaginado,
  CLASES_SUMINISTRO,
  MARCAS_SUMINISTRO,
  MODELOS_SUMINISTRO,
  PROCEDENCIAS_SUMINISTRO,
  PROCEDIMIENTOS_CATALOGO,
  SUBTIPOS_SUMINISTRO,
  TIPOS_SUMINISTRO,
  OpcionCatalogo,
  esServicio,
} from '../models/suministros.model';

const USAR_MOCK = true;

@Injectable({ providedIn: 'root' })
export class SuministrosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerSuministros(
    busqueda?: string,
    clase?: string,
    tipo?: string,
    estado?: string,
    soloEnPropuestas = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<SuministrosPaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, clase, tipo, estado, soloEnPropuestas, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (clase)    params['clase']    = clase;
    if (tipo)     params['tipo']     = tipo;
    if (estado)   params['estado']   = estado;
    if (soloEnPropuestas) params['soloEnPropuestas'] = 'true';

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuministrosPaginado>>(`${this.base}/suministros`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerSuministroPorId(id: number): Promise<SuministroDetalle> {
    if (USAR_MOCK) return this.mockObtenerPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuministroDetalle>>(`${this.base}/suministros/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarSuministro(dto: GuardarSuministroRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardar(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/suministros`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoSuministro(dto: CambiarEstadoSuministroRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstado(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/suministros/${dto.idSuministro}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  async crearMarca(nombre: string): Promise<OpcionCatalogo> {
    await this.mockDelay(200);
    const value = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const nueva: OpcionCatalogo = { value, label: nombre.toUpperCase() };
    SuministrosService.marcasDinamicas.push(nueva);
    return nueva;
  }

  async crearModelo(nombre: string): Promise<OpcionCatalogo> {
    await this.mockDelay(200);
    const value = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const nuevo: OpcionCatalogo = { value, label: nombre.toUpperCase() };
    SuministrosService.modelosDinamicos.push(nuevo);
    return nuevo;
  }

  obtenerMarcas(): OpcionCatalogo[] {
    return [...MARCAS_SUMINISTRO, ...SuministrosService.marcasDinamicas];
  }

  obtenerModelos(): OpcionCatalogo[] {
    return [...MODELOS_SUMINISTRO, ...SuministrosService.modelosDinamicos];
  }

  obtenerProcedimientos(): OpcionCatalogo[] {
    // TODO: cuando exista HU-87, reemplazar por servicio real de Procedimientos
    return PROCEDIMIENTOS_CATALOGO;
  }

  generarDescripcionAuto(clase: string, tipo: string, subtipo: string, marca: string, modelo: string): string {
    const claseLabel   = this.labelDeCatalogo(CLASES_SUMINISTRO,   clase);
    const tipoLabel    = this.labelDeCatalogo(TIPOS_SUMINISTRO,    tipo);
    const subtipoLabel = this.labelDeCatalogo(SUBTIPOS_SUMINISTRO, subtipo);

    const partes: string[] = [];
    if (claseLabel)   partes.push(claseLabel);
    if (tipoLabel)    partes.push(tipoLabel);
    if (subtipoLabel) partes.push(subtipoLabel);

    // Servicio no lleva Marca/Modelo (regla de negocio del legacy)
    if (!esServicio(clase)) {
      const marcaLabel  = this.labelDeCatalogo(this.obtenerMarcas(),  marca);
      const modeloLabel = this.labelDeCatalogo(this.obtenerModelos(), modelo);
      if (marcaLabel)  partes.push(`Marca ${marcaLabel}`);
      if (modeloLabel) partes.push(`Modelo ${modeloLabel}`);
    }

    return partes.join(' ');
  }

  private labelDeCatalogo(catalogo: OpcionCatalogo[], value: string): string {
    return catalogo.find(o => o.value === value)?.label ?? '';
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static marcasDinamicas: OpcionCatalogo[] = [];
  private static modelosDinamicos: OpcionCatalogo[] = [];

  private static mockData: SuministroDetalle[] = [
    // ── INSTRUMENTO
    {
      idSuministro: 9150, clase: 'instrumento', claseLabel: 'Instrumento',
      tipo: 'instrumento_laboratorio', tipoLabel: 'Instrumento de Laboratorio',
      subtipo: 'estufa', subtipoLabel: 'Estufa',
      descripcion: 'Suministro Instrumento de Laboratorio Estufa Marca 3S CIENTIFIC Modelo HTC-8',
      marca: '3s_cientific', modelo: 'htc_8',
      ctaContable: '7011109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: false,
      descripcionAuto: 'Instrumento Instrumento de Laboratorio Estufa Marca 3S CIENTIFIC Modelo HTC-8',
      descripcionManual: '',
      alcance: '', unidad: 'unidad_bienes', casillero: '',
      codigoUnspsc: '', precioMinReferencia: null,
      escalas: [
        { nivel: 'estandar',         precio: null },
        { nivel: 'volumen',          precio: null },
        { nivel: 'corporativo_alto', precio: null },
      ],
      aplicaComercial: false, aplicaServicio: false, aplicaMetrologia: false,
      usuarioRegistro: 'LMILLA', fechaRegistro: '2021-07-08T14:53:00Z',
      fechaModificacion: '2026-08-15T14:30:00Z', totalEdiciones: 4, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    // ── EQUIPO
    {
      idSuministro: 29, clase: 'equipo', claseLabel: 'Equipo',
      tipo: 'balanza_industrial', tipoLabel: 'Balanza Industrial',
      subtipo: 'de_plataforma', subtipoLabel: 'De Plataforma',
      descripcion: 'Suministro Balanza Industrial De Plataforma Marca OHAUS Modelo PTI-1212-T32XW',
      marca: 'ohaus', modelo: 'pti_1212_t32xw',
      ctaContable: '7011103', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Equipo Balanza Industrial De Plataforma Marca OHAUS Modelo PTI-1212-T32XW',
      descripcionManual: 'Suministro Balanza De Plataforma Marca Ohaus Modelo PTI-1212-T32XW',
      alcance: '', unidad: 'n', casillero: 'N',
      codigoUnspsc: '41111509 - BÁSCULAS DE PISO O DE PLATAFORMA', precioMinReferencia: null,
      escalas: [
        { nivel: 'estandar',         precio: null },
        { nivel: 'volumen',          precio: null },
        { nivel: 'corporativo_alto', precio: null },
      ],
      aplicaComercial: true, aplicaServicio: true, aplicaMetrologia: false,
      usuarioRegistro: '', fechaRegistro: '', fechaModificacion: '',
      totalEdiciones: 0, firmaDigital: '',
      urlFoto: '', urlManualPdf: '',
    },
    // ── PESA
    {
      idSuministro: 18830, clase: 'pesa', claseLabel: 'Pesa',
      tipo: 'pesa_patron', tipoLabel: 'Pesa Patrón',
      subtipo: 'bloque_patron', subtipoLabel: 'Bloque Patrón',
      descripcion: 'Suministro Pesa Patrón Bloque Patrón Marca MITUTOYO Modelo 516-106-10',
      marca: 'mitutoyo', modelo: '516_106_10',
      ctaContable: '', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: false,
      descripcionAuto: 'Pesa Pesa Patrón Bloque Patrón Marca MITUTOYO Modelo 516-106-10',
      descripcionManual: '',
      alcance: '', unidad: 'unidad_bienes', casillero: '',
      codigoUnspsc: '', precioMinReferencia: null,
      escalas: [
        { nivel: 'estandar',         precio: null },
        { nivel: 'volumen',          precio: null },
        { nivel: 'corporativo_alto', precio: null },
      ],
      aplicaComercial: false, aplicaServicio: false, aplicaMetrologia: false,
      usuarioRegistro: 'DGASTULO', fechaRegistro: '2026-05-30T10:17:00Z',
      fechaModificacion: '2026-05-30T10:17:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    // ── SERVICIO (con procedimientos)
    {
      idSuministro: 16984, clase: 'servicio', claseLabel: 'Servicio',
      tipo: 'mantenimiento_calibracion', tipoLabel: 'Mantenimiento y Calibración',
      subtipo: 'clase_iii_iiii', subtipoLabel: 'Clase III - IIII',
      descripcion: 'Servicio de mantenimiento y calibración de balanza clase III - IIII',
      marca: '', modelo: '',
      ctaContable: '', procedencia: 'servicio', procedenciaLabel: 'Servicio',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: false,
      descripcionAuto: 'Servicio Mantenimiento y Calibración Clase III - IIII',
      descripcionManual: 'Servicio de mantenimiento y calibración de balanza clase III - IIII',
      alcance: 'hasta 30 kg', unidad: 'unidad_servicios', casillero: '',
      codigoUnspsc: '', precioMinReferencia: null,
      escalas: [
        { nivel: 'estandar',         precio: null },
        { nivel: 'volumen',          precio: null },
        { nivel: 'corporativo_alto', precio: null },
      ],
      aplicaComercial: false, aplicaServicio: true, aplicaMetrologia: true,
      idPrimerProcedimiento:  'POST10-2016',
      idSegundoProcedimiento: 'PC-001-2025',
      usuarioRegistro: 'JROCA', fechaRegistro: '2025-07-14T17:34:00Z',
      fechaModificacion: '2025-07-14T17:34:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    // ── SERVICIO (mantenimiento preventivo balanza camiones)
    {
      idSuministro: 5167, clase: 'servicio', claseLabel: 'Servicio',
      tipo: 'mantenimiento_calibracion', tipoLabel: 'Mantenimiento y Calibración',
      subtipo: 'balanza_camiones', subtipoLabel: 'Balanza de Camiones',
      descripcion: 'Servicio Mantenimiento Preventivo y Calibración Balanza de Camiones',
      marca: '', modelo: '',
      ctaContable: '', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: false,
      descripcionAuto: 'Servicio Mantenimiento y Calibración Balanza de Camiones',
      descripcionManual: 'Servicio Mantenimiento Preventivo y Calibración Balanza de Camiones',
      alcance: '', unidad: 'n', casillero: 'N',
      codigoUnspsc: '', precioMinReferencia: null,
      escalas: [
        { nivel: 'estandar',         precio: null },
        { nivel: 'volumen',          precio: null },
        { nivel: 'corporativo_alto', precio: null },
      ],
      aplicaComercial: true, aplicaServicio: true, aplicaMetrologia: false,
      idPrimerProcedimiento:  'PC-BAL-01',
      idSegundoProcedimiento: 'PC-MT-02',
      usuarioRegistro: '', fechaRegistro: '', fechaModificacion: '',
      totalEdiciones: 0, firmaDigital: '',
      urlFoto: '', urlManualPdf: '',
    },
    // ── EQUIPO (balanza precisión)
    {
      idSuministro: 9170, clase: 'equipo', claseLabel: 'Equipo',
      tipo: 'balanza_precision', tipoLabel: 'Balanza de Precisión',
      subtipo: 'de_plataforma', subtipoLabel: 'De Plataforma',
      descripcion: 'Balanza de Precisión Analítica 0.01g Calibración Automática',
      marca: 'ad', modelo: 'ek_6000',
      ctaContable: '7011109', procedencia: 'importado_japon', procedenciaLabel: 'Importado Japón',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Equipo Balanza de Precisión De Plataforma Marca A&D Modelo EK-6000',
      descripcionManual: 'Balanza de precisión analítica, capacidad 6000g x 0.01g, calibración automática interna con pesa de referencia.',
      alcance: '0 a 6000 g (d = 0.01 g)', unidad: 'unidad_bienes', casillero: '',
      codigoUnspsc: '41111731 - BALANZAS ANALÍTICAS', precioMinReferencia: 4200,
      escalas: [
        { nivel: 'estandar',         precio: 4800 },
        { nivel: 'volumen',          precio: 4400 },
        { nivel: 'corporativo_alto', precio: 4200 },
      ],
      aplicaComercial: true, aplicaServicio: false, aplicaMetrologia: true,
      usuarioRegistro: 'MTORRES', fechaRegistro: '2025-07-02T10:00:00Z',
      fechaModificacion: '2026-09-10T14:00:00Z', totalEdiciones: 5, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    // ── PESA (clase M1)
    {
      idSuministro: 9160, clase: 'pesa', claseLabel: 'Pesa',
      tipo: 'pesa_patron', tipoLabel: 'Pesa Patrón',
      subtipo: 'pesa_clase_m1', subtipoLabel: 'Pesa Clase M1',
      descripcion: 'Pesa Patrón Paralelepípeda Hierro Fundido Clase M1 20kg con Cavidad de Ajuste',
      marca: 'total_weight', modelo: 'tw_m1',
      ctaContable: '7011109', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Pesa Pesa Patrón Pesa Clase M1 Marca TOTAL WEIGHT Modelo TW-M1',
      descripcionManual: 'Pesa patrón paralelepípeda de hierro fundido, clase M1 (OIML R111), masa nominal 20 kg con cavidad de ajuste sellada.',
      alcance: '20 kg ± 1 g', unidad: 'unidad_bienes', casillero: 'A-12',
      codigoUnspsc: '41111803 - PESAS DE CALIBRACIÓN', precioMinReferencia: 320,
      escalas: [
        { nivel: 'estandar',         precio: 380 },
        { nivel: 'volumen',          precio: 340 },
        { nivel: 'corporativo_alto', precio: 320 },
      ],
      aplicaComercial: true, aplicaServicio: true, aplicaMetrologia: true,
      usuarioRegistro: 'LVARGAS', fechaRegistro: '2025-06-01T08:30:00Z',
      fechaModificacion: '2026-06-01T10:00:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    // ── INSTRUMENTO (indicador digital)
    {
      idSuministro: 9153, clase: 'instrumento', claseLabel: 'Instrumento',
      tipo: 'indicador_digital', tipoLabel: 'Indicador Digital',
      subtipo: 'indicador_alta_res', subtipoLabel: 'Indicador Alta Resolución',
      descripcion: 'Indicador Electrónico de Pesaje Alta Resolución con Display Gráfico',
      marca: 'rice_lake', modelo: '820',
      ctaContable: '7011109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Instrumento Indicador Digital Indicador Alta Resolución Marca RICE LAKE Modelo 820',
      descripcionManual: 'Indicador digital de alta resolución con display gráfico OLED, 8 entradas de celda de carga.',
      alcance: '1 μV/d resolución', unidad: 'unidad_bienes', casillero: 'B-05',
      codigoUnspsc: '41115406 - INDICADORES DE PESAJE', precioMinReferencia: 1900,
      escalas: [
        { nivel: 'estandar',         precio: 2200 },
        { nivel: 'volumen',          precio: 2000 },
        { nivel: 'corporativo_alto', precio: 1900 },
      ],
      aplicaComercial: true, aplicaServicio: true, aplicaMetrologia: true,
      usuarioRegistro: 'CMENDOZA', fechaRegistro: '2025-05-20T09:00:00Z',
      fechaModificacion: '2026-07-10T15:00:00Z', totalEdiciones: 3, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
  ];

  private static nextId = 20000;

  private async mockObtener(
    busqueda?: string,
    clase?: string,
    tipo?: string,
    estado?: string,
    soloEnPropuestas = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<SuministrosPaginado> {
    await this.mockDelay();
    let filtered = [...SuministrosService.mockData];

    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(s =>
        String(s.idSuministro).includes(q) ||
        s.descripcion.toLowerCase().includes(q) ||
        s.tipoLabel.toLowerCase().includes(q) ||
        s.subtipoLabel.toLowerCase().includes(q) ||
        this.labelDeCatalogo(this.obtenerMarcas(),  s.marca).toLowerCase().includes(q) ||
        this.labelDeCatalogo(this.obtenerModelos(), s.modelo).toLowerCase().includes(q) ||
        (s.ctaContable ?? '').toLowerCase().includes(q)
      );
    }
    if (clase)  filtered = filtered.filter(s => s.clase  === clase);
    if (tipo)   filtered = filtered.filter(s => s.tipo   === tipo);
    if (estado) filtered = filtered.filter(s => s.estado === estado);
    if (soloEnPropuestas) filtered = filtered.filter(s => s.usarEnPropuestas);

    const total  = filtered.length;
    const inicio = (pagina - 1) * porPagina;
    const items  = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockObtenerPorId(id: number): Promise<SuministroDetalle> {
    await this.mockDelay();
    const found = SuministrosService.mockData.find(s => s.idSuministro === id);
    if (!found) throw new Error('Suministro no encontrado.');
    return { ...found };
  }

  private async mockGuardar(dto: GuardarSuministroRequest): Promise<number> {
    await this.mockDelay();
    // Servicio no lleva marca/modelo
    const marca  = esServicio(dto.clase) ? '' : dto.marca;
    const modelo = esServicio(dto.clase) ? '' : dto.modelo;

    if (dto.idSuministro === 0) {
      const nuevoId = SuministrosService.nextId++;
      SuministrosService.mockData.push({
        idSuministro:       nuevoId,
        clase:              dto.clase,
        claseLabel:         this.labelDeCatalogo(CLASES_SUMINISTRO,       dto.clase),
        tipo:               dto.tipo,
        tipoLabel:          this.labelDeCatalogo(TIPOS_SUMINISTRO,        dto.tipo),
        subtipo:            dto.subtipo,
        subtipoLabel:       this.labelDeCatalogo(SUBTIPOS_SUMINISTRO,     dto.subtipo),
        descripcion:        dto.descripcionManual || dto.descripcionAuto,
        marca, modelo,
        ctaContable:        dto.ctaContable,
        procedencia:        dto.procedencia,
        procedenciaLabel:   this.labelDeCatalogo(PROCEDENCIAS_SUMINISTRO, dto.procedencia),
        estado:             dto.guardarComoBorrador ? 'Borrador' : (dto.esActivoEnCatalogo ? 'Activo' : 'Inactivo'),
        esActivoEnCatalogo: dto.esActivoEnCatalogo,
        usarEnPropuestas:   dto.usarEnPropuestas,
        descripcionAuto:    dto.descripcionAuto,
        descripcionManual:  dto.descripcionManual,
        alcance:            dto.alcance,
        unidad:             dto.unidad,
        casillero:          dto.casillero,
        codigoUnspsc:       dto.codigoUnspsc,
        precioMinReferencia: dto.precioMinReferencia,
        escalas:             dto.escalas,
        aplicaComercial:     dto.aplicaComercial,
        aplicaServicio:      dto.aplicaServicio,
        aplicaMetrologia:    dto.aplicaMetrologia,
        idPrimerProcedimiento:  esServicio(dto.clase) ? dto.idPrimerProcedimiento  : undefined,
        idSegundoProcedimiento: esServicio(dto.clase) ? dto.idSegundoProcedimiento : undefined,
        usuarioRegistro:   'Admin TW',
        fechaRegistro:     new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        totalEdiciones:    1,
        firmaDigital:      'SHA-256 · verificado',
        urlFoto:           '',
        urlManualPdf:      '',
      });
      return nuevoId;
    }

    const existing = SuministrosService.mockData.find(s => s.idSuministro === dto.idSuministro);
    if (!existing) throw new Error('Suministro no encontrado.');
    Object.assign(existing, {
      clase:              dto.clase,
      claseLabel:         this.labelDeCatalogo(CLASES_SUMINISTRO,       dto.clase),
      tipo:               dto.tipo,
      tipoLabel:          this.labelDeCatalogo(TIPOS_SUMINISTRO,        dto.tipo),
      subtipo:            dto.subtipo,
      subtipoLabel:       this.labelDeCatalogo(SUBTIPOS_SUMINISTRO,     dto.subtipo),
      descripcion:        dto.descripcionManual || dto.descripcionAuto,
      marca, modelo,
      ctaContable:        dto.ctaContable,
      procedencia:        dto.procedencia,
      procedenciaLabel:   this.labelDeCatalogo(PROCEDENCIAS_SUMINISTRO, dto.procedencia),
      esActivoEnCatalogo: dto.esActivoEnCatalogo,
      usarEnPropuestas:   dto.usarEnPropuestas,
      descripcionAuto:    dto.descripcionAuto,
      descripcionManual:  dto.descripcionManual,
      alcance:            dto.alcance,
      unidad:             dto.unidad,
      casillero:          dto.casillero,
      codigoUnspsc:       dto.codigoUnspsc,
      precioMinReferencia: dto.precioMinReferencia,
      escalas:             dto.escalas,
      aplicaComercial:     dto.aplicaComercial,
      aplicaServicio:      dto.aplicaServicio,
      aplicaMetrologia:    dto.aplicaMetrologia,
      idPrimerProcedimiento:  esServicio(dto.clase) ? dto.idPrimerProcedimiento  : undefined,
      idSegundoProcedimiento: esServicio(dto.clase) ? dto.idSegundoProcedimiento : undefined,
      fechaModificacion:  new Date().toISOString(),
      totalEdiciones:     existing.totalEdiciones + 1,
    });
    return dto.idSuministro;
  }

  private async mockCambiarEstado(dto: CambiarEstadoSuministroRequest): Promise<void> {
    await this.mockDelay();
    const existing = SuministrosService.mockData.find(s => s.idSuministro === dto.idSuministro);
    if (!existing) throw new Error('Suministro no encontrado.');
    existing.estado = dto.estado;
    existing.esActivoEnCatalogo = dto.estado === 'Activo';
  }

  private mockDelay(ms = 220): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
