import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assemble, type OrderedPrompt, type PreviewBlock, type Worked } from '../src/assemble';
import { workOutMacros } from '../src/macros';
import type { PromptData } from '../src/preset';

const row = (identifier: string, fields: Partial<PromptData> = {}, enabled = true): OrderedPrompt => ({
	id: identifier,
	prompt: { identifier, name: identifier, system_prompt: false, role: 'system', content: identifier, ...fields },
	enabled,
});
/** Assembles with no macros worked out: each text as typed. */
const run = (rows: OrderedPrompt[]) => assemble(rows, (texts) => texts.map((text) => ({ text })));
const inChat = (identifier: string, depth: number, fields: Partial<PromptData> = {}) =>
	row(identifier, { injection_position: 1, injection_depth: depth, ...fields });

/** A short picture of each block, to compare whole lists at once. */
function shape(blocks: PreviewBlock<Worked>[]): string[] {
	return blocks.map((b) => {
		if (b.type === 'history') return `history(${shape(b.inChat).join(' ')})`;
		const at = b.depth === null ? '' : `@${b.depth}`;
		return `${b.type === 'text' ? b.id : `[${b.id}]`}${at}`;
	});
}

test('relative prompts follow the list; off, non-normal and empty ones are left out', () => {
	const blocks = run([
		row('main', { system_prompt: true }),
		row('off', {}, false),
		row('swipeOnly', { injection_trigger: ['swipe'] }),
		row('normalToo', { injection_trigger: ['swipe', 'normal'] }),
		row('empty', { content: '' }),
		row('spaces', { content: '  ' }),
		row('charDescription', { system_prompt: true, marker: true, role: 'user', content: undefined }),
		row('dialogueExamples', { system_prompt: true, marker: true }),
		row('chatHistory', { system_prompt: true, marker: true }),
		row('jailbreak', { system_prompt: true }),
	]);
	assert.deepEqual(shape(blocks), [
		'main',
		'normalToo',
		'spaces',
		'[charDescription]',
		'[dialogueExamples]',
		'history()',
		'jailbreak',
	]);
	assert.deepEqual(
		blocks.map((b) => (b.type === 'history' ? null : b.role)),
		['system', 'system', 'system', 'user', null, null, 'system'],
	);
});

test('SillyTavern skips custom prompts not marked system_prompt: false', () => {
	const blocks = run([row('a', { system_prompt: true }), row('b', { system_prompt: undefined }), row('c')]);
	assert.deepEqual(shape(blocks), ['c']);
});

test('the chat history holds the in-chat prompts, deepest first', () => {
	const blocks = run([
		row('main'),
		inChat('deep', 4),
		row('chatHistory'),
		inChat('one', 1),
		inChat('zero', 0),
		inChat('emptyInChat', 2, { content: ' \n' }),
		inChat('noRole', 2, { role: undefined }),
		inChat('tooDeep', 10001),
		row('after'),
	]);
	assert.deepEqual(shape(blocks), ['main', 'history(deep@4 one@1 zero@0)', 'after']);
});

test('one depth: low orders first, then assistant, user, system; list order inside a group', () => {
	const blocks = run([
		inChat('A', 2),
		inChat('B', 2, { role: 'user' }),
		inChat('C', 2, { injection_order: 50 }),
		inChat('D', 2),
		inChat('E', 2, { role: 'assistant', injection_order: 100 }),
		row('chatHistory'),
	]);
	assert.deepEqual(shape(blocks), ['history(C@2 E@2 B@2 A@2 D@2)']);
});

test('in-chat prompts are dropped when Chat History is off or missing', () => {
	assert.deepEqual(shape(run([row('a'), inChat('b', 1), row('chatHistory', {}, false)])), ['a']);
	assert.deepEqual(shape(run([row('a'), inChat('b', 1)])), ['a']);
});

test('placeholders with settings can go in-chat; Chat Examples cannot', () => {
	const blocks = run([
		inChat('scenario', 3, { system_prompt: true, role: undefined, content: undefined }),
		inChat('dialogueExamples', 3, { system_prompt: true }),
		row('chatHistory'),
	]);
	assert.deepEqual(shape(blocks), ['[dialogueExamples]', 'history([scenario]@3)']);
	const history = blocks.find((b) => b.type === 'history');
	const scenario = history?.type === 'history' ? history.inChat[0] : undefined;
	assert.equal(scenario?.type === 'placeholder' && scenario.role, 'system');
});

test('macros are worked out in list order, even in prompts that end up hidden (V-4)', () => {
	const blocks = assemble(
		[
			row('setter', { content: '{{setvar::mood::calm}}' }),
			inChat('hidden', 2, { content: '{{setvar::time::night}}Night' }),
			row('reader', { content: '{{getvar::mood}} {{getvar::time}}' }),
			row('off', { content: '{{setvar::mood::angry}}' }, false),
			row('last', { content: '{{getvar::mood}}' }),
		],
		workOutMacros,
	);
	// No Chat History, so the in-chat prompt is hidden; it still sets its variable.
	assert.deepEqual(shape(blocks), ['reader', 'last']);
	assert.deepEqual(
		blocks.map((b) => (b.type === 'text' ? b.text.text : null)),
		['calm night', 'calm'],
	);
});

test('prompts that are empty once their macros are worked out are left out (V-8)', () => {
	const blocks = assemble(
		[
			row('chatHistory'),
			row('onlySetter', { content: '{{setvar::a::1}}' }),
			row('onlyNewline', { content: '{{newline}}' }),
			inChat('spacesInChat', 1, { content: '{{space}}{{// note}}' }),
			inChat('kept', 1, { content: '{{char}}' }),
		],
		workOutMacros,
	);
	assert.deepEqual(shape(blocks), ['history(kept@1)', 'onlyNewline']);
});
