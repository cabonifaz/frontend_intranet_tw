import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { ComparacionOrdenCompraDto } from '../../../../core/models/ordenes-compra.model';

type Tab = 'campos' | 'conceptos' | 'insights';
type FiltroSeveridad = 'todas' | 'discrepancias' | 'coincidentes';

/**
 * Modal de "Ver detalle completo de validación IA" — usado desde la ficha de registro OC.
 * A diferencia del modal-detalle-validacion-ia (que carga del back), este recibe la comparación
 * en vivo que ya tiene el componente padre (no requiere OC guardada).
 */
@Component({
  selector: 'app-modal-ver-comparacion-oc',
  imports: [CommonModule, ModalComponent, ButtonComponent, SeccionComponent, MonedaPipe],
  templateUrl: './modal-ver-comparacion-oc.component.html',
  styleUrl: './modal-ver-comparacion-oc.component.scss',
})
export class ModalVerComparacionOcComponent {
  readonly comparacion = input.required<ComparacionOrdenCompraDto>();
  readonly numeroOcTemp = input<string>('Nueva OC');
  readonly monedaSimbolo = input<string>('');
  readonly cerrar = output<void>();

  readonly tab = signal<Tab>('campos');
  readonly filtro = signal<FiltroSeveridad>('todas');
  readonly idPropuestaFiltro = signal<number | null>(null);
  readonly now = new Date();

  readonly resumen = computed(() => this.comparacion().resumen);
  readonly propuestas = computed(() => this.comparacion().propuestas);
  readonly todosCampos = computed(() => this.comparacion().campos);
  readonly evaluaciones = computed(() => this.comparacion().evaluacionesIa);

  readonly campos = computed(() => {
    const idP = this.idPropuestaFiltro();
    const base = idP ? this.todosCampos().filter(c => c.idPropuesta === idP) : this.todosCampos();
    const f = this.filtro();
    if (f === 'todas') return base;
    if (f === 'discrepancias') return base.filter(c => c.severidad !== 'ok');
    return base.filter(c => c.severidad === 'ok');
  });

  /**
   * Tabla única agregada: cada campo del back aparece UNA sola vez, combinando las N filas por propuesta.
   * Reglas por tipo de campo:
   *   - numero_propuesta / forma_pago → OR-match: ok si al menos una propuesta coincide (la OC solo apunta a una).
   *   - monto → suma: valor en propuestas = suma de los asignados (ya está en formato texto, lo mostramos como lista).
   *   - resto → dedup si iguales, sino lista "PROP-A: X · PROP-B: Y" con la peor severidad.
   * Sólo se activa cuando hay multi-propuesta y no hay pill de propuesta elegida.
   */
  readonly camposResumen = computed(() => {
    const campos = this.todosCampos();
    if (campos.length === 0) return [] as ReturnType<typeof this.todosCampos>;

    // Agrupar por campo preservando el orden del back (min(orden)).
    const grupos = new Map<string, typeof campos>();
    for (const c of campos) {
      const arr = grupos.get(c.campo) ?? [];
      arr.push(c);
      grupos.set(c.campo, arr);
    }

    const ordenMin = (lista: typeof campos) => Math.min(...lista.map(x => x.orden));
    const nombresOrdenados = [...grupos.keys()].sort((a, b) => ordenMin(grupos.get(a)!) - ordenMin(grupos.get(b)!));

    const resultado: ReturnType<typeof this.todosCampos> = [];
    for (const nombre of nombresOrdenados) {
      const filas = grupos.get(nombre)!;
      resultado.push(this.agregarCampo(nombre, filas));
    }
    return this.aplicarFiltroSeveridad(resultado);
  });

