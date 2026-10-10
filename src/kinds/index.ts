/**
 * Kinds module: what each kind of prompt allows (SRS 3.3, P-1).
 * Prompts are told apart by identifier, as in SillyTavern
 * (public/scripts/PromptManager.js).
 */

export type PromptKind = 'builtin' | 'placeholder-settings' | 'placeholder' | 'custom';

export interface KindRules {
	editText: boolean;
	settings: boolean;
	remove: boolean;
}

const BUILTIN = ['main', 'nsfw', 'jailbreak', 'enhanceDefinitions'];
const PLACEHOLDER_SETTINGS = [
	'charDescription',
	'charPersonality',
	'scenario',
	'personaDescription',
	'worldInfoBefore',
	'worldInfoAfter',
];
const PLACEHOLDER = ['chatHistory', 'dialogueExamples'];
const FORBID_OVERRIDES = ['main', 'jailbreak'];

const RULES: Record<PromptKind, KindRules> = {
	builtin: { editText: true, settings: true, remove: false },
	'placeholder-settings': { editText: false, settings: true, remove: false },
	placeholder: { editText: false, settings: false, remove: false },
	custom: { editText: true, settings: true, remove: true },
};

export function kindOf(identifier: string): PromptKind {
	if (BUILTIN.includes(identifier)) return 'builtin';
	if (PLACEHOLDER_SETTINGS.includes(identifier)) return 'placeholder-settings';
	if (PLACEHOLDER.includes(identifier)) return 'placeholder';
	return 'custom';
}

export function rulesFor(identifier: string): KindRules {
	return RULES[kindOf(identifier)];
}

/** P-1: "Forbid overrides" is offered only on these prompts. */
export function hasForbidOverrides(identifier: string): boolean {
	return FORBID_OVERRIDES.includes(identifier);
}
