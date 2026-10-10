/**
 * Finds where values sit in JSON text, so they can be replaced without
 * touching the bytes around them. Expects text that JSON.parse accepts.
 */

export interface Span {
	start: number;
	end: number;
}

export interface Member {
	key: string;
	keyStart: number;
	value: Span;
}

/** Position of the root value, after any byte order mark and whitespace. */
export function rootStart(text: string): number {
	return skipWs(text, text.charCodeAt(0) === 0xfeff ? 1 : 0);
}

export function objectMembers(text: string, start: number): Member[] {
	const members: Member[] = [];
	let i = skipWs(text, start + 1);
	if (text[i] === '}') return members;
	for (;;) {
		const keyStart = i;
		i = skipString(text, i);
		const key = JSON.parse(text.slice(keyStart, i)) as string;
		i = skipWs(text, skipWs(text, i) + 1);
		const valueStart = i;
		i = skipValue(text, i);
		members.push({ key, keyStart, value: { start: valueStart, end: i } });
		i = skipWs(text, i);
		if (text[i] !== ',') return members;
		i = skipWs(text, i + 1);
	}
}

export function arrayElements(text: string, start: number): Span[] {
	const elements: Span[] = [];
	let i = skipWs(text, start + 1);
	if (text[i] === ']') return elements;
	for (;;) {
		const elementStart = i;
		i = skipValue(text, i);
		elements.push({ start: elementStart, end: i });
		i = skipWs(text, i);
		if (text[i] !== ',') return elements;
		i = skipWs(text, i + 1);
	}
}

function skipWs(text: string, i: number): number {
	while (i < text.length && ' \t\n\r'.includes(text[i] as string)) i++;
	return i;
}

function skipString(text: string, i: number): number {
	i++;
	while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
	return i + 1;
}

function skipValue(text: string, i: number): number {
	const c = text[i];
	if (c === '"') return skipString(text, i);
	if (c === '{') return closeOf(text, objectMembers(text, i).at(-1)?.value.end ?? i + 1);
	if (c === '[') return closeOf(text, arrayElements(text, i).at(-1)?.end ?? i + 1);
	while (i < text.length && !' \t\n\r,]}'.includes(text[i] as string)) i++;
	return i;
}

/** Position just after the closing bracket that follows `i`. */
function closeOf(text: string, i: number): number {
	return skipWs(text, i) + 1;
}
