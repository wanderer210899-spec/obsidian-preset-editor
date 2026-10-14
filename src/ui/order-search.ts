/**
 * E-8: the Order panel's search. It looks at prompt names only, as the panel
 * shows them. Spaces at either end and upper or lower case don't matter.
 */
import type { UiRow } from './types';

export function filterByName(rows: readonly UiRow[], typed: string): UiRow[] {
	const q = typed.trim().toLowerCase();
	if (!q) return [...rows];
	return rows.filter((r) => (r.prompt.name ?? r.id).toLowerCase().includes(q));
}
