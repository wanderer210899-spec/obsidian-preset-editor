/**
 * UI module: the editor screen from the mockup, in Svelte (SRS I-1, E-1 to E-7).
 * It knows nothing about Obsidian or files; it works on an EditorDocument.
 */
import { mount, unmount } from 'svelte';
import Editor from './Editor.svelte';
import type { EditorDocument, SaveState } from './types';

export type { EditorDocument, SaveState, UiRow } from './types';

export interface EditorHandle {
	setStatus(status: SaveState): void;
	setTitle(title: string): void;
	destroy(): void;
}

/**
 * Shows the editor in `target`. The mode switch and panel button go into
 * `header` (the Obsidian view header).
 */
export function mountEditor(target: HTMLElement, header: HTMLElement, doc: EditorDocument, title: string): EditorHandle {
	const editor = mount(Editor, { target, props: { doc, header, title } });
	return {
		setStatus: (status) => editor.setStatus(status),
		setTitle: (t) => editor.setTitle(t),
		destroy: () => void unmount(editor),
	};
}
