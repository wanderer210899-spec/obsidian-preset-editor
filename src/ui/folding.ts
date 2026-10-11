/**
 * Folding prompts (SRS C-1, C-5, C-6). Only changes how the editor looks;
 * nothing is saved to the preset. The editor keeps the open prompt's id and
 * starts with none, so every prompt is folded when a preset opens (C-6).
 */

/** C-5: opening a prompt folds the one that was open; opening the open one folds it. */
export function toggleOpen(open: string | null, id: string): string | null {
	return open === id ? null : id;
}

/** What a folded prompt shows. */
export interface FoldSummary {
	/** The first line that has text, or '' if the prompt is empty. */
	firstLine: string;
	/** Lines as typed (not as wrapped on screen); 0 for an empty prompt. */
	lines: number;
}

export function foldSummary(text: string): FoldSummary {
	if (!text.trim()) return { firstLine: '', lines: 0 };
	const all = text.split('\n');
	return { firstLine: (all.find((l) => l.trim()) ?? '').trim(), lines: all.length };
}
