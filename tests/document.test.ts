import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PresetDocument } from '../src/document';
import { kindOf, rulesFor } from '../src/kinds';
import type { PresetContent } from '../src/preset';
import { macroSpans } from '../src/text-editor/highlight';

function sample(): PresetContent {
	return {
		prompts: [
			{ identifier: 'main', name: 'Main Prompt', content: 'hi' },
			{ identifier: 'chatHistory', name: 'Chat History', marker: true },
			{ identifier: 'a', name: 'A', content: '' },
			{ identifier: 'loose', name: 'Not in order' },
		],
		order: [
			{ identifier: 'main', enabled: true },
			{ identifier: 'gone', enabled: true },
			{ identifier: 'chatHistory', enabled: false },
			{ identifier: 'a', enabled: true },
		],
	};
}

const ids = (doc: PresetDocument) => doc.rows().map((r) => r.id);

test('rows follow the main order and skip missing prompts', () => {
	const doc = new PresetDocument(sample());
	assert.deepEqual(ids(doc), ['main', 'chatHistory', 'a']);
	assert.equal(doc.rows()[1]?.enabled, false);
});

test('move, toggle and update change only what they should', () => {
	const doc = new PresetDocument(sample());
	doc.move('a', 0);
	assert.deepEqual(ids(doc), ['a', 'main', 'chatHistory']);
	doc.move('a', 2);
	assert.deepEqual(ids(doc), ['main', 'chatHistory', 'a']);
	doc.setEnabled('chatHistory', true);
	assert.equal(doc.rows()[1]?.enabled, true);
	doc.update('main', { content: 'new', identifier: 'hacked' });
	assert.deepEqual(doc.content.prompts[0], { identifier: 'main', name: 'Main Prompt', content: 'new' });
	assert.ok(doc.content.order.some((e) => e.identifier === 'gone'));
});

test('insert adds a SillyTavern-shaped custom prompt', () => {
	const doc = new PresetDocument(sample());
	const id = doc.insert(1);
	assert.deepEqual(ids(doc), ['main', id, 'chatHistory', 'a']);
	assert.equal(kindOf(id), 'custom');
	assert.deepEqual(Object.keys(doc.content.prompts.at(-1) ?? {}), [
		'identifier', 'system_prompt', 'enabled', 'marker', 'name', 'role', 'content',
		'injection_position', 'injection_depth', 'injection_order', 'injection_trigger', 'forbid_overrides',
	]);
	const end = doc.insert(99);
	assert.equal(ids(doc).at(-1), end);
});

test('remove is undone in place', () => {
	const doc = new PresetDocument(sample());
	const before = JSON.stringify(doc.content);
	doc.remove('a');
	assert.deepEqual(ids(doc), ['main', 'chatHistory']);
	assert.ok(!doc.content.prompts.some((p) => p.identifier === 'a'));
	assert.equal(doc.undo(), true);
	assert.equal(JSON.stringify(doc.content), before);
	assert.equal(doc.undo(), false);
});

test('listeners hear every change', () => {
	const doc = new PresetDocument(sample());
	let n = 0;
	const stop = doc.onChange(() => n++);
	doc.setEnabled('a', false);
	doc.update('a', { name: 'B' });
	stop();
	doc.move('a', 0);
	assert.equal(n, 2);
});

test('prompt kinds follow SRS 3.3', () => {
	assert.equal(kindOf('jailbreak'), 'builtin');
	assert.equal(kindOf('scenario'), 'placeholder-settings');
	assert.equal(kindOf('dialogueExamples'), 'placeholder');
	assert.equal(kindOf('abc-123'), 'custom');
	assert.equal(rulesFor('main').remove, false);
	assert.equal(rulesFor('abc-123').remove, true);
});

test('macro colouring matches the mockup', () => {
	assert.deepEqual(macroSpans('a {{char}} {{getvar::x}} {{if {{user}}}}'), [
		{ from: 2, to: 10, kind: 'macro' },
		{ from: 11, to: 24, kind: 'variable' },
		{ from: 25, to: 30, kind: 'control' },
		{ from: 30, to: 38, kind: 'macro' },
		{ from: 38, to: 40, kind: 'control' },
	]);
});

test('load replaces everything, clears undo and says so', () => {
	const doc = new PresetDocument(sample());
	const causes: string[] = [];
	doc.onChange((cause) => causes.push(cause));
	doc.remove('a');
	doc.load({ prompts: [{ identifier: 'x', name: 'X' }], order: [{ identifier: 'x', enabled: true }] });
	assert.deepEqual(ids(doc), ['x']);
	assert.equal(doc.undo(), false);
	assert.deepEqual(causes, ['edit', 'load']);
});
