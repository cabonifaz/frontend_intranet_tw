import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
  effect, input, output, signal, viewChild,
} from '@angular/core';

/**
 * Editor WYSIWYG simple para cuerpo de correos. Usa un div `contenteditable`
 * + toolbar con comandos nativos (`document.execCommand`). Suficiente para
 * negrita, cursiva, subrayado, listas, enlace y deshacer/rehacer.
 *
 * Input `html` establece el contenido; output `htmlChange` emite el HTML
 * del div cada vez que el usuario escribe. Pensado para usarse con signals
 * (sin ngModel) para evitar bucles de actualización.
 */
@Component({
  selector: 'app-editor-correo',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ec-toolbar">
      <button type="button" class="ec-btn" title="Negrita (Ctrl+B)" (mousedown)="aplicar($event, 'bold')">
        <span class="material-symbols-outlined">format_bold</span>
      </button>
      <button type="button" class="ec-btn" title="Cursiva (Ctrl+I)" (mousedown)="aplicar($event, 'italic')">
        <span class="material-symbols-outlined">format_italic</span>
      </button>
      <button type="button" class="ec-btn" title="Subrayado (Ctrl+U)" (mousedown)="aplicar($event, 'underline')">
        <span class="material-symbols-outlined">format_underlined</span>
      </button>
      <span class="ec-sep"></span>
      <button type="button" class="ec-btn" title="Lista con viñetas" (mousedown)="aplicar($event, 'insertUnorderedList')">
        <span class="material-symbols-outlined">format_list_bulleted</span>
      </button>
      <button type="button" class="ec-btn" title="Lista numerada" (mousedown)="aplicar($event, 'insertOrderedList')">
        <span class="material-symbols-outlined">format_list_numbered</span>
      </button>
      <span class="ec-sep"></span>
      <button type="button" class="ec-btn" title="Insertar enlace" (mousedown)="insertarEnlace($event)">
        <span class="material-symbols-outlined">link</span>
      </button>
      <button type="button" class="ec-btn" title="Quitar formato" (mousedown)="aplicar($event, 'removeFormat')">
        <span class="material-symbols-outlined">format_clear</span>
      </button>
      <span class="ec-sep"></span>
      <button type="button" class="ec-btn" title="Deshacer (Ctrl+Z)" (mousedown)="aplicar($event, 'undo')">
        <span class="material-symbols-outlined">undo</span>
      </button>
      <button type="button" class="ec-btn" title="Rehacer (Ctrl+Y)" (mousedown)="aplicar($event, 'redo')">
        <span class="material-symbols-outlined">redo</span>
      </button>
    </div>
    <div #editable class="ec-editor"
         contenteditable="true"
         [attr.data-placeholder]="placeholder()"
         (input)="onInput()"
         (paste)="onPaste($event)"></div>
  `,
  styleUrl: './editor-correo.component.scss',
})
export class EditorCorreoComponent implements AfterViewInit, OnDestroy {
  readonly html         = input<string>('');
  readonly placeholder  = input<string>('Escribe aquí...');
  readonly htmlChange   = output<string>();

  private readonly ref = viewChild.required<ElementRef<HTMLDivElement>>('editable');
  private readonly interno = signal<string>('');

  constructor() {
    // Sincroniza el html externo con el div, solo si el usuario no es la fuente del cambio.
    effect(() => {
      const incoming = this.html();
      if (incoming === this.interno()) return;
      const el = this.ref().nativeElement;
      if (el) {
        el.innerHTML = incoming;
        this.interno.set(incoming);
      }
    });
  }

  ngAfterViewInit(): void {
    this.ref().nativeElement.innerHTML = this.html();
    this.interno.set(this.html());
  }

  ngOnDestroy(): void { /* nada que limpiar */ }

  onInput(): void {
    const html = this.ref().nativeElement.innerHTML;
    this.interno.set(html);
    this.htmlChange.emit(html);
  }

  /** Pegar solo texto plano para evitar que el usuario traiga HTML sucio. */
  onPaste(e: ClipboardEvent): void {
    const texto = e.clipboardData?.getData('text/plain');
    if (texto === undefined) return;
    e.preventDefault();
    document.execCommand('insertText', false, texto);
  }

  aplicar(e: MouseEvent, comando: string): void {
    e.preventDefault();   // mantiene el foco en el div
    this.ref().nativeElement.focus();
    document.execCommand(comando, false);
    this.onInput();
  }

  insertarEnlace(e: MouseEvent): void {
    e.preventDefault();
    this.ref().nativeElement.focus();
    const url = prompt('URL del enlace:', 'https://');
    if (!url) return;
    document.execCommand('createLink', false, url);
    this.onInput();
  }
}
