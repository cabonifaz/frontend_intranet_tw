import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { AutenticacionService } from '../../../../../core/services/autenticacion.service';
import { TipoPropuesta } from '../../../../../core/models/propuestas.model';
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
  imports: [ReactiveFormsModule, FormsModule, SeccionComponent, CampoComponent, ToggleComponent, ButtonComponent, DetalleRequerimientoComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
})
export class ConfiguracionComponent implements OnInit {
  readonly draftSvc = inject(PropuestaDraftService);
  private readonly fb       = inject(FormBuilder);
  private readonly authSvc  = inject(AutenticacionService);

  /** id del RQ cuando el usuario pide ver su origen (abre DetalleRequerimientoComponent como modal). */
  readonly idRqAbierto = signal<number | null>(null);

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

  readonly tiposPropuesta: { value: TipoPropuesta; label: string }[] = [
    { value: 'servicio', label: 'Servicio' },
    { value: 'mixta',    label: 'Mixta'    },
    { value: 'proyecto', label: 'Proyecto' },
  ];

  // ─── Form principal ───────────────────────────────────────────────────────
  readonly form = this.fb.group({
    tipoPropuesta:         [''],
    responsableTecnico:    [''],
    requiereTercerizacion: [false],
    terceroEmpresa:        [''],
    terceroRuc:            [''],
    terceroNombreComercial: [''],
    terceroPais:           ['Perú'],
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

    this.form.valueChanges.subscribe(v => {
      this.draftSvc.actualizar({
        tipoPropuesta:         v.tipoPropuesta as TipoPropuesta || '',
        responsableTecnico:    v.responsableTecnico ?? '',
        requiereTercerizacion: !!v.requiereTercerizacion,
        terceroEmpresa:        v.terceroEmpresa ?? '',
        terceroRuc:            v.terceroRuc ?? '',
        terceroDireccion:      v.terceroDireccion ?? '',
        referencia:            v.referencia ?? '',
        introduccion:          v.textoIntroduccion ?? '',
        notasGenerales:        v.notasGenerales ?? '',
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

  // ─── Texto por default de la introducción ─────────────────────────────────
  private textoIntroduccionDefault(): string {
    const d = this.draftSvc.draft();
    const rq = d.codigoRequerimiento || 'su requerimiento';
    const nombre = d.contacto?.split(' ')[0] || 'cliente';
    return `Estimado ${nombre},\n\nEn atención al requerimiento ${rq} de su consideración, tenemos a bien remitirle la presente propuesta técnica y económica a brindar en sus instalaciones industriales.`;
  }
}
