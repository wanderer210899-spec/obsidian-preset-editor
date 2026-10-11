/**
 * Splits prompt text into macro tokens. Ported from
 * public/scripts/macros/engine/MacroLexer.js (SillyTavern 1.19.0, AGPL-3.0).
 * Only the tokens and modes are kept; the disabled pipe/filter modes stay out.
 */
import { createToken, Lexer, type CustomPatternMatcherFunc, type TokenType } from 'chevrotain';

const IDENTIFIER_LEXER_PATTERN = /[a-zA-Z][\w-_]*/;

/** Variable shorthand names, as in `.varName` or `$varName`. */
export const MACRO_VARIABLE_SHORTHAND_PATTERN = /[a-zA-Z](?:[\w\-_]*[\w])?/;

const modes = {
	plaintext: 'plaintext_mode',
	macro_def: 'macro_def_mode',
	macro_identifier_end: 'macro_identifier_end_mode',
	macro_args: 'macro_args_mode',
	var_identifier: 'var_identifier_mode',
	var_after_identifier: 'var_after_identifier_mode',
	var_value: 'var_value_mode',
} as const;

/** Matches nothing, so the lexer can leave a mode that has no closing token. */
const popMode = (() => ['']) as unknown as CustomPatternMatcherFunc;

export const Tokens = {
	Plaintext: createToken({ name: 'Plaintext', pattern: /(?:[^{]|\{(?!\{))+/u, line_breaks: true }),
	PlaintextOpenBrace: createToken({ name: 'Plaintext.OpenBrace', pattern: /\{(?=\{\{)/ }),

	Macro: {
		Start: createToken({ name: 'Macro.Start', pattern: /\{\{/ }),
		/** `!` `?` `~` `#` `/`: flags before the name. `/` marks a closing tag, `#` keeps whitespace. */
		Flags: createToken({ name: 'Macro.Flag', pattern: /[!?~#/]/ }),
		FilterFlag: createToken({ name: 'Macro.FilterFlag', pattern: />/ }),
		DoubleSlash: createToken({ name: 'Macro.DoubleSlash', pattern: /\/\// }),
		Identifier: createToken({ name: 'Macro.Identifier', pattern: IDENTIFIER_LEXER_PATTERN }),
		EndOfIdentifier: createToken({
			name: 'Macro.EndOfIdentifier',
			pattern: /(?:\s+|(?=:{1,2})|(?=[|}]))/,
			group: Lexer.SKIPPED,
		}),
		BeforeEnd: createToken({ name: 'Macro.BeforeEnd', pattern: /(?=\}\})/, group: Lexer.SKIPPED }),
		End: createToken({ name: 'Macro.End', pattern: /\}\}/ }),
	},

	Args: {
		DoubleColon: createToken({ name: 'Args.DoubleColon', pattern: /::/ }),
		Colon: createToken({ name: 'Args.Colon', pattern: /:/ }),
		Equals: createToken({ name: 'Args.Equals', pattern: /=/ }),
		Quote: createToken({ name: 'Args.Quote', pattern: /"/ }),
	},

	Identifier: createToken({ name: 'Identifier', pattern: IDENTIFIER_LEXER_PATTERN }),
	WhiteSpace: createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED }),

	Var: {
		LocalPrefix: createToken({ name: 'Var.LocalPrefix', pattern: /\./ }),
		GlobalPrefix: createToken({ name: 'Var.GlobalPrefix', pattern: /\$/ }),
		Identifier: createToken({ name: 'Var.Identifier', pattern: MACRO_VARIABLE_SHORTHAND_PATTERN }),
		Operators: {
			Increment: createToken({ name: 'Var.Increment', pattern: /\+\+/ }),
			Decrement: createToken({ name: 'Var.Decrement', pattern: /--/ }),
			NullishCoalescingEquals: createToken({ name: 'Var.NullishCoalescingEquals', pattern: /\?\?=/ }),
			NullishCoalescing: createToken({ name: 'Var.NullishCoalescing', pattern: /\?\?/ }),
			LogicalOrEquals: createToken({ name: 'Var.LogicalOrEquals', pattern: /\|\|=/ }),
			LogicalOr: createToken({ name: 'Var.LogicalOr', pattern: /\|\|/ }),
			MinusEquals: createToken({ name: 'Var.MinusEquals', pattern: /-=/ }),
			DoubleEquals: createToken({ name: 'Var.DoubleEquals', pattern: /==/ }),
			NotEquals: createToken({ name: 'Var.NotEquals', pattern: /!=/ }),
			GreaterThanOrEqual: createToken({ name: 'Var.GreaterThanOrEqual', pattern: />=/ }),
			GreaterThan: createToken({ name: 'Var.GreaterThan', pattern: />/ }),
			LessThanOrEqual: createToken({ name: 'Var.LessThanOrEqual', pattern: /<=/ }),
			LessThan: createToken({ name: 'Var.LessThan', pattern: /</ }),
			PlusEquals: createToken({ name: 'Var.PlusEquals', pattern: /\+=/ }),
			Equals: createToken({ name: 'Var.Equals', pattern: /=/ }),
		},
	},

	Unknown: createToken({ name: 'Unknown', pattern: /([^}]|\}(?!\}))/ }),
	/** Must always be the last token of a mode. */
	ModePopper: createToken({ name: 'ModePopper', pattern: popMode, line_breaks: false, group: Lexer.SKIPPED }),
};

const enterModes = new Map<string, string>();

/** The token enters `mode` (and can leave the current one first). */
function enter(token: TokenType, mode: string, { andExits = false } = {}): TokenType {
	if (enterModes.has(token.name) && enterModes.get(token.name) !== mode) {
		throw new Error(`Token ${token.name} already enters mode ${enterModes.get(token.name)}.`);
	}
	if (andExits) exits(token);
	token.PUSH_MODE = mode;
	enterModes.set(token.name, mode);
	return token;
}

/** The token leaves the current mode. */
function exits(token: TokenType): TokenType {
	token.POP_MODE = true;
	return token;
}

const V = Tokens.Var.Operators;

export const lexerDefinition = {
	modes: {
		[modes.plaintext]: [Tokens.Plaintext, Tokens.PlaintextOpenBrace, enter(Tokens.Macro.Start, modes.macro_def)],
		[modes.macro_def]: [
			exits(Tokens.Macro.End),
			enter(Tokens.Macro.DoubleSlash, modes.macro_args),
			enter(Tokens.Var.LocalPrefix, modes.var_identifier),
			enter(Tokens.Var.GlobalPrefix, modes.var_identifier),
			Tokens.Macro.Flags,
			Tokens.Macro.FilterFlag,
			Tokens.WhiteSpace,
			enter(Tokens.Macro.Identifier, modes.macro_identifier_end),
			exits(Tokens.ModePopper),
		],
		[modes.macro_identifier_end]: [
			exits(Tokens.Macro.BeforeEnd),
			enter(Tokens.Macro.EndOfIdentifier, modes.macro_args, { andExits: true }),
		],
		[modes.macro_args]: [
			enter(Tokens.Macro.Start, modes.macro_def),
			Tokens.Args.DoubleColon,
			Tokens.Args.Colon,
			Tokens.Args.Equals,
			Tokens.Args.Quote,
			Tokens.Identifier,
			Tokens.WhiteSpace,
			Tokens.Unknown,
			exits(Tokens.ModePopper),
		],
		[modes.var_identifier]: [
			Tokens.WhiteSpace,
			enter(Tokens.Var.Identifier, modes.var_after_identifier, { andExits: true }),
			exits(Tokens.ModePopper),
		],
		[modes.var_after_identifier]: [
			Tokens.WhiteSpace,
			V.Increment,
			V.Decrement,
			enter(V.NullishCoalescingEquals, modes.var_value, { andExits: true }),
			enter(V.NullishCoalescing, modes.var_value, { andExits: true }),
			enter(V.LogicalOrEquals, modes.var_value, { andExits: true }),
			enter(V.LogicalOr, modes.var_value, { andExits: true }),
			enter(V.MinusEquals, modes.var_value, { andExits: true }),
			enter(V.DoubleEquals, modes.var_value, { andExits: true }),
			enter(V.NotEquals, modes.var_value, { andExits: true }),
			enter(V.GreaterThanOrEqual, modes.var_value, { andExits: true }),
			enter(V.GreaterThan, modes.var_value, { andExits: true }),
			enter(V.LessThanOrEqual, modes.var_value, { andExits: true }),
			enter(V.LessThan, modes.var_value, { andExits: true }),
			enter(V.PlusEquals, modes.var_value, { andExits: true }),
			enter(V.Equals, modes.var_value, { andExits: true }),
			exits(Tokens.Macro.BeforeEnd),
			exits(Tokens.ModePopper),
		],
		[modes.var_value]: [
			enter(Tokens.Macro.Start, modes.macro_def),
			Tokens.Identifier,
			Tokens.WhiteSpace,
			Tokens.Unknown,
			exits(Tokens.ModePopper),
		],
	},
	defaultMode: modes.plaintext,
};

let lexer: Lexer | null = null;

/** Built on first use: building it takes a moment. */
export function macroLexer(): Lexer {
	return (lexer ??= new Lexer(lexerDefinition, { traceInitPerf: false }));
}
