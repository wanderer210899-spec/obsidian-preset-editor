import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	buildTree,
	folderChoices,
	nameProblem,
	peek,
	type PresetEntry,
	pushRecent,
	recentPresets,
	searchPresets,
	timeLabel,
	topFolders,
} from '../src/library/catalog';

const P = (path: string, mtime: number, prompts = 10): PresetEntry => ({
	path,
	name: path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, ''),
	folder: path.slice(0, path.lastIndexOf('/')),
	mtime,
	prompts,
});

const presets = [
	P('Presets/Default.json', 100, 14),
	P('Presets/Minimal.json', 50, 9),
	P('Presets/Roleplay/Slow Burn.json', 900, 24),
	P('Presets/Roleplay/Narrator.json', 800, 16),
	P('Presets/Roleplay/Archive/Old.json', 10, 30),
	P('Downloaded/Marinara.json', 300, 22),
];
const folders = ['Presets/Roleplay', 'Presets/Roleplay/Archive', 'Presets/Empty'];

test('top folders drop preset folders inside another one', () => {
	assert.deepEqual(topFolders(['Presets', 'Presets/Roleplay', 'Downloaded', 'Presets']), ['Presets', 'Downloaded']);
	assert.deepEqual(topFolders(['Pre', 'Presets']), ['Pre', 'Presets']);
});

test('tree nests folders and counts only presets directly inside', () => {
	const tree = buildTree(['Presets', 'Downloaded'], folders, presets, 'name');
	assert.deepEqual(
		tree.map((f) => f.name),
		['Downloaded', 'Presets'],
	);
	const top = tree[1]!;
	assert.equal(top.presets.length, 2);
	assert.deepEqual(
		top.children.map((f) => f.name),
		['Empty', 'Roleplay'],
	);
	const rp = top.children[1]!;
	assert.equal(rp.depth, 1);
	assert.deepEqual(
		rp.presets.map((p) => p.name),
		['Narrator', 'Slow Burn'],
	);
	assert.equal(rp.children[0]?.presets.length, 1);
});

test('sorting by last edited puts the newest preset and folder first', () => {
	const tree = buildTree(['Presets', 'Downloaded'], folders, presets, 'edited');
	assert.deepEqual(
		tree.map((f) => f.name),
		['Downloaded', 'Presets'],
	);
	assert.deepEqual(
		tree[1]!.children.map((f) => f.name),
		['Roleplay', 'Empty'],
	);
	assert.deepEqual(
		tree[1]!.children[0]!.presets.map((p) => p.name),
		['Slow Burn', 'Narrator'],
	);
});

test('sorting by most prompts', () => {
	const tree = buildTree(['Presets'], folders, presets, 'prompts');
	assert.deepEqual(
		tree[0]!.presets.map((p) => p.name),
		['Default', 'Minimal'],
	);
});

test('peek shows up to three names', () => {
	const tree = buildTree(['Presets'], folders, presets, 'name');
	assert.equal(peek(tree[0]!), 'Default, Minimal');
	const many = buildTree(['X'], [], ['a', 'b', 'c', 'd'].map((n) => P(`X/${n}.json`, 1)), 'name');
	assert.equal(peek(many[0]!), 'a, b, c…');
});

test('folder choices list every folder, top to bottom', () => {
	assert.deepEqual(
		folderChoices(['Presets', 'Downloaded'], folders).map((c) => `${c.depth}:${c.name}`),
		['0:Downloaded', '0:Presets', '1:Empty', '1:Roleplay', '2:Archive'],
	);
});

test('search looks at names only, ignoring case', () => {
	assert.deepEqual(
		searchPresets(presets, 'NAR', 'name').map((p) => p.name),
		['Marinara', 'Narrator'],
	);
	assert.deepEqual(searchPresets(presets, 'Roleplay', 'name'), []);
	assert.deepEqual(searchPresets(presets, '  ', 'name'), []);
});

test('recent keeps the last four that still exist', () => {
	let recent: string[] = [];
	for (const p of ['Presets/Default.json', 'gone.json', 'Presets/Minimal.json', 'Presets/Default.json']) recent = pushRecent(recent, p);
	assert.deepEqual(recent, ['Presets/Default.json', 'Presets/Minimal.json', 'gone.json']);
	assert.deepEqual(
		recentPresets(recent, presets).map((p) => p.name),
		['Default', 'Minimal'],
	);
});

test('time labels follow the mockup', () => {
	const now = new Date(2026, 9, 12, 20, 0).getTime();
	const ago = (m: number) => now - m * 60000;
	assert.equal(timeLabel(ago(0), now), 'Just now');
	assert.equal(timeLabel(ago(5), now), '5m ago');
	assert.equal(timeLabel(ago(120), now), '2h ago');
	assert.equal(timeLabel(ago(1500), now), 'Yesterday');
	assert.equal(timeLabel(new Date(2026, 9, 3).getTime(), now), '3 Oct');
	assert.equal(timeLabel(new Date(2025, 0, 9).getTime(), now), '9 Jan 2025');
});

test('rename warns about taken names and bad characters', () => {
	assert.equal(nameProblem('Slow burn', ['Slow Burn', 'Other']), 'That name is already used in this folder');
	assert.match(nameProblem('a/b', []) ?? '', /can't contain/);
	assert.equal(nameProblem('New name', ['Slow Burn']), null);
});
