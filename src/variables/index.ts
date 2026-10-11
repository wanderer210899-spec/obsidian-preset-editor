/**
 * Variables module: lists the local variables for the Variables panel
 * (SRS T-1 to T-6). It has no Obsidian or UI code.
 */
import { sentForNormalReply, type OrderedPrompt } from '../assemble';
import { finalVariables, findVariableUses, type VariableUse } from '../macros';

/** A prompt that sets or reads a variable. */
export interface PromptRef {
	id: string;
	name: string;
}

export interface VariableInfo {
	name: string;
	/** T-2: the final value as the Preview works it out. '' is empty. */
	value: string;
	setIn: PromptRef[];
	readIn: PromptRef[];
}

/** Each text's variable macros, kept between calls so typing in one prompt only reads that prompt again. */
let usesCache = new Map<string, VariableUse[]>();

/**
 * T-1: every local variable in the prompts the Preview works out, in the
 * order they're first typed, going down the prompt list. T-4: every
 * variable macro as typed counts, even one in an {{if}} part that doesn't run.
 */
export function listVariables(rows: readonly OrderedPrompt[]): VariableInfo[] {
	const sent = sentForNormalReply(rows);
	const texts = sent.map((row) => row.prompt.content ?? '');
	const uses = new Map(texts.map((text) => [text, usesCache.get(text) ?? findVariableUses(text)]));
	usesCache = uses;
	const found = new Map<string, VariableInfo>();
	sent.forEach((row, i) => {
		const ref = { id: row.id, name: row.prompt.name ?? row.id };
		for (const use of uses.get(texts[i]!)!) {
			let info = found.get(use.name);
			if (!info) found.set(use.name, (info = { name: use.name, value: '', setIn: [], readIn: [] }));
			const list = use.sets ? info.setIn : info.readIn;
			if (!list.some((p) => p.id === ref.id)) list.push(ref);
		}
	});
	if (found.size === 0) return [];
	const values = finalVariables(texts);
	return [...found.values()].map((info) => ({ ...info, value: values.get(info.name) ?? '' }));
}
