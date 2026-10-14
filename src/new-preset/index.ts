/**
 * New preset module (SRS L-4, L-5): the text of a new preset and its name.
 * Pure text in, text out. No Obsidian or UI code.
 */
import { t } from '../i18n';
import { readPreset, writePreset } from '../preset';
import { DEFAULT_PRESET } from './default-preset';

/** L-5: SillyTavern's Default preset with every prompt's text left blank. */
export function blankPresetText(): string {
	const text = JSON.stringify(DEFAULT_PRESET, null, 4);
	const content = readPreset(text);
	if (!content) throw new Error('The bundled Default preset is not a valid preset');
	const prompts = content.prompts.map((p) => (p.content === undefined ? p : { ...p, content: '' }));
	return writePreset(text, { prompts, order: content.order });
}

/** L-4: "Untitled preset", then "Untitled preset 1", "Untitled preset 2", … until one is free. */
export function untitledName(isTaken: (name: string) => boolean): string {
	const base = t('library.untitled');
	let name = base;
	for (let i = 1; isTaken(name); i++) name = `${base} ${i}`;
	return name;
}
