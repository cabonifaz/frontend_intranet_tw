import { Component, DestroyRef, computed, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { AutenticacionService } from '../../../../../core/services/autenticacion.service';
import { MaestrosService } from '../../../../../core/services/maestros.service';
import { PropuestasService } from '../../../../../core/services/propuestas.service';
import { CatalogoItem, ContactoListaItem, ClienteListaItem } from '../../../../../core/models/maestros.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { CampoComponent } from '../../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../../shared/ui/toggle/toggle.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DetalleRequerimientoComponent } from '../../../requerimientos/detalle-requerimiento/detalle-requerimiento.component';

type SeccionKey =
  | 'configuracion' | 'propuesta' | 'opcionales' | 'detalle' | 'recomendaciones'
  | 'formaPago' | 'suministrosCliente' | 'condicionesServicio' | 'listadoEquipos';

interface SeccionConfig {
  key:         SeccionKey;
  numero:      number;
  label:       string;
  obligatoria: boolean;
}

// Secciones que SIEMPRE deben ir en la propuesta (no se pueden desactivar)
const OBLIGATORIAS: SeccionKey[] = ['configuracion', 'propuesta', 'formaPago', 'listadoEquipos'];

@Component({
  selector: 'app-seccion-configuracion',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, SeccionComponent, CampoComponent, ToggleComponent, ButtonComponent, DetalleRequerimientoComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
})
export class ConfiguracionComponent implements OnInit {
  readonly draftSvc = inject(PropuestaDraftService);
  private readonly fb       = inject(FormBuilder);
  private readonly authSvc  = inject(AutenticacionService);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly propuestasSvc = inject(PropuestasService);
  private readonly destroyRef = inject(DestroyRef);

  /** id del RQ cuando el usuario pide ver su origen (abre DetalleRequerimientoComponent como modal). */
  readonly idRqAbierto = signal<number | null>(null);

  // Observación 15 v4 (feedback 2026-11-03): autocomplete inline para el tercero.
  // Al escribir en el input, se consulta el back con debounce de 300 ms y se
  // muestra el dropdown con los clientes coincidentes.
  readonly busquedaTercero      = signal('');
  readonly busquedaTerceroFoco  = signal(false);
  readonly buscandoTercero      = signal(false);
  readonly sugerenciasTercero   = signal<ClienteListaItem[]>([]);
  private busquedaTerceroDebounce: number | null = null;

  readonly SECCIONES: SeccionConfig[] = [
    { key: 'configuracion',       numero: 1, label: 'Configuración',         obligatoria: true  },
    { key: 'propuesta',           numero: 2, label: 'Propuesta',             obligatoria: true  },
    { key: 'opcionales',          numero: 3, label: 'Opcionales',            obligatoria: false },
    { key: 'detalle',             numero: 4, label: 'Detalle (Textos Base)', obligatoria: false },
    { key: 'recomendaciones',     numero: 5, label: 'Recomendaciones',       obligatoria: false },
    { key: 'formaPago',           numero: 6, label: 'Forma de Pago',         obligatoria: true  },
    { key: 'suministrosCliente',  numero: 7, label: 'Suministros Cliente',   obligatoria: false },
    { key: 'condicionesServicio', numero: 8, label: 'Condiciones',           obligatoria: false },
    { key: 'listadoEquipos',      numero: 9, label: 'Listado de Equipos',    obligatoria: true  },
  ];

  /**
   * Catálogo TIPO_PROPUESTA (106) cargado desde el back (observación 10, 31/10).
   * Cada ítem incluye `num2` donde 1 = "solo disponible si el RQ entra al sistema de acreditación".
   * El checkbox `es_inacal` del RQ es la fuente de verdad: si no está marcado, la opción con `num2=1`
   * (ej. "Servicio metrológico") no aparece en el dropdown de la propuesta.
   */
  readonly tiposPropuestaCatalogo = signal<CatalogoItem[]>([]);

  readonly tiposPropuestaDisponibles = computed(() => {
    const esAcred = this.draftSvc.draft().esAcreditacionRq;
    return this.tiposPropuestaCatalogo().filter(t => esAcred || t.num2 !== 1);
  });

