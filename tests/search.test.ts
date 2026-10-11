import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countMatches, findRanges, markParts, matchingIds, normaliseQuery, wrapIndex } from '../src/search';

test('C-4: matches ignore case and spaces around the query', () => {
	const q = normaliseQuery('  Mood ');
	assert.deepEqual(findRanges('mood: MOOD', q), [
		{ from: 0, to: 4 },
		{ from: 6, to: 10 },
	]);
	assert.equal(countMatches('no match here', q), 0);
	assert.deepEqual(findRanges('anything', normaliseQuery('   ')), []);
});

test('C-4: the bar steps through prompts that match, in order, and wraps round', () => {
	const items = [
		{ id: 'a', text: 'Calm' },
		{ id: 'b', text: 'storm' },
		{ id: 'c', text: 'calm again' },
	];
	assert.deepEqual(matchingIds(items, 'calm'), ['a', 'c']);
	assert.deepEqual(matchingIds(items, ''), []);
	assert.equal(wrapIndex(2, 2), 0);
	assert.equal(wrapIndex(-1, 2), 1);
	assert.equal(wrapIndex(5, 0), 0);
});

test('C-4: Preview pieces are split so each match is marked, even across pieces', () => {
	const parts = [
		{ text: 'Mood: ', value: false },
		{ text: 'calm', value: true },
		{ text: ' sea', value: false },
	];
	assert.deepEqual(
		markParts(parts, 'm s').map((p) => [p.text, p.hit, p.value]),
		[
			['Mood: ', false, false],
			['cal', false, true],
			['m', true, true],
			[' s', true, false],
			['ea', false, false],
		],
	);
	assert.deepEqual(
		markParts(parts, 'zzz').map((p) => p.hit),
		[false, false, false],
	);
});
