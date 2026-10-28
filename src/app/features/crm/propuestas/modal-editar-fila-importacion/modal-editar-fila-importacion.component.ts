import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import {
  AccionImportacion,
  EquipoConciliado,
  FilaImportacionEquipo,
  OpcionImportacion,
  SuministroConciliado,
} from '../../../../core/models/importacion-equipos.model';

type AccionUi = 'vincular' | 'crear';

/**
 * Modal secundario — Fase 2 de HU-89.
 * Permite al comercial resolver una fila en revisión o nueva:
 *  - si vincular: elegir entre los candidatos del cliente
 *  - si crear: completar los datos obligatorios (N/S, sede, suministro) y opcionales
 *    (código cliente, ubicación, alcance máximo).
 * En match automático solo se muestra el panel Vincular (sin selector).
 * Para descartar una fila, el comercial deselecciona el checkbox en el preview.
 * Marca/Modelo/Clasificación se heredan del suministro, no se editan a mano.
 */
@Component({
  selector: 'app-modal-editar-fila-importacion',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-editar-fila-importacion.component.html',
  styleUrl: './modal-editar-fila-importacion.component.scss',
})
export class ModalEditarFilaImportacionComponent {
  // ─── Inputs ──────────────────────────────────────────────────────────────
  readonly fila            = input.required<FilaImportacionEquipo>();
  readonly sedes           = input<OpcionImportacion[]>([]);
  readonly clasificaciones = input<OpcionImportacion[]>([]);

  // ─── Outputs ─────────────────────────────────────────────────────────────
  readonly cerrar  = output<void>();
  readonly guardar = output<FilaImportacionEquipo>();

  // ─── Estado interno ──────────────────────────────────────────────────────
  readonly accion = signal<AccionUi>('crear');

  readonly idEquipoSeleccionado = signal<number | null>(null);

  // Datos del "crear"
  readonly nNumSerie      = signal('');
  readonly nIdSede        = signal<number | null>(null);
  readonly nIdSuministro  = signal<number | null>(null);
  readonly nCodigoCliente = signal<string>('');
  readonly nUbicacion     = signal<string>('');
  readonly nAlcanceMaximo = signal<string>('');

  readonly busquedaSuministro = signal('');
  readonly todosSuministros   = signal<SuministroConciliado[]>([]);

  readonly suministrosFiltrados = computed(() => {
    const q = this.busquedaSuministro().toLowerCase().trim();
    const base = this.todosSuministros();
    if (!q) return base;
    return base.filter(s =>
      (s.descripcion + ' ' + s.marca + ' ' + s.modelo + ' ' + s.codigo)
        .toLowerCase().includes(q),
    );
  });

  readonly suministroSeleccionado = computed(() =>
    this.todosSuministros().find(s => s.idSuministro === this.nIdSuministro()) ?? null,
  );

  readonly puedeGuardar = computed(() => {
    const a = this.accion();
    if (a === 'vincular') return this.idEquipoSeleccionado() != null;
    // crear
    return !!this.nNumSerie().trim()
        && this.nIdSede() != null
        && this.nIdSuministro() != null;
  });

  /** En match automático solo se puede vincular → ocultamos el selector. */
  readonly mostrarSelectorAccion = computed(() => this.fila().estado !== 'automatico');

  constructor() {
    // Inicialización desde la fila (effect sobre el input al construir).
    queueMicrotask(() => this.inicializarDesdeFila());
  }

  private inicializarDesdeFila(): void {
    const f = this.fila();
    const n = f.nuevo;

    // Acción UI: automático siempre vincular. Para el resto, respetamos lo que trae la fila.
    if (f.estado === 'automatico')     this.accion.set('vincular');
    else if (f.accion === 'vincular')  this.accion.set('vincular');
    else                               this.accion.set('crear');

    // Vincular
    this.idEquipoSeleccionado.set(f.equipo?.idEquipo ?? null);

    // Crear
    this.nNumSerie.set(n?.numSerie ?? f.leido.numSerie ?? '');
    this.nIdSede.set(n?.idSede ?? f.equipo?.idSede ?? null);
    this.nIdSuministro.set(n?.idSuministro ?? null);
    this.nCodigoCliente.set(n?.codigoCliente ?? f.leido.codigoCliente ?? '');
    this.nUbicacion.set(n?.ubicacion ?? f.leido.ubicacion ?? '');
    this.nAlcanceMaximo.set(n?.alcanceMaximo ?? f.leido.capacidad ?? '');

    // Suministros disponibles para elegir: los candidatos de la fila.
    this.todosSuministros.set(f.suministrosCandidatos ?? []);
  }

  // ─── Acciones del usuario ────────────────────────────────────────────────
  elegirCandidato(c: EquipoConciliado): void {
    this.idEquipoSeleccionado.set(c.idEquipo);
  }

  elegirSuministro(s: SuministroConciliado): void {
    this.nIdSuministro.set(s.idSuministro);
    this.busquedaSuministro.set('');
  }

  quitarSuministro(): void {
    this.nIdSuministro.set(null);
  }

  cambiarAccion(a: AccionUi): void {
    this.accion.set(a);
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Guardar ─────────────────────────────────────────────────────────────
  onGuardar(): void {
    if (!this.puedeGuardar()) return;

    const original = this.fila();
    const a = this.accion();

    let actualizada: FilaImportacionEquipo;

    if (a === 'vincular') {
      const idEq = this.idEquipoSeleccionado();
      const eq   = original.candidatos.find(c => c.idEquipo === idEq) ?? original.equipo;
      actualizada = {
        ...original,
        estado:       'automatico',
        motivo:       'resuelto_manual',
        estadoLabel:  'Resuelto manualmente — vincular',
        accion:       'vincular' as AccionImportacion,
        equipo:       eq ?? null,
        nuevo:        null,
        importable:   true,
        seleccionado: true,
        origen:       'reglas',
        confianza:    100,
      };
    } else {
      // crear
      const sum = this.suministroSeleccionado();
      actualizada = {
        ...original,
        estado:       'nuevo',
        motivo:       'resuelto_manual',
        estadoLabel:  'Resuelto manualmente — crear',
        accion:       'crear' as AccionImportacion,
        equipo:       null,
        importable:   true,
        seleccionado: true,
        origen:       'reglas',
        confianza:    100,
        nuevo: {
          numSerie:              this.nNumSerie().trim(),
          marca:                 sum?.marca ?? original.leido.marca ?? null,
          modelo:                sum?.modelo ?? original.leido.modelo ?? null,
          clasificacion:         sum?.clase ?? null,
          idSuministro:          sum?.idSuministro ?? null,
          suministroDescripcion: sum?.descripcion ?? null,
          idSede:                this.nIdSede(),
          codigoCliente:         this.nCodigoCliente().trim() || null,
          ubicacion:             this.nUbicacion().trim() || null,
          alcanceMaximo:         this.nAlcanceMaximo().trim() || null,
        },
      };
    }

    this.guardar.emit(actualizada);
  }

  // ─── Helpers UI ──────────────────────────────────────────────────────────
  nombreSede(idSede: number | null): string {
    if (idSede == null) return '—';
    return this.sedes().find(s => s.id === idSede)?.nombre ?? '—';
  }
}
