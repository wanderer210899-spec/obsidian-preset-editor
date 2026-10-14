/**
 * Search module: finds and replaces text for the "Find in prompts" bar
 * (SRS C-4, C-7 to C-10). Plain text matching. It knows nothing about the
 * screen; each view hands it the text it shows.
 */

export interface Range {
	from: number;
	to: number;
}

/** What the find bar looks for. An empty `text` means "no search". */
export interface Query {
	text: string;
	/** C-8: off means upper and lower case match each other. */
	matchCase: boolean;
}

export const NO_QUERY: Query = { text: '', matchCase: false };

/** Cleans up what was typed in the search bar: spaces at either end are dropped. */
export function makeQuery(typed: string, matchCase: boolean): Query {
	return { text: typed.trim(), matchCase };
}

/**
 * Where the query appears in `text`. Positions are always in `text` itself,
 * so a replace cuts exactly the matched letters.
 */
export function findRanges(text: string, query: Query): Range[] {
	if (!query.text) return [];
	const escaped = query.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(escaped, query.matchCase ? 'gu' : 'giu');
	const out: Range[] = [];
	for (const m of text.matchAll(re)) out.push({ from: m.index, to: m.index + m[0].length });
	return out;
}

/** How many times the query appears in `text`. */
export function countMatches(text: string, query: Query): number {
	return findRanges(text, query).length;
}

/**
 * One thing a view can search: a prompt's id and the text the view shows for
 * it. Names are not searched (C-4); the Order panel finds those (E-8).
 */
export interface Searchable {
	id: string;
	text: string;
}

/** C-7: one match. `from` and `to` are in the prompt's text. */
export interface Match extends Range {
	id: string;
}

/** C-7: every match, in the order the view shows them, prompt by prompt. The bar steps through these ("2 of 5"). */
export function listMatches(items: readonly Searchable[], query: Query): Match[] {
	const out: Match[] = [];
	for (const item of items) {
		for (const r of findRanges(item.text, query)) out.push({ id: item.id, ...r });
	}
	return out;
}

/** Steps through `count` matches and wraps round at either end. */
export function wrapIndex(index: number, count: number): number {
	return count ? ((index % count) + count) % count : 0;
}

/**
 * C-10: after "Replace", the next match is the first one in the text after
 * position `pos` of prompt `id` (so a replacement that holds the query isn't
 * found again), or the first in a later prompt. Wraps round to 0.
 */
export function indexAfter(matches: readonly Match[], ids: readonly string[], id: string, pos: number): number {
	const rank = new Map(ids.map((x, i) => [x, i]));
	const r = rank.get(id) ?? -1;
	const k = matches.findIndex((m) => {
		const mr = rank.get(m.id) ?? -1;
		return mr > r || (mr === r && m.from >= pos);
	});
	return k === -1 ? 0 : k;
}

/** C-10: puts `replacement` in place of each range (in order, not overlapping). */
export function replaceRanges(text: string, ranges: readonly Range[], replacement: string): string {
	let out = '';
	let at = 0;
	for (const r of ranges) {
		out += text.slice(at, r.from) + replacement;
		at = r.to;
	}
	return out + text.slice(at);
}

/**
 * Splits text pieces so each match is a piece of its own, marked `hit`.
 * The pieces of the `current` match (C-7) are also marked `now`.
 * A match may run across pieces (e.g. across a worked-out value).
 */
export function markParts<T extends { text: string }>(
	parts: T[],
	query: Query,
	current: Range | null = null,
): (T & { hit: boolean; now: boolean })[] {
	const ranges = findRanges(parts.map((p) => p.text).join(''), query);
	if (!ranges.length) return parts.map((p) => ({ ...p, hit: false, now: false }));
	const out: (T & { hit: boolean; now: boolean })[] = [];
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
			const now = hit && !!current && current.from <= a && b <= current.to;
			out.push({ ...part, text: part.text.slice(a - start, b - start), hit, now });
		}
		if (part.text.length === 0) out.push({ ...part, hit: false, now: false });
		start = end;
	}
	return out;
}
