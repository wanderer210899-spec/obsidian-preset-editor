/**
 * View module: the Obsidian tab that shows one preset in the editor. It joins
 * the preset, document, autosave and ui modules; none of them know each other.
 */
import { type App, FileView, Notice, Platform, Scope, TFile, type WorkspaceLeaf } from 'obsidian';
import { Autosave } from '../autosave';
import { PresetDocument } from '../document';
import { readPreset, writePreset } from '../preset';
import { type EditorHandle, mountEditor } from '../ui';

export const VIEW_TYPE = 'preset-editor';

/**
 * Opens `file` in the Preset Editor: in the current tab (F-4), or in a new
 * tab (L-7). A preset already open in a tab is shown there instead.
 */
export async function openPresetEditor(app: App, file: TFile, newTab = false): Promise<void> {
	if (newTab) {
		const open = app.workspace.getLeavesOfType(VIEW_TYPE).find((leaf) => leaf.view instanceof PresetEditorView && leaf.view.file === file);
		if (open) {
			app.workspace.setActiveLeaf(open, { focus: true });
			await app.workspace.revealLeaf(open);
			return;
		}
	}
	await app.workspace.getLeaf(newTab ? 'tab' : false).setViewState({ type: VIEW_TYPE, state: { file: file.path }, active: true });
}

export class PresetEditorView extends FileView {
	navigation = true;
	private doc: PresetDocument | null = null;
	private autosave: Autosave | null = null;
	private editor: EditorHandle | null = null;
	private stopListening: (() => void) | null = null;
	/** The file's text as last read or written by this view. */
	private diskText = '';

	constructor(
		leaf: WorkspaceLeaf,
		/** W-5: the "Auto complete" setting when the editor opens. */
		private readonly autoComplete: () => boolean,
	) {
		super(leaf);
		// E-6: one undo timeline for the whole preset, text boxes included.
		this.scope = new Scope(this.app.scope);
		const run = (action: (editor: EditorHandle) => void) => () => {
			if (!this.editor) return true;
			action(this.editor);
			return false;
		};
		this.scope.register(['Mod'], 'z', run((e) => e.undo()));
		this.scope.register(['Mod', 'Shift'], 'z', run((e) => e.redo()));
		this.scope.register(['Mod'], 'y', run((e) => e.redo()));
		// C-4: Ctrl+F opens "Find in prompts" while the Preset Editor is in use.
		this.scope.register(['Mod'], 'f', run((e) => e.openSearch()));
		// Esc only acts while this tab is in use (DECISIONS.md, 2026-10-11). Obsidian still gets the key too.
		this.scope.register([], 'Escape', () => {
			this.editor?.escape();
			return true;
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
		this.editor = mountEditor(this.contentEl, header, doc, file.basename, {
			undoButton: Platform.isMobile,
			autoComplete: this.autoComplete(),
		});
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

	/** W-5: the "Auto complete" setting changed. */
	setAutoComplete(on: boolean): void {
		this.editor?.setAutoComplete(on);
	}

	async onRename(file: TFile): Promise<void> {
		await super.onRename(file);
		this.editor?.setTitle(file.basename);
	}
}
