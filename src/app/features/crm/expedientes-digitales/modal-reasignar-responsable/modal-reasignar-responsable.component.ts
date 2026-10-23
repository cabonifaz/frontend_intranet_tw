import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExpedientesDigitalesService } from '../../../../core/services/expedientes-digitales.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CandidatoResponsableDto,
  CarteraComercialExpedienteDto,
  EntidadExpedienteDto,
  PreparacionReasignacionExpedienteDto,
  ReasignarResponsableExpedienteDto,
} from '../../../../core/models/expedientes-digitales.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';

type ModoReasignacion = 'entidad' | 'cascada' | 'global';

/** HU-33 — Modal Reasignar Responsable (3 variantes: Entidad específica, Cascada, Masivo). */
@Component({
  selector: 'app-modal-reasignar-responsable',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-reasignar-responsable.component.html',
  styleUrl: './modal-reasignar-responsable.component.scss',
})
export class ModalReasignarResponsableComponent implements OnInit {
  private readonly svc   = inject(ExpedientesDigitalesService);
  private readonly toast = inject(ToastService);

  readonly idExpediente     = input.required<number>();
  readonly numeroExpediente = input<string>('');
  /** Si viene seteado, el modal arranca en modo "Entidad específica" y preselecciona esa entidad. */
  readonly idEntidadOrigen  = input<number | null>(null);
  readonly cerrar           = output<void>();
  readonly reasignado       = output<void>();

  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly data     = signal<PreparacionReasignacionExpedienteDto | null>(null);
  readonly cartera  = signal<CarteraComercialExpedienteDto | null>(null);

  // ── Paso 1: tipo de reasignación ────────────────────────────────
  readonly modo = signal<ModoReasignacion>('cascada');

  // ── Paso 2A/2B: entidad seleccionada (clave) ────────────────────
  readonly claveEntidad = signal<string | null>(null);
  /** Para variante B: claves desmarcadas del árbol. */
  readonly excluidos = signal<Set<string>>(new Set());

  // ── Paso 3: responsables + motivo + sla + comentario ────────────
  readonly busqueda       = signal<string>('');
  readonly candidatos     = signal<CandidatoResponsableDto[]>([]);
  readonly buscandoCand   = signal(false);
  readonly nuevoResp      = signal<CandidatoResponsableDto | null>(null);
  readonly idMotivo       = signal<number | null>(null);
  readonly gestionSla     = signal<string>('mantener');
  readonly comentario     = signal<string>('');

  // ── Derivados ───────────────────────────────────────────────────
  readonly entidadSeleccionada = computed<EntidadExpedienteDto | null>(() => {
    const c = this.claveEntidad();
    return this.data()?.entidades.find(e => e.clave === c) ?? null;
  });

  readonly descendientes = computed<EntidadExpedienteDto[]>(() => {
    const raiz = this.entidadSeleccionada();
    if (!raiz) return [];
    const ents = this.data()?.entidades ?? [];
    const result: EntidadExpedienteDto[] = [];
    const stack = [raiz.clave];
    while (stack.length) {
      const padre = stack.pop()!;
      const hijos = ents.filter(e => e.clavePadre === padre);
      for (const h of hijos) {
        result.push(h);
        stack.push(h.clave);
      }
    }
    return result;
  });

  readonly totalEntidadesAfectadas = computed(() => {
    if (this.modo() === 'entidad') return this.entidadSeleccionada() ? 1 : 0;
    if (this.modo() === 'cascada') {
      const incluidas = [this.entidadSeleccionada(), ...this.descendientes()]
        .filter((e): e is EntidadExpedienteDto => !!e)
        .filter(e => !this.excluidos().has(e.clave));
      return incluidas.length;
    }
    return this.cartera()?.resumen?.totalEntidades ?? 0;
  });

  readonly longitudComentario = computed(() => this.comentario().length);
  readonly comentarioValido   = computed(() => this.longitudComentario() >= 20);

  readonly puedeConfirmar = computed(() => {
    if (this.enviando()) return false;
    if (!this.nuevoResp()) return false;
    if (this.idMotivo() == null) return false;
    if (!this.comentarioValido()) return false;
    if (this.modo() === 'entidad' && !this.entidadSeleccionada()) return false;
    if (this.modo() === 'cascada' && !this.entidadSeleccionada()) return false;
    return true;
  });

  // ── Lifecycle ───────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.prepararReasignacion(this.idExpediente());
      this.data.set(d);

      // Preseleccionar entidad si viene idEntidadOrigen
      const idOrigen = this.idEntidadOrigen();
      if (idOrigen != null) {
        const found = d.entidades.find(e => e.idEntidad === idOrigen);
        if (found) {
          this.claveEntidad.set(found.clave);
          this.modo.set('entidad');
        }
      } else {
        // Default: raíz del expediente
        const raiz = d.entidades.find(e => !e.clavePadre);
        if (raiz) this.claveEntidad.set(raiz.clave);
      }
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo preparar la reasignación.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ── Paso 1 ──────────────────────────────────────────────────────
  async setModo(m: ModoReasignacion): Promise<void> {
    this.modo.set(m);
    this.excluidos.set(new Set());
    if (m === 'global') await this.cargarCartera();
  }

