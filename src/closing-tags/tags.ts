/**
 * Finds the tags in prompt text and pairs them up (SRS W-3, W-4).
 * Two kinds: XML tags like `<rules>`…`</rules>`, and `{{if …}}`…`{{/if}}`.
 */

export interface Span {
	from: number;
	to: number;
}

export interface Tag extends Span {
	kind: 'xml' | 'if';
	closing: boolean;
	/** XML: the tag name ('' for `<>` and `</>`). `if` for the other kind. */
	name: string;
	/** Where the name sits, for renaming (XML only). */
	nameFrom: number;
	nameTo: number;
}

const XML_TAG = /<(\/?)(?:([A-Za-z_][\w.:-]*)([^<>]*?))?(\/?)>/g;
/** What may follow a name inside a tag: nothing, or a space and attributes. */
const ATTRS = /^(\s[^<>]*)?$/;

/** XML tags, opening and closing. Tags that close themselves (`<br/>`) are left out. */
export function xmlTags(text: string): Tag[] {
	const out: Tag[] = [];
	for (const m of text.matchAll(XML_TAG)) {
		const [whole, slash = '', name = '', attrs = '', selfClose] = m;
		if (selfClose || !ATTRS.test(attrs) || (slash && attrs.trim())) continue;
		const from = m.index;
		const nameFrom = from + 1 + slash.length;
		out.push({ kind: 'xml', closing: !!slash, name, from, to: from + whole.length, nameFrom, nameTo: nameFrom + name.length });
	}
	return out;
}

/** Every `{{…}}` in the text, nested ones too, with what's between the braces. */
export function macrosIn(text: string): (Span & { inner: string })[] {
	const out: (Span & { inner: string })[] = [];
	const open: number[] = [];
	for (let i = 0; i < text.length - 1; ) {
		if (text.startsWith('{{', i)) {
			open.push(i);
			i += 2;
		} else if (text.startsWith('}}', i) && open.length) {
			const from = open.pop()!;
			out.push({ from, to: i + 2, inner: text.slice(from + 2, i) });
			i += 2;
		} else i++;
	}
	return out.sort((a, b) => a.from - b.from);
}

/**
 * True for an `{{if}}` that waits for a `{{/if}}`: `{{if mood}}` or
 * `{{if::mood}}`. `{{if mood::text}}` is complete on its own, as in
 * SillyTavern (one argument = scoped, two = inline).
 */
export function isScopedIf(inner: string): boolean {
	const m = /^\s*if(?=[\s:]|$)(.*)$/s.exec(inner);
	if (!m) return false;
	// Nested macros in the condition may hold `::` of their own.
	const condition = m[1]!.replace(/\{\{[^]*\}\}/g, 'x').replace(/^(\s+|::)/, '');
	return condition.trim() !== '' && !condition.includes('::');
}

export function isIfClose(inner: string): boolean {
	return /^\s*\/\s*if\s*$/.test(inner);
}

/** `{{if …}}` that wait for a closer, and `{{/if}}`. */
export function ifTags(text: string): Tag[] {
	const out: Tag[] = [];
	for (const m of macrosIn(text)) {
		const closing = isIfClose(m.inner);
		if (!closing && !isScopedIf(m.inner)) continue;
		out.push({ kind: 'if', closing, name: 'if', from: m.from, to: m.to, nameFrom: m.from, nameTo: m.from });
	}
	return out;
}

export function allTags(text: string): Tag[] {
	return [...xmlTags(text), ...ifTags(text)].sort((a, b) => a.from - b.from);
}

/**
 * Pairs each closing tag with the nearest open tag of the same name before it.
 * Tags with no partner are left out.
 */
export function pairTags(tags: readonly Tag[]): [Tag, Tag][] {
	const pairs: [Tag, Tag][] = [];
	const open = new Map<string, Tag[]>();
	for (const t of tags) {
		const key = `${t.kind}:${t.name}`;
		const stack = open.get(key) ?? [];
		open.set(key, stack);
		if (!t.closing) stack.push(t);
		else {
			const partner = stack.pop();
			if (partner) pairs.push([partner, t]);
		}
	}
	return pairs;
}

/** W-4: the tag pair the cursor touches, if any (the innermost one). */
export function pairAt(text: string, pos: number): [Span, Span] | null {
	let best: [Tag, Tag] | null = null;
	for (const pair of pairTags(allTags(text))) {
		const touches = pair.some((t) => t.from <= pos && pos <= t.to);
		if (touches && (!best || pair[0].from > best[0].from)) best = pair;
	}
	return best && [
		{ from: best[0].from, to: best[0].to },
		{ from: best[1].from, to: best[1].to },
	];
}

/** True while there are more open tags of this kind and name than closing ones. */
export function hasUnclosed(tags: readonly Tag[], kind: Tag['kind'], name: string): boolean {
	let n = 0;
	for (const t of tags) if (t.kind === kind && t.name === name) n += t.closing ? -1 : 1;
	return n > 0;
}
