/**
 * View module: the Obsidian tab that shows one preset in the editor. It joins
 * the preset, document, autosave and ui modules; none of them know each other.
 */
import { type App, FileView, Notice, Scope, TFile, type WorkspaceLeaf } from 'obsidian';
import { Autosave } from '../autosave';
import { PresetDocument } from '../document';
import { readPreset, writePreset } from '../preset';
import { type EditorHandle, mountEditor } from '../ui';

export const VIEW_TYPE = 'preset-editor';

/** Opens `file` in the Preset Editor, in the current tab. */
export async function openPresetEditor(app: App, file: TFile): Promise<void> {
	await app.workspace.getLeaf(false).setViewState({ type: VIEW_TYPE, state: { file: file.path }, active: true });
}

export class PresetEditorView extends FileView {
	navigation = true;
	private doc: PresetDocument | null = null;
	private autosave: Autosave | null = null;
	private editor: EditorHandle | null = null;
	private stopListening: (() => void) | null = null;
	/** The file's text as last read or written by this view. */
	private diskText = '';

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		// E-6: Ctrl/Cmd+Z brings back the last deleted prompt. Inside a text
		// box it is left to the box's own undo.
		this.scope = new Scope(this.app.scope);
		this.scope.register(['Mod'], 'z', () => {
			if (isEditing(activeDocument.activeElement)) return true;
			return !this.doc?.undo();
		});
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename ?? 'Preset Editor';
	}

	getIcon(): string {
		return 'sliders-horizontal';
	}

	canAcceptExtension(extension: string): boolean {
		return extension === 'json';
	}

	onload(): void {
		super.onload();
		// The file on disk always wins (DECISIONS.md, 2026-10-10).
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file === this.file && file instanceof TFile) void this.reloadFromDisk(file);
			}),
		);
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.diskText = await this.app.vault.read(file);
		const content = readPreset(this.diskText);
		if (!content) {
			new Notice(`${file.name} isn't a valid preset and can't be opened.`);
			return;
		}
		const doc = new PresetDocument(content);
		const autosave = new Autosave(
			async () => {
				await this.app.vault.process(file, (text) => (this.diskText = writePreset(text, doc.content)));
			},
			(status) => {
				this.editor?.setStatus(status);
				if (status === 'error') new Notice(`Couldn't save ${file.name}.`);
			},
		);
		this.doc = doc;
		this.autosave = autosave;
		this.stopListening = doc.onChange((cause) => {
			if (cause === 'edit') autosave.schedule();
		});

		this.contentEl.empty();
		this.contentEl.setCssStyles({ padding: '0', overflow: 'hidden' });
		const header = this.containerEl.querySelector<HTMLElement>('.view-header .view-actions') ?? this.contentEl;
		this.editor = mountEditor(this.contentEl, header, doc, file.basename);
	}

	async onUnloadFile(_file: TFile): Promise<void> {
		await this.autosave?.flush();
		this.stopListening?.();
		this.editor?.destroy();
		this.contentEl.empty();
		this.doc = this.autosave = this.editor = this.stopListening = null;
	}

	/** Replaces the editor's content with the file's, dropping any unsaved edit. */
	private async reloadFromDisk(file: TFile): Promise<void> {
		const text = await this.app.vault.read(file);
		if (text === this.diskText || !this.doc) return;
		this.diskText = text;
		this.autosave?.cancel();
		const content = readPreset(text);
		if (content) {
			this.doc.load(content);
			return;
		}
		new Notice(`${file.name} is no longer a valid preset and can't be shown.`);
		this.stopListening?.();
		this.editor?.destroy();
		this.contentEl.empty();
		this.doc = this.autosave = this.editor = this.stopListening = null;
	}

	async onRename(file: TFile): Promise<void> {
		await super.onRename(file);
		this.editor?.setTitle(file.basename);
	}
}

function isEditing(el: Element | null): boolean {
	if (!el) return false;
	return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.closest('[contenteditable="true"]') !== null;
}
