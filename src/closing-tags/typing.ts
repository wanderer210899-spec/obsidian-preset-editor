/**
 * What auto complete adds while typing (SRS W-1, W-2, W-3). Works on plain
 * text and positions, so the text box can be swapped without touching this.
 */
import { hasUnclosed, ifTags, isScopedIf, macrosIn, pairTags, type Span, xmlTags } from './tags';

export interface Change {
	from: number;
	to: number;
	insert: string;
}

export interface Plan {
	/** Changes to make instead of the typed key, all in the text before the key. */
	changes: Change[];
	/** Where the cursor goes, in the text after the changes. */
	cursor: number;
	/** A `}}` that was added for the user, so typing `}` can step over it. */
	added?: Span;
}

/** Macros that close by themselves once their opening tag is finished (W-1). A trial: only `{{if}}`. */
const SELF_CLOSING: { opens: (inner: string) => boolean; closer: string; kind: 'if' }[] = [
	{ opens: isScopedIf, closer: '{{/if}}', kind: 'if' },
];

const NAME_CHARS = /^[\w.:-]*$/;
const NAME = /^[A-Za-z_][\w.:-]*$/;

/**
 * The plan for typing `ch` at `pos`, or null to let the key type as normal.
 * `added` are the `{{…}}` macros whose `}}` was added for the user.
 */
export function onType(text: string, pos: number, ch: string, added: readonly Span[]): Plan | null {
	if (ch === '{') return openBraces(text, pos);
	if (ch === '}') return closeBraces(text, pos, added);
	if (ch === '>') return closeXml(text, pos);
	return null;
}

/** W-1: typing the second `{` adds `}}`, cursor in between. */
function openBraces(text: string, pos: number): Plan | null {
	if (text[pos - 1] !== '{' || text[pos - 2] === '{') return null;
	return { changes: [{ from: pos, to: pos, insert: '{}}' }], cursor: pos + 1, added: { from: pos - 1, to: pos + 3 } };
}

/**
 * Typing `}` steps over a `}}` that was added for the user. If it finishes
 * `{{if …}}` and that `{{if}}` has no `{{/if}}` yet, `{{/if}}` is added after it.
 */
function closeBraces(text: string, pos: number, added: readonly Span[]): Plan | null {
	const steps = text[pos] === '}' && added.some((m) => m.to - 2 <= pos && pos < m.to);
	const after = steps ? text : text.slice(0, pos) + '}' + text.slice(pos);
	const cursor = pos + 1;
	const closer = closerFor(after, cursor);
	if (!steps && !closer) return null;
	const insert = (steps ? '' : '}') + (closer ?? '');
	return { changes: insert ? [{ from: steps ? cursor : pos, to: steps ? cursor : pos, insert }] : [], cursor };
}

/** The closing tag to add after a macro that ends at `end`, if it opens a scope that isn't closed. */
function closerFor(text: string, end: number): string | null {
	const macro = macrosIn(text).find((m) => m.to === end);
	if (!macro) return null;
	const rule = SELF_CLOSING.find((r) => r.opens(macro.inner));
	if (!rule || !hasUnclosed(ifTags(text), rule.kind, 'if')) return null;
	return rule.closer;
}

/** W-2: typing the `>` of `<rules>` adds `</rules>`, unless that tag is already closed. */
function closeXml(text: string, pos: number): Plan | null {
	const before = text.slice(0, pos) + '>';
	const m = /<([A-Za-z_][\w.:-]*)(\s[^<>]*)?>$/.exec(before);
	if (!m || before.endsWith('/>')) return null;
	const name = m[1]!;
	if (!hasUnclosed(xmlTags(before + text.slice(pos)), 'xml', name)) return null;
	return { changes: [{ from: pos, to: pos, insert: `></${name}>` }], cursor: pos + 1 };
}

/** W-1: Backspace in an empty `{{}}` removes both pairs of braces. */
export function onBackspace(text: string, pos: number): Plan | null {
	if (text.slice(pos - 2, pos) !== '{{' || text.slice(pos, pos + 2) !== '}}') return null;
	return { changes: [{ from: pos - 2, to: pos + 2, insert: '' }], cursor: pos - 2 };
}

/**
 * W-3: when an edit (`from`–`to` replaced by `insert`) changes an XML tag's
 * name, the same new name for its partner. Null if the edit isn't a rename.
 */
export function renamePartner(text: string, from: number, to: number, insert: string): Change | null {
	if (!NAME_CHARS.test(insert)) return null;
	const tags = xmlTags(text);
	const edited = tags.find((t) => t.nameFrom <= from && to <= t.nameTo);
	if (!edited) return null;
	const pair = pairTags(tags).find((p) => p.includes(edited));
	if (!pair) return null;
	const partner = pair[0] === edited ? pair[1] : pair[0];
	const name = edited.name.slice(0, from - edited.nameFrom) + insert + edited.name.slice(to - edited.nameFrom);
	if (name !== '' && !NAME.test(name)) return null;
	return { from: partner.nameFrom, to: partner.nameTo, insert: name };
}
