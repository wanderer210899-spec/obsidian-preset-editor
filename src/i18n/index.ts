/**
 * Language module (SRS 3.11): the plugin's own text in English or Simplified
 * Chinese. The plugin sets the language once when it loads; Obsidian restarts
 * when its language changes. Until then, and in tests, the text is English.
 */
import { STRINGS, type StringKey } from './strings';

export type { StringKey };

let chinese = false;

/** N-1: takes Obsidian's language code. Simplified Chinese ("zh") gets Chinese; any other gets English. */
export function setLanguage(code: string): void {
	chinese = code === 'zh';
}

/** The text for `key`. Each {word} in it is filled from `fill`. */
export function t(key: StringKey, fill?: Record<string, string | number>): string {
	const [, en, zh] = STRINGS[key];
	const text: string = chinese ? zh : en;
	if (!fill) return text;
	return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in fill ? String(fill[name]) : whole));
}
