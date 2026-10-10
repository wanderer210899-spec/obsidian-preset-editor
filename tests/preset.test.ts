import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { type PresetContent, readPreset, writePreset } from '../src/preset';

const defaultText = readFileSync(new URL('../tests/fixtures/Default.json', import.meta.url), 'utf8');

/** Everything in the file except prompts and the main prompt order. */
function untouched(text: string): unknown {
	const data = JSON.parse(text);
	delete data.prompts;
	for (const list of data.prompt_order) if (String(list.character_id) === '100001') delete list.order;
	return data;
}

test('reads Default.json', () => {
	const preset = readPreset(defaultText);
	assert.ok(preset);
	assert.equal(preset.prompts.length, 12);
	assert.equal(preset.order[0]?.identifier, 'main');
	assert.ok(preset.order.some((entry) => entry.identifier === 'personaDescription'));
});

test('rejects files that are not presets', () => {
	assert.equal(readPreset('not json'), null);
	assert.equal(readPreset('[]'), null);
	assert.equal(readPreset('{"prompts": []}'), null);
	assert.equal(readPreset('{"prompts": [], "prompt_order": []}'), null);
	assert.equal(readPreset('{"prompts": [{}], "prompt_order": [{"character_id": 100001, "order": []}]}'), null);
	assert.ok(readPreset('{"prompts": [], "prompt_order": [{"character_id": "100001", "order": []}]}'));
});

test('saving unchanged content keeps the file byte-identical', () => {
	const preset = readPreset(defaultText) as PresetContent;
	assert.equal(writePreset(defaultText, preset), defaultText);
});

test('edits change only prompts and the main order', () => {
	const preset = readPreset(defaultText) as PresetContent;
	const edited: PresetContent = structuredClone(preset);
	(edited.prompts[0] as { content: string }).content = 'New text with "quotes"\nand a line break';
	edited.prompts.push({ identifier: 'custom-1', name: 'Mine', role: 'user', content: 'Hi', system_prompt: false });
	edited.order.reverse();
	edited.order.push({ identifier: 'custom-1', enabled: true });

	const saved = writePreset(defaultText, edited);
	assert.deepEqual(readPreset(saved), edited);
	assert.deepEqual(untouched(saved), untouched(defaultText));
	assert.ok(!saved.replace(/\r\n/g, '').includes('\n'), 'keeps CRLF line endings');
	assert.match(saved, /\r\n {4}"prompts": \[\r\n {8}\{\r\n {12}"name": "Main Prompt"/);
});

test('bytes outside the edited parts are never rewritten', () => {
	const text = [
		'{',
		'    "temperature": 1.0,',
		'    "note": "caf\\u00e9",',
		'    "seed": 12345678901234567890,',
		'    "prompts": [],',
		'    "prompt_order": [',
		'        { "character_id": 100000, "order": [ { "identifier": "main", "enabled": true } ] },',
		'        { "character_id": 100001, "order": [] }',
		'    ],',
		'    "after": { "nested": [1, 2, {}] }',
		'}',
	].join('\n');
	const edited: PresetContent = {
		prompts: [{ identifier: 'main', name: 'Main Prompt', content: 'x' }],
		order: [{ identifier: 'main', enabled: false }],
	};
	const saved = writePreset(text, edited);
	assert.deepEqual(readPreset(saved), edited);
	for (const line of [0, 1, 2, 3, 5, 6, 8, 9, 10]) assert.ok(saved.includes(text.split('\n')[line] as string));
});
