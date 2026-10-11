/**
 * Which macros the Preview works out, and which it leaves as typed.
 * Handlers are ported from public/scripts/macros/definitions/ (SillyTavern
 * 1.19.0, AGPL-3.0).
 *
 * - Worked out: {{if}}/{{else}} and local variables (SRS V-4), and text
 *   helpers whose result depends only on the prompt text.
 * - Left as typed: everything SillyTavern fills in (V-3), and anything that
 *   can't be worked out in Obsidian, such as dice, random picks, dates and
 *   global variables (V-5). They are still listed, with their arguments, so
 *   tags pair up exactly as in SillyTavern.
 */
import type { CstNode } from 'chevrotain';
import { MACRO_VARIABLE_SHORTHAND_PATTERN } from './lexer';
import { unmark } from './marks';
import { parseDocument } from './parser';
import { isFalseBoolean, MacroRegistry, normalize, type MacroHandler, type MacroOptions } from './registry';
import { extractMacroInfo } from './walker';

/** {{else}} leaves this behind for the enclosing {{if}} to split on. */
export const ELSE_MARKER = '\u0000\u001FELSE\u001F\u0000';

/** Shows a macro as typed. A scoped one keeps its opening and closing tags. */
const keepAsTyped: MacroHandler = ({ call }) =>
	call.scoped ? call.scoped.open + call.scoped.content + call.scoped.close : `{{${call.rawInner}}}`;

/** Macros left as typed, by number of arguments. */
const KEPT: [name: string, aliases: string[], args: MacroOptions['unnamedArgs'] | 'list'][] = [
	// Names, character card and persona (V-3)
	['user', [], 0],
	['char', [], 0],
	['group', ['charIfNotGroup'], 0],
	['groupNotMuted', [], 0],
	['notChar', [], 0],
	['charPrompt', [], 0],
	['charInstruction', [], 0],
	['charDescription', ['description'], 0],
	['charPersonality', ['personality'], 0],
	['charScenario', ['scenario'], 0],
	['persona', [], 0],
	['mesExamplesRaw', [], 0],
	['mesExamples', [], 0],
	['charDepthPrompt', [], 0],
	['charCreatorNotes', ['creatorNotes'], 0],
	['charFirstMessage', ['greeting'], [{ name: 'index', optional: true }]],
	['charVersion', ['version', 'char_version'], 0],
	['model', [], 0],
	['original', [], 0],
	['isMobile', [], 0],
	// Chat and app state (V-3)
	['input', [], 0],
	['maxPrompt', ['maxPromptTokens'], 0],
	['maxContext', ['maxContextTokens'], 0],
	['maxResponse', ['maxResponseTokens'], 0],
	['outlet', [], 1],
	['lastMessage', [], 0],
	['lastMessageId', [], 0],
	['lastUserMessage', [], 0],
	['lastCharMessage', [], 0],
	['firstIncludedMessageId', [], 0],
	['firstDisplayedMessageId', [], 0],
	['lastSwipeId', [], 0],
	['currentSwipeId', [], 0],
	['allChatRange', [], 0],
	['lastGenerationType', [], 0],
	['hasExtension', [], 1],
	// Instruct and context templates (V-3)
	['instructStoryStringPrefix', [], 0],
	['instructStoryStringSuffix', [], 0],
	['instructUserPrefix', ['instructInput'], 0],
	['instructUserSuffix', [], 0],
	['instructAssistantPrefix', ['instructOutput'], 0],
	['instructAssistantSuffix', ['instructSeparator'], 0],
	['instructSystemPrefix', [], 0],
	['instructSystemSuffix', [], 0],
	['instructFirstAssistantPrefix', ['instructFirstOutputPrefix'], 0],
	['instructLastAssistantPrefix', ['instructLastOutputPrefix'], 0],
	['instructStop', [], 0],
	['instructUserFiller', [], 0],
	['instructSystemInstructionPrefix', [], 0],
	['instructFirstUserPrefix', ['instructFirstInput'], 0],
	['instructLastUserPrefix', ['instructLastInput'], 0],
	['defaultSystemPrompt', ['instructSystem', 'instructSystemPrompt'], 0],
	['systemPrompt', [], 0],
	['exampleSeparator', ['chatSeparator'], 0],
	['chatStart', [], 0],
	// Dice, random picks, dates and times (V-5)
	['roll', [], 1],
	['random', [], 'list'],
	['pick', [], 'list'],
	['time', [], [{ name: 'offset', optional: true }]],
	['date', [], 0],
	['weekday', [], 0],
	['isotime', [], 0],
	['isodate', [], 0],
	['datetimeformat', [], 1],
	['idleDuration', ['idle_duration'], 0],
	['timeDiff', [], 2],
	// Global variables (V-5)
	['setglobalvar', [], 2],
	['addglobalvar', [], 2],
	['incglobalvar', [], 1],
	['decglobalvar', [], 1],
	['getglobalvar', [], 1],
	['hasglobalvar', ['globalvarexists'], 1],
	['deleteglobalvar', ['flushglobalvar'], 1],
	['setglobalvarkey', ['setglobalvarindex'], 3],
	['getglobalvarkey', ['getglobalvarindex'], 2],
];

export function buildRegistry(): MacroRegistry {
	const registry = new MacroRegistry();
	registerTextMacros(registry);
	registerConditionMacros(registry);
	registerVariableMacros(registry);
	for (const [name, aliases, args] of KEPT) {
		registry.register(name, {
			aliases,
			...(args === 'list' ? { list: true } : { unnamedArgs: args }),
			handler: keepAsTyped,
		});
	}
	return registry;
}

