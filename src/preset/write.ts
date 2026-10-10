import { arrayElements, type Member, objectMembers, rootStart, type Span } from './json-spans';
import { MAIN_ORDER_ID } from './read';
import type { PresetContent } from './types';

/**
 * Returns the file text with only `prompts` and the main prompt order replaced.
 * Every other byte stays as it was (SRS S-2). New text uses 4-space indentation
 * and the file's own line endings (SRS S-3).
 * `original` must be text that readPreset accepts.
 */
export function writePreset(original: string, content: PresetContent): string {
	const root = objectMembers(original, rootStart(original));
	const prompts = lastMember(root, 'prompts');
	const order = mainOrder(original, lastMember(root, 'prompt_order'));
	const eol = original.includes('\r\n') ? '\r\n' : '\n';

	const edits = [
		{ span: prompts.value, text: format(content.prompts, indentOf(original, prompts.keyStart), eol) },
		{ span: order.value, text: format(content.order, indentOf(original, order.keyStart), eol) },
	].sort((a, b) => b.span.start - a.span.start);

	let text = original;
	for (const { span, text: replacement } of edits) {
		text = text.slice(0, span.start) + replacement + text.slice(span.end);
	}
	return text;
}

/** The `order` member of the first prompt_order list with the main id. */
function mainOrder(text: string, promptOrder: Member): Member {
	for (const list of arrayElements(text, promptOrder.value.start)) {
		if (text[list.start] !== '{') continue;
		const members = objectMembers(text, list.start);
		const id = members.filter((m) => m.key === 'character_id').at(-1);
		if (id && String(parse(text, id.value)) === String(MAIN_ORDER_ID)) return lastMember(members, 'order');
	}
	throw new Error('Preset has no main prompt order');
}

function lastMember(members: Member[], key: string): Member {
	const member = members.filter((m) => m.key === key).at(-1);
	if (!member) throw new Error(`Preset has no "${key}"`);
	return member;
}

function parse(text: string, span: Span): unknown {
	return JSON.parse(text.slice(span.start, span.end));
}

/** Leading whitespace of the line that `pos` is on. */
function indentOf(text: string, pos: number): string {
	const lineStart = text.lastIndexOf('\n', pos) + 1;
	return /^[ \t]*/.exec(text.slice(lineStart, pos))?.[0] ?? '';
}

function format(value: unknown, indent: string, eol: string): string {
	return JSON.stringify(value, null, 4).split('\n').join(eol + indent);
}
