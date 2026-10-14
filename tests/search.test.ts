import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countMatches, findRanges, indexAfter, listMatches, makeQuery, markParts, NO_QUERY, replaceRanges, wrapIndex } from '../src/search';

test('C-4: matches ignore case and spaces around the query', () => {
	const q = makeQuery('  Mood ', false);
	assert.deepEqual(findRanges('mood: MOOD', q), [
		{ from: 0, to: 4 },
		{ from: 6, to: 10 },
	]);
	assert.equal(countMatches('no match here', q), 0);
	assert.deepEqual(findRanges('anything', makeQuery('   ', false)), []);
	assert.deepEqual(findRanges('anything', NO_QUERY), []);
});

test('C-8: Match case only finds the same upper and lower case', () => {
	assert.equal(countMatches('Mood mood MOOD', makeQuery('Mood', true)), 1);
	assert.equal(countMatches('Mood mood MOOD', makeQuery('Mood', false)), 3);
});

test('C-4: symbols in the query are plain text', () => {
	const q = makeQuery('{{.x}}', false);
	assert.deepEqual(findRanges('a {{.x}} b {{.xx}}', q), [{ from: 2, to: 8 }]);
	assert.equal(countMatches('a.b axb', makeQuery('a.b', false)), 1);
});

test('C-7: the bar steps through every match, prompt by prompt, name first, and wraps round', () => {
	const items = [
		{ id: 'a', name: 'Calm', text: 'calm and calm' },
		{ id: 'b', name: 'Storm', text: 'storm' },
		{ id: 'c', name: '', text: 'calm again' },
	];
	assert.deepEqual(listMatches(items, makeQuery('calm', false)), [
		{ id: 'a', inName: true, from: 0, to: 4 },
		{ id: 'a', inName: false, from: 0, to: 4 },
		{ id: 'a', inName: false, from: 9, to: 13 },
		{ id: 'c', inName: false, from: 0, to: 4 },
	]);
	assert.deepEqual(listMatches(items, NO_QUERY), []);
	assert.equal(wrapIndex(2, 2), 0);
	assert.equal(wrapIndex(-1, 2), 1);
	assert.equal(wrapIndex(5, 0), 0);
});

test('C-10: Replace puts the new text in place and goes to the next match after it', () => {
	const ids = ['a', 'b', 'c'];
	const q = makeQuery('cat', false);
	// "cat" → "cats": the new text holds the query, but isn't found again.
	const text = replaceRanges('cat cat', [{ from: 0, to: 3 }], 'cats');
	assert.equal(text, 'cats cat');
	const after = listMatches(
		[
			{ id: 'a', name: '', text },
			{ id: 'c', name: '', text: 'cat' },
		],
		q,
	);
	assert.equal(indexAfter(after, ids, 'a', 0 + 4), 1);
	// The last match in a prompt goes on to the next prompt, and the very last wraps to 0.
	assert.equal(indexAfter(after, ids, 'a', 8 + 4), 2);
	assert.equal(indexAfter(after, ids, 'c', 4), 0);
	// Replace all: every match at once.
	assert.equal(replaceRanges('Cat cat CAT', findRanges('Cat cat CAT', q), 'dog'), 'dog dog dog');
	assert.equal(replaceRanges('no change', [], 'x'), 'no change');
});

test('C-4: Preview pieces are split so each match is marked, even across pieces', () => {
	const parts = [
		{ text: 'Mood: ', value: false },
		{ text: 'calm', value: true },
		{ text: ' sea', value: false },
	];
	assert.deepEqual(
		markParts(parts, makeQuery('m s', false)).map((p) => [p.text, p.hit, p.value]),
		[
			['Mood: ', false, false],
			['cal', false, true],
			['m', true, true],
			[' s', true, false],
			['ea', false, false],
		],
	);
	assert.deepEqual(
		markParts(parts, makeQuery('zzz', false)).map((p) => p.hit),
		[false, false, false],
	);
});

test('C-7: in Preview, only the pieces of the current match are marked "now"', () => {
	const parts = [{ text: 'sea and sea', value: false }];
	assert.deepEqual(
		markParts(parts, makeQuery('sea', false), { from: 8, to: 11 }).map((p) => [p.text, p.hit, p.now]),
		[
			['sea', true, false],
			[' and ', false, false],
			['sea', true, true],
		],
	);
});
