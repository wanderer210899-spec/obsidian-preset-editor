import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Change, onBackspace, onType, pairAt, renamePartner, type Span } from '../src/closing-tags';

/** Types `ch` where `|` is, and shows the result with `|` at the cursor. */
function type(withCursor: string, ch: string, added: Span[] = []): string {
	const pos = withCursor.indexOf('|');
	const text = withCursor.replace('|', '');
	const plan = onType(text, pos, ch, added);
	if (!plan) return text.slice(0, pos) + ch + '|' + text.slice(pos);
	const after = apply(text, plan.changes);
	return after.slice(0, plan.cursor) + '|' + after.slice(plan.cursor);
}

function apply(text: string, changes: Change[]): string {
	for (const c of [...changes].sort((a, b) => b.from - a.from)) text = text.slice(0, c.from) + c.insert + text.slice(c.to);
	return text;
}

test('W-1: typing {{ adds }}, with the cursor in between', () => {
	assert.equal(type('Hi {|', '{'), 'Hi {{|}}');
	assert.equal(type('|', '{'), '{|');
	assert.equal(type('{{|', '{'), '{{{|');
});

test('W-1: typing } in front of an added }} steps over it', () => {
	const added = [{ from: 0, to: 8 }];
	assert.equal(type('{{char|}}', '}', added), '{{char}|}');
	assert.equal(type('{{char}|}', '}', added), '{{char}}|');
	// Not added by auto complete: } types as normal.
	assert.equal(type('{{char|}}', '}'), '{{char}|}}');
});

test('W-1: finishing {{if …}} adds {{/if}}, only when it is not closed yet', () => {
	const added = [{ from: 0, to: 11 }];
	assert.equal(type('{{if mood}|}', '}', added), '{{if mood}}|{{/if}}');
	assert.equal(type('{{if mood}|', '}'), '{{if mood}}|{{/if}}');
	assert.equal(type('{{if::mood}|', '}'), '{{if::mood}}|{{/if}}');
	assert.equal(type('{{if mood}| calm {{/if}}', '}'), '{{if mood}}| calm {{/if}}');
	assert.equal(type('{{if a}} {{if b}| x {{/if}}', '}'), '{{if a}} {{if b}}|{{/if}} x {{/if}}');
});

test('W-1: inline {{if}}, other macros and {{/if}} add nothing (only {{if}}, as a trial)', () => {
	assert.equal(type('{{if mood::calm}|', '}'), '{{if mood::calm}}|');
	assert.equal(type('{{trim}|', '}'), '{{trim}}|');
	assert.equal(type('{{if {{getvar::x}}}|', '}'), '{{if {{getvar::x}}}}|{{/if}}');
	assert.equal(type('{{if a}}x{{/if}|', '}'), '{{if a}}x{{/if}}|');
});

test('W-1: Backspace in an empty {{}} removes both pairs', () => {
	assert.deepEqual(onBackspace('a{{}}b', 3), { changes: [{ from: 1, to: 5, insert: '' }], cursor: 1 });
	assert.equal(onBackspace('a{{x}}b', 3), null);
});

test('W-2: typing the > of <rules> adds </rules>, unless it is closed already', () => {
	assert.equal(type('<rules|', '>'), '<rules>|</rules>');
	assert.equal(type('<rules lang="en"|', '>'), '<rules lang="en">|</rules>');
	assert.equal(type('<rules| text </rules>', '>'), '<rules>| text </rules>');
	assert.equal(type('<br/|', '>'), '<br/>|');
	assert.equal(type('</rules|', '>'), '</rules>|');
	assert.equal(type('a < b |', '>'), 'a < b >|');
});

test('W-3: renaming a tag renames its partner', () => {
	const text = '<rules>x</rules>';
	assert.deepEqual(renamePartner(text, 6, 6, 'x'), { from: 10, to: 15, insert: 'rulesx' });
	assert.deepEqual(renamePartner(text, 10, 15, 'law'), { from: 1, to: 6, insert: 'law' });
	assert.deepEqual(renamePartner(text, 1, 6, ''), { from: 10, to: 15, insert: '' });
	assert.deepEqual(renamePartner('<>x</>', 1, 1, 'a'), { from: 5, to: 5, insert: 'a' });
	// Typing a space (attributes) or a tag with no partner: nothing.
	assert.equal(renamePartner(text, 6, 6, ' '), null);
	assert.equal(renamePartner('<rules>x', 6, 6, 'x'), null);
});

test('W-3: nested tags with the same name rename the right partner', () => {
	const text = '<a><a>x</a></a>';
	assert.deepEqual(renamePartner(text, 2, 2, 'b'), { from: 13, to: 14, insert: 'ab' });
	assert.deepEqual(renamePartner(text, 5, 5, 'b'), { from: 9, to: 10, insert: 'ab' });
});

test('W-4: the cursor in a tag finds its partner, for XML and {{if}}', () => {
	const xml = '<rules>xyz</rules>';
	assert.deepEqual(pairAt(xml, 3), [
		{ from: 0, to: 7 },
		{ from: 10, to: 18 },
	]);
	assert.equal(pairAt(xml, 8), null);
	const ifs = '{{if a}}x{{else}}y{{/if}}';
	assert.deepEqual(pairAt(ifs, 20), [
		{ from: 0, to: 8 },
		{ from: 18, to: 25 },
	]);
	assert.equal(pairAt(ifs, 12), null);
	assert.equal(pairAt('<rules>x', 3), null);
});
