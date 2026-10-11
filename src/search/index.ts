/**
 * Search module: finds text for the "Find in prompts" bar (SRS C-4).
 * Plain text matching, ignoring case. It knows nothing about the screen;
 * each view hands it the text it shows.
 */

export interface Range {
	from: number;
	to: number;
}

/** Cleans up what was typed in the search bar. An empty result means "no search". */
export function normaliseQuery(query: string): string {
	return query.trim().toLowerCase();
}

/** Where `query` (already normalised) appears in `text`, ignoring case. */
export function findRanges(text: string, query: string): Range[] {
	if (!query) return [];
	const lower = text.toLowerCase();
	const out: Range[] = [];
	for (let i = lower.indexOf(query); i !== -1; i = lower.indexOf(query, i + query.length)) {
		out.push({ from: i, to: i + query.length });
	}
	return out;
}

/** How many times `query` appears in `text`. */
export function countMatches(text: string, query: string): number {
	return findRanges(text, query).length;
}

/** One thing a view can search: a prompt's id and the text the view shows for it. */
export interface Searchable {
	id: string;
	text: string;
}

/** The ids that contain `query`, in order. The bar steps through these ("2 of 5"). */
export function matchingIds(items: Searchable[], query: string): string[] {
	if (!query) return [];
	return items.filter((item) => item.text.toLowerCase().includes(query)).map((item) => item.id);
}

/** Steps through `count` matches and wraps round at either end. */
export function wrapIndex(index: number, count: number): number {
	return count ? ((index % count) + count) % count : 0;
}

/**
 * Splits text pieces so each match is a piece of its own, marked `hit`.
 * A match may run across pieces (e.g. across a worked-out value).
 */
export function markParts<T extends { text: string }>(parts: T[], query: string): (T & { hit: boolean })[] {
	const ranges = findRanges(parts.map((p) => p.text).join(''), query);
	if (!ranges.length) return parts.map((p) => ({ ...p, hit: false }));
	const out: (T & { hit: boolean })[] = [];
	let start = 0;
	for (const part of parts) {
		const end = start + part.text.length;
		// Cut points inside this piece, from the match edges.
		const cuts = new Set<number>([start, end]);
		for (const r of ranges) {
			if (r.from > start && r.from < end) cuts.add(r.from);
			if (r.to > start && r.to < end) cuts.add(r.to);
		}
		const points = [...cuts].sort((a, b) => a - b);
		for (let k = 0; k < points.length - 1; k++) {
			const a = points[k]!;
			const b = points[k + 1]!;
			const hit = ranges.some((r) => r.from <= a && b <= r.to);
			out.push({ ...part, text: part.text.slice(a - start, b - start), hit });
		}
		if (part.text.length === 0) out.push({ ...part, hit: false });
		start = end;
	}
	return out;
}
