/**
 * Finds the local variable macros in prompt text as typed, for the Variables
 * panel (SRS T-4, T-6). Nothing is worked out, so a macro inside an {{if}}
 * part that doesn't run still counts.
 */
import type { CstElement, CstNode, IToken } from 'chevrotain';
import { MACRO_VARIABLE_SHORTHAND_PATTERN } from './lexer';
import { parseDocument } from './parser';
import { getArgumentLocation } from './walker';

/** One variable macro: the variable's name as typed, and whether it sets or reads it. */
export interface VariableUse {
	name: string;
	sets: boolean;
}

/** Macros that set or delete a local variable. The name is the first argument. */
const SETS = new Set(['setvar', 'addvar', 'incvar', 'decvar', 'deletevar', 'flushvar', 'setvarkey', 'setvarindex']);
/** Macros that read a local variable. The name is the first argument. */
const READS = new Set(['getvar', 'hasvar', 'varexists', 'getvarkey', 'getvarindex']);
/** Operators that set a variable in `{{.name …}}`. The rest only read it. */
const SET_OPERATORS = new Set(['++', '--', '=', '+=', '-=', '||=', '??=']);
/** `{{if .name}}` and `{{if !.name}}`, as the if macro reads its condition. */
const IF_SHORTHAND = new RegExp(`^!?\\s*\\.(${MACRO_VARIABLE_SHORTHAND_PATTERN.source})$`);

const tokens = (node: CstNode | undefined, key: string) => (node?.children[key] ?? []) as IToken[];
const nodes = (node: CstNode | undefined, key: string) => (node?.children[key] ?? []) as CstNode[];

/** The variable macros in a text, in the order they're typed. Global variables are left out (T-6). */
export function findVariableUses(text: string): VariableUse[] {
	const cst = parseDocument(text);
	if (!cst) return [];
	const found: (VariableUse & { at: number })[] = [];
	const visit = (node: CstNode) => {
		if (node.name === 'macro' && isComplete(node)) {
			const use = useOf(node, text);
			if (use) found.push({ ...use, at: tokens(node, 'Macro.Start')[0]!.startOffset });
		}
		for (const group of Object.values(node.children)) {
			for (const element of group) if (isNode(element)) visit(element);
		}
	};
	visit(cst);
	return found.sort((a, b) => a.at - b.at).map(({ name, sets }) => ({ name, sets }));
}

function useOf(macro: CstNode, text: string): VariableUse | null {
	const expr = nodes(macro, 'variableExpr')[0];
	if (expr) {
		if (tokens(expr, 'Var.scope')[0]?.tokenType.name !== 'Var.LocalPrefix') return null;
		const name = tokens(expr, 'Var.identifier')[0]?.image;
		if (!name) return null;
		const operator = tokens(nodes(expr, 'variableOperator')[0], 'Var.operator')[0]?.image ?? '';
		return { name, sets: SET_OPERATORS.has(operator) };
	}

	// A closing tag such as {{/if}} has no arguments to read.
	if (tokens(macro, 'flags').some((t) => t.image === '/')) return null;
	const body = nodes(macro, 'macroBody')[0];
	const macroName = tokens(body, 'Macro.identifier')[0]?.image.toLowerCase() ?? '';
	const first = nodes(nodes(body, 'arguments')[0], 'argument')[0];
	const location = first && getArgumentLocation(first);
	if (!location) return null;
	const arg = text.slice(location.startOffset, location.endOffset + 1);

	if (SETS.has(macroName)) return { name: arg, sets: true };
	if (READS.has(macroName)) return { name: arg, sets: false };
	const shorthand = macroName === 'if' ? arg.match(IF_SHORTHAND) : null;
	return shorthand ? { name: shorthand[1]!, sets: false } : null;
}

/** A macro closed only by the parser's error recovery is plain text. */
function isComplete(macro: CstNode): boolean {
	const end = tokens(macro, 'Macro.End')[0];
	return !!end && !end.isInsertedInRecovery && Number.isFinite(end.startOffset);
}

function isNode(element: CstElement): element is CstNode {
	return 'children' in element;
}
