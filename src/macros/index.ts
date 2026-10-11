/**
 * Macros module: works out the macros in prompt text the way SillyTavern's
 * New macro engine does (SRS V-4, V-5, V-6, V-11). It has no Obsidian or UI
 * code. The engine itself is a port of SillyTavern's (AGPL-3.0).
 */
import { buildRegistry } from './definitions';
import { createEngine, type MacroEngine } from './engine';
import { toParts, unmark, type Part } from './marks';
import { LocalVariables } from './variables';

export type { Part } from './marks';

export interface WorkedOut {
	/** The text SillyTavern would send. Macros left as typed are still in it. */
	text: string;
	/** The same text in pieces, marking worked-out values and macros left as typed. */
	parts: Part[];
}

let engine: MacroEngine | null = null;

/**
 * Works out each text in turn, as SillyTavern does for the prompts in list
 * order. Variables set in one text can be read in the next. Every call
 * starts with no variables (V-11).
 */
export function workOutMacros(texts: readonly string[]): WorkedOut[] {
	engine ??= createEngine(buildRegistry());
	const env = { variables: new LocalVariables() };
	return texts.map((text) => {
		const marked = engine!.evaluate(text, env);
		return { text: unmark(marked), parts: toParts(marked) };
	});
}
