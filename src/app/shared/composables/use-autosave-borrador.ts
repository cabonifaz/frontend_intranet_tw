import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { BorradorInfo, BorradorService } from '../../core/services/borrador.service';
import { ToastService } from '../../core/services/toast.service';

export interface AutosaveBorradorOptions<T = unknown> {
  /** FormGroup a observar para autoguardado. */
  form: FormGroup;
  /** DestroyRef del componente (para limpiar la subscripción). */
  destroyRef: DestroyRef;
  /** Ruta a la que redirige tras `guardarYSalir()`. */
  rutaVuelta: string;
  /**
   * Snapshot opcional del estado a guardar. Si se omite, usa `form.getRawValue()`.
   * Útil para fichas con sub-estado (ej. cliente serializa sedes/contactos temporales).
   */
  snapshotFn?: () => T;
  /**
   * Restore opcional al cargar un borrador. Si se omite, usa `form.patchValue(data)`.
   * Debe ser el inverso de `snapshotFn`.
   */
  restoreFn?: (data: T) => void;
  /** Mensajes personalizados (por defecto en español neutro). */
  mensajes?: {
    guardado?: string;
    restaurado?: string;
    descartado?: string;
    autoguardado?: string;
  };
}

export interface AutosaveBorrador<T = unknown> {
  /** Signal con el borrador detectado al llamar `activar(key)` (null si no hay). */
  readonly borradorDisponible: Signal<BorradorInfo<T> | null>;
  /** Signal true mientras se guarda el borrador vía CTA `guardarYSalir()`. */
  readonly guardandoBorrador:  Signal<boolean>;
  /**
   * Activa autoguardado y detecta borrador existente. Debe llamarse en `ngOnInit`
   * tras resolver el id de la entidad.
   * @param key Clave única del borrador. Convención: `<ficha>:<nuevo|id>`.
   */
  activar(key: string): void;
  /** Restaura el borrador detectado al formulario. */
  restaurar():      void;
  /** Elimina el borrador vía CTA explícita del usuario (muestra toast). */
  descartar():      void;
  /** Elimina el borrador silenciosamente + marca salida (ej. tras `guardar()` exitoso al back). */
  limpiarTrasGuardado(): void;
  /** Guarda el borrador vía CTA y navega a `rutaVuelta`. */
  guardarYSalir(): Promise<void>;
  /** Marca que la salida es controlada (ej. tras `guardar()` exitoso) → no mostrar toast "autoguardado" al destruir. */
  marcarSalida():   void;
  /**
   * Fuerza un snapshot inmediato (sin esperar al debounce del form).
   * Útil cuando hay cambios de estado FUERA del form que también deben persistirse
   * (ej. ficha-cliente al añadir una sede/contacto temporal).
   */
  marcarCambio():   void;
}

/**
 * Composable para gestionar autoguardado de borradores en fichas.
 * Reemplaza el bloque de ~100 líneas duplicado en las 7 fichas de la intranet.
 *
 * @example
 *   export class FichaProcedimientoComponent implements OnInit {
 *     private readonly destroyRef = inject(DestroyRef);
 *     formulario = this.fb.group({ ... });
 *
 *     readonly autosave = useAutosaveBorrador({
 *       form: this.formulario,
 *       destroyRef: this.destroyRef,
 *       rutaVuelta: '/maestros/procedimientos',
 *     });
 *
 *     async ngOnInit() {
 *       const id = this.route.snapshot.paramMap.get('id');
 *       // ...cargar detalle...
 *       this.autosave.activar(`procedimientos:${id || 'nuevo'}`);
 *     }
 *
 *     async guardar() {
 *       // ...guardar al back...
 *       this.autosave.marcarSalida();  // evita toast "autoguardado"
 *     }
 *   }
 */
export function useAutosaveBorrador<T = unknown>(opts: AutosaveBorradorOptions<T>): AutosaveBorrador<T> {
  const borradorSvc = inject(BorradorService);
  const toastSvc    = inject(ToastService);
  const router      = inject(Router);

  const borradorDisponible = signal<BorradorInfo<T> | null>(null);
  const guardandoBorrador  = signal(false);
  let key                 = '';
  let autoguardadoActivo  = false;
  let huboCambios         = false;
  let salidaControlada    = false;

  function activar(k: string): void {
    key = k;
    const existente = borradorSvc.obtener<T>(key);
    if (existente) borradorDisponible.set(existente);

    autoguardadoActivo = true;
    opts.form.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(opts.destroyRef))
      .subscribe(() => {
        if (!autoguardadoActivo || !key) return;
        const data = (opts.snapshotFn ? opts.snapshotFn() : opts.form.getRawValue()) as T;
        borradorSvc.guardar(key, data);
        huboCambios = true;
      });
  }

  function restaurar(): void {
    const draft = borradorDisponible();
    if (!draft) return;
    autoguardadoActivo = false;
    if (opts.restoreFn) {
      opts.restoreFn(draft.data);
    } else {
      opts.form.patchValue(draft.data as object, { emitEvent: false });
    }
    autoguardadoActivo = true;
    borradorDisponible.set(null);
    toastSvc.exito(opts.mensajes?.restaurado ?? 'Borrador restaurado.');
  }

  function descartar(): void {
    if (!key) return;
    borradorSvc.borrar(key);
    borradorDisponible.set(null);
    toastSvc.exito(opts.mensajes?.descartado ?? 'Borrador descartado.');
  }

  function limpiarTrasGuardado(): void {
    if (key) borradorSvc.borrar(key);
    borradorDisponible.set(null);
    salidaControlada = true;
  }

  async function guardarYSalir(): Promise<void> {
    if (!key) return;
    salidaControlada = true;
    guardandoBorrador.set(true);
    const data = (opts.snapshotFn ? opts.snapshotFn() : opts.form.getRawValue()) as T;
    borradorSvc.guardar(key, data);
    toastSvc.exito(opts.mensajes?.guardado ?? 'Borrador guardado. Puedes continuar más tarde.');
    guardandoBorrador.set(false);
    router.navigate([opts.rutaVuelta]);
  }

  function marcarSalida(): void { salidaControlada = true; }

  function marcarCambio(): void {
    if (!autoguardadoActivo || !key) return;
    const data = (opts.snapshotFn ? opts.snapshotFn() : opts.form.getRawValue()) as T;
    borradorSvc.guardar(key, data);
    huboCambios = true;
  }

  // Notificación "autoguardado" al salir sin un commit explícito.
  opts.destroyRef.onDestroy(() => {
    if (!salidaControlada && huboCambios && key && borradorSvc.tiene(key)) {
      toastSvc.exito(opts.mensajes?.autoguardado ?? 'Borrador autoguardado. Puedes volver cuando quieras para continuar.');
    }
  });

  return { borradorDisponible, guardandoBorrador, activar, restaurar, descartar, limpiarTrasGuardado, guardarYSalir, marcarSalida, marcarCambio };
}