  /**
   * Contactos del cliente para el dropdown "Dirigido a" (observación 11, 31/10).
   * Al seleccionar uno, se autocompleta el correo debajo del campo.
   */
  readonly contactosCliente = signal<ContactoListaItem[]>([]);

  readonly contactoSeleccionado = computed(() => {
    const id = this.draftSvc.draft().idContacto;
    if (!id) return null;
    return this.contactosCliente().find(c => c.idContacto === id) ?? null;
  });

  /** Correo del contacto seleccionado (se muestra debajo del dropdown). */
  readonly correoDirigidoA = computed(() => this.contactoSeleccionado()?.correo ?? '');

  /** Guard para que el fallback de sincronización RQ → draft (observación 12) se ejecute solo una vez. */
  private yaSincronizoRq = false;
  private ultimoClienteContactos: number | null = null;

  constructor() {
    // Observación 12 (31/10): el wizard padre carga el draft asincrónicamente, por lo que al
    // montarse este componente puede que todavía no tenga los datos del RQ. Un effect reactivo
    // escucha cambios en el draft y:
    //  a) si falta la referencia pero hay idRequerimiento → la trae del back (fallback para borradores viejos)
    //  b) si el draft ya tiene datos del RQ pero el form aún muestra los campos vacíos → los sincroniza
    effect(() => {
      const d = this.draftSvc.draft();

      // (b) El wizard pobló el draft después del ngOnInit: sincronizamos el form con los valores del draft.
      if (d.idRequerimiento != null && d.referencia && !this.form.get('referencia')?.value) {
        this.form.patchValue({
          tipoPropuesta:       d.tipoPropuesta,
          responsableTecnico:  d.responsableTecnico || this.form.get('responsableTecnico')?.value,
          referencia:          d.referencia,
          textoIntroduccion:   d.introduccion || this.textoIntroduccionDefault(),
          notasGenerales:      d.notasGenerales,
          dirigidoA:           d.idContacto != null ? String(d.idContacto) : '',
        }, { emitEvent: false });
      }

      // (c) Cargar los contactos del cliente para el dropdown "Dirigido a" (observación 11).
      if (d.idCliente != null && d.idCliente !== this.ultimoClienteContactos) {
        this.ultimoClienteContactos = d.idCliente;
        this.maestrosSvc.obtenerContactosPorCliente(d.idCliente)
          .then(lista => {
            this.contactosCliente.set(lista);
            // Si el draft no tenía idContacto todavía pero el RQ sí, lo seteamos en el form.
            const idStr = d.idContacto != null ? String(d.idContacto) : '';
            if (idStr && this.form.get('dirigidoA')?.value !== idStr) {
              this.form.patchValue({ dirigidoA: idStr }, { emitEvent: false });
            }
          })
          .catch(() => this.contactosCliente.set([]));
      }

      // (a) Fallback: borrador viejo sin referencia precargada. Pedimos los datos del RQ al back
      // (observación 12).
      if (this.yaSincronizoRq)       return;
      if (d.idRequerimiento == null) return;
      if (d.referencia)              return;
      this.yaSincronizoRq = true;
      this.propuestasSvc.obtenerDatosNueva(d.idRequerimiento).then(datos => {
        const actual = this.draftSvc.draft();
        this.draftSvc.actualizar({
          referencia:             actual.referencia || (datos.descripcion ?? ''),
          esAcreditacionRq:       actual.esAcreditacionRq || !!datos.esAcreditacion,
          condicionPagoClienteRq: actual.condicionPagoClienteRq ?? (datos.condicionPagoCliente ?? null),
          condicionPagoCodigoRq:  actual.condicionPagoCodigoRq  ?? (datos.condicionPagoCodigo  ?? null),
        });
        this.form.patchValue({ referencia: this.draftSvc.draft().referencia }, { emitEvent: false });
      }).catch(() => { this.yaSincronizoRq = false; });
    });
  }

