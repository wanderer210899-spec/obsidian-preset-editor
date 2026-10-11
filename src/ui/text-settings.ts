/**
 * Settings for every prompt text box on the screen (SRS W-5). The editor sets
 * them once; each PromptText reads them, so rows in between don't pass them on.
 */
import { getContext, setContext } from 'svelte';

export interface TextSettings {
	/** W-5: close tags while typing. Read inside an effect to follow changes. */
	readonly autoComplete: boolean;
}

const KEY = Symbol('pe-text-settings');

export function setTextSettings(settings: TextSettings): void {
	setContext(KEY, settings);
}

export function getTextSettings(): TextSettings {
	return getContext<TextSettings | undefined>(KEY) ?? { autoComplete: true };
}