  /** Toma N filas (una por propuesta) de un mismo campo y devuelve UNA fila agregada. */
  private agregarCampo(nombre: string, filas: ReturnType<typeof this.todosCampos>) {
    const primera = filas[0];
    if (filas.length === 1) return primera;

    const peor = this.peorSeveridad(filas.map(f => f.severidad));
    const algunaOk = filas.some(f => f.severidad === 'ok');

    // N° Propuesta: la OC apunta a UNA, coincide si matchea con cualquiera.
    // Mostramos solo los nombres de las propuestas (el valor en propuesta YA ES el nombre, redundante), una por línea.
    if (nombre === 'numero_propuesta') {
      const okRow = filas.find(f => f.severidad === 'ok');
      return {
        ...primera,
        valorPropuesta: filas.map(f => this.nombrePropuesta(f.idPropuesta)).join('\n'),
        severidad: algunaOk ? 'ok' : peor,
        mensaje: okRow?.mensaje ?? primera.mensaje,
        accion:  okRow?.accion  ?? primera.accion,
      };
    }

    // Forma de pago: la OC trae UNA condición, coincide si matchea con cualquiera.
    // Lo mostramos con salto de línea por propuesta (una línea c/u).
    if (nombre === 'forma_pago') {
      const okRow = filas.find(f => f.severidad === 'ok');
      return {
        ...primera,
        valorPropuesta: filas.map(f => `${this.nombrePropuesta(f.idPropuesta)}: ${f.valorPropuesta ?? '—'}`).join('\n'),
        severidad: algunaOk ? 'ok' : peor,
        mensaje: okRow?.mensaje ?? primera.mensaje,
        accion:  okRow?.accion  ?? primera.accion,
      };
    }

    // Monto: suma la asignación de OC y la suma de las propuestas, muestra totales únicos.
    if (nombre === 'monto') {
      const sumaOc    = filas.reduce((s, f) => s + this.extraerMonto(f.valorOc), 0);
      const sumaProps = filas.reduce((s, f) => s + this.extraerMonto(f.valorPropuesta), 0);
      const simbolo   = this.monedaSimbolo() || '';
      return {
        ...primera,
        valorOc:        this.formatearMontoNumero(sumaOc),
        valorPropuesta: this.formatearMontoNumero(sumaProps),
        severidad: Math.abs(sumaOc - sumaProps) < 0.01 ? 'ok' : peor,
        mensaje: filas.find(f => f.severidad === peor)?.mensaje
                 ?? `Suma de ${filas.length} propuestas: ${simbolo} ${sumaProps.toFixed(2)}.`,
        accion:  filas.find(f => f.severidad === peor)?.accion ?? primera.accion,
      };
    }

    // Conceptos: sumatoria de ítems detectados/esperados.
    if (nombre === 'conceptos') {
      const sumaDetectados = filas.reduce((s, f) => s + this.extraerPrimerEntero(f.valorOc), 0);
      const sumaEsperados  = filas.reduce((s, f) => s + this.extraerPrimerEntero(f.valorPropuesta), 0);
      return {
        ...primera,
        valorOc:        `${sumaDetectados} item(s) detectado(s)`,
        valorPropuesta: `${sumaEsperados} item(s) esperado(s)`,
        severidad: sumaDetectados === sumaEsperados ? 'ok' : peor,
        mensaje: filas.find(f => f.severidad === peor)?.mensaje ?? primera.mensaje,
        accion:  filas.find(f => f.severidad === peor)?.accion  ?? primera.accion,
      };
    }

    // Dedup si todas iguales (cliente, moneda, igv).
    const todasIguales = filas.every(f =>
      f.valorPropuesta === primera.valorPropuesta &&
      f.severidad === primera.severidad &&
      (f.mensaje ?? '') === (primera.mensaje ?? '') &&
      (f.accion ?? '') === (primera.accion ?? ''),
    );
    if (todasIguales) return primera;

    // Varían (ej. fecha_emision con vigencias distintas): una línea por propuesta.
    return {
      ...primera,
      valorPropuesta: filas.map(f => `${this.nombrePropuesta(f.idPropuesta)}: ${f.valorPropuesta ?? '—'}`).join('\n'),
      severidad: peor,
      mensaje: filas.find(f => f.severidad === peor)?.mensaje ?? primera.mensaje,
      accion:  filas.find(f => f.severidad === peor)?.accion  ?? primera.accion,
    };
  }

  /** Extrae el primer número decimal de un texto formateado tipo "$ 5,955.30". Devuelve 0 si no encuentra. */
  private extraerMonto(txt: string | null | undefined): number {
    if (!txt) return 0;
    const m = txt.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }

