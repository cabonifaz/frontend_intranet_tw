import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';
import { ToastService } from '../../../core/services/toast.service';

/** Valida que contrasenaNueva === confirmarContrasena a nivel de grupo. */
function coincidenValidator(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('contrasenaNueva')?.value;
  const conf  = group.get('confirmarContrasena')?.value;
  if (!nueva || !conf) return null;
  return nueva === conf ? null : { noCoinciden: true };
}

/** Valida que contrasenaNueva !== contrasenaActual a nivel de grupo. */
function distintaDeActualValidator(group: AbstractControl): ValidationErrors | null {
  const actual = group.get('contrasenaActual')?.value;
  const nueva  = group.get('contrasenaNueva')?.value;
  if (!actual || !nueva) return null;
  return actual === nueva ? { igualALaActual: true } : null;
}

@Component({
  selector: 'app-cambiar-contrasena',
  imports: [ReactiveFormsModule],
  templateUrl: './cambiar-contrasena.component.html',
  styleUrl: './cambiar-contrasena.component.scss',
})
export class CambiarContrasenaComponent {
  private readonly fb              = inject(FormBuilder);
  private readonly router          = inject(Router);
  private readonly autenticacionSvc = inject(AutenticacionService);
  private readonly toastSvc        = inject(ToastService);

  readonly cargando          = signal(false);
  readonly errorMensaje      = signal('');
  readonly mostrarActual     = signal(false);
  readonly mostrarNueva      = signal(false);
  readonly mostrarConfirmar  = signal(false);

  readonly usuarioActual = this.autenticacionSvc.usuarioActual;

  readonly formulario = this.fb.group({
    contrasenaActual:     ['', [Validators.required]],
    // Robustez: mínimo 8 chars, al menos 1 mayúscula, 1 minúscula y 1 número
    contrasenaNueva:      ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/),
    ]],
    confirmarContrasena:  ['', [Validators.required]],
  }, { validators: [coincidenValidator, distintaDeActualValidator] });

  get actual()     { return this.formulario.get('contrasenaActual')!; }
  get nueva()      { return this.formulario.get('contrasenaNueva')!; }
  get confirmar()  { return this.formulario.get('confirmarContrasena')!; }

  toggleActual()    { this.mostrarActual.update(v => !v); }
  toggleNueva()     { this.mostrarNueva.update(v => !v); }
  toggleConfirmar() { this.mostrarConfirmar.update(v => !v); }

  async enviar(): Promise<void> {
    if (this.formulario.invalid || this.cargando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.errorMensaje.set('');
    this.cargando.set(true);

    try {
      const { contrasenaActual, contrasenaNueva } = this.formulario.getRawValue();
      await this.autenticacionSvc.cambiarContrasena({
        contrasenaActual: contrasenaActual!,
        contrasenaNueva:  contrasenaNueva!,
      });
      this.toastSvc.exito('Contraseña actualizada. Ya podés usar la plataforma.');
      this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cambiar la contraseña.';
      this.errorMensaje.set(msg);
    } finally {
      this.cargando.set(false);
    }
  }

  cerrarSesion(): void {
    this.autenticacionSvc.cerrarSesion();
  }
}
