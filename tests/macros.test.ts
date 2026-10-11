import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workOutMacros } from '../src/macros';

/** Works out `input` after setting the local variables in `vars`. */
function run(input: string, vars: Record<string, string> = {}): string {
	const setup = Object.entries(vars)
		.map(([name, value]) => `{{setvar::${name}::${value}}}`)
		.join('');
	return workOutMacros([setup, input])[1]!.text;
}

/**
 * Cases from SillyTavern's own engine tests (tests/frontend/MacroEngine.e2e.js),
 * as [input, expected, local variables].
 */
const SILLYTAVERN_CASES: [string, string, Record<string, string>?][] = [
	['Start {{newline}} end.', 'Start \n end.'],
	['A {{setvar::test::4}}{{getvar::test}} B {{setvar::test::2}}{{getvar::test}} C', 'A 4 B 2 C'],
	['Reversed: {{reverse::abc}}!', 'Reversed: cba!'],
	['Values: {{reverse abc def}}!', 'Values: fed cba!'],
	['Result: {{setvar::test::0}}{{reverse::{{addvar::test::100}}{{getvar::test}}}}{{setvar::test::0}}', 'Result: 001'],
	['Test: {{unknown::{{newline}}}}', 'Test: {{unknown::\n}}'],
	['Hello{{// comment}}World', 'HelloWorld'],
	['Before{{//}}This entire block is a comment.{{///}}After', 'BeforeAfter'],
	['Start\n{{//}}\n  This entire block is a comment.\n  It can span multiple lines.\n{{///}}\nEnd', 'Start\n\nEnd'],
	['{{trim}}  hello world  {{/trim}}', 'hello world'],
	['{{trim}}  outer {{trim}}  inner  {{/trim}} outer  {{/trim}}', 'outer inner outer'],
	['foo\n\n{{trim}}\n\nbar', 'foobar'],
	['A\n\n{{trim}}\n\nB\n\n{{trim}}\n\nC', 'ABC'],
	['{{/unknown}}', '{{/unknown}}'],
	['{{setvar::x}}value{{/setvar}}{{/user}}{{getvar::x}}', '{{/user}}value'],
	['{{setvar::outer}}before {{setvar::inner}}nested{{/setvar}} after{{/setvar}}{{getvar::outer}} | {{getvar::inner}}', 'before  after | nested'],
	['{{setvar::empty}}{{/setvar}}[{{getvar::empty}}]', '[]'],
	['{{reverse}}hello{{/reverse}}', 'olleh'],
	['{{setvar::myvar::existing}}extra{{/setvar}}{{getvar::myvar}}', '{{setvar::myvar::existing}}extra{{/setvar}}'],
	['{{setvar::ws}}   {{/setvar}}[{{getvar::ws}}]', '[]'],
	['{{#setvar::ws}}   {{/setvar}}[{{getvar::ws}}]', '[   ]'],
	['{{setvar::testvar::{{reverse}}hello{{/reverse}}}} {{getvar::testvar}}', ' olleh'],
	['{{setvar::testvar::{{if 0}}wrong{{else}}correct{{/if}}}} {{getvar::testvar}}', ' correct'],
	['{{if::hello::shown}}', 'shown'],
	['{{if::::hidden}}', ''],
	['{{if noop}}should not show{{/if}}[end]', '[end]'],
	['{{if::notamacro::shown}}', 'shown'],
	['{{setvar::flag::}}{{if {{getvar::flag}}}}hidden{{/if}}[end]', '[end]'],
	['{{if yes}}outer{{if yes}}inner{{/if}}{{/if}}', 'outerinner'],
	['{{if yes}}then{{else}}else{{/if}}', 'then'],
	['{{if yes}}outer-then{{if yes}}inner-then{{else}}inner-else{{/if}}{{else}}outer-else{{/if}}', 'outer-theninner-then'],
	['{{if::}}A{{else}}B{{if::}}C{{else}}D{{/if}}{{/if}}', 'BD'],
	['{{if yes}}  then  {{else}}  else  {{/if}}', 'then'],
	['{{if yes}}\n  then\n{{else}}\n  else\n{{/if}}', 'then'],
	['{{if !yes}}shown{{/if}}[end]', '[end]'],
	['{{if::!}}not shown{{else}}shown{{/if}}', 'not shown'],
	['{{setvar::emptyVar::}}{{if !{{getvar::emptyVar}}}}Empty var{{/if}}', 'Empty var'],
	['{{setvar::bangVar::!hello}}{{if {{getvar::bangVar}}}}Has value{{else}}No value{{/if}}', 'Has value'],
	['{{if::!something}}shown{{/if}}[end]', '[end]'],
	['{{setvar::myvar}}\n  line1\n  line2  \n{{/setvar}}[{{getvar::myvar}}]', '[line1\nline2]'],
	['{{if yes}}\n  trimmed  \n{{/if}}', 'trimmed'],
	['{{setvar::myvar}}\n  # Heading\n  Content here\n{{/setvar}}[{{getvar::myvar}}]', '[# Heading\nContent here]'],
	['{{setvar::myvar}}\n  parent\n    child\n  sibling\n{{/setvar}}[{{getvar::myvar}}]', '[parent\n  child\nsibling]'],
	['{{if yes}}\n  # Title\n  Body text\n{{/if}}', '# Title\nBody text'],
	['{{if false}}\n  Then branch\n{{else}}\n  # Else Title\n  Else body\n{{/if}}', '# Else Title\nElse body'],
	['{{setvar::myvar}}\n  line1\n\n  line2\n{{/setvar}}[{{getvar::myvar}}]', '[line1\n\nline2]'],
	['{{.myvar = test}}Value: {{.myvar}}', 'Value: test'],
	['{{.myvar += 3}}Then: {{.myvar}}', 'Then: 10', { myvar: '7' }],
	['Value:[{{.nonexistent}}]', 'Value:[]'],
	['{{.newcounter++}}', '1'],
	['{{.x = 5}}{{.x++}}{{.x += 10}}{{.x}}', '616'],
	['{{.myvar -= 3}}Then: {{.myvar}}', 'Then: 7', { myvar: '10' }],
	['{{.myvar || fallback}}', 'fallback', { myvar: '' }],
	['{{.myvar ?? fallback}}', 'fallback'],
	['[{{.myvar ?? fallback}}]', '[]', { myvar: '' }],
	['{{.myvar ||= newval}}{{.myvar}}', 'newvalnewval', { myvar: '' }],
	['{{.myvar ??= created}}{{.myvar}}', 'createdcreated'],
	['[{{.myvar ??= newval}}][{{.myvar}}]', '[][]', { myvar: '' }],
	['{{.myvar == hello}}', 'true', { myvar: 'hello' }],
	['{{.myvar > 5}}', 'true', { myvar: '10' }],
	['{{.myvar > 5}}', 'false', { myvar: 'abc' }],
	['{{.myvar > -5}}', 'true', { myvar: '0' }],
	['{{.myvar ?? {{.tracker = evaluated}}fallback}}[{{.tracker}}]', 'exists[]', { myvar: 'exists' }],
	['{{.myvar ?? {{.tracker = evaluated}}fallback}}[{{.tracker}}]', 'fallback[evaluated]'],
	['{{.myvar = {{.tracker = evaluated}}value}}[{{.tracker}}]', '[evaluated]'],
	['{{.myvar = }}[{{.myvar}}]', '[]'],
	['{{.myvar -= }}[{{.myvar}}]', '[10]', { myvar: '10' }],
	['{{.myvar++5}}', '{{.myvar++5}}', { myvar: '5' }],
	['{{.myvar--5}}', '', { myvar: '10' }],
	['{{.myvar -- 5}}', '{{.myvar -- 5}}', { myvar: '10' }],
	['{{if .flag}}Yes{{/if}}', 'Yes', { flag: '1' }],
	['{{if !.flag}}Not set{{/if}}', 'Not set', { flag: '' }],
	['{{if .nonexistent}}Yes{{else}}No{{/if}}', 'No'],
	['{{if .count}}Has count{{else}}No count{{/if}}', 'No count', { count: '0' }],
	['{{if 0}}{{if::1::inner}}{{else}}outer-else{{/if}}', 'outer-else'],
	['{{if 0}}{{if::1::a}}{{if::1::b}}{{else}}found{{/if}}', 'found'],
	['{{hasvar::nonexistent}}', 'false'],
	['{{hasvar::myvar}}', 'true', { myvar: '' }],
	['{{hasvar::myvar}}{{deletevar::myvar}}{{hasvar::myvar}}', 'truefalse', { myvar: 'value' }],
	['{{if {{hasvar::myvar}} == true}}exists{{else}}missing{{/if}}', 'exists', { myvar: '' }],
];

