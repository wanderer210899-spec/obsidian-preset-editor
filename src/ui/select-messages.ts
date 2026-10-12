/**
 * M-7: the words of the select mode messages. One prompt uses its name,
 * several use a count. Pure text in, text out.
 */

/** "Pacing rules" or "3 prompts". */
function what(names: readonly string[]): string {
	return names.length === 1 ? (names[0] ?? '') : `${names.length} prompts`;
}

/** "A", "A and B", or "A, B and 2 more". */
function list(names: readonly string[]): string {
	const [a = '', b = ''] = names;
	if (names.length <= 1) return a;
	if (names.length === 2) return `${a} and ${b}`;
	return `${a}, ${b} and ${names.length - 2} more`;
}

export const deleted = (names: readonly string[]) => `Deleted ${what(names)}`;
export const moved = (names: readonly string[]) => `Moved ${what(names)}`;
export const movedTo = (names: readonly string[], preset: string) => `Moved ${what(names)} to ${preset}`;
export const copiedTo = (names: readonly string[], preset: string) => `Copied ${what(names)} to ${preset}`;

/** M-4: the second line when some picked prompts were left out. */
export function skipped(names: readonly string[]): string {
	return `${list(names)} ${names.length === 1 ? 'stays' : 'stay'}: every preset has its own.`;
}

/** M-4: only built-ins and placeholders were picked. */
export function onlyLocked(names: readonly string[]): string {
	return `${list(names)} can't be copied, moved or deleted.`;
}

/** M-6: prompts changed in the other preset stay there on Undo. */
export function changedStays(names: readonly string[], preset: string): string {
	return names.length === 1
		? `${list(names)} was changed in ${preset}, so it stays there.`
		: `${list(names)} were changed in ${preset}, so they stay there.`;
}

/** Copy to… or Move to… couldn't change the other preset. */
export const couldNotAdd = (preset: string) => `Couldn't add the prompts to ${preset}.`;

/** Undo couldn't take the prompts back out of the other preset. */
export const couldNotTakeBack = (preset: string) => `Couldn't take the prompts back out of ${preset}.`;
