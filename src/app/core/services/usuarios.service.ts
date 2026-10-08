import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoUsuarioRequest,
  GuardarUsuarioRequest,
  UsuarioDetalle,
  UsuarioListaItem,
  UsuariosPaginado,
} from '../models/usuarios.model';

const USAR_MOCK = environment.usarMocks;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerUsuarioPorId(id: number): Promise<UsuarioDetalle> {
    if (USAR_MOCK) return this.mockObtenerUsuarioPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<UsuarioDetalle>>(`${this.base}/usuarios/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerJefesDisponibles(): Promise<UsuarioListaItem[]> {
    if (USAR_MOCK) return this.mockObtenerJefesDisponibles();

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<UsuarioListaItem[]>>(`${this.base}/usuarios/jefes`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerUsuarios(
    busqueda?: string,
    rol?: string,
    estado?: string,
    pagina = 1,
    porPagina = 20,
  ): Promise<UsuariosPaginado> {
    if (USAR_MOCK) return this.mockObtenerUsuarios(busqueda, rol, estado, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (rol)      params['rol']      = rol;
    if (estado)   params['estado']   = estado;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<UsuariosPaginado>>(`${this.base}/usuarios`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarUsuario(dto: GuardarUsuarioRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardarUsuario(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/usuarios`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoUsuario(dto: CambiarEstadoUsuarioRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstadoUsuario(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/usuarios/${dto.idUsuario}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  generarContrasenaTemporal(): string {
    const may  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const min  = 'abcdefghijkmnpqrstuvwxyz';
    const num  = '23456789';
    const sim  = '!@#$%&*';
    const todo = may + min + num + sim;
    let pass = '';
    pass += may[Math.floor(Math.random() * may.length)];
    pass += min[Math.floor(Math.random() * min.length)];
    pass += num[Math.floor(Math.random() * num.length)];
    pass += sim[Math.floor(Math.random() * sim.length)];
    for (let i = 0; i < 8; i++) {
      pass += todo[Math.floor(Math.random() * todo.length)];
    }
    return pass.split('').sort(() => Math.random() - 0.5).join('');
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static mockData: UsuarioDetalle[] = [
    { idUsuario: 1,  nombre: 'Carlos',   apellido: 'Mendoza Villalobos', correo: 'cmendoza@totalweight.com',  rolSistema: 'admin',           rolSistemaLabel: 'Administrador',           telefono: '+51 987 111 222', estado: 'Activo',   ultimoAcceso: '2026-09-29T08:15:00Z', fechaCreacion: '2025-01-10T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '44892310', cargo: 'CTO', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: null, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: false, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: true },
    { idUsuario: 2,  nombre: 'María',    apellido: 'Torres Salazar',     correo: 'mtorres@totalweight.com',   rolSistema: 'jefe_comercial',  rolSistemaLabel: 'Jefe Comercial',   telefono: '+51 987 333 444', estado: 'Activo',   ultimoAcceso: '2026-09-28T18:42:00Z', fechaCreacion: '2025-01-15T10:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '45123890', cargo: 'Jefa Comercial Minería', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: 12, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: true },
    { idUsuario: 3,  nombre: 'Juan',     apellido: 'Pérez Ramos',         correo: 'jperez@totalweight.com',    rolSistema: 'comercial',       rolSistemaLabel: 'Comercial',        telefono: '+51 987 555 666', estado: 'Activo',   ultimoAcceso: '2026-09-29T09:03:00Z', fechaCreacion: '2025-02-01T09:30:00Z', tipoDocumento: 'DNI', numeroDocumento: '46234567', cargo: 'Ejecutivo Comercial', area: null, sedeOperativa: 'Arequipa', idSupervisorDirecto: 2, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: false },
    { idUsuario: 4,  nombre: 'Ana',      apellido: 'Quispe Huamán',       correo: 'aquispe@totalweight.com',   rolSistema: 'comercial',       rolSistemaLabel: 'Comercial',        telefono: '+51 987 777 888', estado: 'Activo',   ultimoAcceso: '2026-09-27T15:22:00Z', fechaCreacion: '2025-02-10T09:30:00Z', tipoDocumento: 'DNI', numeroDocumento: '47345678', cargo: 'Ejecutiva Comercial', area: null, sedeOperativa: 'Cusco', idSupervisorDirecto: 2, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: false },
    { idUsuario: 5,  nombre: 'Luis',     apellido: 'Vargas Ccama',        correo: 'lvargas@totalweight.com',   rolSistema: 'jefe_metrologia', rolSistemaLabel: 'Jefe de Metrología',       telefono: '+51 987 999 000', estado: 'Activo',   ultimoAcceso: '2026-09-29T07:50:00Z', fechaCreacion: '2025-03-01T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '48456789', cargo: 'Jefe de Metrología', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: 12, habilitadoFirmaInacal: true, numeroRegistroInacal: 'INACAL-CAL-04-77', fechaExpiracionCertificacion: '2027-12-31', requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: true },
    { idUsuario: 6,  nombre: 'Rosa',     apellido: 'Chávez Ríos',         correo: 'rchavez@totalweight.com',   rolSistema: 'metrologo',       rolSistemaLabel: 'Metrólogo',               telefono: '+51 987 121 212', estado: 'Activo',   ultimoAcceso: '2026-09-26T11:14:00Z', fechaCreacion: '2025-03-15T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '49567890', cargo: 'Metróloga Sr.', area: null, sedeOperativa: 'Arequipa', idSupervisorDirecto: 5, habilitadoFirmaInacal: true, numeroRegistroInacal: 'INACAL-CAL-08-91', fechaExpiracionCertificacion: '2027-06-30', requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: false },
    { idUsuario: 7,  nombre: 'Pedro',    apellido: 'Rojas Delgado',       correo: 'projas@totalweight.com',    rolSistema: 'metrologo',       rolSistemaLabel: 'Metrólogo',               telefono: '+51 987 343 434', estado: 'Inactivo', ultimoAcceso: '2026-06-14T10:00:00Z', fechaCreacion: '2025-04-01T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '50678901', cargo: 'Metrólogo Jr.', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: 5, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: false, forzarCambioContrasena: false, enviarCredencialesCorreo: false, autenticacion2fa: false },
    { idUsuario: 8,  nombre: 'Sofía',    apellido: 'Ramírez Cuba',        correo: 'sramirez@totalweight.com',  rolSistema: 'jefe_operaciones',rolSistemaLabel: 'Jefe de Operaciones',    telefono: '+51 987 565 656', estado: 'Activo',   ultimoAcceso: '2026-09-28T16:33:00Z', fechaCreacion: '2025-04-15T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '51789012', cargo: 'Jefa de Operaciones', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: 12, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: true },
    { idUsuario: 9,  nombre: 'Miguel',   apellido: 'Fernández López',     correo: 'mfernandez@totalweight.com',rolSistema: 'operaciones',     rolSistemaLabel: 'Operaciones',             telefono: '+51 987 787 878', estado: 'Activo',   ultimoAcceso: '2026-09-29T09:11:00Z', fechaCreacion: '2025-05-01T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '52890123', cargo: 'Coordinador de Operaciones', area: null, sedeOperativa: 'Cusco', idSupervisorDirecto: 8, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: true, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: false },
    { idUsuario: 10, nombre: 'Diana',    apellido: 'Sánchez Bravo',       correo: 'dsanchez@totalweight.com',  rolSistema: 'comercial',       rolSistemaLabel: 'Comercial',        telefono: null,              estado: 'Activo',   ultimoAcceso: null,                     fechaCreacion: '2026-09-25T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '53901234', cargo: 'Ejecutiva Comercial', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: 2, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: false, forzarCambioContrasena: true, enviarCredencialesCorreo: true, autenticacion2fa: false },
    { idUsuario: 11, nombre: 'Bryan',    apellido: 'García Molina',       correo: 'bgarcia@totalweight.com',   rolSistema: 'desarrollador',   rolSistemaLabel: 'Desarrollador',           telefono: '+51 987 909 090', estado: 'Activo',   ultimoAcceso: '2026-09-29T09:20:00Z', fechaCreacion: '2026-09-29T08:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '75098765', cargo: 'Desarrollador Backend .NET', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: 1, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: false, forzarCambioContrasena: true, enviarCredencialesCorreo: true, autenticacion2fa: true },
    { idUsuario: 12, nombre: 'Jorge',    apellido: 'García Sánchez',      correo: 'jgarcia@totalweight.com',   rolSistema: 'gerencia',        rolSistemaLabel: 'Gerencia',                telefono: '+51 987 010 101', estado: 'Activo',   ultimoAcceso: '2026-09-27T19:00:00Z', fechaCreacion: '2025-01-05T09:00:00Z', tipoDocumento: 'DNI', numeroDocumento: '10234567', cargo: 'Gerente General', area: null, sedeOperativa: 'Lima Central', idSupervisorDirecto: null, habilitadoFirmaInacal: false, numeroRegistroInacal: null, fechaExpiracionCertificacion: null, requiereInduccionSctr: false, forzarCambioContrasena: false, enviarCredencialesCorreo: true, autenticacion2fa: true },
  ];

  private async mockObtenerUsuarioPorId(id: number): Promise<UsuarioDetalle> {
    await this.mockDelay();
    const existente = UsuariosService.mockData.find(u => u.idUsuario === id);
    if (!existente) throw new Error('Usuario no encontrado.');
    return { ...existente };
  }

  private async mockObtenerJefesDisponibles(): Promise<UsuarioListaItem[]> {
    await this.mockDelay(150);
    const rolesJefe = ['admin', 'gerencia', 'jefe_comercial', 'jefe_metrologia', 'jefe_operaciones'];
    return UsuariosService.mockData
      .filter(u => rolesJefe.includes(u.rolSistema) && u.estado === 'Activo')
      .map(u => ({ ...u }));
  }

  private async mockObtenerUsuarios(
    busqueda?: string,
    rol?: string,
    estado?: string,
    pagina = 1,
    porPagina = 20,
  ): Promise<UsuariosPaginado> {
    await this.mockDelay();
    let filtered = [...UsuariosService.mockData];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(u =>
        u.nombre.toLowerCase().includes(q)   ||
        u.apellido.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q)
      );
    }
    if (rol)    filtered = filtered.filter(u => u.rolSistema === rol);
    if (estado) filtered = filtered.filter(u => u.estado    === estado);

    const total    = filtered.length;
    const inicio   = (pagina - 1) * porPagina;
    const items    = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockGuardarUsuario(dto: GuardarUsuarioRequest): Promise<number> {
    await this.mockDelay();
    if (dto.idUsuario === 0) {
      const nuevoId = Math.max(...UsuariosService.mockData.map(u => u.idUsuario)) + 1;
      const label = this.mockLabelRol(dto.rolSistema);
      UsuariosService.mockData.push({
        idUsuario:                    nuevoId,
        nombre:                       dto.nombre,
        apellido:                     dto.apellido,
        correo:                       dto.correo,
        rolSistema:                   dto.rolSistema,
        rolSistemaLabel:              label,
        telefono:                     dto.telefono,
        anexo:                        null,
        estado:                       dto.guardarComoBorrador ? 'Borrador' : 'Activo',
        ultimoAcceso:                 null,
        fechaCreacion:                new Date().toISOString(),
        tipoDocumento:                dto.tipoDocumento,
        numeroDocumento:              dto.numeroDocumento,
        cargo:                        dto.cargo,
        area:                         dto.area,
        sedeOperativa:                dto.sedeOperativa,
        idSupervisorDirecto:          dto.idSupervisorDirecto,
        habilitadoFirmaInacal:        dto.habilitadoFirmaInacal,
        numeroRegistroInacal:         dto.numeroRegistroInacal,
        fechaExpiracionCertificacion: dto.fechaExpiracionCertificacion,
        requiereInduccionSctr:        dto.requiereInduccionSctr,
        forzarCambioContrasena:       dto.forzarCambioContrasena,
        enviarCredencialesCorreo:     dto.enviarCredencialesCorreo,
        autenticacion2fa:             dto.autenticacion2fa,
      });
      return nuevoId;
    }
    const existente = UsuariosService.mockData.find(u => u.idUsuario === dto.idUsuario);
    if (!existente) throw new Error('Usuario no encontrado.');
    Object.assign(existente, {
      nombre:                       dto.nombre,
      apellido:                     dto.apellido,
      correo:                       dto.correo,
      rolSistema:                   dto.rolSistema,
      rolSistemaLabel:              this.mockLabelRol(dto.rolSistema),
      telefono:                     dto.telefono,
      tipoDocumento:                dto.tipoDocumento,
      numeroDocumento:              dto.numeroDocumento,
      cargo:                        dto.cargo,
      sedeOperativa:                dto.sedeOperativa,
      idSupervisorDirecto:          dto.idSupervisorDirecto,
      habilitadoFirmaInacal:        dto.habilitadoFirmaInacal,
      numeroRegistroInacal:         dto.numeroRegistroInacal,
      fechaExpiracionCertificacion: dto.fechaExpiracionCertificacion,
      requiereInduccionSctr:        dto.requiereInduccionSctr,
      forzarCambioContrasena:       dto.forzarCambioContrasena,
      enviarCredencialesCorreo:     dto.enviarCredencialesCorreo,
      autenticacion2fa:             dto.autenticacion2fa,
    });
    return dto.idUsuario;
  }

  private async mockCambiarEstadoUsuario(dto: CambiarEstadoUsuarioRequest): Promise<void> {
    await this.mockDelay();
    const existente = UsuariosService.mockData.find(u => u.idUsuario === dto.idUsuario);
    if (!existente) throw new Error('Usuario no encontrado.');
    existente.estado = dto.estado;
  }

  private mockLabelRol(rol: string): string {
    const labels: Record<string, string> = {
      admin:            'Administrador',
      gerencia:         'Gerencia',
      jefe_comercial:   'Jefe Comercial',
      comercial:        'Comercial',
      jefe_metrologia:  'Jefe de Metrología',
      metrologo:        'Metrólogo',
      jefe_operaciones: 'Jefe de Operaciones',
      operaciones:      'Operaciones',
      desarrollador:    'Desarrollador',
    };
    return labels[rol] ?? rol;
  }

  private mockDelay(ms = 250): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
