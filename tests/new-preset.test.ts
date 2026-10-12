import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankPresetText, untitledName } from '../src/new-preset';
import { readPreset } from '../src/preset';

test('a new preset is SillyTavern Default with blank prompt text', () => {
	const text = blankPresetText();
	const preset = readPreset(text);
	assert.ok(preset);
	assert.equal(preset.prompts.length, 12);
	assert.ok(preset.prompts.every((p) => !p.content));
	assert.ok(preset.prompts.some((p) => p.content === ''));
	const data = JSON.parse(text);
	assert.equal(typeof data.impersonation_prompt, 'string');
	assert.ok(data.impersonation_prompt.length > 0, 'other text fields are kept');
	assert.match(text, /\n {4}"prompts": \[/, '4-space indents');
});

test('new presets are named Untitled preset, then 1, 2, …', () => {
	assert.equal(untitledName(() => false), 'Untitled preset');
	const taken = new Set(['Untitled preset', 'Untitled preset 1']);
	assert.equal(untitledName((n) => taken.has(n)), 'Untitled preset 2');
});
