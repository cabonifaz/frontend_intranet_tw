import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoSuplenteRequest,
  GuardarSuplenteRequest,
  SuplenteListaItem,
  SuplentesPaginado,
} from '../models/suplentes.model';

const USAR_MOCK = environment.usarMocks;

@Injectable({ providedIn: 'root' })
export class SuplentesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerSuplentes(
    busqueda?: string,
    estado?: string,
    pagina = 1,
    porPagina = 20,
  ): Promise<SuplentesPaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, estado, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (estado)   params['estado']   = estado;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuplentesPaginado>>(`${this.base}/suplentes`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerSuplentePorId(id: number): Promise<SuplenteListaItem> {
    if (USAR_MOCK) return this.mockObtenerPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuplenteListaItem>>(`${this.base}/suplentes/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerSuplenciasComoTitular(idUsuario: number): Promise<SuplenteListaItem[]> {
    if (USAR_MOCK) return this.mockPorRol(idUsuario, 'titular');

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuplenteListaItem[]>>(`${this.base}/suplentes/titular/${idUsuario}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerSuplenciasComoSuplente(idUsuario: number): Promise<SuplenteListaItem[]> {
    if (USAR_MOCK) return this.mockPorRol(idUsuario, 'suplente');

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuplenteListaItem[]>>(`${this.base}/suplentes/suplente/${idUsuario}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarSuplente(dto: GuardarSuplenteRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardar(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/suplentes`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoSuplente(dto: CambiarEstadoSuplenteRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstado(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/suplentes/${dto.idAsignacion}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static mockData: SuplenteListaItem[] = [
    { idAsignacion: 1, idTitular: 3, titularNombre: 'Juan',   titularApellido: 'Pérez Ramos',    titularCargo: 'Ejecutivo Comercial',   idSuplente: 4, suplenteNombre: 'Ana',    suplenteApellido: 'Quispe Huamán',   suplenteCargo: 'Ejecutiva Comercial', fechaInicio: '2026-03-01', fechaFin: '2026-05-15', estado: 'Activo',   fechaCreacion: '2026-02-25T10:00:00Z' },
    { idAsignacion: 2, idTitular: 4, titularNombre: 'Ana',    titularApellido: 'Quispe Huamán',   titularCargo: 'Ejecutiva Comercial',   idSuplente: 3, suplenteNombre: 'Juan',   suplenteApellido: 'Pérez Ramos',      suplenteCargo: 'Ejecutivo Comercial', fechaInicio: '2026-04-10', fechaFin: null,        estado: 'Activo',   fechaCreacion: '2026-04-05T09:30:00Z' },
    { idAsignacion: 3, idTitular: 10, titularNombre: 'Diana', titularApellido: 'Sánchez Bravo',   titularCargo: 'Ejecutiva Comercial',   idSuplente: 3, suplenteNombre: 'Juan',   suplenteApellido: 'Pérez Ramos',      suplenteCargo: 'Ejecutivo Comercial', fechaInicio: '2026-01-15', fechaFin: '2026-02-28', estado: 'Inactivo', fechaCreacion: '2026-01-10T11:00:00Z' },
  ];

  private static nextId = 4;

  private async mockObtener(
    busqueda?: string,
    estado?: string,
    pagina = 1,
    porPagina = 20,
  ): Promise<SuplentesPaginado> {
    await this.mockDelay();
    let filtered = [...SuplentesService.mockData];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.titularNombre} ${s.titularApellido}`.toLowerCase().includes(q) ||
        `${s.suplenteNombre} ${s.suplenteApellido}`.toLowerCase().includes(q)
      );
    }
    if (estado) filtered = filtered.filter(s => s.estado === estado);

    const total   = filtered.length;
    const inicio  = (pagina - 1) * porPagina;
    const items   = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockObtenerPorId(id: number): Promise<SuplenteListaItem> {
    await this.mockDelay();
    const found = SuplentesService.mockData.find(s => s.idAsignacion === id);
    if (!found) throw new Error('Asignación no encontrada.');
    return { ...found };
  }

  private async mockPorRol(idUsuario: number, rol: 'titular' | 'suplente'): Promise<SuplenteListaItem[]> {
    await this.mockDelay(150);
    return SuplentesService.mockData
      .filter(s => rol === 'titular' ? s.idTitular === idUsuario : s.idSuplente === idUsuario)
      .map(s => ({ ...s }));
  }

  private async mockGuardar(dto: GuardarSuplenteRequest): Promise<number> {
    await this.mockDelay();

    if (dto.idTitular === dto.idSuplente) {
      throw new Error('El titular y el suplente no pueden ser la misma persona.');
    }

    // NOTE: en real, esto se resuelve consultando el service de usuarios.
    // En mock lo dejamos con IDs y el listado se resuelve al leer.
    // Necesito nombres de titular/suplente — asumo que el frontend los enviará resueltos
    // pero en mock los generamos con lookup de UsuariosService.mockData indirect.
    // Aquí simplemente escribo los IDs y estado.
    if (dto.idAsignacion === 0) {
      const nuevoId = SuplentesService.nextId++;
      SuplentesService.mockData.push({
        idAsignacion:     nuevoId,
        idTitular:        dto.idTitular,
        titularNombre:    '(pendiente)',
        titularApellido:  '',
        titularCargo:     null,
        idSuplente:       dto.idSuplente,
        suplenteNombre:   '(pendiente)',
        suplenteApellido: '',
        suplenteCargo:    null,
        fechaInicio:      dto.fechaInicio,
        fechaFin:         dto.sinFechaFin ? null : dto.fechaFin,
        estado:           dto.activo ? 'Activo' : 'Inactivo',
        fechaCreacion:    new Date().toISOString(),
      });
      return nuevoId;
    }

    const existing = SuplentesService.mockData.find(s => s.idAsignacion === dto.idAsignacion);
    if (!existing) throw new Error('Asignación no encontrada.');
    Object.assign(existing, {
      idTitular:   dto.idTitular,
      idSuplente:  dto.idSuplente,
      fechaInicio: dto.fechaInicio,
      fechaFin:    dto.sinFechaFin ? null : dto.fechaFin,
      estado:      dto.activo ? 'Activo' : 'Inactivo',
    });
    return dto.idAsignacion;
  }

  private async mockCambiarEstado(dto: CambiarEstadoSuplenteRequest): Promise<void> {
    await this.mockDelay();
    const existing = SuplentesService.mockData.find(s => s.idAsignacion === dto.idAsignacion);
    if (!existing) throw new Error('Asignación no encontrada.');
    existing.estado = dto.estado;
  }

  /** Permite al componente enriquecer los nombres antes de refrescar la lista. */
  static reemplazarNombres(idAsignacion: number, titular: { nombre: string; apellido: string; cargo: string | null }, suplente: { nombre: string; apellido: string; cargo: string | null }): void {
    const s = SuplentesService.mockData.find(x => x.idAsignacion === idAsignacion);
    if (!s) return;
    s.titularNombre    = titular.nombre;
    s.titularApellido  = titular.apellido;
    s.titularCargo     = titular.cargo;
    s.suplenteNombre   = suplente.nombre;
    s.suplenteApellido = suplente.apellido;
    s.suplenteCargo    = suplente.cargo;
  }

  private mockDelay(ms = 250): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
