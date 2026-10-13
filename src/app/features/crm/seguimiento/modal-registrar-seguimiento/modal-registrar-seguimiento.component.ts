import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import {
  PreparacionRegistroSeguimiento,
  ProximaAccionEntrada,
} from '../../../../core/models/seguimiento.model';

/** Variantes del modal:
 *   general  → Registro general (tipo + resultado + notas). Si tipo = Llamada,
 *              aparece dinámicamente el campo "Duración (min)".
 *   correo   → Enviar correo (editor HTML + plantillas + envío Brevo).
 *   La variante "llamada" fue absorbida por "general" (ver HU-19 iteración UX).
 */
type Variante = 'general' | 'correo';

@Component({
  selector: 'app-modal-registrar-seguimiento',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-registrar-seguimiento.component.html',
  styleUrl: './modal-registrar-seguimiento.component.scss',
})
export class ModalRegistrarSeguimientoComponent {
  private readonly svc   = inject(SeguimientoService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly varianteInicial = input<Variante>('general');
  readonly ejecutaAccionPendiente = input<boolean>(false);
  /** HU-19 — Qué hacer con la próxima acción pendiente:
   *   ninguno   = no hay pendiente, flujo normal
   *   ejecutar  = ejecuta la pendiente (viene de "Ejecutar ahora" o del decider)
   *   mantener  = registra otra sin tocar la pendiente → ocultar sección "programar próxima"
   *   cancelar  = cancela la pendiente y permite programar otra */
  readonly comportamientoPendiente = input<'ninguno' | 'ejecutar' | 'mantener' | 'cancelar'>('ninguno');
  /** Nombre/fecha/responsable de la pendiente — para pintar el banner o hint informativo. */
  readonly nombreAccionPendiente  = input<string | null | undefined>(null);
  readonly fechaAccionPendiente   = input<string | null | undefined>(null);
  readonly responsablePendiente   = input<string | null | undefined>(null);
  /** Código del tipo de la pendiente (LLAMADA/CORREO/REUNION/VISITA/WHATSAPP/...) — para preseleccionar al Ejecutar. */
  readonly codigoAccionPendiente  = input<string | null | undefined>(null);

  readonly cerrar     = output<void>();
  readonly confirmado = output<void>();

  readonly cargandoDatos = signal(true);
  readonly datos         = signal<PreparacionRegistroSeguimiento | null>(null);
  readonly variante      = signal<Variante>('general');
  readonly enviando      = signal(false);

  // ─── Form general ───────────────────────────────────────────────
  readonly idCanal         = signal<number | null>(null);
  readonly idResultado     = signal<number | null>(null);
  readonly idContacto      = signal<number | null>(null);
  readonly fechaInteraccion = signal<string>('');
  readonly notas           = signal('');

  // Específicos llamada
  readonly duracionMinutos = signal<number | null>(null);

  // Específicos correo
  readonly idPlantilla     = signal<number | null>(null);
  readonly correoPara      = signal<string>('');
  readonly correoCc        = signal<string>('');
  readonly correoAsunto    = signal('');
  readonly correoCuerpo    = signal('');

  // Programar próxima acción
  readonly programarProxima  = signal(false);
  readonly idTipoAccion      = signal<number | null>(null);
  readonly fechaProxima      = signal<string>('');
  readonly idPrioridadProxima = signal<number | null>(null);
  readonly idResponsableProxima = signal<number | null>(null);
  readonly detalleProxima    = signal('');

  // Adjuntos
  readonly archivos = signal<File[]>([]);

  /** La pendiente NO se hereda si el flujo es "ejecutar" o "cancelar" (ambos la cierran). */
  readonly debeConsumirPendiente = computed(() =>
    this.comportamientoPendiente() === 'ejecutar'
    || this.comportamientoPendiente() === 'cancelar'
    || this.ejecutaAccionPendiente(),
  );

  /** Oculta la sección "Programar próxima acción" cuando el user eligió mantener la pendiente. */
  readonly ocultaProgramar = computed(() => this.comportamientoPendiente() === 'mantener');

  /** Al Ejecutar ahora, el tipo queda bloqueado: no puede cambiarlo. */
  readonly tipoBloqueado = computed(() => this.comportamientoPendiente() === 'ejecutar');

  /** El canal seleccionado es LLAMADA — mostramos campo Duración dinámico. */
  readonly esCanalLlamada = computed(() => {
    const canal = this.datos()?.tiposSeguimiento.find(t => t.id === this.idCanal());
    return canal?.codigo === 'LLAMADA';
  });

  readonly puedeGuardar = computed(() => {
    const d = this.datos();
    if (!d) return false;
    if (this.variante() === 'correo') {
      return this.correoPara().trim().length > 0 && !!this.correoAsunto().trim() && !!this.correoCuerpo().trim();
    }
    // General: tipo + resultado obligatorios. Si es llamada, duración > 0.
    if (this.idCanal() === null || this.idResultado() === null) return false;
    if (this.esCanalLlamada()) {
      const d = this.duracionMinutos();
      if (d === null || d <= 0) return false;
      if (this.notas().trim().length < 5) return false;
    }
    return true;
  });

  constructor() {
    effect(() => {
      const id = this.idPropuesta();
      if (id > 0) {
        this.variante.set(this.varianteInicial());
        void this.cargar(id);
      }
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargandoDatos.set(true);
    try {
      const d = await this.svc.prepararRegistro(id);
      this.datos.set(d);
      // Prefills
      if (d.cabecera.fechaServidor) this.fechaInteraccion.set(d.cabecera.fechaServidor.substring(0, 16));
      if (d.cabecera.idContacto) this.idContacto.set(d.cabecera.idContacto);
      // Para correo precargar from a usuario y para a contacto principal
      if (d.cabecera.correoContacto) this.correoPara.set(d.cabecera.correoContacto);
      // Si hay borrador reusar
      if (d.borrador) {
        this.correoAsunto.set(d.borrador.asunto);
        this.correoCuerpo.set(d.borrador.cuerpoHtml);
        if (d.borrador.idPlantilla != null) this.idPlantilla.set(d.borrador.idPlantilla);
        this.correoPara.set(d.borrador.para.map(p => p.correo).join(', '));
        this.correoCc.set(d.borrador.cc.map(p => p.correo).join(', '));
      }
      // HU-19 — Al Ejecutar ahora, preseleccionar variante + tipo según el código de la tarea pendiente.
      const codigo = this.codigoAccionPendiente();
      if (this.comportamientoPendiente() === 'ejecutar' && codigo) {
        if (codigo === 'CORREO') {
          this.variante.set('correo');
        } else {
          this.variante.set('general');
          // Busca el canal cuyo código coincide (LLAMADA, WHATSAPP, REUNION, VISITA, REENVIO_AJUSTES, OTRO...)
          const canal = d.tiposSeguimiento.find(t => t.codigo === codigo);
          if (canal) this.idCanal.set(canal.id);
        }
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar datos del modal.');
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  cambiarVariante(v: Variante): void { this.variante.set(v); }
  onCerrar(): void { this.cerrar.emit(); }

  aplicarPlantilla(idPlantilla: number): void {
    const p = this.datos()?.plantillas.find(x => x.idPlantilla === idPlantilla);
    if (!p) return;
    this.correoAsunto.set(p.asunto);
    this.correoCuerpo.set(p.cuerpoHtml);
    this.idPlantilla.set(idPlantilla);
  }

  onArchivosSeleccionados(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    const nuevos = Array.from(input.files);
    this.archivos.update(prev => [...prev, ...nuevos].slice(0, 5));
    input.value = '';
  }
  quitarArchivo(i: number): void {
    this.archivos.update(prev => prev.filter((_, idx) => idx !== i));
  }

  private armarProxima(): ProximaAccionEntrada | null {
    if (!this.programarProxima()) return null;
    return {
      idTipoAccion:  this.idTipoAccion(),
      fecha:         this.fechaProxima() || null,
      idResponsable: this.idResponsableProxima(),
      idPrioridad:   this.idPrioridadProxima(),
      detalle:       this.detalleProxima() || null,
    };
  }

  private parseDestinatarios(csv: string) {
    return csv.split(',').map(s => s.trim()).filter(Boolean).map(correo => ({ correo }));
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      const idProp = this.idPropuesta();
      let resultado;
      if (this.variante() === 'correo') {
        resultado = await this.svc.enviarCorreo(idProp, {
          idPlantilla:  this.idPlantilla(),
          para:         this.parseDestinatarios(this.correoPara()),
          cc:           this.parseDestinatarios(this.correoCc()),
          asunto:       this.correoAsunto(),
          cuerpoHtml:   this.correoCuerpo(),
          idContacto:   this.idContacto(),
          idResultado:  this.idResultado(),
          programarProximaAccion: this.programarProxima(),
          proximaAccion: this.armarProxima(),
          ejecutaAccionPendiente: this.debeConsumirPendiente(),
        });
      } else if (this.esCanalLlamada()) {
        // General con tipo = LLAMADA: usamos el endpoint específico de llamada para que
        // el back aplique sus validaciones de duración obligatoria.
        resultado = await this.svc.registrarLlamada(idProp, {
          idContacto:        this.idContacto(),
          fechaInteraccion:  this.fechaInteraccion() || null,
          duracionMinutos:   this.duracionMinutos(),
          idResultado:       this.idResultado(),
          notas:             this.notas() || null,
          programarProximaAccion: this.programarProxima(),
          proximaAccion: this.armarProxima(),
          ejecutaAccionPendiente: this.debeConsumirPendiente(),
        });
      } else {
        resultado = await this.svc.registrarSeguimiento(idProp, {
          idCanal:           this.idCanal(),
          idResultado:       this.idResultado(),
          idContacto:        this.idContacto(),
          fechaInteraccion:  this.fechaInteraccion() || null,
          notas:             this.notas() || null,
          programarProximaAccion: this.programarProxima(),
          proximaAccion: this.armarProxima(),
          ejecutaAccionPendiente: this.debeConsumirPendiente(),
        });
      }
      // Subir adjuntos si hay
      if (this.archivos().length > 0 && resultado.idSeguimiento) {
        try {
          await this.svc.subirAdjuntos(resultado.idSeguimiento, this.archivos());
        } catch (e: unknown) {
          this.toast.error('Seguimiento registrado, pero fallaron adjuntos: ' +
            (e instanceof Error ? e.message : ''));
        }
      }
      this.toast.exito('Seguimiento registrado correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar.');
    } finally {
      this.enviando.set(false);
    }
  }
}
