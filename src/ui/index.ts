/**
 * UI module: the editor screen from the mockup, in Svelte (SRS I-1, E-1 to E-7).
 * It knows nothing about Obsidian or files; it works on an EditorDocument.
 */
import { mount, unmount } from 'svelte';
import Editor from './Editor.svelte';
import type { EditorDocument, SaveState } from './types';

export type { EditorDocument, SaveState, UiRow } from './types';

export interface EditorHandle {
	/** E-6: undo or redo one step, showing the prompt it changed. */
	undo(): void;
	redo(): void;
	/** C-4: Ctrl+F opens the search bar. */
	openSearch(): void;
	setStatus(status: SaveState): void;
	setTitle(title: string): void;
	/** W-5: the "Auto complete" setting changed. */
	setAutoComplete(on: boolean): void;
	destroy(): void;
}

export interface EditorOptions {
	/** E-6: show the Undo and Redo buttons (Obsidian mobile only, DECISIONS.md 2026-10-10). */
	undoButton: boolean;
	/** W-5: close tags while typing. */
	autoComplete: boolean;
}

/**
 * Shows the editor in `target`. The mode switch, Undo and Redo buttons, search
 * button and panel button go into `header` (the Obsidian view header).
 */
export function mountEditor(
	target: HTMLElement,
	header: HTMLElement,
	doc: EditorDocument,
	title: string,
	options: EditorOptions,
): EditorHandle {
	const editor = mount(Editor, { target, props: { doc, header, title, undoButton: options.undoButton, autoComplete: options.autoComplete } });
	return {
		undo: () => editor.undo(),
		redo: () => editor.redo(),
		openSearch: () => editor.openSearch(),
		setStatus: (status) => editor.setStatus(status),
		setTitle: (t) => editor.setTitle(t),
		setAutoComplete: (on) => editor.setAutoComplete(on),
		destroy: () => void unmount(editor),
	};
}