  /** Extrae el primer entero de un texto. Devuelve 0 si no encuentra. */
  private extraerPrimerEntero(txt: string | null | undefined): number {
    if (!txt) return 0;
    const m = txt.match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  /** Formatea un número con el símbolo monetario del modal. */
  private formatearMontoNumero(n: number): string {
    const s = this.monedaSimbolo() || '';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    return `${s} ${valor}`.trim();
  }

  private peorSeveridad(severidades: string[]): string {
    const rank: Record<string, number> = { ok: 0, sin_dato: 1, advertencia: 2, critico: 3 };
    return severidades.reduce((peor, s) => (rank[s] ?? 0) > (rank[peor] ?? 0) ? s : peor, 'ok');
  }

  private aplicarFiltroSeveridad<T extends { severidad: string }>(lista: T[]): T[] {
    const f = this.filtro();
    if (f === 'todas') return lista;
    if (f === 'discrepancias') return lista.filter(c => c.severidad !== 'ok');
    return lista.filter(c => c.severidad === 'ok');
  }

  /** Nombre visible de una propuesta por id (para el valorPropuesta agregado). */
  nombrePropuesta(idPropuesta: number): string {
    const p = this.propuestas().find(x => x.idPropuesta === idPropuesta);
    return p ? `${p.numero}` : `#${idPropuesta}`;
  }

  /** Formatea un número devolviendo la lista de propuestas por sus nombres (para el pool consolidado). */
  nombresPropuestas(ids: number[]): string {
    return ids.map(id => this.nombrePropuesta(id)).join(' · ');
  }

  dotEstadoConsolidado(sev: string): string {
    return ({ ok: 'sev--ok', advertencia: 'sev--adv', critico: 'sev--crit', info: 'sev--info' } as Record<string, string>)[sev] ?? 'sev--neutro';
  }

  iconoEstadoConsolidado(sev: string): string {
    switch (sev) {
      case 'ok':          return 'check_circle';
      case 'advertencia': return 'warning';
      case 'critico':     return 'error';
      case 'info':        return 'info';
      default:            return 'help';
    }
  }

  labelEstadoConsolidado(sev: string): string {
    return ({ ok: 'En OC', advertencia: 'Divergencia', critico: 'Crítico', info: 'Informativo' } as Record<string, string>)[sev] ?? sev;
  }

  /** Mapea el `estado` detallado del back a una severidad semántica para colores/iconos. */
  severidadDesdeEstadoItem(it: { estado?: string | null; esOpcional?: boolean; severidad?: string }): string {
    const e = (it.estado ?? '').toLowerCase();
    // Obligatorios
    if (e === 'ok') return 'ok';
    if (e === 'faltan_unidades' || e === 'sobran_unidades' || e === 'falta_en_oc' || e === 'adicional_en_oc') return 'advertencia';
    // Opcionales
    if (e === 'confirmado_opcional') return 'ok';
    if (e === 'parcial_opcional' || e === 'no_solicitado') return 'info';
    // Fallback a la severidad previa si viene
    return it.severidad ?? 'neutro';
  }

  /** Label corto para la columna estado del pool. */
  labelEstadoItem(estado?: string | null): string {
    switch ((estado ?? '').toLowerCase()) {
      case 'ok':                  return 'OK';
      case 'faltan_unidades':     return 'Faltan unidades';
      case 'sobran_unidades':     return 'Sobran unidades';
      case 'falta_en_oc':         return 'Falta en OC';
      case 'adicional_en_oc':     return 'Adicional en OC';
      case 'confirmado_opcional': return 'Confirmado (opcional)';
      case 'parcial_opcional':    return 'Parcial (opcional)';
      case 'no_solicitado':       return 'No solicitado';
      default:                    return estado ?? '—';
    }
  }

  /** Mensaje visible en el chip. Compacto para opcionales (sobrescribe el msj largo del back). */
  mensajeChipItem(it: { estado?: string | null; mensaje?: string | null; cantidadTotal?: number; esOpcional?: boolean }): string {
    const estado = (it.estado ?? '').toLowerCase();
    if (it.esOpcional) {
      if (estado === 'no_solicitado') return `No solicitado (${it.cantidadTotal ?? 0} disp.)`;
      if (estado === 'confirmado_opcional') return 'Confirmado';
      if (estado === 'parcial_opcional') return 'Parcial';
      return this.labelEstadoItem(it.estado);
    }
    return it.mensaje ?? this.labelEstadoItem(it.estado);
  }

  readonly conceptos = computed(() => {
    const idP = this.idPropuestaFiltro();
    const base = this.evaluaciones();
    const seleccion = idP ? base.filter(e => e.idPropuesta === idP) : base;
    return seleccion.flatMap(e => e.conceptos.map(c => ({ ...c, idPropuesta: e.idPropuesta })));
  });

  /** Pool consolidado (ticket C): se usa en modo agregado para no duplicar ítems entre propuestas. */
  readonly itemsConsolidados = computed(() => this.comparacion().itemsConsolidados ?? []);

  /** Ítems obligatorios del pool (Propuesta Técnica). */
  readonly itemsObligatorios = computed(() => this.itemsConsolidados().filter(i => !i.esOpcional));

  /** Ítems opcionales del pool (sección Opcionales de cada propuesta). */
  readonly itemsOpcionales = computed(() => this.itemsConsolidados().filter(i => i.esOpcional));

  /** Opcionales filtrados por la propuesta seleccionada (modo single propuesta). */
  readonly itemsOpcionalesPropuesta = computed(() => {
    const idP = this.idPropuestaFiltro();
    if (!idP) return [];
    return this.itemsOpcionales().filter(i => i.enPropuestas.includes(idP));
  });

  /** True si debemos mostrar el pool consolidado en vez del desglose por propuesta. */
  readonly usarPoolConsolidado = computed(() =>
    this.propuestas().length > 1 && !this.idPropuestaFiltro() && this.itemsConsolidados().length > 0,
  );

  readonly insights = computed(() => {
    const idP = this.idPropuestaFiltro();
    const base = this.evaluaciones();
    const seleccion = idP ? base.filter(e => e.idPropuesta === idP) : base;
    return seleccion.flatMap(e => e.insights.map(i => ({ ...i, idPropuesta: e.idPropuesta })));
  });

  readonly conteoTodas = computed(() => this.todosCampos().length);
  readonly conteoDiscrepancias = computed(() => this.todosCampos().filter(c => c.severidad !== 'ok').length);
  readonly conteoCoincidentes = computed(() => this.todosCampos().filter(c => c.severidad === 'ok').length);

  onCerrar(): void { this.cerrar.emit(); }
  cambiarTab(t: Tab): void { this.tab.set(t); }

  claseSeveridad(sev: string): string {
    return ({ ok: 'sev--ok', advertencia: 'sev--adv', critico: 'sev--crit', sin_dato: 'sev--neutro' } as Record<string, string>)[sev] ?? 'sev--neutro';
  }

  iconoSeveridad(sev: string): string {
    switch (sev) {
      case 'ok':          return 'check_circle';
      case 'advertencia': return 'warning';
      case 'critico':     return 'error';
      default:            return 'help';
    }
  }

  labelSeveridad(sev: string): string {
    return ({ ok: 'Coincidencia', advertencia: 'Diferencia menor', critico: 'Observación crítica', sin_dato: 'Sin dato' } as Record<string, string>)[sev] ?? sev;
  }

  // ─── Helpers para desglose por concepto ──────────────────────────────────

  /** Mapea el estado de concepto a la misma clase de severidad que la tabla de comparación. */
  dotEstadoConcepto(estado: string): string {
    return ({
      coincide:         'sev--ok',
      monto_distinto:   'sev--adv',
      falta_en_oc:      'sev--crit',
      adicional_en_oc:  'sev--neutro',
    } as Record<string, string>)[estado] ?? 'sev--neutro';
  }

  iconoEstadoConcepto(estado: string): string {
    switch (estado) {
      case 'coincide':        return 'check_circle';
      case 'monto_distinto':  return 'warning';
      case 'falta_en_oc':     return 'error';
      case 'adicional_en_oc': return 'info';
      default:                return 'help';
    }
  }

  labelEstadoConcepto(estado: string): string {
    return ({
      coincide:         'Coincide',
      monto_distinto:   'Monto distinto',
      falta_en_oc:      'Falta en OC',
      adicional_en_oc:  'Adicional en OC',
    } as Record<string, string>)[estado] ?? estado;
  }

  diferenciaConcepto(montoOc: number | null | undefined, montoPropuesta: number | null | undefined): number | null {
    if (montoOc == null || montoPropuesta == null) return null;
    return montoOc - montoPropuesta;
  }

  formatearMonto(monto: number | null | undefined): string {
    if (monto == null) return '—';
    const s = this.monedaSimbolo();
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`.trim();
  }

  // ─── Dictamen (desde la primera evaluación IA) ───────────────────────────

  readonly dictamenPrimario = computed(() => {
    const ev = this.evaluaciones()[0];
    if (!ev?.dictamen) return null;
    return { texto: ev.dictamen, confianza: ev.confianza, motor: ev.motor };
  });
}
