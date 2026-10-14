/**
 * M-7: the words of the select mode messages. One prompt uses its name,
 * several use a count. Pure text in, text out.
 */
import { t } from '../i18n';

/** "Pacing rules" or "3 prompts". */
function what(names: readonly string[]): string {
	return names.length === 1 ? (names[0] ?? '') : t('picker.prompts', { n: names.length });
}

/** "A", "A and B", or "A, B and 2 more". */
function list(names: readonly string[]): string {
	const [a = '', b = ''] = names;
	if (names.length <= 1) return a;
	if (names.length === 2) return t('msg.two', { a, b });
	return t('msg.more', { a, b, n: names.length - 2 });
}

export const deleted = (names: readonly string[]) => t('msg.deleted', { what: what(names) });
export const moved = (names: readonly string[]) => t('msg.moved', { what: what(names) });
export const movedTo = (names: readonly string[], preset: string) => t('msg.movedTo', { what: what(names), preset });
export const copiedTo = (names: readonly string[], preset: string) => t('msg.copiedTo', { what: what(names), preset });

/** M-4: the second line when some picked prompts were left out. */
export function skipped(names: readonly string[]): string {
	return t(names.length === 1 ? 'msg.skippedOne' : 'msg.skipped', { names: list(names) });
}

/** M-4: only built-ins and placeholders were picked. */
export function onlyLocked(names: readonly string[]): string {
	return t('msg.onlyLocked', { names: list(names) });
}

/** M-6: prompts changed in the other preset stay there on Undo. */
export function changedStays(names: readonly string[], preset: string): string {
	return t(names.length === 1 ? 'msg.changedOne' : 'msg.changed', { names: list(names), preset });
}

/** Copy to… or Move to… couldn't change the other preset. */
export const couldNotAdd = (preset: string) => t('msg.couldNotAdd', { preset });

/** Undo couldn't take the prompts back out of the other preset. */
export const couldNotTakeBack = (preset: string) => t('msg.couldNotTakeBack', { preset });