test('matches SillyTavern on its own test cases', () => {
	for (const [input, expected, vars] of SILLYTAVERN_CASES) assert.equal(run(input, vars), expected, input);
});

test('variables carry from one prompt to the next, and start empty every time (V-11)', () => {
	const texts = workOutMacros(['[{{getvar::a}}]{{setvar::a::1}}', '[{{getvar::a}}]']).map((w) => w.text);
	assert.deepEqual(texts, ['[]', '[1]']);
	assert.equal(workOutMacros(['[{{getvar::a}}]'])[0]!.text, '[]');
	assert.equal(run('{{if .mood}}yes{{else}}no{{/if}}'), 'no');
});

test('SillyTavern data stays as typed (V-3)', () => {
	assert.equal(run('Hi {{char}}, I am {{user}}.'), 'Hi {{char}}, I am {{user}}.');
	assert.equal(run('Hello <USER>'), 'Hello {{user}}');
});

test('an {{if}} that depends on a macro left as typed stays as typed, whole (V-12)', () => {
	for (const block of [
		'{{if description}}\n  A {{getvar::a}}\n{{else}}B{{/if}}',
		'{{if !persona}}A{{else}}B{{/if}}',
		'{{if {{char}}}}A{{/if}}',
		'{{if $flag}}yes{{/if}}',
		'{{if {{roll 1d6}}::A}}',
	]) {
		assert.equal(run(block), block);
	}
	// Nothing inside it runs.
	assert.equal(run('{{if char}}{{setvar::a::1}}{{/if}}[{{getvar::a}}]'), '{{if char}}{{setvar::a::1}}{{/if}}[]');
	// A variable holding a macro left as typed can't be decided either.
	assert.equal(run('{{setvar::a::{{user}}}}{{if .a}}A{{/if}}'), '{{if .a}}A{{/if}}');
	// Conditions that can be worked out still choose a branch.
	assert.equal(run('{{if notamacro}}A{{else}}B{{/if}}'), 'A');
	assert.equal(run('{{if noop}}A{{else}}B{{/if}}'), 'B');
});

