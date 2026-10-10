/**
 * Finds the `{{…}}` macros in prompt text so they can be coloured as in the
 * mockup: variable macros, `if`/`else`, and all other macros. Nested macros
 * take their own colour. This only colours text; it does not run macros.
 */

export type MacroKind = 'macro' | 'variable' | 'control';

export interface MacroSpan {
	from: number;
	to: number;
	kind: MacroKind;
}

export function macroSpans(src: string): MacroSpan[] {
	const spans: MacroSpan[] = [];
	const stack: MacroKind[] = [];
	const mark = (from: number, to: number, kind: MacroKind | undefined) => {
		if (!kind) return;
		const last = spans[spans.length - 1];
		if (last && last.kind === kind && last.to === from) last.to = to;
		else spans.push({ from, to, kind });
	};
	let i = 0;
	while (i < src.length) {
		if (src.startsWith('{{', i)) {
			const name = /^\/?\s*([a-zA-Z_]+)/.exec(src.slice(i + 2))?.[1] ?? '';
			const kind: MacroKind = /^(if|else)$/.test(name) ? 'control' : /var$/.test(name) ? 'variable' : 'macro';
			stack.push(kind);
			mark(i, i + 2, kind);
			i += 2;
		} else if (src.startsWith('}}', i) && stack.length) {
			mark(i, i + 2, stack.pop());
			i += 2;
		} else {
			mark(i, i + 1, stack[stack.length - 1]);
			i++;
		}
	}
	return spans;
}
