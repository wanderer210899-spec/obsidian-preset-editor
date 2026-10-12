import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PresetDocument } from '../src/document';
import type { PresetContent } from '../src/preset';
import { PickedActions } from '../src/ui/select-actions';
import * as say from '../src/ui/select-messages';
import type { IncomingPrompt, Message, PresetChoice, PresetPort } from '../src/ui/types';

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

// --- Select mode actions and messages (M-1 to M-7) ---


test('message words: names for one, counts for several (M-7)', () => {
	assert.equal(say.deleted(['Pacing rules']), 'Deleted Pacing rules');
	assert.equal(say.deleted(['a', 'b', 'c']), 'Deleted 3 prompts');
	assert.equal(say.copiedTo(['a', 'b', 'c'], 'Narrator, third person'), 'Copied 3 prompts to Narrator, third person');
	assert.equal(say.movedTo(['a', 'b'], 'N'), 'Moved 2 prompts to N');
	assert.equal(say.moved(['a', 'b', 'c']), 'Moved 3 prompts');
	assert.equal(say.skipped(['Main Prompt']), 'Main Prompt stays: every preset has its own.');
	assert.equal(say.skipped(['Main Prompt', 'Chat History']), 'Main Prompt and Chat History stay: every preset has its own.');
	assert.equal(say.skipped(['M', 'C', 'X', 'Y']), 'M, C and 2 more stay: every preset has its own.');
	assert.equal(say.onlyLocked(['Main Prompt']), "Main Prompt can't be copied, moved or deleted.");
	assert.equal(say.changedStays(['Pacing rules'], 'Narrator'), 'Pacing rules was changed in Narrator, so it stays there.');
	assert.equal(say.changedStays(['A', 'B'], 'Narrator'), 'A and B were changed in Narrator, so they stay there.');
});

/** A pretend second preset, held in a PresetDocument as the real one would be. */
function setup() {
	const doc = new PresetDocument(sample());
	const other = new PresetDocument({ prompts: [{ identifier: 'main', name: 'Main' }], order: [{ identifier: 'main', enabled: true }] });
	const messages: Message[] = [];
	const closed: Message[] = [];
	const opened: string[] = [];
	const port: PresetPort = {
		presets: async () => [],
		rows: async () => [],
		add: async (_path: string, at: number, prompts: IncomingPrompt[]) => {
			const added = other.insertMany(at, prompts);
			return async () => {
				const kept: string[] = [];
				const drop: string[] = [];
				for (const a of added) {
					const now = other.prompt(a.identifier);
					if (!now) continue;
					if (JSON.stringify(now) === JSON.stringify(a)) drop.push(a.identifier);
					else kept.push(now.name ?? a.identifier);
				}
				other.removeMany(drop);
				return kept;
			};
		},
		open: (path) => opened.push(path),
	};
	const notify = (m: Message) => {
		messages.push(m);
		return { close: () => closed.push(m) };
	};
	const actions = new PickedActions(doc, port, notify, () => doc.undo());
	doc.onChange(() => actions.changed());
	const target: PresetChoice = { path: 'N.json', name: 'Narrator', folder: '', prompts: 1, current: false };
	const otherIds = () => other.rows().map((r) => r.id);
	const settle = () => new Promise((r) => setTimeout(r, 0));
	return { doc, other, messages, closed, opened, actions, target, otherIds, settle };
}

test('delete skips locked prompts, says so, and Undo in the message brings them back (M-4, M-7)', () => {
	const { doc, messages, actions } = setup();
	assert.equal(actions.delete(['main', 'a', 'chatHistory', 'b']), true);
	assert.deepEqual(ids(doc), ['main', 'c', 'chatHistory', 'd']);
	assert.deepEqual(messages[0]?.lines, ['Deleted 2 prompts', 'MAIN and CHATHISTORY stay: every preset has its own.']);
	messages[0]?.links.find((l) => l.label === 'Undo')?.run();
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd']);
});

test('only locked prompts picked: nothing happens, and a message says why (M-4)', () => {
	const { doc, messages, actions } = setup();
	assert.equal(actions.delete(['main']), false);
	assert.equal(actions.canSend(['main', 'chatHistory']), false);
	assert.equal(doc.canUndo(), false);
	assert.deepEqual(messages.map((m) => m.lines[0]), ["MAIN can't be copied, moved or deleted.", "MAIN and CHATHISTORY can't be copied, moved or deleted."]);
});

test('a new change closes the Delete and drag messages (M-7)', () => {
	const { doc, messages, closed, actions } = setup();
	actions.drag(['b', 'd'], 0);
	assert.deepEqual(ids(doc), ['b', 'd', 'main', 'a', 'c', 'chatHistory']);
	assert.deepEqual(messages[0]?.lines, ['Moved 2 prompts']);
	assert.equal(closed.length, 0);
	doc.update('a', { content: 'typed' });
	assert.equal(closed[0], messages[0]);
	assert.equal(actions.drag(['b', 'd'], 0), false, 'dropping in the same place does nothing');
	assert.equal(messages.length, 1);
});

test('copy: the other preset gets them; Undo in the message takes back unchanged ones only (M-1, M-6)', async () => {
	const { doc, other, messages, closed, opened, actions, target, otherIds } = setup();
	assert.equal(await actions.copy(target, 1, ['a', 'main', 'b']), true);
	assert.deepEqual(otherIds(), ['main', 'a', 'b']);
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd'], 'this preset is unchanged');
	assert.equal(doc.canUndo(), false, 'Ctrl+Z skips a copy');
	const msg = messages[0];
	assert.deepEqual(msg?.lines, ['Copied 2 prompts to Narrator', 'MAIN stays: every preset has its own.']);
	doc.update('c', { content: 'typed' });
	assert.equal(closed.length, 0, 'a later change here leaves the Copy message open');
	other.update('a', { content: 'changed in Narrator' });
	msg?.links.find((l) => l.label === 'Undo')?.run();
	await new Promise((r) => setTimeout(r, 0));
	assert.deepEqual(otherIds(), ['main', 'a']);
	assert.deepEqual(messages[1]?.lines, ['A was changed in Narrator, so it stays there.']);
	msg?.links.find((l) => l.label === 'Open')?.run();
	assert.deepEqual(opened, ['N.json']);
});

test('move: Undo puts things back in both presets, Redo moves them again (M-6)', async () => {
	const { doc, messages, actions, target, otherIds, settle } = setup();
	assert.equal(await actions.move(target, 0, ['b', 'c']), true);
	assert.deepEqual(ids(doc), ['main', 'a', 'chatHistory', 'd']);
	assert.deepEqual(otherIds(), ['b', 'c', 'main']);
	assert.deepEqual(messages[0]?.lines, ['Moved 2 prompts to Narrator']);
	assert.deepEqual(messages[0]?.links.map((l) => l.label), ['Undo', 'Open']);
	doc.undo();
	await settle();
	assert.deepEqual(ids(doc), ['main', 'a', 'b', 'c', 'chatHistory', 'd']);
	assert.deepEqual(otherIds(), ['main']);
	doc.redo();
	await settle();
	assert.deepEqual(ids(doc), ['main', 'a', 'chatHistory', 'd']);
	assert.deepEqual(otherIds(), ['b', 'c', 'main']);
	doc.undo();
	await settle();
	assert.deepEqual(otherIds(), ['main']);
});
