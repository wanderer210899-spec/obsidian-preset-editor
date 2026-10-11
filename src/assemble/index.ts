/**
 * Assemble module: works out what the Preview shows, in the order SillyTavern
 * would send it for a normal reply (SRS V-1, V-2, V-4, V-7 to V-10). Follows
 * getPromptCollection in public/scripts/PromptManager.js, then
 * populateChatCompletion and populationInjectionPrompts in
 * public/scripts/openai.js. It has no Obsidian or UI code. Macros are worked
 * out by the function passed in.
 */
import { kindOf } from '../kinds';
import type { PromptData } from '../preset';

/** One prompt in the main order, with its on/off state. */
export interface OrderedPrompt {
	id: string;
	prompt: Readonly<PromptData>;
	enabled: boolean;
}

/** A prompt's text with its macros worked out. `text` is what SillyTavern would send. */
export interface Worked {
	text: string;
}

/**
 * Works out the macros in each text, in the order given (V-4). Variables set
 * in one text can be read in the next.
 */
export type WorkOut<W extends Worked> = (texts: string[]) => W[];

/**
 * One prompt in the Preview.
 * - text: a prompt's text, with its macros worked out.
 * - placeholder: something SillyTavern fills in (V-3). `role` is null for
 *   Chat Examples, which has no role.
 *
 * `depth` is set on in-chat prompts: how many chat messages come after them.
 */
export type PromptBlock<W extends Worked> =
	| { type: 'text'; id: string; name: string; role: string; text: W; depth: number | null }
	| { type: 'placeholder'; id: string; name: string; role: string | null; depth: number | null };

/** One block of the Preview. The chat history holds the in-chat prompts, deepest first (V-7). */
export type PreviewBlock<W extends Worked> =
	| PromptBlock<W>
	| { type: 'history'; id: string; name: string; inChat: PromptBlock<W>[] };

/** SillyTavern's injection_position for In-chat. */
const IN_CHAT = 1;
/** SillyTavern's MAX_INJECTION_DEPTH: deeper in-chat prompts are never sent. */
const MAX_DEPTH = 10000;
/** Prompts SillyTavern places by name, whatever their `system_prompt` flag. */
const PLACED_BY_NAME = [
	'worldInfoBefore',
	'main',
	'worldInfoAfter',
	'charDescription',
	'charPersonality',
	'scenario',
	'personaDescription',
	'nsfw',
	'jailbreak',
	'enhanceDefinitions',
	'dialogueExamples',
	'chatHistory',
];
/** In-chat roles, in the order SillyTavern lists them inside one depth and order. */
const ROLES = ['system', 'user', 'assistant'];

export function assemble<W extends Worked>(rows: readonly OrderedPrompt[], workOut: WorkOut<W>): PreviewBlock<W>[] {
	const sent = sentForNormalReply(rows);
	// V-4: SillyTavern works out every one of these in list order, before placing
	// them, so a prompt that ends up hidden can still set a variable.
	const results = workOut(sent.map((r) => r.prompt.content ?? ''));
	const worked = new Map(sent.map((r, i) => [r, results[i]!]));
	const textOf = (row: OrderedPrompt) => worked.get(row)!;

	const inChat = sent.filter((r) => isInChat(r) && hasContent(r, textOf(r)) && isSentInChat(r));
	const blocks: PreviewBlock<W>[] = [];
	for (const row of sent) {
		if (row.id === 'chatHistory') blocks.push(history(row, inChat, textOf));
		else if (!isInChat(row) && isRelativeSent(row) && hasContent(row, textOf(row)))
			blocks.push(block(row, null, textOf(row)));
	}
	return blocks;
}

/** V-2: the prompts SillyTavern works out for a normal reply: on, with no trigger or the Normal one. */
export function sentForNormalReply<R extends OrderedPrompt>(rows: readonly R[]): R[] {
	return rows.filter((r) => r.enabled && runsOnNormal(r.prompt));
}

