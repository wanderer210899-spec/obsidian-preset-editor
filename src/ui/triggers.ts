/** SillyTavern's trigger values and labels (public/index.html, injection_trigger). */
export const TRIGGERS: readonly (readonly [value: string, label: string])[] = [
	['normal', 'Normal'],
	['continue', 'Continue'],
	['impersonate', 'Impersonate'],
	['swipe', 'Swipe'],
	['regenerate', 'Regenerate'],
	['quiet', 'Quiet'],
];

/** The label for a trigger value; unknown values are shown as they are. */
export function triggerLabel(value: string): string {
	return TRIGGERS.find(([v]) => v === value)?.[1] ?? value;
}
