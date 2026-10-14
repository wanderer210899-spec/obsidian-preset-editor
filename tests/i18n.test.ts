import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setLanguage, t } from '../src/i18n';
import { STRINGS } from '../src/i18n/strings';
import { presetCount, timeLabel } from '../src/library/catalog';

test('N-1: Simplified Chinese ("zh") gets Chinese; other languages get English', () => {
	setLanguage('zh');
	assert.equal(t('editor.undo'), '撤销');
	setLanguage('zh-TW');
	assert.equal(t('editor.undo'), 'Undo');
	setLanguage('en');
	assert.equal(t('editor.undo'), 'Undo');
});

test('N-2: words in {braces} are filled in, in both languages', () => {
	assert.equal(t('find.count', { k: 2, n: 5 }), '2 of 5');
	setLanguage('zh');
	assert.equal(t('find.count', { k: 2, n: 5 }), '第 2 个，共 5 个');
	assert.equal(presetCount(3), '3 个预设');
	setLanguage('en');
});

test('N-2: the library dates follow the language', () => {
	const now = new Date(2026, 9, 14, 12).getTime();
	setLanguage('zh');
	assert.equal(timeLabel(now - 5 * 60000, now), '5 分钟前');
	assert.equal(timeLabel(new Date(2026, 9, 3).getTime(), now), '10月3日');
	assert.equal(timeLabel(new Date(2025, 0, 9).getTime(), now), '2025年1月9日');
	setLanguage('en');
	assert.equal(timeLabel(new Date(2026, 9, 3).getTime(), now), '3 Oct');
});

test('N-5: every Chinese line keeps the same {words} as its English', () => {
	const words = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
	for (const [key, [, en, zh]] of Object.entries(STRINGS)) {
		assert.equal(words(zh), words(en), key);
	}
	const [, en, zh] = STRINGS['time.months'];
	assert.equal(zh.split(',').length, en.split(',').length);
});