/** Chat History and Chat Examples always stay at their place in the list. */
function isInChat(row: OrderedPrompt): boolean {
	return row.prompt.injection_position === IN_CHAT && kindOf(row.id) !== 'placeholder';
}

/** The chat history, with the in-chat prompts in the order they end up in the chat (V-7). */
function history<W extends Worked>(
	row: OrderedPrompt,
	inChat: OrderedPrompt[],
	textOf: (row: OrderedPrompt) => W,
): PreviewBlock<W> {
	const depths = [...new Set(inChat.map((r) => r.prompt.injection_depth as number))].sort((a, b) => b - a);
	return {
		type: 'history',
		id: row.id,
		name: row.prompt.name ?? 'Chat History',
		inChat: depths.flatMap((depth) => atDepth(inChat, depth).map((r) => block(r, depth, textOf(r)))),
	};
}

/**
 * The in-chat prompts at one depth, in the order they end up in the chat.
 * SillyTavern goes through orders high to low, then roles, and inserts the
 * result into the reversed chat, so the order flips back: low orders first,
 * and assistant before user before system. Prompts sharing a depth, order
 * and role are joined in list order; here they stay separate blocks (V-7).
 */
function atDepth(inChat: OrderedPrompt[], depth: number): OrderedPrompt[] {
	const here = inChat.filter((r) => r.prompt.injection_depth === depth);
	const orders = [...new Set(here.map(orderOf))].sort((a, b) => b - a);
	const groups: OrderedPrompt[][] = [];
	for (const order of orders) {
		for (const role of ROLES) {
			const group = here.filter((r) => orderOf(r) === order && roleOf(r) === role);
			if (group.length) groups.push(group);
		}
	}
	return groups.reverse().flat();
}

function block<W extends Worked>(row: OrderedPrompt, depth: number | null, worked: W): PromptBlock<W> {
	const { id, prompt } = row;
	const name = prompt.name ?? id;
	const kind = kindOf(id);
	if (kind === 'placeholder') return { type: 'placeholder', id, name, role: null, depth };
	const role = roleOf(row) ?? 'system';
	if (kind === 'placeholder-settings') return { type: 'placeholder', id, name, role, depth };
	return { type: 'text', id, name, role, text: worked, depth };
}

function runsOnNormal(prompt: Readonly<PromptData>): boolean {
	const triggers = prompt.injection_trigger;
	return !Array.isArray(triggers) || triggers.length === 0 || triggers.includes('normal');
}

/** V-8: SillyTavern only sends a relative prompt it places by name, or one with `system_prompt: false`. */
function isRelativeSent(row: OrderedPrompt): boolean {
	return PLACED_BY_NAME.includes(row.id) || row.prompt.system_prompt === false;
}

/** V-8: prompts that are empty once their macros are worked out aren't sent. Placeholders count as filled (V-3). */
function hasContent(row: OrderedPrompt, worked: Worked): boolean {
	if (kindOf(row.id) !== 'custom' && kindOf(row.id) !== 'builtin') return true;
	const { text } = worked;
	// SillyTavern trims in-chat text before checking it.
	return isInChat(row) ? text.trim() !== '' : text !== '';
}

/** SillyTavern drops in-chat prompts with an unknown role or a depth it never reaches. */
function isSentInChat(row: OrderedPrompt): boolean {
	const depth = row.prompt.injection_depth;
	return (
		ROLES.includes(roleOf(row) ?? '') &&
		typeof depth === 'number' &&
		Number.isInteger(depth) &&
		depth >= 0 &&
		depth <= MAX_DEPTH
	);
}

/** SillyTavern gives placeholders with settings the System role unless the preset sets one. */
function roleOf(row: OrderedPrompt): string | undefined {
	return row.prompt.role ?? (kindOf(row.id) === 'placeholder-settings' ? 'system' : undefined);
}

function orderOf(row: OrderedPrompt): number {
	return row.prompt.injection_order ?? 100;
}
