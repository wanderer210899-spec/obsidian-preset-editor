/**
 * Assemble module: works out what the Preview shows, in the order SillyTavern
 * would send it for a normal reply (SRS V-1, V-2, V-7 to V-10). Follows
 * populateChatCompletion and populationInjectionPrompts in
 * public/scripts/openai.js. It has no Obsidian or UI code, and runs no macros.
 */
import { kindOf } from '../kinds';
import type { PromptData } from '../preset';

/** One prompt in the main order, with its on/off state. */
export interface OrderedPrompt {
	id: string;
	prompt: Readonly<PromptData>;
	enabled: boolean;
}

/**
 * One block of the Preview.
 * - text: a prompt's text, as typed.
 * - placeholder: something SillyTavern fills in (V-3). `role` is null for
 *   Chat Examples, which has no role.
 * - history: one part of the chat history (V-7). `part` says which:
 *   'all' (no in-chat prompts), 'earlier' (before the deepest in-chat prompt),
 *   or a number of messages between in-chat prompts or after the last one.
 *
 * `depth` is set on in-chat blocks: how many chat messages come after them.
 */
export type PreviewBlock =
	| { type: 'text'; id: string; name: string; role: string; text: string; depth: number | null }
	| { type: 'placeholder'; id: string; name: string; role: string | null; depth: number | null }
	| { type: 'history'; id: string; name: string; part: 'all' | 'earlier' | { messages: number; last: boolean } };

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

export function assemble(rows: readonly OrderedPrompt[]): PreviewBlock[] {
	// V-2: only prompts that are on and run for a normal reply.
	const sent = rows.filter((r) => r.enabled && runsOnNormal(r.prompt));
	const inChat = sent.filter((r) => isInChat(r) && hasContent(r) && isSentInChat(r));

	const blocks: PreviewBlock[] = [];
	for (const row of sent) {
		if (row.id === 'chatHistory') blocks.push(...history(row, inChat));
		else if (!isInChat(row) && isRelativeSent(row) && hasContent(row)) blocks.push(block(row, null));
	}
	return blocks;
}

/** Chat History and Chat Examples always stay at their place in the list. */
function isInChat(row: OrderedPrompt): boolean {
	return row.prompt.injection_position === IN_CHAT && kindOf(row.id) !== 'placeholder';
}

/** The chat history, split around the in-chat prompts (V-7). */
function history(row: OrderedPrompt, inChat: OrderedPrompt[]): PreviewBlock[] {
	const name = row.prompt.name ?? 'Chat History';
	const part = (p: Extract<PreviewBlock, { type: 'history' }>['part']): PreviewBlock => ({
		type: 'history',
		id: row.id,
		name,
		part: p,
	});
	const depths = [...new Set(inChat.map((r) => r.prompt.injection_depth as number))].sort((a, b) => b - a);
	if (!depths.length) return [part('all')];

	const out: PreviewBlock[] = [part('earlier')];
	depths.forEach((depth, i) => {
		out.push(...atDepth(inChat, depth).map((r) => block(r, depth)));
		const next = depths[i + 1] ?? 0;
		if (depth > next) out.push(part({ messages: depth - next, last: i === depths.length - 1 }));
	});
	return out;
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

function block(row: OrderedPrompt, depth: number | null): PreviewBlock {
	const { id, prompt } = row;
	const name = prompt.name ?? id;
	const kind = kindOf(id);
	if (kind === 'placeholder') return { type: 'placeholder', id, name, role: null, depth };
	const role = roleOf(row) ?? 'system';
	if (kind === 'placeholder-settings') return { type: 'placeholder', id, name, role, depth };
	return { type: 'text', id, name, role, text: prompt.content ?? '', depth };
}

function runsOnNormal(prompt: Readonly<PromptData>): boolean {
	const triggers = prompt.injection_trigger;
	return !Array.isArray(triggers) || triggers.length === 0 || triggers.includes('normal');
}

/** V-8: SillyTavern only sends a relative prompt it places by name, or one with `system_prompt: false`. */
function isRelativeSent(row: OrderedPrompt): boolean {
	return PLACED_BY_NAME.includes(row.id) || row.prompt.system_prompt === false;
}

/** V-8: empty prompts aren't sent. Placeholders count as filled (V-3). */
function hasContent(row: OrderedPrompt): boolean {
	if (kindOf(row.id) !== 'custom' && kindOf(row.id) !== 'builtin') return true;
	const text = row.prompt.content ?? '';
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
