/**
 * Turns prompt text into a syntax tree of plain text and macros. Ported from
 * public/scripts/macros/engine/MacroParser.js (SillyTavern 1.19.0, AGPL-3.0).
 */
import { CstParser, type CstNode } from 'chevrotain';
import { lexerDefinition, macroLexer, Tokens } from './lexer';

class MacroParser extends CstParser {
	document!: () => CstNode;
	macro!: () => CstNode;
	macroBody!: () => CstNode;
	variableExpr!: () => CstNode;
	variableOperator!: () => CstNode;
	variableValue!: () => CstNode;
	arguments!: () => CstNode;
	argument!: () => CstNode;
	argumentAllowingColons!: () => CstNode;

	constructor() {
		super(lexerDefinition, { traceInitPerf: false, nodeLocationTracking: 'full', recoveryEnabled: true });
		const $ = this;
		const V = Tokens.Var.Operators;

		$.document = $.RULE('document', () => {
			$.MANY(() => {
				$.OR([
					{ ALT: () => $.CONSUME(Tokens.Plaintext, { LABEL: 'plaintext' }) },
					{ ALT: () => $.CONSUME(Tokens.PlaintextOpenBrace, { LABEL: 'plaintext' }) },
					{ ALT: () => $.SUBRULE($.macro) },
					{ ALT: () => $.CONSUME(Tokens.Macro.Start, { LABEL: 'plaintext' }) },
				]);
			});
		});

		// A regular macro or a variable expression (.name / $name).
		$.macro = $.RULE('macro', () => {
			$.CONSUME(Tokens.Macro.Start);
			$.MANY(() => {
				$.OR1([
					{ ALT: () => $.CONSUME(Tokens.Macro.Flags, { LABEL: 'flags' }) },
					{ ALT: () => $.CONSUME(Tokens.Macro.FilterFlag, { LABEL: 'flags' }) },
				]);
			});
			$.OR([{ ALT: () => $.SUBRULE($.variableExpr) }, { ALT: () => $.SUBRULE($.macroBody) }]);
			$.CONSUME(Tokens.Macro.End);
		});

		$.macroBody = $.RULE('macroBody', () => {
			$.OR2([
				{ ALT: () => $.CONSUME(Tokens.Macro.DoubleSlash, { LABEL: 'Macro.identifier' }) },
				{ ALT: () => $.CONSUME(Tokens.Macro.Identifier, { LABEL: 'Macro.identifier' }) },
			]);
			$.OPTION(() => $.SUBRULE($.arguments));
		});

		$.variableExpr = $.RULE('variableExpr', () => {
			$.OR3([
				{ ALT: () => $.CONSUME(Tokens.Var.LocalPrefix, { LABEL: 'Var.scope' }) },
				{ ALT: () => $.CONSUME(Tokens.Var.GlobalPrefix, { LABEL: 'Var.scope' }) },
			]);
			$.CONSUME(Tokens.Var.Identifier, { LABEL: 'Var.identifier' });
			$.OPTION2(() => $.SUBRULE($.variableOperator));
		});

		$.variableOperator = $.RULE('variableOperator', () => {
			$.OR4([
				{ ALT: () => $.CONSUME(V.Increment, { LABEL: 'Var.operator' }) },
				{ ALT: () => $.CONSUME(V.Decrement, { LABEL: 'Var.operator' }) },
				{
					ALT: () => {
						$.OR5([
							{ ALT: () => $.CONSUME(V.NullishCoalescingEquals, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.NullishCoalescing, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.LogicalOrEquals, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.LogicalOr, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.MinusEquals, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.DoubleEquals, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.NotEquals, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.GreaterThanOrEqual, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.GreaterThan, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.LessThanOrEqual, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.LessThan, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.PlusEquals, { LABEL: 'Var.operator' }) },
							{ ALT: () => $.CONSUME(V.Equals, { LABEL: 'Var.operator' }) },
						]);
						$.SUBRULE($.variableValue, { LABEL: 'Var.value' });
					},
				},
			]);
		});

		$.variableValue = $.RULE('variableValue', () => {
			$.MANY2(() => {
				$.OR5([
					{ ALT: () => $.SUBRULE($.macro) },
					{ ALT: () => $.CONSUME(Tokens.Identifier) },
					{ ALT: () => $.CONSUME(Tokens.Unknown) },
				]);
			});
		});

		$.arguments = $.RULE('arguments', () => {
			$.OR([
				{
					ALT: () => {
						$.CONSUME(Tokens.Args.DoubleColon, { LABEL: 'separator' });
						$.AT_LEAST_ONE_SEP({
							SEP: Tokens.Args.DoubleColon,
							DEF: () => $.SUBRULE($.argument, { LABEL: 'argument' }),
						});
					},
				},
				{
					ALT: () => {
						$.OPTION(() => $.CONSUME(Tokens.Args.Colon, { LABEL: 'separator' }));
						$.SUBRULE($.argumentAllowingColons, { LABEL: 'argument' });
					},
					// The first token of an argument is never a double colon, so the two branches can't clash.
					IGNORE_AMBIGUITIES: true,
				},
			]);
		});

		const validArgumentTokens = [
			{ ALT: () => $.SUBRULE($.macro) },
			{ ALT: () => $.CONSUME(Tokens.Identifier) },
			{ ALT: () => $.CONSUME(Tokens.Unknown) },
			{ ALT: () => $.CONSUME(Tokens.Args.Colon) },
			{ ALT: () => $.CONSUME(Tokens.Args.Equals) },
			{ ALT: () => $.CONSUME(Tokens.Args.Quote) },
		];

		$.argument = $.RULE('argument', () => {
			$.MANY(() => $.OR([...validArgumentTokens]));
		});
		$.argumentAllowingColons = $.RULE('argumentAllowingColons', () => {
			$.AT_LEAST_ONE(() => $.OR([...validArgumentTokens, { ALT: () => $.CONSUME(Tokens.Args.DoubleColon) }]));
		});

		this.performSelfAnalysis();
	}

	/** Parses a whole text. Returns null for empty text. */
	parseDocument(input: string): CstNode | null {
		if (!input) return null;
		this.input = macroLexer().tokenize(input).tokens;
		return this.document();
	}
}

let parser: MacroParser | null = null;

/** Parses prompt text into a syntax tree. The parser is built on first use. */
export function parseDocument(input: string): CstNode | null {
	return (parser ??= new MacroParser()).parseDocument(input);
}
