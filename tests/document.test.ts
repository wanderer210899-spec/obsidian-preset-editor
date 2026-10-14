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

test('remove is undone in place, and redone', () => {
	const doc = new PresetDocument(sample());
	const before = JSON.stringify(doc.content);
	assert.equal(doc.canUndo(), false);
	doc.remove('a');
	const after = JSON.stringify(doc.content);
	assert.equal(doc.canUndo(), true);
	assert.deepEqual(ids(doc), ['main', 'chatHistory']);
	assert.ok(!doc.content.prompts.some((p) => p.identifier === 'a'));
	assert.equal(doc.undo(), 'a');
	assert.equal(JSON.stringify(doc.content), before);
	assert.equal(doc.canUndo(), false);
	assert.equal(doc.undo(), null);
	assert.equal(doc.redo(), 'a');
	assert.equal(JSON.stringify(doc.content), after);
	assert.equal(doc.redo(), null);
});

test('one timeline: typing, adding, moving and deleting undo in reverse order', () => {
	let clock = 0;
	const doc = new PresetDocument(sample(), () => clock);
	const start = JSON.stringify(doc.content);
	doc.update('main', { content: 'hi!' });
	clock += 100;
	doc.update('main', { content: 'hi!!' }); // same burst of typing
	clock += 1000;
	const added = doc.insert(1);
	clock += 1000;
	doc.update(added, { content: 'x' });
	doc.move('a', 0);
	doc.update('a', { role: 'user' });
	doc.remove('chatHistory');
	const end = JSON.stringify(doc.content);
	const undone = [doc.undo(), doc.undo(), doc.undo(), doc.undo(), doc.undo(), doc.undo(), doc.undo()];
	assert.deepEqual(undone, ['chatHistory', 'a', 'a', added, added, 'main', null]);
	assert.equal(JSON.stringify(doc.content), start);
	while (doc.redo());
	assert.equal(JSON.stringify(doc.content), end);
});

test('typing after a pause, or in another field, is a new step', () => {
	let clock = 0;
	const doc = new PresetDocument(sample(), () => clock);
	doc.update('a', { content: '1' });
	clock += 600;
	doc.update('a', { content: '12' });
	clock += 100;
	doc.update('a', { name: 'A2' });
	doc.undo();
	assert.equal(doc.content.prompts[2]?.name, 'A');
	doc.undo();
	assert.equal(doc.content.prompts[2]?.content, '1');
	doc.undo();
	assert.equal(doc.content.prompts[2]?.content, '');
});

test('C-10: replacing text in several prompts is one undo step, never grouped with typing', () => {
	let now = 0;
	const doc = new PresetDocument(sample(), () => now);
	const text = (id: string) => doc.rows().find((r) => r.id === id)?.prompt.content;
	doc.setTexts([
		{ id: 'main', content: 'hello' },
		{ id: 'a', content: 'more' },
	]);
	assert.equal(text('main'), 'hello');
	assert.equal(text('a'), 'more');
	now = 10;
	doc.setTexts([{ id: 'main', content: 'hello!' }]);
	assert.equal(doc.undo(), 'main');
	assert.equal(text('main'), 'hello');
	assert.equal(doc.undo(), 'main');
	assert.equal(text('main'), 'hi');
	assert.equal(text('a'), '');
	assert.equal(doc.canUndo(), false);
	doc.setTexts([{ id: 'main', content: 'hi' }]);
	assert.equal(doc.canUndo(), false, 'no change, no step');
});

test('on/off is not undone, and stays as it is through undo and redo', () => {
	const doc = new PresetDocument(sample());
	doc.setEnabled('a', false);
	assert.equal(doc.canUndo(), false);
	doc.update('a', { name: 'B' });
	doc.setEnabled('a', true);
	doc.undo();
	assert.equal(doc.rows()[2]?.prompt.name, 'A');
	assert.equal(doc.rows()[2]?.enabled, true);
});

test('a new change clears redo; a change to the same value is ignored', () => {
	const doc = new PresetDocument(sample());
	doc.update('a', { name: 'A' });
	assert.equal(doc.canUndo(), false);
	doc.update('a', { name: 'B' });
	doc.undo();
	assert.equal(doc.canRedo(), true);
	doc.move('a', 0);
	assert.equal(doc.canRedo(), false);
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
	assert.equal(doc.canUndo(), false);
	assert.equal(doc.undo(), null);
	assert.deepEqual(causes, ['edit', 'load']);
});
