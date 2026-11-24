import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../../core/services/toast.service';
import { RegistroInformeIntranetService } from '../../../../../core/services/registro-informe-intranet.service';
import {
  CabeceraInformeIntranetApi,
  DiagnosticoGuardarInforme,
  FallaGuardarInforme,
  GuardarCabeceraInformeApi,
  PrioridadRecomendacionInforme,
  RecomendacionGuardarInforme,
  SeveridadFalla,
  SeveridadGeneral,
} from '../../../../../core/models/registro-informe-intranet-api.model';

type SubSeccion = 'datos' | 'detalle' | 'recoms' | 'fallas' | 'diagnostico' | 'pruebas';

/** Form state interno (sin idRecomendacion). */
interface RecomForm {
  id?:         number;
  titulo:      string;
  descripcion: string;
  prioridad:   PrioridadRecomendacionInforme;
}

interface FallaForm {
  id?:            number;
  clasificacion:  string;
  componente:     string;
  severidad:      SeveridadFalla;
  descripcion:    string;
  fotos:          number[];
}

/**
 * HU-55 Paso 4 — Cabecera del informe.
 *
 * 6 subsecciones:
 *   4.1 Datos del responsable (contacto del cliente)
 *   4.2 Detalle del servicio (tipo de equipo, celdas, sumatorias, anillos, checklist)
 *   4.3 Recomendaciones
 *   4.4 Fallas
 *   4.5 Diagnóstico final
 *   4.6 Comentario de pruebas
 *
 * Guarda todo con un solo PUT /cabecera-informe. El back responde con el total de fallas/recoms
 * y la fecha de guardado.
 */
@Component({
  selector: 'app-paso-cabecera',
  imports: [CommonModule, FormsModule],
  templateUrl: './paso-cabecera.component.html',
  styleUrl: './paso-cabecera.component.scss',
})
export class PasoCabeceraComponent implements OnInit {
  private readonly svc   = inject(RegistroInformeIntranetService);
  private readonly toast = inject(ToastService);

  readonly idOs       = input.required<number>();
  readonly idOsEquipo = input.required<number>();

  readonly completado = output<void>();

