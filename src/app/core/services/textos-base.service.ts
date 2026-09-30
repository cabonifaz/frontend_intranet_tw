import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoTextoBaseRequest,
  GuardarTextoBaseRequest,
  TextoBaseDetalle,
  TextoBaseListaItem,
  TextosBasePaginado,
} from '../models/textos-base.model';

const USAR_MOCK = true;

@Injectable({ providedIn: 'root' })
export class TextosBaseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerTextosBase(
    busqueda?: string,
    tipoCategoria?: string,
    estado?: string,
    soloPredeterminados = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<TextosBasePaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, tipoCategoria, estado, soloPredeterminados, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda)      params['busqueda']      = busqueda;
    if (tipoCategoria) params['tipoCategoria'] = tipoCategoria;
    if (estado)        params['estado']        = estado;
    if (soloPredeterminados) params['soloPredeterminados'] = 'true';

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<TextosBasePaginado>>(`${this.base}/textos-base`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerTextoBasePorId(id: number): Promise<TextoBaseDetalle> {
    if (USAR_MOCK) return this.mockObtenerPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<TextoBaseDetalle>>(`${this.base}/textos-base/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarTextoBase(dto: GuardarTextoBaseRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardar(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/textos-base`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoTextoBase(dto: CambiarEstadoTextoBaseRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstado(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/textos-base/${dto.idTextoBase}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  generarCodigoCorto(tipoCategoria: string): string {
    const prefijos: Record<string, string> = {
      servicio_saludo:  'TXT-SVC-SAL',
      comercial_saludo: 'TXT-COM-SAL',
      propuesta:         'TXT-PROP-LOG',
      recomendaciones:   'TXT-REC',
      condiciones:       'TXT-COND',
      garantia:          'TXT-GAR',
      legal:             'TXT-LEG',
      firma_pie:         'TXT-FIRMA',
    };
    const prefijo = prefijos[tipoCategoria] ?? 'TXT-BASE';
    const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    return `${prefijo}-${num}`;
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static mockData: TextoBaseDetalle[] = [
    { idTextoBase: 1,  codigoCorto: 'TXT-SVC-SAL-01',  tipoCategoria: 'servicio_saludo',  tipoCategoriaLabel: 'Servicio · Saludo',  nombre: 'Saludo',
      textoClausula: 'Estimados Señores,\nPor medio de la presente reciban el cordial saludo de TOTAL WEIGHT & SYSTEMS S.A.C. y permítannos de acuerdo a su requerimiento, presentarles nuestra propuesta comercial.',
      estado: 'Activo', esPredeterminado: true, esNegritaPorDefecto: false, fechaCreacion: '2025-01-15T10:00:00Z', usuarioCreador: 'Ana Torres',
      seccionDossier: 'cap1', ordenAparicion: 1, nivelSangria: 'estandar',
      aplicaTodosServicios: true, aplicaCalibracionLab: true, aplicaCalibracionPlanta: true, aplicaMantenimiento: true, aplicaVentaSuministros: true,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 245 },
    { idTextoBase: 2,  codigoCorto: 'TXT-COM-SAL-01',  tipoCategoria: 'comercial_saludo', tipoCategoriaLabel: 'Comercial · Saludo', nombre: 'Saludo',
      textoClausula: 'Estimados Señores,\nPor medio de la presente reciban el cordial saludo de TOTAL WEIGHT & SYSTEMS S.A.C. y a su vez permítanos hacerles llegar nuestra cotización de acuerdo a su siguiente pedido.',
      estado: 'Activo', esPredeterminado: true, esNegritaPorDefecto: false, fechaCreacion: '2025-01-20T09:30:00Z', usuarioCreador: 'Ana Torres',
      seccionDossier: 'cap1', ordenAparicion: 2, nivelSangria: 'estandar',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: false, aplicaMantenimiento: false, aplicaVentaSuministros: true,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: false, visibleSupervisores: true,
      propuestasAsociadas: 128 },
    { idTextoBase: 3,  codigoCorto: 'TXT-PROP-LOG-01', tipoCategoria: 'propuesta',        tipoCategoriaLabel: 'Propuesta',           nombre: 'Calibración',
      textoClausula: 'Servicio de calibración por nuestro laboratorio acreditado TW SAC.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: true,  fechaCreacion: '2025-02-01T09:00:00Z', usuarioCreador: 'Carlos Mendoza',
      seccionDossier: 'cap2', ordenAparicion: 1, nivelSangria: 'primer_nivel',
      aplicaTodosServicios: false, aplicaCalibracionLab: true, aplicaCalibracionPlanta: true, aplicaMantenimiento: false, aplicaVentaSuministros: false,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 89 },
    { idTextoBase: 4,  codigoCorto: 'TXT-PROP-LOG-02', tipoCategoria: 'propuesta',        tipoCategoriaLabel: 'Propuesta',           nombre: 'Transporte',
      textoClausula: 'Transporte de módulos desde taller de fabricación a lugar de instalación en planta {Cliente}.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-02-05T09:00:00Z', usuarioCreador: 'Carlos Mendoza',
      seccionDossier: 'cap3', ordenAparicion: 2, nivelSangria: 'primer_nivel',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: true, aplicaMantenimiento: true, aplicaVentaSuministros: true,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 42 },
    { idTextoBase: 5,  codigoCorto: 'TXT-PROP-LOG-03', tipoCategoria: 'propuesta',        tipoCategoriaLabel: 'Propuesta',           nombre: 'Jebe',
      textoClausula: '42 metros de jebes de protección tipo T para todo el perímetro de la balanza.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-02-10T09:00:00Z', usuarioCreador: 'Luis Vargas',
      seccionDossier: 'cap4', ordenAparicion: 3, nivelSangria: 'vineta',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: false, aplicaMantenimiento: true, aplicaVentaSuministros: true,
      visibleGestoresComerciales: false, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 15 },
    { idTextoBase: 6,  codigoCorto: 'TXT-PROP-LOG-04', tipoCategoria: 'propuesta',        tipoCategoriaLabel: 'Propuesta',           nombre: 'Piso',
      textoClausula: 'Rotura de piso de concreto o asfalto, de existir el mismo en futura ubicación del sistema.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-02-15T09:00:00Z', usuarioCreador: 'Luis Vargas',
      seccionDossier: 'cap5', ordenAparicion: 4, nivelSangria: 'primer_nivel',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: true, aplicaMantenimiento: false, aplicaVentaSuministros: true,
      visibleGestoresComerciales: false, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 8 },
    { idTextoBase: 7,  codigoCorto: 'TXT-PROP-LOG-05', tipoCategoria: 'propuesta',        tipoCategoriaLabel: 'Propuesta',           nombre: 'Caseta',
      textoClausula: 'Caseta de pesaje.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-02-18T09:00:00Z', usuarioCreador: 'Luis Vargas',
      seccionDossier: 'cap5', ordenAparicion: 5, nivelSangria: 'vineta',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: false, aplicaMantenimiento: false, aplicaVentaSuministros: true,
      visibleGestoresComerciales: false, visibleTecnicosMetrologos: true, visibleSupervisores: false,
      propuestasAsociadas: 5 },
    { idTextoBase: 10, codigoCorto: 'TXT-REC-01',      tipoCategoria: 'recomendaciones',  tipoCategoriaLabel: 'Recomendaciones',     nombre: 'Mantenimientos preventivos',
      textoClausula: 'Considerar como mínimo dos (2) mantenimientos preventivos y correctivos al año para asegurar su correcta operatividad.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-03-01T09:00:00Z', usuarioCreador: 'María Torres',
      seccionDossier: 'cap6', ordenAparicion: 1, nivelSangria: 'primer_nivel',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: true, aplicaMantenimiento: true, aplicaVentaSuministros: false,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 63 },
    { idTextoBase: 11, codigoCorto: 'TXT-REC-02',      tipoCategoria: 'recomendaciones',  tipoCategoriaLabel: 'Recomendaciones',     nombre: 'Suministro Eléctrico',
      textoClausula: 'El cliente deberá habilitar en la ubicación de los equipos un suministro eléctrico estabilizado con conexión a tierra totalmente independiente y verificado 220 VAC, no será compartido con equipos que generen ruido eléctrico.\nLos valores de la línea eléctrica requeridos: Fase - Neutro = 220 VAC +/- 2%, Neutro - Tierra = 0.5 VAC MAX.',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-03-10T09:00:00Z', usuarioCreador: 'María Torres',
      seccionDossier: 'cap5', ordenAparicion: 2, nivelSangria: 'estandar',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: true, aplicaMantenimiento: false, aplicaVentaSuministros: true,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 34 },
    { idTextoBase: 12, codigoCorto: 'TXT-REC-03',      tipoCategoria: 'recomendaciones',  tipoCategoriaLabel: 'Recomendaciones',     nombre: 'Obra Civil',
      textoClausula: 'Para la construcción de la obra civil, el terreno debe soportar como mínimo 15 Kg/cm2 al ras de la fundación (gama, a 1 m de profundidad del nivel de piso).',
      estado: 'Activo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-03-15T09:00:00Z', usuarioCreador: 'María Torres',
      seccionDossier: 'cap5', ordenAparicion: 3, nivelSangria: 'estandar',
      aplicaTodosServicios: false, aplicaCalibracionLab: false, aplicaCalibracionPlanta: true, aplicaMantenimiento: false, aplicaVentaSuministros: true,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 22 },
    { idTextoBase: 13, codigoCorto: 'TXT-GAR-01',      tipoCategoria: 'garantia',         tipoCategoriaLabel: 'Garantía',            nombre: 'Garantía Estándar 12 meses',
      textoClausula: 'La presente propuesta incluye garantía de fábrica por 12 meses contra defectos de fabricación, contados desde la fecha de puesta en marcha.',
      estado: 'Activo', esPredeterminado: true, esNegritaPorDefecto: true, fechaCreacion: '2025-03-20T09:00:00Z', usuarioCreador: 'Admin TW',
      seccionDossier: 'cap4', ordenAparicion: 1, nivelSangria: 'estandar',
      aplicaTodosServicios: true, aplicaCalibracionLab: true, aplicaCalibracionPlanta: true, aplicaMantenimiento: true, aplicaVentaSuministros: true,
      visibleGestoresComerciales: true, visibleTecnicosMetrologos: true, visibleSupervisores: true,
      propuestasAsociadas: 178 },
    { idTextoBase: 14, codigoCorto: 'TXT-LEG-01',      tipoCategoria: 'legal',            tipoCategoriaLabel: 'Cláusula Legal',      nombre: 'Confidencialidad',
      textoClausula: 'Ambas partes se comprometen a mantener en estricta confidencialidad la información técnica y comercial intercambiada durante la ejecución del presente contrato.',
      estado: 'Inactivo', esPredeterminado: false, esNegritaPorDefecto: false, fechaCreacion: '2025-04-01T09:00:00Z', usuarioCreador: 'Admin TW',
      seccionDossier: 'cap4', ordenAparicion: 2, nivelSangria: 'estandar',
      aplicaTodosServicios: true, aplicaCalibracionLab: true, aplicaCalibracionPlanta: true, aplicaMantenimiento: true, aplicaVentaSuministros: true,
      visibleGestoresComerciales: false, visibleTecnicosMetrologos: false, visibleSupervisores: true,
      propuestasAsociadas: 12 },
  ];

  private static nextId = 15;

  private async mockObtener(
    busqueda?: string,
    tipoCategoria?: string,
    estado?: string,
    soloPredeterminados = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<TextosBasePaginado> {
    await this.mockDelay();
    let filtered = [...TextosBaseService.mockData];

    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        t.codigoCorto.toLowerCase().includes(q) ||
        t.textoClausula.toLowerCase().includes(q)
      );
    }
    if (tipoCategoria)       filtered = filtered.filter(t => t.tipoCategoria === tipoCategoria);
    if (estado)              filtered = filtered.filter(t => t.estado === estado);
    if (soloPredeterminados) filtered = filtered.filter(t => t.esPredeterminado);

    const total  = filtered.length;
    const inicio = (pagina - 1) * porPagina;
    const items  = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockObtenerPorId(id: number): Promise<TextoBaseDetalle> {
    await this.mockDelay();
    const found = TextosBaseService.mockData.find(t => t.idTextoBase === id);
    if (!found) throw new Error('Texto base no encontrado.');
    return { ...found };
  }

  private async mockGuardar(dto: GuardarTextoBaseRequest): Promise<number> {
    await this.mockDelay();

    if (dto.idTextoBase === 0) {
      const nuevoId = TextosBaseService.nextId++;
      const label = this.labelDeCategoria(dto.tipoCategoria);
      TextosBaseService.mockData.push({
        idTextoBase:              nuevoId,
        codigoCorto:              dto.codigoCorto,
        tipoCategoria:            dto.tipoCategoria,
        tipoCategoriaLabel:       label,
        nombre:                   dto.nombre,
        textoClausula:            dto.textoClausula,
        estado:                   dto.guardarComoBorrador ? 'Borrador' : (dto.activo ? 'Activo' : 'Inactivo'),
        esPredeterminado:         dto.esPredeterminado,
        esNegritaPorDefecto:      dto.esNegritaPorDefecto,
        fechaCreacion:            new Date().toISOString(),
        usuarioCreador:           'Admin TW',
        seccionDossier:           dto.seccionDossier,
        ordenAparicion:           dto.ordenAparicion,
        nivelSangria:             dto.nivelSangria,
        aplicaTodosServicios:     dto.aplicaTodosServicios,
        aplicaCalibracionLab:     dto.aplicaCalibracionLab,
        aplicaCalibracionPlanta:  dto.aplicaCalibracionPlanta,
        aplicaMantenimiento:      dto.aplicaMantenimiento,
        aplicaVentaSuministros:   dto.aplicaVentaSuministros,
        visibleGestoresComerciales: dto.visibleGestoresComerciales,
        visibleTecnicosMetrologos:  dto.visibleTecnicosMetrologos,
        visibleSupervisores:        dto.visibleSupervisores,
        propuestasAsociadas:      0,
      });
      return nuevoId;
    }

    const existing = TextosBaseService.mockData.find(t => t.idTextoBase === dto.idTextoBase);
    if (!existing) throw new Error('Texto base no encontrado.');
    Object.assign(existing, {
      codigoCorto:              dto.codigoCorto,
      tipoCategoria:            dto.tipoCategoria,
      tipoCategoriaLabel:       this.labelDeCategoria(dto.tipoCategoria),
      nombre:                   dto.nombre,
      textoClausula:            dto.textoClausula,
      esPredeterminado:         dto.esPredeterminado,
      esNegritaPorDefecto:      dto.esNegritaPorDefecto,
      seccionDossier:           dto.seccionDossier,
      ordenAparicion:           dto.ordenAparicion,
      nivelSangria:             dto.nivelSangria,
      aplicaTodosServicios:     dto.aplicaTodosServicios,
      aplicaCalibracionLab:     dto.aplicaCalibracionLab,
      aplicaCalibracionPlanta:  dto.aplicaCalibracionPlanta,
      aplicaMantenimiento:      dto.aplicaMantenimiento,
      aplicaVentaSuministros:   dto.aplicaVentaSuministros,
      visibleGestoresComerciales: dto.visibleGestoresComerciales,
      visibleTecnicosMetrologos:  dto.visibleTecnicosMetrologos,
      visibleSupervisores:        dto.visibleSupervisores,
    });
    return dto.idTextoBase;
  }

  private async mockCambiarEstado(dto: CambiarEstadoTextoBaseRequest): Promise<void> {
    await this.mockDelay();
    const existing = TextosBaseService.mockData.find(t => t.idTextoBase === dto.idTextoBase);
    if (!existing) throw new Error('Texto base no encontrado.');
    existing.estado = dto.estado;
  }

  private labelDeCategoria(value: string): string {
    const labels: Record<string, string> = {
      servicio_saludo:  'Servicio · Saludo',
      comercial_saludo: 'Comercial · Saludo',
      propuesta:         'Propuesta',
      recomendaciones:   'Recomendaciones',
      condiciones:       'Condiciones Comerciales',
      garantia:          'Garantía',
      legal:             'Cláusula Legal',
      firma_pie:         'Firma / Pie de página',
    };
    return labels[value] ?? value;
  }

  private mockDelay(ms = 220): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
