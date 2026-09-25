import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import { AlertaOperativa, KpisDashboard, Notificacion } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  async obtenerResumen(): Promise<KpisDashboard> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<KpisDashboard>>(`${this.base}/dashboard/resumen`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerAlertas(): Promise<AlertaOperativa[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<AlertaOperativa[]>>(`${this.base}/dashboard/alertas`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerNotificaciones(): Promise<Notificacion[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<Notificacion[]>>(`${this.base}/notificaciones`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }
}