/** core-macros.js: helpers whose result depends only on the prompt text. */
function registerTextMacros(registry: MacroRegistry): void {
	const count = [{ name: 'count', optional: true, type: 'integer' as const }];
	registry.register('space', { unnamedArgs: count, handler: ({ unnamedArgs: [n] }) => ' '.repeat(Number(n ?? 1)) });
	registry.register('newline', { unnamedArgs: count, handler: ({ unnamedArgs: [n] }) => '\n'.repeat(Number(n ?? 1)) });
	registry.register('noop', { handler: () => '' });
	// Unscoped {{trim}} is removed with the line breaks around it after everything else.
	registry.register('trim', {
		unnamedArgs: [{ name: 'content', optional: true }],
		keepMarks: true,
		handler: ({ unnamedArgs: [content], isScoped }) => (isScoped ? (content ?? '') : '{{trim}}'),
	});
	registry.register('reverse', {
		unnamedArgs: 1,
		handler: ({ unnamedArgs: [value] }) => Array.from(value!).reverse().join(''),
	});
	registry.register('//', { aliases: ['comment'], unnamedArgs: 1, handler: () => '' });
	// Banned words only apply to Text Completion; in a Chat Completion preset the macro is removed.
	registry.register('banned', { unnamedArgs: 1, handler: () => '' });
}

/** core-macros.js: {{if}} and {{else}}. */
function registerConditionMacros(registry: MacroRegistry): void {
	const varShorthand = new RegExp(`^([.$])(${MACRO_VARIABLE_SHORTHAND_PATTERN.source})$`);

	registry.register('if', {
		unnamedArgs: 2,
		// Only the chosen branch is worked out, so a {{setvar}} in the other branch never runs.
		delayArgResolution: true,
		handler: ({ unnamedArgs: [rawCondition = '', rawContent = ''], flags, resolve, trimContent }) => {
			let inverted = false;
			let condition = rawCondition;
			if (/^\s*!/.test(rawCondition)) {
				inverted = true;
				condition = rawCondition.replace(/^\s*!\s*/, '');
			}
			condition = unmark(resolve(condition));

			// `.name` or `$name`, or the name of a macro that needs no arguments.
			const shorthand = condition.match(varShorthand);
			if (shorthand) {
				const macro = shorthand[1] === '.' ? 'getvar' : 'getglobalvar';
				condition = unmark(resolve(`{{${macro}::${shorthand[2]}}}`));
			} else if (registry.getPrimary(condition)?.minArgs === 0) {
				condition = unmark(resolve(`{{${condition}}}`));
			}

			// Anything left as typed is not empty, so it counts as true (V-3).
			let isFalsy = condition === '' || isFalseBoolean(condition);
			if (inverted) isFalsy = !isFalsy;

			const { thenBranch, elseBranch } = splitOnTopLevelElse(rawContent);
			const chosen = isFalsy ? elseBranch : thenBranch;
			if (chosen === undefined) return '';
			const result = resolve(chosen);
			return flags.preserveWhitespace ? result : trimContent(result);
		},
	});

	registry.register('else', { handler: () => ELSE_MARKER });
}

/** Splits on the first {{else}} that isn't inside a nested scoped {{if}}. */
function splitOnTopLevelElse(content: string): { thenBranch: string; elseBranch: string | undefined } {
	const macroNodes = (parseDocument(content)?.children.macro ?? []) as CstNode[];
	let depth = 0;
	for (const node of macroNodes) {
		const info = extractMacroInfo(node);
		if (!info) continue;
		// Only {{if condition}} with no inline content waits for a {{/if}}.
		if (info.name === 'if' && !info.isClosing && info.argCount === 1) depth++;
		else if (info.name === 'if' && info.isClosing) depth--;
		else if (info.name === 'else' && depth === 0) {
			return { thenBranch: content.slice(0, info.startOffset), elseBranch: content.slice(info.endOffset + 1) };
		}
	}
	return { thenBranch: content, elseBranch: undefined };
}

/** variable-macros.js: local variables (V-4). Reads are worked-out values. */
function registerVariableMacros(registry: MacroRegistry): void {
	registry.register('setvar', {
		unnamedArgs: 2,
		handler: ({ unnamedArgs: [name, value], env }) => void env.variables.set(name!, value),
	});
	registry.register('addvar', {
		unnamedArgs: 2,
		handler: ({ unnamedArgs: [name, value], env }) => void env.variables.add(name!, value),
	});
	registry.register('incvar', {
		unnamedArgs: 1,
		value: true,
		handler: ({ unnamedArgs: [name], env }) => normalize(env.variables.inc(name!)),
	});
	registry.register('decvar', {
		unnamedArgs: 1,
		value: true,
		handler: ({ unnamedArgs: [name], env }) => normalize(env.variables.dec(name!)),
	});
	registry.register('getvar', {
		unnamedArgs: 1,
		value: true,
		handler: ({ unnamedArgs: [name], env }) => normalize(env.variables.get(name!)),
	});
	registry.register('hasvar', {
		aliases: ['varexists'],
		unnamedArgs: 1,
		value: true,
		handler: ({ unnamedArgs: [name], env }) => (env.variables.has(name!) ? 'true' : 'false'),
	});
	registry.register('deletevar', {
		aliases: ['flushvar'],
		unnamedArgs: 1,
		handler: ({ unnamedArgs: [name], env }) => env.variables.del(name!),
	});
	registry.register('setvarkey', {
		aliases: ['setvarindex'],
		unnamedArgs: 3,
		handler: ({ unnamedArgs: [name, key, value], env }) => void env.variables.set(name!, value, key),
	});
	registry.register('getvarkey', {
		aliases: ['getvarindex'],
		unnamedArgs: 2,
		value: true,
		handler: ({ unnamedArgs: [name, key], env }) => normalize(env.variables.get(name!, key)),
	});
}
