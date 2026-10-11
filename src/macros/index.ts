/**
 * Macros module: works out the macros in prompt text the way SillyTavern's
 * New macro engine does (SRS V-4, V-5, V-6, V-11), and finds the variable
 * macros as typed (T-4). It has no Obsidian or UI code. The engine itself is
 * a port of SillyTavern's (AGPL-3.0).
 */
import { buildRegistry } from './definitions';
import { createEngine, type MacroEngine } from './engine';
import { toParts, unmark, type Part } from './marks';
import { normalize } from './registry';
import { LocalVariables } from './variables';

export type { Part } from './marks';
export { findVariableUses, type VariableUse } from './uses';

export interface WorkedOut {
	/** The text SillyTavern would send. Macros left as typed are still in it. */
	text: string;
	/** The same text in pieces, marking worked-out values and macros left as typed. */
	parts: Part[];
}

interface Run {
	texts: readonly string[];
	results: WorkedOut[];
	variables: LocalVariables;
}

let engine: MacroEngine | null = null;
/** The last run. The Preview and the Variables panel ask about the same texts, so it runs once. */
let last: Run | null = null;

/**
 * Works out each text in turn, as SillyTavern does for the prompts in list
 * order. Variables set in one text can be read in the next. Every call
 * starts with no variables (V-11).
 */
export function workOutMacros(texts: readonly string[]): WorkedOut[] {
	return run(texts).results;
}

/**
 * The local variables once every text is worked out, as text (T-2). A
 * variable that holds no value is left out.
 */
export function finalVariables(texts: readonly string[]): ReadonlyMap<string, string> {
	const { variables } = run(texts);
	return new Map(variables.names().map((name) => [name, normalize(variables.get(name))]));
}

function run(texts: readonly string[]): Run {
	if (last && sameTexts(last.texts, texts)) return last;
	engine ??= createEngine(buildRegistry());
	const env = { variables: new LocalVariables() };
	const results = texts.map((text) => {
		const marked = engine!.evaluate(text, env);
		return { text: unmark(marked), parts: toParts(marked) };
	});
	return (last = { texts: [...texts], results, variables: env.variables });
}

function sameTexts(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((text, i) => text === b[i]);
}
