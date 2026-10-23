import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExpedientesDigitalesService } from '../../../../core/services/expedientes-digitales.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  DocumentoExpedienteDto,
  DocumentosExpedienteDto,
  FiltrosDocumentosExpedienteDto,
} from '../../../../core/models/expedientes-digitales.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';

/** HU-31 — Modal Repositorio Consolidado de Documentos del Expediente. */
@Component({
  selector: 'app-modal-repositorio-documentos',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-repositorio-documentos.component.html',
  styleUrl: './modal-repositorio-documentos.component.scss',
})
export class ModalRepositorioDocumentosComponent implements OnInit {
  private readonly svc   = inject(ExpedientesDigitalesService);
  private readonly toast = inject(ToastService);

  readonly idExpediente     = input.required<number>();
  readonly numeroExpediente = input<string>('');
  readonly cerrar           = output<void>();

  readonly cargando  = signal(true);
  readonly data      = signal<DocumentosExpedienteDto | null>(null);
  readonly exportando = signal(false);

  // Filtros
  readonly tabActivo = signal<string>('todos');
  readonly busqueda  = signal<string>('');
  readonly desde     = signal<string>('');
  readonly hasta     = signal<string>('');
  readonly formato   = signal<string>('');

  readonly documentosFiltrados = computed<DocumentoExpedienteDto[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.documentos;
  });

  async ngOnInit(): Promise<void> { await this.cargar(); }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const f: FiltrosDocumentosExpedienteDto = {
        categoria: this.tabActivo() || 'todos',
        busqueda:  this.busqueda() || undefined,
        desde:     this.desde() || undefined,
        hasta:     this.hasta() || undefined,
        formato:   this.formato() || undefined,
      };
      this.data.set(await this.svc.obtenerDocumentos(this.idExpediente(), f));
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo cargar los documentos.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(codigo: string): void {
    this.tabActivo.set(codigo);
    void this.cargar();
  }

  aplicarFiltros(): void { void this.cargar(); }

  async exportar(): Promise<void> {
    this.exportando.set(true);
    try {
      const blob = await this.svc.descargarDocumentosXlsx(this.idExpediente(), {
        categoria: this.tabActivo() || 'todos',
        busqueda:  this.busqueda() || undefined,
        desde:     this.desde() || undefined,
        hasta:     this.hasta() || undefined,
        formato:   this.formato() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_${this.numeroExpediente() || this.idExpediente()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo exportar la lista.');
    } finally {
      this.exportando.set(false);
    }
  }

  async previsualizar(doc: DocumentoExpedienteDto): Promise<void> {
    if (!doc.previsualizable) return;
    try {
      const blob = await this.svc.obtenerArchivoDocumento(this.idExpediente(), doc.clave, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo abrir el documento.');
    }
  }

  async descargar(doc: DocumentoExpedienteDto): Promise<void> {
    if (!doc.descargable) return;
    try {
      const blob = await this.svc.obtenerArchivoDocumento(this.idExpediente(), doc.clave, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombreArchivo || doc.nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.error((e as Error).message || 'No se pudo descargar el documento.');
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Helpers UI ─────────────────────────────────────────────────────

  /** Icono + color del badge del archivo según su formato. */
  iconoFormato(formato?: string | null, tipoContenido?: string | null): string {
    const f = (formato || '').toLowerCase();
    const mime = (tipoContenido || '').toLowerCase();
    if (f === 'pdf' || mime.includes('pdf')) return 'picture_as_pdf';
    if (f === 'xlsx' || f === 'xls' || mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (f === 'docx' || f === 'doc' || mime.includes('word')) return 'description';
    if (f === 'eml' || mime.includes('message')) return 'mail';
    if (f === 'jpg' || f === 'jpeg' || f === 'png' || mime.includes('image')) return 'image';
    return 'draft';
  }

  colorFormato(formato?: string | null): string {
    const f = (formato || '').toLowerCase();
    if (f === 'pdf')  return 'rojo';
    if (f === 'xlsx' || f === 'xls') return 'verde';
    if (f === 'docx' || f === 'doc') return 'azul';
    if (f === 'eml') return 'azul';
    if (f === 'jpg' || f === 'jpeg' || f === 'png') return 'ambar';
    return 'neutro';
  }

  /** Label legible del rol del documento (Pedido 6). */
  labelRolDocumento(rol?: string | null): string {
    switch ((rol ?? '').toLowerCase()) {
      case 'generada':         return 'Generada';
      case 'comunicacion':     return 'Comunicación';
      case 'adjunto_cliente':  return 'Adjunto cliente';
      case 'documento_origen': return 'Documento origen';
      case 'habilitacion':     return 'Habilitación';
      case 'induccion':        return 'Inducción';
      case 'certificado':      return 'Certificado';
      case 'evidencia':        return 'Evidencia';
      case 'otro':             return 'Otro';
      default:                 return rol ?? '';
    }
  }

  /** Color pastel del chip del rol del documento. */
  colorRolDocumento(rol?: string | null): string {
    switch ((rol ?? '').toLowerCase()) {
      case 'generada':         return 'verde';   // PDF del sistema → OK
      case 'certificado':      return 'verde';
      case 'documento_origen': return 'azul';    // PDF del cliente
      case 'comunicacion':     return 'cian';    // correos
      case 'adjunto_cliente':  return 'violeta';
      case 'habilitacion':     return 'ambar';   // SSOMA
      case 'induccion':        return 'ambar';
      case 'evidencia':        return 'ambar';
      case 'otro':             return 'neutro';
      default:                 return 'neutro';
    }
  }

  /** Color del chip de origen según el módulo. */
  colorOrigen(modulo?: string | null): string {
    const m = (modulo || '').toLowerCase();
    if (m.includes('rq') || m.includes('requer')) return 'azul';
    if (m.includes('prop')) return 'violeta';
    if (m.includes('vb') || m.includes('visto')) return 'violeta';
    if (m.includes('seg')) return 'cian';
    if (m.includes('oc') || m.includes('compra')) return 'ambar';
    if (m.includes('os') || m.includes('servicio')) return 'verde';
    if (m.includes('ssoma')) return 'rojo';
    return 'neutro';
  }

  formatearTamano(bytes?: number | null): string {
    if (bytes == null || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatearFecha(f?: string | null): string {
    if (!f) return '—';
    const d = new Date(f);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  }

  iniciales(nombre?: string | null): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }
}
