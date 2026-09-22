import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb              = inject(FormBuilder);
  private readonly router          = inject(Router);
  private readonly autenticacionSvc = inject(AutenticacionService);

  readonly mostrarContrasena = signal(false);
  readonly cargando          = signal(false);
  readonly errorMensaje      = signal('');

  readonly formulario = this.fb.group({
    correo:     ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    recordarme: [false],
  });

  get correo()     { return this.formulario.get('correo')!; }
  get contrasena() { return this.formulario.get('contrasena')!; }

  ngOnInit(): void {
    if (this.autenticacionSvc.estaAutenticado()) {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleContrasena(): void {
    this.mostrarContrasena.update(v => !v);
  }

  async enviar(): Promise<void> {
    if (this.formulario.invalid || this.cargando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.errorMensaje.set('');
    this.cargando.set(true);

    try {
      const { correo, contrasena, recordarme } = this.formulario.getRawValue();
      await this.autenticacionSvc.iniciarSesion(
        { correo: correo!, contrasena: contrasena! },
        recordarme!
      );
      this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      this.errorMensaje.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }
}
