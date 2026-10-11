/**
 * Works out the macros in one text. Ported from
 * public/scripts/macros/engine/MacroEngine.js (SillyTavern 1.19.0, AGPL-3.0).
 *
 * Changes from SillyTavern: trimming skips over value marks (see marks.ts),
 * so marks never change what gets trimmed. Dynamic macros, custom
 * pre/post-processors and diagnostics are left out.
 */
import { ELSE_MARKER } from './definitions';
import { isMark, markValue } from './marks';
import { parseDocument } from './parser';
import { executeMacro, type MacroCall, type MacroEngineHooks, type MacroEnv, type MacroRegistry } from './registry';
import { evaluateDocument } from './walker';

export interface MacroEngine {
	evaluate(input: string, env: MacroEnv): string;
}

export function createEngine(registry: MacroRegistry): MacroEngine {
	const hooks: MacroEngineHooks = { resolve: evaluate, trimContent: trimScopedContent };

	function evaluate(input: string, env: MacroEnv): string {
		if (!input) return '';
		const text = preProcess(input);
		const cst = parseDocument(text);
		if (!cst?.children) return input;
		let evaluated: string;
		try {
			evaluated = evaluateDocument({ text, env, registry, resolveMacro, trimContent: trimScopedContent }, cst);
		} catch {
			return input;
		}
		return postProcess(evaluated);
	}

	/** Unknown macros, and calls that fail, stay as typed (with nested macros worked out). */
	function resolveMacro(call: MacroCall): string {
		const raw = `{{${call.rawInner}}}`;
		if (!call.name) return raw;
		const def = registry.get(call.name);
		if (!def) return raw;
		try {
			const result = executeMacro(call, def, hooks);
			return def.value ? markValue(result) : result;
		} catch {
			return raw;
		}
	}

	return { evaluate };
}

/** Rewrites legacy forms into their macro forms before parsing. */
function preProcess(text: string): string {
	return text
		.replace(/{{time_(UTC[+-]\d+)}}/gi, (_match, utcOffset) => `{{time::${utcOffset}}}`)
		.replace(/<USER>/gi, '{{user}}')
		.replace(/<BOT>/gi, '{{char}}')
		.replace(/<CHAR>/gi, '{{char}}')
		.replace(/<GROUP>/gi, '{{group}}')
		.replace(/<CHARIFNOTGROUP>/gi, '{{charIfNotGroup}}');
}

const TRIM_MACRO = /(?:[]*\r?\n)*[]*{{trim}}(?:[]*\r?\n)*/gi;

function postProcess(text: string): string {
	return (
		text
			// Escaped braces: \{ → {, \} → }
			.replace(/\\([{}])/g, '$1')
			// {{trim}} removes itself and the line breaks around it.
			.replace(TRIM_MACRO, (match) => [...match].filter(isMark).join(''))
			.replaceAll(ELSE_MARKER, '')
	);
}

const isSpace = (ch: string) => /\s/.test(ch);

function trimStart(text: string): string {
	let i = 0;
	let marks = '';
	while (i < text.length && (isMark(text[i]) || isSpace(text[i]!))) {
		if (isMark(text[i])) marks += text[i];
		i++;
	}
	return marks + text.slice(i);
}

function trimEnd(text: string): string {
	let j = text.length;
	let marks = '';
	while (j > 0 && (isMark(text[j - 1]) || isSpace(text[j - 1]!))) {
		if (isMark(text[j - 1])) marks = text[j - 1] + marks;
		j--;
	}
	return text.slice(0, j) + marks;
}

const trim = (text: string) => trimEnd(trimStart(text));

/** Number of leading spaces and tabs, not counting marks. */
function indentOf(line: string): number {
	let count = 0;
	for (const ch of line) {
		if (isMark(ch)) continue;
		if (ch !== ' ' && ch !== '\t') break;
		count++;
	}
	return count;
}

/** Removes `count` leading spaces or tabs, keeping marks. */
function dedent(line: string, count: number): string {
	let i = 0;
	let marks = '';
	while (count > 0 && i < line.length) {
		if (isMark(line[i])) marks += line[i];
		else count--;
		i++;
	}
	return marks + line.slice(i);
}

/**
 * Trims scoped content and removes the first line's indentation from every
 * line, so neatly indented {{if}} blocks come out flush (trimScopedContent).
 */
function trimScopedContent(content: string): string {
	if (!content) return '';
	const lines = content.split('\n');
	const first = lines.find((line) => [...line].some((ch) => !isMark(ch) && !isSpace(ch)));
	const baseIndent = first === undefined ? 0 : indentOf(first);
	if (baseIndent === 0) return trim(content);
	const dedented = lines.map((line) => (indentOf(line) >= baseIndent ? dedent(line, baseIndent) : trimStart(line)));
	return trim(dedented.join('\n'));
}
