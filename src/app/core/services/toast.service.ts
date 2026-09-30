import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id:      number;
  mensaje: string;
  tipo:    'exito' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  private nextId  = 0;

  exito(mensaje: string, duracion = 3500): void {
    this._agregar(mensaje, 'exito', duracion);
  }

  error(mensaje: string, duracion = 5000): void {
    this._agregar(mensaje, 'error', duracion);
  }

  cerrar(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  private _agregar(mensaje: string, tipo: ToastItem['tipo'], duracion: number): void {
    const id = ++this.nextId;
    this.toasts.update(t => [...t, { id, mensaje, tipo }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
