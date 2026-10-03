import { Component } from '@angular/core';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import {
  variantEstadoPropuesta,
  variantEstadoRq,
  variantPrioridad,
  variantSla,
  variantTipoPropuesta,
} from '../../core/utils/estado-visual';

interface Paleta {
  nombre:  string;
  tokenBase: string;
  tonos:   { label: string; var: string }[];
}

@Component({
  selector: 'app-styleguide',
  imports: [ButtonComponent, BadgeComponent],
  templateUrl: './styleguide.component.html',
  styleUrl: './styleguide.component.scss',
})
export class StyleguideComponent {
  readonly paletas: Paleta[] = [
    {
      nombre: 'Primary (azul · acción principal)',
      tokenBase: 'primary',
      tonos: [
        { label: '50',  var: '--tw-primary-50'  },
        { label: '100', var: '--tw-primary-100' },
        { label: '200', var: '--tw-primary-200' },
        { label: '300', var: '--tw-primary-300' },
        { label: '500 ★', var: '--tw-primary-500' },
        { label: '600', var: '--tw-primary-600' },
        { label: '700', var: '--tw-primary-700' },
        { label: '900', var: '--tw-primary-900' },
      ],
    },
    {
      nombre: 'Neutral (grises · texto, bordes, fondos)',
      tokenBase: 'neutral',
      tonos: [
        { label: '50',  var: '--tw-neutral-50'  },
        { label: '100', var: '--tw-neutral-100' },
        { label: '200', var: '--tw-neutral-200' },
        { label: '300', var: '--tw-neutral-300' },
        { label: '400', var: '--tw-neutral-400' },
        { label: '500', var: '--tw-neutral-500' },
        { label: '600', var: '--tw-neutral-600' },
        { label: '700', var: '--tw-neutral-700' },
        { label: '800', var: '--tw-neutral-800' },
        { label: '900 ★', var: '--tw-neutral-900' },
      ],
    },
    {
      nombre: 'Danger (rojo · eliminar, anular, errores)',
      tokenBase: 'danger',
      tonos: [
        { label: '50',  var: '--tw-danger-50'  },
        { label: '100', var: '--tw-danger-100' },
        { label: '200', var: '--tw-danger-200' },
        { label: '500 ★', var: '--tw-danger-500' },
        { label: '600', var: '--tw-danger-600' },
        { label: '700', var: '--tw-danger-700' },
      ],
    },
    {
      nombre: 'Success (verde · aprobar, completado)',
      tokenBase: 'success',
      tonos: [
        { label: '50',  var: '--tw-success-50'  },
        { label: '100', var: '--tw-success-100' },
        { label: '200', var: '--tw-success-200' },
        { label: '500 ★', var: '--tw-success-500' },
        { label: '600', var: '--tw-success-600' },
        { label: '700', var: '--tw-success-700' },
      ],
    },
    {
      nombre: 'Warning (ámbar · advertencia, SLA próximo)',
      tokenBase: 'warning',
      tonos: [
        { label: '50',  var: '--tw-warning-50'  },
        { label: '100', var: '--tw-warning-100' },
        { label: '200', var: '--tw-warning-200' },
        { label: '500 ★', var: '--tw-warning-500' },
        { label: '600', var: '--tw-warning-600' },
        { label: '700', var: '--tw-warning-700' },
      ],
    },
    {
      nombre: 'Info (celeste · nuevo, informativo)',
      tokenBase: 'info',
      tonos: [
        { label: '50',  var: '--tw-info-50'  },
        { label: '100', var: '--tw-info-100' },
        { label: '200', var: '--tw-info-200' },
        { label: '500 ★', var: '--tw-info-500' },
        { label: '600', var: '--tw-info-600' },
        { label: '700', var: '--tw-info-700' },
      ],
    },
    {
      nombre: 'Marca TW (identidad)',
      tokenBase: 'brand',
      tonos: [
        { label: 'primary',       var: '--tw-brand-primary' },
        { label: 'primary-dark',  var: '--tw-brand-primary-dark' },
        { label: 'accent (rojo)', var: '--tw-brand-accent' },
        { label: 'panel',         var: '--tw-brand-panel' },
      ],
    },
  ];

  readonly aliases = [
    { nombre: 'text-primary',   var: '--tw-text-primary',   descripcion: 'Default · títulos, labels' },
    { nombre: 'text-secondary', var: '--tw-text-secondary', descripcion: 'Texto cuerpo' },
    { nombre: 'text-muted',     var: '--tw-text-muted',     descripcion: 'Placeholders, hints' },
    { nombre: 'text-inverse',   var: '--tw-text-inverse',   descripcion: 'Sobre fondos oscuros' },
    { nombre: 'text-link',      var: '--tw-text-link',      descripcion: 'Enlaces' },
    { nombre: 'bg-base',        var: '--tw-bg-base',        descripcion: 'Cards, inputs' },
    { nombre: 'bg-surface',     var: '--tw-bg-surface',     descripcion: 'Página, zonas secundarias' },
    { nombre: 'bg-elevated',    var: '--tw-bg-elevated',    descripcion: 'Modales, dropdowns' },
    { nombre: 'border-light',   var: '--tw-border-light',   descripcion: 'Separadores sutiles' },
    { nombre: 'border-base',    var: '--tw-border-base',    descripcion: 'Inputs, cards' },
    { nombre: 'border-strong',  var: '--tw-border-strong',  descripcion: 'Inputs activos' },
  ];

  readonly variantsBoton = [
    'primary', 'secondary', 'ghost', 'danger', 'danger-ghost',
    'success', 'dark', 'warning', 'link', 'dashed',
  ] as const;

  readonly tamanosBoton  = ['xs', 'sm', 'md', 'lg'] as const;
  readonly variantsBadge = ['info', 'success', 'danger', 'warning', 'neutral', 'dark', 'morado'] as const;

  readonly estadosRq         = ['nuevo', 'en_proceso', 'con_propuesta', 'cerrado', 'anulado'];
  readonly estadosPropuesta  = ['borrador', 'pendiente', 'por_vb', 'por_enviar', 'en_seguimiento', 'aceptada', 'rechazada', 'por_consolidar'];
  readonly prioridades       = [{ id: 1, label: 'ALTA' }, { id: 2, label: 'MEDIA' }, { id: 3, label: 'BAJA' }];
  readonly tiposPropuesta    = ['servicio', 'mixta', 'proyecto'];
  readonly slas              = [{ dias: -5, label: '5d vencido' }, { dias: 2, label: '2d restantes' }, { dias: 15, label: '15d restantes' }];

  // Helpers
  readonly variantEstadoRq        = variantEstadoRq;
  readonly variantEstadoPropuesta = variantEstadoPropuesta;
  readonly variantPrioridad       = variantPrioridad;
  readonly variantSla             = variantSla;
  readonly variantTipoPropuesta   = variantTipoPropuesta;

  copiarAlPortapapeles(texto: string): void {
    void navigator.clipboard?.writeText(texto);
  }
}
