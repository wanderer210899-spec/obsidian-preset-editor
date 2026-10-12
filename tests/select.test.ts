import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PresetDocument } from '../src/document';
import type { PresetContent } from '../src/preset';

function sample(): PresetContent {
	return {
		prompts: ['main', 'a', 'b', 'c', 'chatHistory', 'd'].map((identifier) => ({ identifier, name: identifier.toUpperCase(), content: identifier })),
		order: ['main', 'a', 'gone', 'b', 'c', 'chatHistory', 'd'].map((identifier) => ({ identifier, enabled: identifier !== 'c' })),
	};
}

const ids = (doc: PresetDocument) => doc.rows().map((r) => r.id);

test('moveMany: the group lands together, in list order, as one undo step (M-3, M-6)', () => {
	const doc = new PresetDocument(sample());
	// Picked in any order; they keep their list order.
	doc.moveMany(['d', 'a'], 3);
	assert.deepEqual(ids(doc), ['main', 'b', 'c', 'a', 'd', 'chatHistory']);
	assert.ok(doc.content.order.some((e) => e.identifier === 'gone'), 'entries with no prompt stay');
	assert.equal(doc.undo(), 'a');
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd']);
	assert.equal(doc.canUndo(), false);
	doc.moveMany(['b', 'c'], 0);
	assert.deepEqual(ids(doc), ['b', 'c', 'main', 'a', 'chatHistory', 'd']);
	doc.moveMany(['main'], 99);
	assert.equal(ids(doc).at(-1), 'main');
});

test('moveMany that changes nothing adds no undo step', () => {
	const doc = new PresetDocument(sample());
	doc.moveMany(['a', 'b'], 1);
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd']);
	assert.equal(doc.canUndo(), false);
	doc.moveMany(['nope'], 0);
	assert.equal(doc.canUndo(), false);
});

test('removeMany is one undo step, and runs its link on undo and redo (M-6)', () => {
	const doc = new PresetDocument(sample());
	const calls: string[] = [];
	doc.removeMany(['d', 'b', 'missing'], { undo: () => calls.push('undo'), redo: () => calls.push('redo') });
	assert.deepEqual(ids(doc), ['main', 'a', 'c', 'chatHistory']);
	assert.equal(doc.content.prompts.length, 4);
	assert.equal(doc.undo(), 'b');
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd']);
	assert.equal(doc.redo(), 'b');
	assert.deepEqual(ids(doc), ['main', 'a', 'c', 'chatHistory']);
	assert.deepEqual(calls, ['undo', 'redo']);
	assert.equal(doc.undo(), 'b');
	assert.deepEqual(calls, ['undo', 'redo', 'undo']);
});

test('insertMany adds copies at the spot, with on/off kept, as one undo step (M-1)', () => {
	const doc = new PresetDocument(sample());
	const added = doc.insertMany(2, [
		{ prompt: { identifier: 'x', name: 'X', content: 'hello', injection_trigger: ['normal'] }, enabled: false },
		{ prompt: { identifier: 'y', name: 'Y' }, enabled: true },
	]);
	assert.deepEqual(ids(doc), ['main', 'a', 'x', 'y', 'b', 'c', 'chatHistory', 'd']);
	assert.equal(doc.rows()[2]?.enabled, false);
	assert.deepEqual(added.map((p) => p.identifier), ['x', 'y']);
	assert.deepEqual(doc.prompt('x'), { identifier: 'x', name: 'X', content: 'hello', injection_trigger: ['normal'] });
	doc.undo();
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd']);
	assert.equal(doc.prompt('x'), undefined);
});

test('insertMany adds a second prompt when the identifier is taken (M-5)', () => {
	const doc = new PresetDocument(sample());
	const [copy, other] = doc.insertMany(99, [
		{ prompt: { identifier: 'a', name: 'A', content: 'new text' }, enabled: true },
		{ prompt: { identifier: 'gone', name: 'G' }, enabled: true },
	]);
	assert.ok(copy && other);
	assert.notEqual(copy.identifier, 'a');
	assert.notEqual(other.identifier, 'gone');
	assert.equal(doc.prompt('a')?.content, 'a', 'the one already there is not replaced');
	assert.equal(doc.prompt(copy.identifier)?.content, 'new text');
	assert.deepEqual(Object.keys(copy), ['identifier', 'name', 'content'], 'key order kept');
	assert.equal(new Set(doc.content.prompts.map((p) => p.identifier)).size, doc.content.prompts.length);
});