  // ─── Form principal ───────────────────────────────────────────────────────
  readonly form = this.fb.group({
    tipoPropuesta:         [''],
    responsableTecnico:    [''],
    requiereTercerizacion: [false],
    terceroEmpresa:        [''],
    terceroRuc:            [''],
    terceroNombreComercial: [''],
    // Observación 14 (31/10): quitamos el campo "País fiscal" del Servicio Tercerizado.
    terceroDireccion:      [''],

    // Datos de la propuesta (carátula y formalidades)
    dirigidoA:             [''],
    saludoIntroduccion:    [''],
    textoIntroduccion:     [''],
    referencia:            [''],
    notasGenerales:        [''],
  });

  // Checkboxes de secciones — sync con el draft directamente
  readonly secciones = computed(() => this.draftSvc.draft().seccionesIncluidas);

  ngOnInit(): void {
    const d = this.draftSvc.draft();
    const u = this.authSvc.usuarioActual();
    const nombreUsuario = u ? `${u.nombre} ${u.apellido}`.trim() : '';
    this.form.patchValue({
      tipoPropuesta:         d.tipoPropuesta,
      responsableTecnico:    d.responsableTecnico || nombreUsuario,
      requiereTercerizacion: d.requiereTercerizacion,
      terceroEmpresa:        d.terceroEmpresa,
      terceroRuc:            d.terceroRuc,
      terceroDireccion:      d.terceroDireccion,
      dirigidoA:             d.contacto,
      textoIntroduccion:     d.introduccion || this.textoIntroduccionDefault(),
      referencia:            d.referencia,
      notasGenerales:        d.notasGenerales,
    }, { emitEvent: false });

    // Observación 10: catálogo TIPO_PROPUESTA desde back (num2=1 → solo si RQ con acreditación).
    this.maestrosSvc.obtenerCatalogo('TIPO_PROPUESTA')
      .then(items => this.tiposPropuestaCatalogo.set(items))
      .catch(() => this.tiposPropuestaCatalogo.set([]));

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
      // Observación 11: dirigidoA guarda el id del contacto. Actualizamos también el nombre (`contacto`)
      // del draft para que el texto de la introducción use el nombre correcto.
      const idC = v.dirigidoA ? Number(v.dirigidoA) : null;
      const cSel = idC ? this.contactosCliente().find(c => c.idContacto === idC) : null;
      this.draftSvc.actualizar({
        tipoPropuesta:         v.tipoPropuesta ?? '',
        responsableTecnico:    v.responsableTecnico ?? '',
        requiereTercerizacion: !!v.requiereTercerizacion,
        terceroEmpresa:        v.terceroEmpresa ?? '',
        terceroRuc:            v.terceroRuc ?? '',
        terceroDireccion:      v.terceroDireccion ?? '',
        referencia:            v.referencia ?? '',
        introduccion:          v.textoIntroduccion ?? '',
        notasGenerales:        v.notasGenerales ?? '',
        idContacto:            idC,
        contacto:              cSel?.nombres ?? this.draftSvc.draft().contacto,
        correoContacto:        cSel?.correo ?? null,
      });
    });
  }

  esObligatoria(key: SeccionKey): boolean {
    return OBLIGATORIAS.includes(key);
  }

  // ─── Checkboxes de secciones ──────────────────────────────────────────────
  toggleSeccion(key: SeccionKey): void {
    // Las obligatorias nunca se pueden desactivar
    if (this.esObligatoria(key)) return;
    const current = this.draftSvc.draft().seccionesIncluidas;
    this.draftSvc.actualizar({
      seccionesIncluidas: { ...current, [key]: !current[key] },
    });
  }

  restaurarDefault(): void {
    this.draftSvc.actualizar({
      seccionesIncluidas: {
        configuracion:        true,   // obligatoria
        propuesta:            true,   // obligatoria
        opcionales:           true,
        detalle:              true,
        recomendaciones:      true,
        formaPago:            true,   // obligatoria
        suministrosCliente:   true,
        condicionesServicio:  true,
        listadoEquipos:       true,   // obligatoria
      },
    });
  }

  // ─── Ver origen del RQ (abre modal DetalleRequerimiento) ─────────────────
  verOrigenRq(): void {
    const id = this.draftSvc.draft().idRequerimiento;
    if (id) this.idRqAbierto.set(id);
  }

  cerrarRq(): void { this.idRqAbierto.set(null); }

  cambiarResponsable(): void {
    console.log('[configuracion] abrir modal cambiar responsable');
  }

  // ─── Carátula PDF ─────────────────────────────────────────────────────────
  verCaratulaPdf(): void {
    console.log('[configuracion] vista previa carátula PDF');
  }

  // ─── Observación 15 v4 (feedback 2026-11-03): autocomplete inline ──────
  onBuscarTercero(texto: string): void {
    this.busquedaTercero.set(texto);
    if (this.busquedaTerceroDebounce) clearTimeout(this.busquedaTerceroDebounce);
    if (texto.trim().length < 2) {
      this.sugerenciasTercero.set([]);
      this.buscandoTercero.set(false);
      return;
    }
    this.buscandoTercero.set(true);
    this.busquedaTerceroDebounce = setTimeout(async () => {
      try {
        const r = await this.maestrosSvc.obtenerClientes(texto.trim(), 'Activo', 1, 10);
        this.sugerenciasTercero.set(r.items);
      } catch {
        this.sugerenciasTercero.set([]);
      } finally {
        this.buscandoTercero.set(false);
      }
    }, 300) as unknown as number;
  }

  /** Blur con retraso para que el `mousedown` en la sugerencia alcance a dispararse. */
  onBlurBusquedaTercero(): void {
    setTimeout(() => this.busquedaTerceroFoco.set(false), 150);
  }

  async seleccionarTercero(c: ClienteListaItem): Promise<void> {
    this.busquedaTercero.set('');
    this.sugerenciasTercero.set([]);
    this.busquedaTerceroFoco.set(false);
    try {
      // Traemos el detalle para autocompletar dirección y nombre comercial.
      const detalle = await this.maestrosSvc.obtenerClientePorId(c.idCliente);
      this.draftSvc.actualizar({
        idClienteTercero: c.idCliente,
        terceroEmpresa:   detalle.razonSocial ?? c.razonSocial ?? '',
        terceroRuc:       detalle.ruc ?? c.ruc ?? '',
        terceroDireccion: detalle.domicilioFiscal ?? '',
      });
      this.form.patchValue({
        terceroRuc:              detalle.ruc ?? c.ruc ?? '',
        terceroEmpresa:          detalle.razonSocial ?? c.razonSocial ?? '',
        terceroNombreComercial:  detalle.nombreComercial ?? '',
        terceroDireccion:        detalle.domicilioFiscal ?? '',
      }, { emitEvent: false });
    } catch {
      // Fallback: al menos id + razón social + RUC quedan registrados.
      this.draftSvc.actualizar({
        idClienteTercero: c.idCliente,
        terceroEmpresa:   c.razonSocial,
        terceroRuc:       c.ruc,
      });
      this.form.patchValue({
        terceroRuc:     c.ruc,
        terceroEmpresa: c.razonSocial,
      }, { emitEvent: false });
    }
  }

  limpiarClienteTercero(): void {
    this.draftSvc.actualizar({
      idClienteTercero: null,
      terceroEmpresa:   '',
      terceroRuc:       '',
      terceroDireccion: '',
    });
    this.form.patchValue({
      terceroRuc:              '',
      terceroEmpresa:          '',
      terceroNombreComercial:  '',
      terceroDireccion:        '',
    }, { emitEvent: false });
  }

  // ─── Texto por default de la introducción ─────────────────────────────────
  private textoIntroduccionDefault(): string {
    const d = this.draftSvc.draft();
    const rq = d.codigoRequerimiento || 'su requerimiento';
    const nombre = d.contacto?.split(' ')[0] || 'cliente';
    return `Estimado ${nombre},\n\nEn atención al requerimiento ${rq} de su consideración, tenemos a bien remitirle la presente propuesta técnica y económica a brindar en sus instalaciones industriales.`;
  }
}
