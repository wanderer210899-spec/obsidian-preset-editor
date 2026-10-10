import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assemble, type OrderedPrompt, type PreviewBlock } from '../src/assemble';
import type { PromptData } from '../src/preset';

const row = (identifier: string, fields: Partial<PromptData> = {}, enabled = true): OrderedPrompt => ({
	id: identifier,
	prompt: { identifier, name: identifier, system_prompt: false, role: 'system', content: identifier, ...fields },
	enabled,
});
const inChat = (identifier: string, depth: number, fields: Partial<PromptData> = {}) =>
	row(identifier, { injection_position: 1, injection_depth: depth, ...fields });

/** A short picture of each block, to compare whole lists at once. */
function shape(blocks: PreviewBlock[]): string[] {
	return blocks.map((b) => {
		if (b.type === 'history') return typeof b.part === 'string' ? `history:${b.part}` : `history:${b.part.messages}${b.part.last ? ':last' : ''}`;
		const at = b.depth === null ? '' : `@${b.depth}`;
		return `${b.type === 'text' ? b.id : `[${b.id}]`}${at}`;
	});
}

test('relative prompts follow the list; off, non-normal and empty ones are left out', () => {
	const blocks = assemble([
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
		'history:all',
		'jailbreak',
	]);
	assert.deepEqual(
		blocks.map((b) => (b.type === 'history' ? null : b.role)),
		['system', 'system', 'system', 'user', null, null, 'system'],
	);
});

test('SillyTavern skips custom prompts not marked system_prompt: false', () => {
	const blocks = assemble([row('a', { system_prompt: true }), row('b', { system_prompt: undefined }), row('c')]);
	assert.deepEqual(shape(blocks), ['c']);
});

test('the chat history is split at each in-chat depth', () => {
	const blocks = assemble([
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
	assert.deepEqual(shape(blocks), [
		'main',
		'history:earlier',
		'deep@4',
		'history:3',
		'one@1',
		'history:1',
		'zero@0',
		'after',
	]);
	assert.deepEqual(shape(assemble([row('chatHistory'), inChat('x', 2)])), ['history:earlier', 'x@2', 'history:2:last']);
});

test('one depth: low orders first, then assistant, user, system; list order inside a group', () => {
	const blocks = assemble([
		inChat('A', 2),
		inChat('B', 2, { role: 'user' }),
		inChat('C', 2, { injection_order: 50 }),
		inChat('D', 2),
		inChat('E', 2, { role: 'assistant', injection_order: 100 }),
		row('chatHistory'),
	]);
	assert.deepEqual(shape(blocks), ['history:earlier', 'C@2', 'E@2', 'B@2', 'A@2', 'D@2', 'history:2:last']);
});

test('in-chat prompts are dropped when Chat History is off or missing', () => {
	assert.deepEqual(shape(assemble([row('a'), inChat('b', 1), row('chatHistory', {}, false)])), ['a']);
	assert.deepEqual(shape(assemble([row('a'), inChat('b', 1)])), ['a']);
});

test('placeholders with settings can go in-chat; Chat Examples cannot', () => {
	const blocks = assemble([
		inChat('scenario', 3, { system_prompt: true, role: undefined, content: undefined }),
		inChat('dialogueExamples', 3, { system_prompt: true }),
		row('chatHistory'),
	]);
	assert.deepEqual(shape(blocks), ['[dialogueExamples]', 'history:earlier', '[scenario]@3', 'history:3:last']);
	const scenario = blocks.find((b) => b.id === 'scenario');
	assert.equal(scenario?.type === 'placeholder' && scenario.role, 'system');
});
