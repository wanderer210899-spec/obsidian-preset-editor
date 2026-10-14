/**
 * C-4: what each view searches. Each view searches what it shows
 * (DECISIONS.md, 2026-10-11): Edit the typed text, Preview the worked-out text.
 * Placeholders have no text to search, in either view.
 */
import type { PreviewBlock, PromptBlock } from '../assemble';
import { kindOf } from '../kinds';
import type { WorkedOut } from '../macros';
import type { Searchable } from '../search';
import type { UiRow } from './types';

/**
 * Edit: each prompt's name and typed text. With `names` off (C-10, the
 * replace box is open), only the text is searched.
 */
export function editSearchables(rows: readonly UiRow[], names = true): Searchable[] {
	return rows
		.filter((r) => !kindOf(r.id).startsWith('placeholder'))
		.map((r) => ({ id: r.id, name: names ? (r.prompt.name ?? '') : '', text: r.prompt.content ?? '' }));
}

/** Preview: each prompt's name and text as the Preview shows it, in Preview order. */
export function previewSearchables(blocks: readonly PreviewBlock<WorkedOut>[]): Searchable[] {
	const out: Searchable[] = [];
	const add = (b: PromptBlock<WorkedOut>) => {
		if (b.type === 'text') out.push({ id: b.id, name: b.name, text: shownText(b.text) });
	};
	for (const b of blocks) {
		if (b.type === 'history') b.inChat.forEach(add);
		else add(b);
	}
	return out;
}

/** The text the Preview shows: its pieces joined. */
export function shownText(w: WorkedOut): string {
	return w.parts.map((p) => p.text).join('');
}
