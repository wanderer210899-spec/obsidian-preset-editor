/**
 * The library screen (SRS 3.8), in Svelte. It knows nothing about Obsidian
 * or files; it works through a LibraryModel.
 */
import { mount, unmount } from 'svelte';
import Library from './Library.svelte';
import type { LibraryModel } from './types';

export type { LibraryModel } from './types';

export interface LibraryHandle {
	/** Esc closes a menu or sheet, then select mode. */
	escape(): void;
	/** Shows "New preset in…". */
	newPreset(): void;
	destroy(): void;
}

/** Shows the library in `target`. The phone "+" button goes into `header` (Obsidian's view header). */
export function mountLibrary(target: HTMLElement, header: HTMLElement, model: LibraryModel, isMobile: boolean): LibraryHandle {
	const ui = mount(Library, { target, props: { model, header, isMobile } });
	return {
		escape: () => ui.escape(),
		newPreset: () => ui.newPreset(),
		destroy: () => void unmount(ui),
	};
}