test('dice, random picks, dates and global variables stay as typed (V-5)', () => {
	const kept = '{{roll 1d6}} {{random::a::b}} {{time}} {{setglobalvar::g::1}}{{getglobalvar::g}} {{$g = 2}}{{$g}}';
	assert.equal(run(kept), kept);
	// Macros inside them are still worked out.
	assert.equal(run('{{random::{{getvar::a}}::b}}', { a: 'x' }), '{{random::x::b}}');
	assert.equal(run('{{$g = {{getvar::a}}}}', { a: 'x' }), '{{$g = x}}');
	// A scoped one keeps its tags.
	assert.equal(run('{{setglobalvar::g}}\n  value\n{{/setglobalvar}}'), '{{setglobalvar::g}}value{{/setglobalvar}}');
});

test('parts mark worked-out values, empty values and macros left as typed (V-6, V-11)', () => {
	const [worked] = workOutMacros(['Mood: {{getvar::mood}}, {{char}}{{setvar::n::3}} {{getvar::n}}']);
	const text = (t: string) => ({ text: t, value: false, kept: false });
	assert.deepEqual(worked!.parts, [
		text('Mood: '),
		{ text: '', value: true, kept: false },
		text(', '),
		{ text: '{{char}}', value: false, kept: true },
		text(' '),
		{ text: '3', value: true, kept: false },
	]);
	assert.equal(worked!.text, 'Mood: , {{char}} 3');
});

test('value marks never change what gets trimmed', () => {
	assert.equal(run('{{if 1}} {{getvar::a}}  b{{/if}}'), 'b');
	assert.equal(run('{{if 1}}\n  {{getvar::a}}x\n    y\n{{/if}}'), 'x\n  y');
	assert.equal(run('a\n{{getvar::e}}\n{{trim}}b'), 'ab');
	assert.equal(run('{{trim}} {{getvar::a}} b {{/trim}}', { a: 'x' }), 'x b');
});
