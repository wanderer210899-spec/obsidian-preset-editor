/**
 * Marks worked-out values inside engine output, so the Preview can show them
 * (SRS V-6, V-11). The marks are private-use characters that never appear in
 * prompt text. They are stripped wherever a value is used as input, so they
 * never change a result.
 */

const START = '';
const END = '';
const MARKS = /[]/g;

/** One piece of a worked-out prompt. An empty value has `value` set and no text. */
export interface Part {
	text: string;
	/** Worked out from a variable. */
	value: boolean;
	/** A macro left as typed (V-3, V-5). */
	kept: boolean;
}

export function markValue(value: string): string {
	return START + value + END;
}

export function unmark(text: string): string {
	return text.replace(MARKS, '');
}

export function isMark(ch: string | undefined): boolean {
	return ch === START || ch === END;
}

/** Splits marked engine output into parts. Any `{{…}}` still in the output was left as typed. */
export function toParts(marked: string): Part[] {
	const kept = keptRanges(marked);
	const parts: Part[] = [];
	let depth = 0;
	let range = 0;
	for (let i = 0; i < marked.length; i++) {
		const ch = marked[i]!;
		while (range < kept.length && kept[range]![1] <= i) range++;
		const inKept = range < kept.length && kept[range]![0] <= i;
		if (ch === START) {
			if (marked[i + 1] === END && depth === 0) parts.push({ text: '', value: true, kept: inKept });
			depth++;
		} else if (ch === END) {
			depth = Math.max(0, depth - 1);
		} else {
			const last = parts[parts.length - 1];
			const value = depth > 0;
			if (last && last.text && last.value === value && last.kept === inKept) last.text += ch;
			else parts.push({ text: ch, value, kept: inKept });
		}
	}
	return parts;
}

/** True if the text still holds a macro left as typed. */
export function hasKeptMacro(text: string): boolean {
	return keptRanges(text).length > 0;
}

/** The outermost `{{…}}` spans that close, as [from, to) pairs. */
function keptRanges(text: string): [number, number][] {
	const ranges: [number, number][] = [];
	const open: number[] = [];
	let i = 0;
	while (i < text.length) {
		if (text.startsWith('{{', i)) {
			open.push(i);
			i += 2;
		} else if (text.startsWith('}}', i) && open.length) {
			const from = open.pop()!;
			if (!open.length) ranges.push([from, i + 2]);
			i += 2;
		} else {
			i++;
		}
	}
	return ranges;
}
