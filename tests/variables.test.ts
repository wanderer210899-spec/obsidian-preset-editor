import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrderedPrompt } from '../src/assemble';
import type { PromptData } from '../src/preset';
import { filterVariables, listVariables, type VariableInfo } from '../src/variables';

const row = (identifier: string, content: string, fields: Partial<PromptData> = {}, enabled = true): OrderedPrompt => ({
	id: identifier,
	prompt: { identifier, name: identifier, system_prompt: false, role: 'system', content, ...fields },
	enabled,
});

/** A short picture of each variable: name=value set:[…] read:[…] */
const shape = (vars: VariableInfo[]) =>
	vars.map((v) => `${v.name}=${v.value} set:[${v.setIn.map((p) => p.id)}] read:[${v.readIn.map((p) => p.id)}]`);

test('T-1, T-2: first-use order down the list, final values, and where each is set and read', () => {
	const vars = listVariables([
		row('main', 'Hi {{setvar::tone::wistful}}'),
		row('style', '{{setvar::maxWords::250}}{{if {{getvar::tone}} == wistful}}quiet{{/if}} {{getvar::maxWords}}'),
		row('phi', '{{getvar::tone}} {{getvar::maxWords}} {{setvar::tone::calm}}'),
	]);
	assert.deepEqual(shape(vars), ['tone=calm set:[main,phi] read:[style,phi]', 'maxWords=250 set:[style] read:[style,phi]']);
	assert.equal(vars[0]!.readIn[0]!.name, 'style');
});

test('T-1: prompts that are off or only run on another trigger are left out', () => {
	const vars = listVariables([
		row('off', '{{setvar::a::1}}', {}, false),
		row('swipe', '{{setvar::b::1}}', { injection_trigger: ['swipe'] }),
		row('normal', '{{setvar::c::1}}', { injection_trigger: ['normal', 'swipe'] }),
	]);
	assert.deepEqual(shape(vars), ['c=1 set:[normal] read:[]']);
});

test('T-3: a variable that is only read has no "set in" and reads empty', () => {
	assert.deepEqual(shape(listVariables([row('p', '{{getvar::ghost}}')])), ['ghost= set:[] read:[p]']);
});

test('T-4: macros in an {{if}} part that does not run still count; the value only comes from what runs', () => {
	const vars = listVariables([row('p', '{{if .flag}}{{getvar::x}}{{setvar::y::1}}{{else}}{{setvar::y::2}}{{/if}}')]);
	assert.deepEqual(shape(vars), ['flag= set:[] read:[p]', 'x= set:[] read:[p]', 'y=2 set:[p] read:[]']);
});

test('T-5: a read before a later set gets nothing extra', () => {
	const vars = listVariables([row('a', '{{getvar::x}}'), row('b', '{{setvar::x::1}}')]);
	assert.deepEqual(shape(vars), ['x=1 set:[b] read:[a]']);
});

test('T-6: global variables never show', () => {
	const vars = listVariables([row('p', '{{setglobalvar::g::1}}{{getglobalvar::g}}{{$g}}{{$h = 2}}{{if $g}}x{{/if}}')]);
	assert.deepEqual(vars, []);
});

test('every kind of variable macro is sorted into set or read', () => {
	const vars = listVariables([
		row(
			'p',
			[
				'{{addvar::a::1}}{{incvar::b}}{{decvar::c}}{{deletevar::d}}{{flushvar::e}}{{setvarkey::f::k::1}}',
				'{{hasvar::g}}{{varexists::h}}{{getvarkey::i::k}}{{GetVar::j}}{{getvar k}}',
				'{{.l = 1}}{{.m++}}{{.n--}}{{.o += 2}}{{.p -= 1}}{{.q ||= 1}}{{.r ??= 1}}',
				'{{.s}}{{.t == 1}}{{.u || x}}{{.v > 1}}{{if !.w}}x{{/if}}',
			].join(''),
		),
	]);
	const sets = vars.filter((v) => v.setIn.length).map((v) => v.name);
	const reads = vars.filter((v) => v.readIn.length).map((v) => v.name);
	assert.deepEqual(sets, ['a', 'b', 'c', 'd', 'e', 'f', 'l', 'm', 'n', 'o', 'p', 'q', 'r']);
	assert.deepEqual(reads, ['g', 'h', 'i', 'j', 'k', 's', 't', 'u', 'v', 'w']);
});

test('a prompt shows once per list, nested macros count, and deleted variables are empty', () => {
	const vars = listVariables([
		row('p', '{{setvar::a::{{getvar::b}}}}{{setvar::a::2}}{{getvar::a}}{{getvar::a}}'),
		row('q', '{{setvar::d::1}}{{deletevar::d}}'),
	]);
	assert.deepEqual(shape(vars), ['a=2 set:[p] read:[p]', 'b= set:[] read:[p]', 'd= set:[q] read:[]']);
});

test('no variable macros: an empty list', () => {
	assert.deepEqual(listVariables([row('p', 'Plain {{char}} text {{if x}}y{{/if}}')]), []);
	assert.deepEqual(listVariables([]), []);
});

test('closing tags and unclosed macros are not variables', () => {
	assert.deepEqual(shape(listVariables([row('p', '{{/getvar}} {{setvar::x::1')])), []);
});

test('T-7: search looks at names, values, and the prompts under Set in and Read in, ignoring case', () => {
	const vars = listVariables([
		row('Main Prompt', '{{setvar::tone::Wistful}}{{setvar::maxWords::250}}'),
		row('Style rules', '{{getvar::tone}} {{getvar::pacing}}'),
	]);
	const names = (q: string) => filterVariables(vars, q).map((v) => v.name);
	assert.deepEqual(names(''), ['tone', 'maxWords', 'pacing']);
	assert.deepEqual(names('  '), ['tone', 'maxWords', 'pacing']);
	assert.deepEqual(names('MAXW'), ['maxWords']);
	assert.deepEqual(names('wistful'), ['tone']);
	assert.deepEqual(names('250'), ['maxWords']);
	assert.deepEqual(names('main prompt'), ['tone', 'maxWords']);
	assert.deepEqual(names('style'), ['tone', 'pacing']);
	assert.deepEqual(names('nothing like this'), []);
});
