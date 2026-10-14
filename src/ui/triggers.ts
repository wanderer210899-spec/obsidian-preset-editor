import { type StringKey, t } from '../i18n';

/** SillyTavern's trigger values (public/index.html, injection_trigger), with the key of each label. */
export const TRIGGERS: readonly (readonly [value: string, label: StringKey])[] = [
	['normal', 'ps.normal'],
	['continue', 'ps.continue'],
	['impersonate', 'ps.impersonate'],
	['swipe', 'ps.swipe'],
	['regenerate', 'ps.regenerate'],
	['quiet', 'ps.quiet'],
];

/** The label for a trigger value; unknown values are shown as they are. */
export function triggerLabel(value: string): string {
	const key = TRIGGERS.find(([v]) => v === value)?.[1];
	return key ? t(key) : value;
}