  readonly data     = signal<CabeceraInformeIntranetApi | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);

  readonly subseccion = signal<SubSeccion>('datos');

  // ─ 4.1 Datos del responsable (editable: nombre/cargo/teléfono)
  readonly respNombre   = signal('');
  readonly respCargo    = signal('');
  readonly respTelefono = signal('');

  // ─ 4.2 Detalle
  readonly tipoEquipo       = signal('');
  readonly celdas           = signal<string[]>([]);  // strings para edición
  readonly sumatoriaHasta   = signal('');
  readonly comparacionHasta = signal('');
  readonly anillosFijacion  = signal<boolean | null>(null);
  readonly checksMarcados   = signal<string[]>([]);

  // ─ 4.3 Recomendaciones
  readonly recomendaciones    = signal<RecomForm[]>([]);
  readonly sinRecomendaciones = signal(false);

  // ─ 4.4 Fallas
  readonly fallas    = signal<FallaForm[]>([]);
  readonly sinFallas = signal(false);

  // ─ 4.5 Diagnóstico
  readonly severidadGeneral = signal<SeveridadGeneral | string>('ninguna');
  readonly estadoEquipo     = signal('');
  readonly revisionJefatura = signal(false);
  readonly precotizacion    = signal(false);
  readonly segundaVisita    = signal(false);
  readonly aplicaGarantia   = signal(false);

  // ─ 4.6 Pruebas
  readonly comentarioPruebas = signal('');

  readonly puedeEditar = computed(() => this.data()?.datos.puedeEditar ?? false);

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.obtenerCabeceraInforme(this.idOs(), this.idOsEquipo());
      this.data.set(d);
      this.hidratar(d);
    } catch (err: unknown) {
      this.toast.error((err as Error)?.message || 'No se pudo cargar la cabecera del informe.');
    } finally {
      this.cargando.set(false);
    }
  }

  private hidratar(d: CabeceraInformeIntranetApi): void {
    this.respNombre.set(d.datos.responsableNombre ?? '');
    this.respCargo.set(d.datos.responsableCargo ?? '');
    this.respTelefono.set(d.datos.responsableTelefono ?? '');

    this.tipoEquipo.set(d.detalle.tipoEquipo ?? '');
    this.celdas.set((d.detalle.celdas ?? []).map(n => String(n)));
    this.sumatoriaHasta.set(d.detalle.sumatoriaHasta == null ? '' : String(d.detalle.sumatoriaHasta));
    this.comparacionHasta.set(d.detalle.comparacionHasta == null ? '' : String(d.detalle.comparacionHasta));
    this.anillosFijacion.set(d.detalle.anillosFijacion);
    this.checksMarcados.set(d.detalle.checklist.filter(c => c.marcado).map(c => c.codigo));

    this.recomendaciones.set(d.recomendaciones.map(r => ({
      id: r.idRecomendacion, titulo: r.titulo, descripcion: r.descripcion ?? '', prioridad: r.prioridad,
    })));
    this.sinRecomendaciones.set(d.sinRecomendaciones);

    this.fallas.set(d.fallas.map(f => ({
      id: f.idObservacion, clasificacion: f.clasificacion, componente: f.componente,
      severidad: f.severidad, descripcion: f.descripcion, fotos: [...f.fotos],
    })));
    this.sinFallas.set(d.sinFallas);

    this.severidadGeneral.set(d.diagnostico.severidadGeneral ?? 'ninguna');
    this.estadoEquipo.set(d.diagnostico.estadoEquipo ?? '');
    this.revisionJefatura.set(d.diagnostico.revisionJefatura);
    this.precotizacion.set(d.diagnostico.precotizacion);
    this.segundaVisita.set(d.diagnostico.segundaVisita);
    this.aplicaGarantia.set(d.diagnostico.aplicaGarantia);

    this.comentarioPruebas.set(d.comentarioPruebas ?? '');
  }

  // ─── Edición: Recomendaciones ─────────────────────────────────────────

  addRecom(): void {
    this.recomendaciones.update(a => [...a, { titulo: '', descripcion: '', prioridad: 'media' }]);
    this.sinRecomendaciones.set(false);
  }
  updateRecom(i: number, campo: keyof RecomForm, valor: string): void {
    this.recomendaciones.update(a => a.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r));
  }
  rmRecom(i: number): void {
    this.recomendaciones.update(a => a.filter((_, idx) => idx !== i));
  }

  // ─── Edición: Fallas ──────────────────────────────────────────────────

  addFalla(): void {
    this.fallas.update(a => [...a, {
      clasificacion: '', componente: '', severidad: 'media', descripcion: '', fotos: [],
    }]);
    this.sinFallas.set(false);
  }
  updateFalla(i: number, campo: keyof FallaForm, valor: string): void {
    this.fallas.update(a => a.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));
  }
  rmFalla(i: number): void {
    this.fallas.update(a => a.filter((_, idx) => idx !== i));
  }

  async subirFotoFalla(i: number, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const res = await this.svc.subirFotoFalla(this.idOs(), this.idOsEquipo(), file);
      this.fallas.update(a => a.map((f, idx) =>
        idx === i ? { ...f, fotos: [...f.fotos, res.idEvidencia] } : f,
      ));
      this.toast.exito('Foto de falla subida.');
    } catch (err: unknown) {
      this.toast.error((err as Error)?.message || 'No se pudo subir la foto.');
    }
  }

  rmFotoFalla(i: number, idFoto: number): void {
    this.fallas.update(a => a.map((f, idx) =>
      idx === i ? { ...f, fotos: f.fotos.filter(x => x !== idFoto) } : f,
    ));
  }

  // ─── Edición: Celdas ──────────────────────────────────────────────────

  addCelda(): void { this.celdas.update(a => [...a, '']); }
  updateCelda(i: number, v: string): void { this.celdas.update(a => a.map((c, idx) => idx === i ? v : c)); }
  rmCelda(i: number): void { this.celdas.update(a => a.filter((_, idx) => idx !== i)); }

  toggleCheck(codigo: string): void {
    this.checksMarcados.update(a => a.includes(codigo) ? a.filter(c => c !== codigo) : [...a, codigo]);
  }
  estaMarcado(codigo: string): boolean {
    return this.checksMarcados().includes(codigo);
  }

  // ─── Guardado ─────────────────────────────────────────────────────────

  async guardar(avanzar: boolean): Promise<void> {
    this.guardando.set(true);
    try {
      const payload: GuardarCabeceraInformeApi = {
        datos: {
          responsableNombre: this.respNombre().trim() || null,
          responsableCargo: this.respCargo().trim() || null,
          responsableTelefono: this.respTelefono().trim() || null,
        },
        detalle: {
          tipoEquipo: this.tipoEquipo().trim() || null,
          celdas: this.celdas().map(c => Number(c)).filter(n => Number.isFinite(n)),
          sumatoriaHasta: this.parseNum(this.sumatoriaHasta()),
          comparacionHasta: this.parseNum(this.comparacionHasta()),
          anillosFijacion: this.anillosFijacion(),
          checks: this.checksMarcados(),
        },
        recomendaciones: this.sinRecomendaciones()
          ? [] : this.recomendaciones().map(r => this.recomDto(r)),
        sinRecomendaciones: this.sinRecomendaciones(),
        fallas: this.sinFallas()
          ? [] : this.fallas().map(f => this.fallaDto(f)),
        sinFallas: this.sinFallas(),
        comentarioPruebas: this.comentarioPruebas().trim() || null,
        diagnostico: this.diagDto(),
      };
      await this.svc.guardarCabeceraInforme(this.idOs(), this.idOsEquipo(), payload);
      this.toast.exito('Cabecera del informe guardada.');
      if (avanzar) this.completado.emit();
      else await this.recargar();
    } catch (err: unknown) {
      this.toast.error((err as Error)?.message || 'No se pudo guardar la cabecera.');
    } finally {
      this.guardando.set(false);
    }
  }

  private recomDto(r: RecomForm): RecomendacionGuardarInforme {
    return { titulo: r.titulo || null, descripcion: r.descripcion || null, prioridad: r.prioridad };
  }
  private fallaDto(f: FallaForm): FallaGuardarInforme {
    return {
      clasificacion: f.clasificacion || null,
      componente: f.componente || null,
      severidad: f.severidad,
      descripcion: f.descripcion || null,
      fotos: f.fotos,
    };
  }
  private diagDto(): DiagnosticoGuardarInforme {
    return {
      severidadGeneral: String(this.severidadGeneral()),
      estadoEquipo: this.estadoEquipo() || null,
      revisionJefatura: this.revisionJefatura(),
      precotizacion: this.precotizacion(),
      segundaVisita: this.segundaVisita(),
      aplicaGarantia: this.aplicaGarantia(),
    };
  }

  private parseNum(s: string): number | null {
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
}