  private async cargarCartera(): Promise<void> {
    try {
      const idActual = this.data()?.datos.idResponsable ?? null;
      this.cartera.set(await this.svc.obtenerCarteraComercial(this.idExpediente(), idActual));
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo cargar la cartera.');
    }
  }

  // ── Paso 2 ──────────────────────────────────────────────────────
  seleccionarEntidad(clave: string): void {
    this.claveEntidad.set(clave);
    this.excluidos.set(new Set());
  }

  toggleExcluir(clave: string): void {
    const s = new Set(this.excluidos());
    if (s.has(clave)) s.delete(clave); else s.add(clave);
    this.excluidos.set(s);
  }

  // ── Paso 3: autocomplete candidatos ─────────────────────────────
  async onBuscarCandidatos(texto: string): Promise<void> {
    this.busqueda.set(texto);
    if (texto.trim().length < 2) { this.candidatos.set([]); return; }
    this.buscandoCand.set(true);
    try {
      const idExcluir = this.data()?.datos.idResponsable ?? null;
      this.candidatos.set(await this.svc.buscarCandidatos(texto, idExcluir));
    } catch {
      this.candidatos.set([]);
    } finally {
      this.buscandoCand.set(false);
    }
  }

  seleccionarCandidato(c: CandidatoResponsableDto): void {
    this.nuevoResp.set(c);
    this.busqueda.set('');
    this.candidatos.set([]);
  }

  limpiarNuevoResp(): void {
    this.nuevoResp.set(null);
    this.busqueda.set('');
    this.candidatos.set([]);
  }

  // ── Envío ───────────────────────────────────────────────────────
  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar()) return;
    this.enviando.set(true);
    try {
      const d = this.data()!;
      const payload: ReasignarResponsableExpedienteDto = {
        modo:               this.modo(),
        idNuevoResponsable: this.nuevoResp()!.idUsuario,
        idMotivo:           this.idMotivo()!,
        comentario:         this.comentario().trim(),
        gestionSla:         this.gestionSla(),
      };

      if (this.modo() === 'entidad' || this.modo() === 'cascada') {
        const ent = this.entidadSeleccionada()!;
        payload.entidadTipo = ent.entidadTipo;
        payload.idEntidad   = ent.idEntidad;
      }
      if (this.modo() === 'cascada' && this.excluidos().size > 0) {
        payload.excluidos = Array.from(this.excluidos());
      }
      if (this.modo() === 'global') {
        payload.idResponsableActual = d.datos.idResponsable ?? undefined;
      }

      const result = await this.svc.reasignar(this.idExpediente(), payload);
      this.toast.exito(`Reasignación completada · ${result.totalEntidades} entidad(es) · ${result.correosEnviados} correo(s) enviado(s).`);
      this.reasignado.emit();
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo reasignar.');
    } finally {
      this.enviando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ── Helpers UI ──────────────────────────────────────────────────

  iconoModo(m: ModoReasignacion): string {
    if (m === 'entidad') return 'flag';
    if (m === 'cascada') return 'account_tree';
    return 'public';
  }

  iconoEntidad(tipo?: string | null): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('requer') || t === 'rq') return 'description';
    if (t.includes('propuest')) return 'request_page';
    if (t.includes('compra') || t === 'oc') return 'receipt_long';
    if (t.includes('servicio') || t === 'os') return 'engineering';
    return 'folder';
  }

  colorEntidad(tipo?: string | null): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('requer') || t === 'rq') return 'azul';
    if (t.includes('propuest')) return 'violeta';
    if (t.includes('compra') || t === 'oc') return 'ambar';
    if (t.includes('servicio') || t === 'os') return 'verde';
    return 'neutro';
  }

  etiquetaEntidad(e: EntidadExpedienteDto): string {
    const base = e.codigo ?? `${e.entidadTipo}-${e.idEntidad}`;
    return e.version ? `${base} v${e.version}` : base;
  }

  tipoLegible(t: string): string {
    const low = (t || '').toLowerCase();
    if (low === 'rq' || low.includes('requer')) return 'Requerimiento';
    if (low.includes('propuest')) return 'Propuesta';
    if (low === 'oc' || low.includes('compra')) return 'Orden de Compra';
    if (low === 'os' || low.includes('servicio')) return 'Orden de Servicio';
    return t;
  }

  iniciales(nombre?: string | null): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

  formatearMoneda(valor?: number | null, simbolo?: string | null): string {
    if (valor == null) return '—';
    const sim = simbolo ?? 'S/';
    return `${sim} ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
