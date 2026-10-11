import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foldSummary, toggleOpen } from '../src/ui/folding';

test('C-5: opening a prompt folds the open one; opening the open one folds it', () => {
	assert.equal(toggleOpen(null, 'main'), 'main');
	assert.equal(toggleOpen('main', 'style'), 'style');
	assert.equal(toggleOpen('style', 'style'), null);
});

test('C-1: a folded prompt shows its first line with text and its line count', () => {
	assert.deepEqual(foldSummary('\n  \nYou are {{char}}.\nBe kind.'), { firstLine: 'You are {{char}}.', lines: 4 });
	assert.deepEqual(foldSummary('One line'), { firstLine: 'One line', lines: 1 });
});

test('C-1: an empty prompt has no first line and no count', () => {
	assert.deepEqual(foldSummary(''), { firstLine: '', lines: 0 });
	assert.deepEqual(foldSummary(' \n\n'), { firstLine: '', lines: 0 });
});
