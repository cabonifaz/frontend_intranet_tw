import { Injectable } from '@angular/core';
import {
  AlertaCampo, BandejaSeguimientoOperativo, CabeceraServicio, CierreServicio,
  DemoraIncidenciaServicio, DetalleServicioSeguimiento, EquipoAvance,
  EventoTimeline, HitoEsperado, IncidenciaDia, KpisDemoras,
  KpisSeguimientoOperativo, MapaGpsServicio, PuntoMapa, ResumenServicio,
  ServicioEnCampo, TecnicoActivo, VistaPrincipalSeguimiento,
} from '../models/seguimiento-operativo.model';

/**
 * HU-51/52/53/54 — Módulo 11 Control de Campo (Seguimiento Operativo).
 *
 * ⚠️ MOCK: el back todavía no expone endpoints para este módulo. Cuando Bryan
 * entregue, cambiar USAR_MOCK a false y conectar llamadas HTTP.
 *
 * Endpoints esperados (según el prototipo):
 *  - GET  /api/operaciones/seguimiento/bandeja         → kpis + vista principal + listados
 *  - GET  /api/operaciones/seguimiento/servicios/{id}  → detalle de servicio en campo
 *  - POST /api/operaciones/seguimiento/{id}/registros  → registros del asistente (HU-53)
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoOperativoService {
  private readonly USAR_MOCK = true;

  async obtenerBandeja(): Promise<BandejaSeguimientoOperativo> {
    if (this.USAR_MOCK) return this.bandejaMock();
    throw new Error('Endpoint real aún no implementado.');
  }

  /** HU-52 — Detalle completo del servicio en ruta para abrir el modal. */
  async obtenerDetalleServicio(idServicio: number): Promise<DetalleServicioSeguimiento> {
    if (this.USAR_MOCK) return this.detalleServicioMock(idServicio);
    throw new Error('Endpoint real aún no implementado.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA — basado en los datos de ejemplo del prototipo (proto 2026-11-02)
  // ═══════════════════════════════════════════════════════════════════════════

  private bandejaMock(): BandejaSeguimientoOperativo {
    return {
      kpis:             this.kpisMock(),
      vistaPrincipal:   this.vistaPrincipalMock(),
      serviciosEnCampo: this.serviciosMock(),
      tecnicosActivos:  this.tecnicosMock(),
      incidenciasDia:   this.incidenciasMock(),
    };
  }

  private kpisMock(): KpisSeguimientoOperativo {
    return {
      programadas: 12,
      tecnicos:    4,
      enRuta:      1,
      enPlanta:    2,
      enEjecucion: 3,
      conDemora:   2,
      finalizados: 1,
    };
  }

  private vistaPrincipalMock(): VistaPrincipalSeguimiento {
    const mapa: PuntoMapa[] = [
      {
        idServicio: 791, numero: 'OS-000791', tipo: 'OS',
        idTecnico: 101, tecnico: 'Jhonny Iparraguirre', iniciales: 'JI',
        estado: 'en_ruta', cliente: 'Antamina',
        ubicacion: 'Ventanilla Planta · hace 1 min', horaUltima: '10:41',
      },
      {
        idServicio: 790, numero: 'OS-000790', tipo: 'OS',
        idTecnico: 102, tecnico: 'Carlos Medina', iniciales: 'CM',
        estado: 'en_planta', cliente: 'Alicorp S.A.A.',
        ubicacion: 'Planta Callao · hace 5 min', horaUltima: '10:37',
      },
      {
        idServicio: 793, numero: 'OS-000793', tipo: 'OS',
        idTecnico: 103, tecnico: 'Pedro Salazar', iniciales: 'PS',
        estado: 'en_ejecucion', cliente: 'Aceros Arequipa',
        ubicacion: 'Planta Ventanilla · en ejecución', horaUltima: '10:42',
      },
      {
        idServicio: 795, numero: 'OS-000795', tipo: 'OS',
        idTecnico: 104, tecnico: 'María Quispe', iniciales: 'MQ',
        estado: 'con_demora', cliente: 'UNACEM S.A.A.',
        ubicacion: 'Panamericana Sur · hace 11 min', horaUltima: '10:31',
      },
      {
        idServicio: 792, numero: 'OS-000792', tipo: 'OS',
        idTecnico: 105, tecnico: 'Luis Herrera', iniciales: 'LH',
        estado: 'con_incidente', cliente: 'Las Bambas',
        ubicacion: 'Carretera Central · hace 12 min', horaUltima: '10:30',
      },
    ];

    const alertas: AlertaCampo[] = [
      {
        idAlerta: 1, tipo: 'perdida_contacto', severidad: 'critica',
        tituloCorto: 'Pérdida de contacto',
        tecnico: 'Luis Herrera', numeroServicio: 'OS-000792', idServicio: 792,
        hace: 'Hace 12 min',
      },
      {
        idAlerta: 2, tipo: 'gps_parado', severidad: 'advertencia',
        tituloCorto: 'GPS parado',
        tecnico: 'María Quispe', numeroServicio: 'OS-000795', idServicio: 795,
        hace: 'Hace 11 min',
      },
      {
        idAlerta: 3, tipo: 'sin_ingreso_post_llegada', severidad: 'advertencia',
        tituloCorto: 'Sin ingreso post-llegada',
        tecnico: 'Carlos Medina', numeroServicio: 'OS-000790', idServicio: 790,
        hace: 'Hace 18 min',
      },
      {
        idAlerta: 4, tipo: 'proximidad', severidad: 'info',
        tituloCorto: 'Proximidad (a 300m)',
        tecnico: 'Jhonny Iparraguirre', numeroServicio: 'OS-000791', idServicio: 791,
        hace: 'Hace 4 min',
      },
      {
        idAlerta: 5, tipo: 'sin_iniciar_servicio', severidad: 'advertencia',
        tituloCorto: 'Sin iniciar servicio',
        tecnico: 'Pedro Salazar', numeroServicio: 'OS-000793', idServicio: 793,
        hace: 'Hace 15 min',
      },
    ];

    const hitos: HitoEsperado[] = [
      { idHito: 1, hora: '09:50', titulo: 'Jhonny debería llegar a Antamina',
        subtitulo: 'En ruta · a 15 km · OS-000791',
        idServicio: 791, numeroServicio: 'OS-000791', requiereAtencion: false },
      { idHito: 2, hora: '10:15', titulo: 'Carlos debería iniciar servicio en Alicorp',
        subtitulo: 'En planta · ingresó hace 20 min · OS-000790',
        idServicio: 790, numeroServicio: 'OS-000790', requiereAtencion: false },
      { idHito: 3, hora: '10:30', titulo: 'Pedro debería terminar Balanza A (Aceros)',
        subtitulo: 'En etapa Pruebas (iniciada 09:45) · OS-000793',
        idServicio: 793, numeroServicio: 'OS-000793', requiereAtencion: false },
      { idHito: 4, hora: '10:45', titulo: 'María debería retomar servicio Unacem',
        subtitulo: 'Con demora (tráfico 25 min) · OS-000795',
        idServicio: 795, numeroServicio: 'OS-000795', requiereAtencion: false },
      { idHito: 5, hora: '11:00', titulo: 'Luis Herrera debería ingresar a planta Las Bambas',
        subtitulo: 'Pérdida contacto hace 12 min · OS-000792',
        idServicio: 792, numeroServicio: 'OS-000792', requiereAtencion: true },
      { idHito: 6, hora: '11:15', titulo: 'Elena Rojas debería iniciar retorno a Total Weight',
        subtitulo: 'Finalizó servicio hace 15 min · OM-000332',
        idServicio: 332, numeroServicio: 'OM-000332', requiereAtencion: false },
    ];

    return { mapa, alertas, totalAlertas: 5, hitos, ultimaActualizacion: '10:42' };
  }

  private serviciosMock(): ServicioEnCampo[] {
    return [
      { idServicio: 793, numero: 'OS-000793', tipo: 'OS',
        cliente: 'Aceros Arequipa', sede: 'Planta Ventanilla',
        idTecnico: 103, tecnico: 'Pedro Salazar', estado: 'en_ejecucion',
        horaLlegada: '08:30', horaInicio: '09:00', avancePct: 65, nEquipos: 3,
        ultimaActividad: 'hace 2 min', alertaActiva: null },
      { idServicio: 791, numero: 'OS-000791', tipo: 'OS',
        cliente: 'Antamina', sede: 'Planta Challhuahuacho',
        idTecnico: 101, tecnico: 'Jhonny Iparraguirre', estado: 'en_ruta',
        horaLlegada: null, horaInicio: null, avancePct: 0, nEquipos: 2,
        ultimaActividad: 'hace 1 min', alertaActiva: null },
      { idServicio: 790, numero: 'OS-000790', tipo: 'OS',
        cliente: 'Alicorp S.A.A.', sede: 'Planta Callao',
        idTecnico: 102, tecnico: 'Carlos Medina', estado: 'en_planta',
        horaLlegada: '10:17', horaInicio: null, avancePct: 0, nEquipos: 2,
        ultimaActividad: 'hace 5 min', alertaActiva: 'Sin ingreso post-llegada' },
      { idServicio: 795, numero: 'OS-000795', tipo: 'OS',
        cliente: 'UNACEM S.A.A.', sede: 'Planta Villa María',
        idTecnico: 104, tecnico: 'María Quispe', estado: 'con_demora',
        horaLlegada: null, horaInicio: null, avancePct: 0, nEquipos: 1,
        ultimaActividad: 'hace 11 min', alertaActiva: 'GPS parado' },
      { idServicio: 792, numero: 'OS-000792', tipo: 'OS',
        cliente: 'Las Bambas', sede: 'Planta Challhuahuacho',
        idTecnico: 105, tecnico: 'Luis Herrera', estado: 'con_incidente',
        horaLlegada: null, horaInicio: null, avancePct: 0, nEquipos: 1,
        ultimaActividad: 'hace 12 min', alertaActiva: 'Pérdida de contacto' },
      { idServicio: 332, numero: 'OM-000332', tipo: 'OM',
        cliente: 'La Pampilla', sede: 'Refinería La Pampilla',
        idTecnico: 106, tecnico: 'Elena Rojas', estado: 'finalizado',
        horaLlegada: '07:00', horaInicio: '07:30', avancePct: 100, nEquipos: 4,
        ultimaActividad: 'hace 15 min', alertaActiva: null },
    ];
  }

  private tecnicosMock(): TecnicoActivo[] {
    return [
      { idTecnico: 101, nombre: 'Jhonny Iparraguirre', cargo: 'Técnico Senior',
        iniciales: 'JI', estado: 'en_ruta',
        servicioActual: { idServicio: 791, numero: 'OS-000791', cliente: 'Antamina' },
        servicios: 2, horasCampo: 3.5, telefono: '+51 987 654 321' },
      { idTecnico: 102, nombre: 'Carlos Medina', cargo: 'Técnico de Calibración',
        iniciales: 'CM', estado: 'en_planta',
        servicioActual: { idServicio: 790, numero: 'OS-000790', cliente: 'Alicorp S.A.A.' },
        servicios: 2, horasCampo: 4.2, telefono: '+51 987 111 222' },
      { idTecnico: 103, nombre: 'Pedro Salazar', cargo: 'Técnico de Mantenimiento',
        iniciales: 'PS', estado: 'en_ejecucion',
        servicioActual: { idServicio: 793, numero: 'OS-000793', cliente: 'Aceros Arequipa' },
        servicios: 1, horasCampo: 2.8, telefono: '+51 987 333 444' },
      { idTecnico: 104, nombre: 'María Quispe', cargo: 'Metrólogo',
        iniciales: 'MQ', estado: 'con_demora',
        servicioActual: { idServicio: 795, numero: 'OS-000795', cliente: 'UNACEM S.A.A.' },
        servicios: 1, horasCampo: 1.5, telefono: '+51 987 555 666' },
      { idTecnico: 105, nombre: 'Luis Herrera', cargo: 'Técnico Senior',
        iniciales: 'LH', estado: 'con_incidente',
        servicioActual: { idServicio: 792, numero: 'OS-000792', cliente: 'Las Bambas' },
        servicios: 1, horasCampo: 2.1, telefono: '+51 987 777 888' },
      { idTecnico: 106, nombre: 'Elena Rojas', cargo: 'Metróloga',
        iniciales: 'ER', estado: 'finalizado',
        servicioActual: { idServicio: 332, numero: 'OM-000332', cliente: 'La Pampilla' },
        servicios: 1, horasCampo: 5.5, telefono: '+51 987 999 000' },
    ];
  }

  private detalleServicioMock(idServicio: number): DetalleServicioSeguimiento {
    // Caso ejemplar del prototipo: OS-000793 Pedro Salazar · Aceros Arequipa
    const esFinalizado = idServicio === 332;  // OM-000332 La Pampilla está finalizada

    const cabecera: CabeceraServicio = {
      idServicio, numero: idServicio === 793 ? 'OS-000793' : 'OS-' + String(idServicio).padStart(6, '0'),
      tipo: idServicio === 332 ? 'OM' : 'OS',
      numeroPropuesta: 'PROP-000240 v3',
      cliente: 'Aceros Arequipa',
      sede: 'Planta Ventanilla',
      direccion: 'Av. Néstor Gambetta Km 14.5, Ventanilla, Callao',
      idTecnico: 103, tecnico: 'Pedro Salazar', cargoTecnico: 'Técnico de Mantenimiento',
      telefono: '+51 987 333 444',
      estado: esFinalizado ? 'finalizado' as const : 'en_ejecucion' as const,
      horaProgramada: '08:00', horaFinEstimada: '12:00',
      horaLlegada: '08:12', horaInicio: '08:30', horaFin: esFinalizado ? '12:35' : null,
      totalEquipos: esFinalizado ? 4 : 3, avancePct: esFinalizado ? 75 : 65,
      esFinalizado, ultimaActualizacion: '10:42',
    };

    const resumen: ResumenServicio = {
      checklistSalida: true,
      viaticos: { asignado: 80, simbolo: 'S/', estado: 'depositado' },
      equipoTrabajo: [
        { idUsuario: 103, nombre: 'Pedro Salazar',  rol: 'principal' },
        { idUsuario: 110, nombre: 'Luis Vargas Ccama', rol: 'apoyo' },
      ],
      tareasPendientes: ['Enviar fotos de la Balanza C antes del cierre'],
      observaciones: 'El cliente solicita priorizar Balanza A por auditoría interna.',
    };

    const equipos: EquipoAvance[] = [
      { idEquipo: 1, codigoTw: 'EQ-TW-2026-0001', marca: 'METTLER TOLEDO', modelo: 'PDX50',
        numeroSerie: 'MT-PDX50-2024-00123', estado: 'finalizado',
        horaInicio: '08:30', horaFin: '09:45', etapaActual: null, tiempoResumen: '1h 15min',
        progresoPct: 100,
        etapas: [
          { nombre: 'LIMPIEZA',   estado: 'completada', hora: '08:30' },
          { nombre: 'DESMONTAJE', estado: 'completada', hora: '08:45' },
          { nombre: 'PRUEBAS',    estado: 'completada', hora: '09:10' },
          { nombre: 'MONTAJE',    estado: 'completada', hora: '09:30' },
          { nombre: 'CIERRE',     estado: 'completada', hora: '09:45' },
        ],
        nFotos: 5, nEnsayos: 3, nDocumentos: 1, nObservaciones: 2, nMediciones: 4, activo: false },
      { idEquipo: 2, codigoTw: 'EQ-TW-2026-0010', marca: 'METTLER TOLEDO', modelo: 'PowerDeck',
        numeroSerie: 'MT-864429-2023', estado: 'en_ejecucion',
        horaInicio: '10:35', horaFin: null, etapaActual: 'PRUEBAS', tiempoResumen: '17 min transcurridos',
        progresoPct: 60,
        etapas: [
          { nombre: 'LIMPIEZA',   estado: 'completada', hora: '10:35' },
          { nombre: 'DESMONTAJE', estado: 'completada', hora: '10:42' },
          { nombre: 'PRUEBAS',    estado: 'en_curso',   enCursoDesde: '10:48' },
          { nombre: 'MONTAJE',    estado: 'pendiente' },
          { nombre: 'CIERRE',     estado: 'pendiente' },
        ],
        nFotos: 4, nEnsayos: 1, nDocumentos: 0, nObservaciones: 2, nMediciones: 0, activo: true },
      { idEquipo: 3, codigoTw: 'EQ-TW-2026-0012', marca: 'METTLER TOLEDO', modelo: 'IND570',
        numeroSerie: 'IND-570-44812', estado: 'pendiente',
        horaInicio: null, horaFin: null, etapaActual: null, tiempoResumen: null, progresoPct: 0,
        etapas: [
          { nombre: 'LIMPIEZA',   estado: 'pendiente' },
          { nombre: 'DESMONTAJE', estado: 'pendiente' },
          { nombre: 'PRUEBAS',    estado: 'pendiente' },
          { nombre: 'MONTAJE',    estado: 'pendiente' },
          { nombre: 'CIERRE',     estado: 'pendiente' },
        ],
        nFotos: 0, nEnsayos: 0, nDocumentos: 0, nObservaciones: 0, nMediciones: 0, activo: false },
    ];

    const gps: MapaGpsServicio = {
      resumenRuta: 'Pedro Salazar llegó a Planta Ventanilla a las 08:12 · En ejecución desde las 08:30',
      chipEstadoMapa: 'En Planta',
      estadoSenal: {
        activo:               true,
        haceSegundos:         15,
        precisionMetros:      3,
        satelitesConectados:  9,
        satelitesDisponibles: 12,
        latenciaMs:           342,
        mensajeEstado:        'Señal estable sin desconexiones desde las 08:00',
        estable:              true,
      },
      ultimaUbicacion: {
        nombreLugar:        'Planta Concentradora Ventanilla',
        direccion:          'Av. Néstor Gambetta km 11, Callao',
        dentroDelRadio:     true,
        distanciaAlCliente: 0,
        velocidadKmh:       0,
        direccionBrujula:   null,
        altitudMsnm:        25,
        tiempoEnPunto:      '2h 02min',
      },
      cronograma: [
        { hora: '08:00', lat: -12.1460, lng: -76.9980, evento: 'Salida registrada',
          detalle: 'Total Weight HQ Surco', tipo: 'salida' },
        { hora: '08:08', lat: -12.0464, lng: -77.0428, evento: 'Pre-llegada detectada',
          detalle: 'A 300m del destino en Ventanilla', tipo: 'pre_llegada' },
        { hora: '08:12', lat: -11.8762, lng: -77.1283, evento: 'Llegada confirmada',
          detalle: 'Ingreso al perímetro de Planta Ventanilla', tipo: 'llegada' },
      ],
    };

    const timeline: EventoTimeline[] = [
      { idEvento: 1, hora: '07:15', tipo: 'hito_tecnico',
        titulo: 'Técnico salió de base', descripcion: 'En ruta hacia Planta Ventanilla', autor: 'Pedro Salazar' },
      { idEvento: 2, hora: '08:12', tipo: 'hito_tecnico',
        titulo: 'Llegada a planta', descripcion: 'Registró ingreso en portería', autor: 'Pedro Salazar' },
      { idEvento: 3, hora: '08:30', tipo: 'hito_tecnico',
        titulo: 'Inicio de servicio', descripcion: 'Comenzó revisión del primer equipo', autor: 'Pedro Salazar' },
      { idEvento: 4, hora: '08:45', tipo: 'demora_incidente',
        titulo: 'Demora: falta de repuesto', descripcion: 'Faltó sello para Balanza A · 15 min · resuelto', autor: 'Pedro Salazar' },
      { idEvento: 5, hora: '09:45', tipo: 'hito_tecnico',
        titulo: 'Equipo EQ-TW-2026-0001 completado', descripcion: 'METTLER TOLEDO PDX50', autor: 'Pedro Salazar' },
      { idEvento: 6, hora: '09:50', tipo: 'registro_asistente',
        titulo: 'Nota del Asistente: "Confirmé con jefe de planta que técnico puede continuar"',
        descripcion: 'Registro manual del Asistente', autor: 'Jazir Olivera' },
      { idEvento: 7, hora: '10:15', tipo: 'hito_tecnico',
        titulo: 'Equipo EQ-TW-2026-0005 iniciado', descripcion: 'OHAUS PR4202/E', autor: 'Pedro Salazar' },
      { idEvento: 8, hora: '10:30', tipo: 'hito_tecnico',
        titulo: 'Equipo EQ-TW-2026-0005 completado', descripcion: 'OHAUS PR4202/E · duración 15 min', autor: 'Pedro Salazar' },
      { idEvento: 9, hora: '10:35', tipo: 'hito_tecnico',
        titulo: 'Equipo EQ-TW-2026-0010 iniciado', descripcion: 'METTLER TOLEDO PowerDeck', autor: 'Pedro Salazar' },
      { idEvento: 10, hora: '10:40', tipo: 'alerta_sistema',
        titulo: 'GPS parado detectado (5 min)', descripcion: 'Resuelta automáticamente al reanudar movimiento', autor: 'Sistema' },
      { idEvento: 11, hora: '10:48', tipo: 'hito_tecnico',
        titulo: 'Etapa "Pruebas" iniciada en EQ-TW-2026-0010 PowerDeck',
        descripcion: 'Avance de la ejecución', autor: 'Pedro Salazar' },
      { idEvento: 12, hora: '10:52', tipo: 'alerta_sistema',
        titulo: 'Proximidad al cliente confirmada', descripcion: 'Técnico dentro del radio de 300m', autor: 'Sistema' },
    ];

    const kpisDemoras: KpisDemoras = { total: 2, retrasan: 2, detienen: 0, porTecnico: 2, porAsistente: 0 };

    const demoras: DemoraIncidenciaServicio[] = [
      { idDemora: 1, hora: '09:30', tipo: 'Clima adverso',
        motivo: 'Garúa intensa en Ventanilla, se detiene servicio hasta que escampe por protocolos SSOMA',
        duracionMin: 30, origen: 'tecnico', retrasa: true, detiene: false,
        detalle: 'Esperamos 30 min hasta que amainó. Reanudamos con autorización del jefe de planta.',
        nFotos: 1 },
      { idDemora: 2, hora: '08:30', tipo: 'Tráfico',
        motivo: 'Congestión salida de Lima. Técnico decidió ruta alterna por Costa Verde',
        duracionMin: 15, origen: 'tecnico', retrasa: true, detiene: false,
        detalle: 'Se tomó Costa Verde desde Barranco. Llegada aún dentro del rango programado.' },
    ];

    const cierre: CierreServicio | null = esFinalizado ? {
      horaFin: '12:35',
      duracionReal: '4h 35min',
      demoraMinutos: 35,
      esCompletadoParcial: true,
      avanceFinalPct: 75,
      equiposFinalizados: 3,
      equiposPendientes: 1,
      nInformes: 3,
      nRegAsistente: 1,
      observacionesTecnico: 'Servicio ejecutado conforme a lo programado. Celda carga 02 quedó pendiente a la espera de decisión del Jefe de Operaciones.',
      firmadoPorCliente: true,
      nombreQuienFirma: 'Ing. Luis Rodríguez',
      cargoQuienFirma: 'Jefe de Mantenimiento',
      horaFirma: '12:40',
    } : null;

    // Si el servicio está finalizado, sobreescribimos los equipos con el set
    // de cierre (3 finalizados + 1 pendiente, con tipo servicio e informes).
    const equiposFinal: EquipoAvance[] = esFinalizado ? [
      { ...equipos[0], estado: 'finalizado', activo: false,
        tipoServicioEquipo: 'Calibración',  codigoInforme: 'INF-245-A' },
      { ...equipos[1], estado: 'finalizado', activo: false,
        horaInicio: '10:35', horaFin: '11:30', progresoPct: 100,
        etapas: equipos[1].etapas.map(e => ({ ...e, estado: 'completada' as const })),
        tipoServicioEquipo: 'Mantenimiento', codigoInforme: 'INF-245-B', nObservaciones: 2 },
      { ...equipos[2], estado: 'finalizado', activo: false,
        horaInicio: '11:40', horaFin: '12:20', progresoPct: 100,
        etapas: equipos[2].etapas.map(e => ({ ...e, estado: 'completada' as const })),
        tipoServicioEquipo: 'Verificación', codigoInforme: 'INF-245-C' },
      { idEquipo: 4, codigoTw: 'EQ-TW-2026-0018', marca: 'OHAUS', modelo: 'Celda carga 02',
        numeroSerie: '98765', estado: 'pendiente',
        horaInicio: null, horaFin: null, etapaActual: null, tiempoResumen: null, progresoPct: 0,
        etapas: [
          { nombre: 'LIMPIEZA',   estado: 'pendiente' },
          { nombre: 'DESMONTAJE', estado: 'pendiente' },
          { nombre: 'PRUEBAS',    estado: 'pendiente' },
          { nombre: 'MONTAJE',    estado: 'pendiente' },
          { nombre: 'CIERRE',     estado: 'pendiente' },
        ],
        nFotos: 0, nEnsayos: 0, nDocumentos: 0, nObservaciones: 0, nMediciones: 0, activo: false,
        tipoServicioEquipo: 'Calibración',
        motivoPendiente: 'Esperando decisión J.Ops' },
    ] : equipos;

    return { cabecera, resumen, equipos: equiposFinal, gps, timeline, kpisDemoras, demoras, cierre };
  }

  private incidenciasMock(): IncidenciaDia[] {
    return [
      { idIncidencia: 1, hora: '10:30', tipo: 'perdida_contacto', tipoLabel: 'Pérdida de contacto',
        tecnico: 'Luis Herrera', numeroServicio: 'OS-000792', idServicio: 792,
        severidad: 'critica', detalle: 'Último ping GPS hace 12 min · sin respuesta a llamadas',
        resuelta: false },
      { idIncidencia: 2, hora: '10:31', tipo: 'gps_parado', tipoLabel: 'GPS parado',
        tecnico: 'María Quispe', numeroServicio: 'OS-000795', idServicio: 795,
        severidad: 'advertencia', detalle: 'Vehículo detenido en Panamericana Sur hace 11 min',
        resuelta: false },
      { idIncidencia: 3, hora: '10:24', tipo: 'sin_ingreso_post_llegada', tipoLabel: 'Sin ingreso post-llegada',
        tecnico: 'Carlos Medina', numeroServicio: 'OS-000790', idServicio: 790,
        severidad: 'advertencia', detalle: 'Llegó a planta hace 20 min, no ha ingresado al sistema',
        resuelta: false },
      { idIncidencia: 4, hora: '09:45', tipo: 'retraso_critico', tipoLabel: 'Retraso crítico',
        tecnico: 'María Quispe', numeroServicio: 'OS-000795', idServicio: 795,
        severidad: 'critica', detalle: 'Tráfico 25 min en Panamericana Sur',
        resuelta: true },
      { idIncidencia: 5, hora: '08:50', tipo: 'incidente', tipoLabel: 'Incidente menor',
        tecnico: 'Jhonny Iparraguirre', numeroServicio: 'OS-000791', idServicio: 791,
        severidad: 'advertencia', detalle: 'Falla menor en vehículo, resuelta en ruta',
        resuelta: true },
    ];
  }
}
