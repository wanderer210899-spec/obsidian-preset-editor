/**
 * Walks the syntax tree and works out each macro, left to right. Ported from
 * public/scripts/macros/engine/MacroCstWalker.js (SillyTavern 1.19.0, AGPL-3.0).
 *
 * Changes from SillyTavern:
 * - Variable results are marked as worked-out values (see marks.ts), and
 *   marks are stripped from anything used as input.
 * - Global variable shorthand ($name) stays as typed (SRS V-5).
 * - Calls carry the opening and closing tags of scoped macros, so macros
 *   left as typed can show them.
 * - Position offsets for {{pick}}, and diagnostics, are left out.
 */
import type { CstElement, CstNode, IToken } from 'chevrotain';
import { markValue, unmark } from './marks';
import { parseDocument } from './parser';
import {
	isFalseBoolean,
	normalize,
	type MacroCall,
	type MacroEnv,
	type MacroFlags,
	type MacroRegistry,
} from './registry';

export interface EvaluationContext {
	/** The text being worked on at this level. Tree positions are relative to it. */
	text: string;
	env: MacroEnv;
	registry: MacroRegistry;
	resolveMacro: (call: MacroCall) => string;
	trimContent: (content: string) => string;
}

export interface MacroNodeInfo {
	name: string;
	isClosing: boolean;
	startOffset: number;
	endOffset: number;
	argCount: number;
}

interface Range {
	startOffset: number;
	endOffset: number;
}

interface ScopedContent extends Range {
	closingEndOffset: number;
}

type DocumentItem =
	| ({ type: 'plaintext' } & Range)
	| ({ type: 'macro'; node: CstNode; scopedContent?: ScopedContent; keepRaw?: boolean } & Range);

type MacroItem = Extract<DocumentItem, { type: 'macro' }>;

const tokens = (node: CstNode | undefined, key: string) => (node?.children[key] ?? []) as IToken[];
const nodes = (node: CstNode | undefined, key: string) => (node?.children[key] ?? []) as CstNode[];

/** Works out a whole text. */
export function evaluateDocument(context: EvaluationContext, cst: CstNode): string {
	const items = processScopedMacros(collectDocumentItems(cst), context.registry);
	if (items.length === 0) return context.text;
	return evaluateItems(items, context);
}

/** Name, closing flag, position and argument count of a macro. Null for variable expressions. */
export function extractMacroInfo(macroNode: CstNode): MacroNodeInfo | null {
	if (nodes(macroNode, 'variableExpr')[0]) return null;
	const startToken = tokens(macroNode, 'Macro.Start')[0];
	const endToken = tokens(macroNode, 'Macro.End')[0];
	if (!startToken || !endToken) return null;

	const body = nodes(macroNode, 'macroBody')[0];
	const name = tokens(body, 'Macro.identifier')[0]?.image ?? '';
	if (!name) return null;

	const argumentNodes = nodes(nodes(body, 'arguments')[0], 'argument');
	let isClosing = tokens(macroNode, 'flags').some((t) => t.image === '/');

	// {{///}} lexes as a comment with argument '/', but it closes a scoped comment.
	if (!isClosing && name === '//') {
		const first = argumentNodes[0] && getFirstTokenInNode(argumentNodes[0]);
		if (first?.image.startsWith('/')) isClosing = true;
	}

	return {
		name,
		isClosing,
		startOffset: startToken.startOffset,
		endOffset: endToken.endOffset!,
		argCount: argumentNodes.length,
	};
}

function evaluateItems(items: DocumentItem[], context: EvaluationContext): string {
	const { text } = context;
	let result = '';
	let cursor = 0;
	for (const item of items) {
		if (item.startOffset > cursor) result += text.slice(cursor, item.startOffset);
		if (item.type === 'plaintext' || item.keepRaw) {
			// Unmatched closing tags stay as typed.
			result += text.slice(item.startOffset, item.endOffset + 1);
			cursor = item.endOffset + 1;
		} else {
			result += evaluateMacroNode(item.node, context, item.scopedContent);
			cursor =
				item.scopedContent && item.scopedContent.closingEndOffset > item.endOffset
					? item.scopedContent.closingEndOffset + 1
					: item.endOffset + 1;
		}
	}
	if (cursor < text.length) result += text.slice(cursor);
	return result;
}

function collectDocumentItems(cst: CstNode): DocumentItem[] {
	const items: DocumentItem[] = [];
	for (const token of tokens(cst, 'plaintext')) {
		if (typeof token.startOffset !== 'number' || typeof token.endOffset !== 'number') continue;
		items.push({ type: 'plaintext', startOffset: token.startOffset, endOffset: token.endOffset });
	}
	for (const macroNode of nodes(cst, 'macro')) {
		const endToken = tokens(macroNode, 'Macro.End')[0];
		// A macro closed only by error recovery is plain text, apart from complete macros inside it.
		if (isRecoveryToken(endToken)) {
			flattenIncompleteMacro(macroNode, endToken, items);
			continue;
		}
		items.push({ type: 'macro', ...getMacroRange(macroNode), node: macroNode });
	}
	items.sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);
	return items;
}

function evaluateMacroNode(macroNode: CstNode, context: EvaluationContext, scopedContent?: ScopedContent): string {
	const { text, registry, trimContent } = context;

	const variableExprNode = nodes(macroNode, 'variableExpr')[0];
	if (variableExprNode) return evaluateVariableExpr(macroNode, variableExprNode, context);

	const body = nodes(macroNode, 'macroBody')[0];
	const name = tokens(body, 'Macro.identifier')[0]?.image ?? '';
	const flags = parseFlags(tokens(macroNode, 'flags').map((t) => t.image));

	const range = getMacroRange(macroNode);
	const startToken = tokens(macroNode, 'Macro.Start')[0];
	const endToken = tokens(macroNode, 'Macro.End')[0];
	const innerStart = startToken ? startToken.endOffset! + 1 : range.startOffset;
	const innerEnd = endToken ? endToken.startOffset - 1 : range.endOffset;

	const argumentNodes = nodes(nodes(body, 'arguments')[0], 'argument');
	const delayArgResolution = registry.get(name)?.delayArgResolution === true;

	const args: string[] = [];
	const evaluated: ({ value: string } & Range)[] = [];

	for (const argNode of argumentNodes) {
		const location = getArgumentLocation(argNode);
		const rawArgText = location ? text.slice(location.startOffset, location.endOffset + 1) : '';
		const value = delayArgResolution ? rawArgText : evaluateArgumentNode(argNode, context);
		args.push(value);
		if (location) evaluated.push({ value, ...location });
	}

	let scopedValue = '';
	if (scopedContent) {
		if (scopedContent.startOffset > scopedContent.endOffset) {
			args.push('');
		} else {
			const rawScopedText = text.slice(scopedContent.startOffset, scopedContent.endOffset + 1);
			if (delayArgResolution) {
				scopedValue = rawScopedText;
			} else {
				scopedValue = evaluateRawContent(rawScopedText, context);
				// Scoped content is trimmed unless the '#' flag is set.
				if (!flags.preserveWhitespace) scopedValue = trimContent(scopedValue);
			}
			args.push(scopedValue);
			evaluated.push({ value: scopedValue, ...scopedContent });
		}
	}

	evaluated.sort((a, b) => a.startOffset - b.startOffset);

	const call: MacroCall = {
		name,
		args,
		flags,
		isScoped: scopedContent != null,
		rawInner: buildInner(text, innerStart, innerEnd, evaluated),
		env: context.env,
	};
	if (scopedContent) {
		const opening = buildInner(
			text,
			innerStart,
			innerEnd,
			evaluated.filter((e) => e.startOffset <= innerEnd),
		);
		call.scoped = {
			open: `{{${opening}}}`,
			content: scopedValue,
			close: text.slice(scopedContent.endOffset + 1, scopedContent.closingEndOffset + 1),
		};
	}

	return context.resolveMacro(call);
}

/** The text between the braces, with evaluated arguments in place of the typed ones. */
function buildInner(text: string, innerStart: number, innerEnd: number, evaluated: ({ value: string } & Range)[]) {
	let rawInner = '';
	if (innerStart <= innerEnd) {
		let cursor = innerStart;
		for (const entry of evaluated) {
			if (entry.startOffset > cursor) rawInner += text.slice(cursor, entry.startOffset);
			rawInner += entry.value;
			cursor = entry.endOffset + 1;
		}
		if (cursor <= innerEnd) rawInner += text.slice(cursor, innerEnd + 1);
	}
	return rawInner;
}

type VariableOperation =
	| 'get'
	| 'set'
	| 'inc'
	| 'dec'
	| 'add'
	| 'sub'
	| 'logicalOr'
	| 'nullishCoalescing'
	| 'logicalOrAssign'
	| 'nullishCoalescingAssign'
	| 'equals'
	| 'notEquals'
	| 'greaterThan'
	| 'greaterThanOrEqual'
	| 'lessThan'
	| 'lessThanOrEqual';

const OPERATIONS: Record<string, VariableOperation> = {
	'++': 'inc',
	'--': 'dec',
	'=': 'set',
	'+=': 'add',
	'-=': 'sub',
	'||': 'logicalOr',
	'??': 'nullishCoalescing',
	'||=': 'logicalOrAssign',
	'??=': 'nullishCoalescingAssign',
	'==': 'equals',
	'!=': 'notEquals',
	'>': 'greaterThan',
	'>=': 'greaterThanOrEqual',
	'<': 'lessThan',
	'<=': 'lessThanOrEqual',
};

/** `.name` and `$name` with an optional operator, e.g. `{{.mood = calm}}` or `{{.count++}}`. */
function evaluateVariableExpr(macroNode: CstNode, variableExprNode: CstNode, context: EvaluationContext): string {
	const isGlobal = !tokens(variableExprNode, 'Var.scope').some((t) => t.tokenType.name === 'Var.LocalPrefix');
	const varName = tokens(variableExprNode, 'Var.identifier')[0]?.image ?? '';

	const operatorNode = nodes(variableExprNode, 'variableOperator')[0];
	const operatorImage = tokens(operatorNode, 'Var.operator')[0]?.image;
	const operation: VariableOperation = (operatorImage && OPERATIONS[operatorImage]) || 'get';
	const hasValueExpr = !['get', 'inc', 'dec'].includes(operation);
	const value = hasValueExpr ? evaluateVariableValue(operatorNode!, context) : null;

	// SRS V-5: global variables stay as typed, with nested macros worked out.
	if (isGlobal) {
		const start = tokens(macroNode, 'Macro.Start')[0]!.endOffset! + 1;
		const end = tokens(macroNode, 'Macro.End')[0]!.startOffset - 1;
		if (!value) return `{{${context.text.slice(start, end + 1)}}}`;
		return `{{${context.text.slice(start, value.startOffset)}${value.marked}${context.text.slice(value.endOffset + 1, end + 1)}}}`;
	}

	let cached: string | null = null;
	const lazyValue = () => (cached ??= value ? value.resolve() : '');
	return executeVariableOperation(context.env, varName, operation, lazyValue);
}

function executeVariableOperation(
	env: MacroEnv,
	varName: string,
	operation: VariableOperation,
	lazyValue: () => string,
): string {
	const vars = env.variables;
	const isFalsy = (val: unknown) => !val || isFalseBoolean(normalize(val));
	const compare = (test: (a: number, b: number) => boolean) => {
		const currentNum = Number(vars.get(varName));
		const compareNum = Number(lazyValue());
		if (isNaN(currentNum) || isNaN(compareNum)) return markValue('false');
		return markValue(test(currentNum, compareNum) ? 'true' : 'false');
	};

	switch (operation) {
		case 'get':
			return markValue(normalize(vars.get(varName)));
		case 'set':
			vars.set(varName, lazyValue());
			return '';
		case 'inc':
			return markValue(normalize(vars.inc(varName)));
		case 'dec':
			return markValue(normalize(vars.dec(varName)));
		case 'add':
			vars.add(varName, lazyValue());
			return '';
		case 'sub': {
			const numValue = Number(lazyValue());
			if (!isNaN(numValue)) vars.add(varName, -numValue);
			return '';
		}
		case 'logicalOr': {
			const currentValue = vars.get(varName);
			return markValue(isFalsy(currentValue) ? normalize(lazyValue()) : normalize(currentValue));
		}
		case 'nullishCoalescing':
			return markValue(vars.has(varName) ? normalize(vars.get(varName)) : normalize(lazyValue()));
		case 'logicalOrAssign': {
			const currentValue = vars.get(varName);
			if (isFalsy(currentValue)) {
				vars.set(varName, lazyValue());
				return markValue(normalize(lazyValue()));
			}
			return markValue(normalize(currentValue));
		}
		case 'nullishCoalescingAssign':
			if (!vars.has(varName)) {
				vars.set(varName, lazyValue());
				return markValue(normalize(lazyValue()));
			}
			return markValue(normalize(vars.get(varName)));
		case 'equals':
			return markValue(normalize(vars.get(varName)) === normalize(lazyValue()) ? 'true' : 'false');
		case 'notEquals':
			return markValue(normalize(vars.get(varName)) !== normalize(lazyValue()) ? 'true' : 'false');
		case 'greaterThan':
			return compare((a, b) => a > b);
		case 'greaterThanOrEqual':
			return compare((a, b) => a >= b);
		case 'lessThan':
			return compare((a, b) => a < b);
		case 'lessThanOrEqual':
			return compare((a, b) => a <= b);
	}
}

/**
 * The value after an operator such as `=` or `+=`. `resolve` works out nested
 * macros on first call, as SillyTavern does. `marked` is the same text with
 * its value marks, for a global variable shown as typed.
 */
function evaluateVariableValue(
	operatorNode: CstNode,
	context: EvaluationContext,
): (Range & { resolve: () => string; marked: string }) | null {
	const valueNode = nodes(operatorNode, 'Var.value')[0];
	if (!valueNode) return null;

	const nested = nodes(valueNode, 'macro');
	const ranges = [
		...[...tokens(valueNode, 'Identifier'), ...tokens(valueNode, 'Unknown')].map((t) => ({
			startOffset: t.startOffset,
			endOffset: t.endOffset!,
		})),
		...nested.map(getMacroRange),
	];
	if (ranges.length === 0) return null;

	const startOffset = Math.min(...ranges.map((r) => r.startOffset));
	const endOffset = Math.max(...ranges.map((r) => r.endOffset));
	const { text } = context;

	let marked: string | null = null;
	const evaluate = () => {
		if (marked !== null) return marked;
		if (nested.length === 0) return (marked = text.slice(startOffset, endOffset + 1));
		const sorted = nested.map((node) => ({ node, range: getMacroRange(node) }));
		sorted.sort((a, b) => a.range.startOffset - b.range.startOffset);
		let result = '';
		let cursor = startOffset;
		for (const entry of sorted) {
			if (entry.range.startOffset > cursor) result += text.slice(cursor, entry.range.startOffset);
			result += evaluateMacroNode(entry.node, context);
			cursor = entry.range.endOffset + 1;
		}
		if (cursor <= endOffset) result += text.slice(cursor, endOffset + 1);
		return (marked = result);
	};

	return {
		startOffset,
		endOffset,
		resolve: () => unmark(evaluate()).trim(),
		get marked() {
			return evaluate();
		},
	};
}

function evaluateArgumentNode(argNode: CstNode, context: EvaluationContext): string {
	const location = getArgumentLocation(argNode);
	if (!location) return '';
	return evaluateRawContent(context.text.slice(location.startOffset, location.endOffset + 1), context);
}

/** Works out a piece of text as its own document, including scoped macro pairs inside it. */
function evaluateRawContent(rawContent: string, context: EvaluationContext): string {
	if (!rawContent) return '';
	const cst = parseDocument(rawContent);
	if (!cst?.children) return rawContent;
	const contentContext = { ...context, text: rawContent };
	const items = processScopedMacros(collectDocumentItems(cst), context.registry);
	if (items.length === 0) return rawContent;
	return evaluateItems(items, contentContext);
}

function getMacroRange(macroNode: CstNode): Range {
	const startToken = tokens(macroNode, 'Macro.Start')[0];
	const endToken = tokens(macroNode, 'Macro.End')[0];
	if (startToken && endToken) return { startOffset: startToken.startOffset, endOffset: endToken.endOffset! };
	if (macroNode.location) {
		return { startOffset: macroNode.location.startOffset, endOffset: macroNode.location.endOffset! };
	}
	return { startOffset: 0, endOffset: 0 };
}

/** Adds an incomplete macro's tokens as plain text, keeping complete macros inside it. */
function flattenIncompleteMacro(macroNode: CstNode, excludeToken: IToken | undefined, items: DocumentItem[]) {
	for (const key of Object.keys(macroNode.children)) {
		for (const element of macroNode.children[key] ?? []) {
			if (element === excludeToken) continue;
			if (!isCstNode(element)) {
				if (typeof element.startOffset === 'number') {
					items.push({
						type: 'plaintext',
						startOffset: element.startOffset,
						endOffset: element.endOffset ?? element.startOffset,
					});
				}
				continue;
			}
			const nestedStart = tokens(element, 'Macro.Start')[0];
			const nestedEnd = tokens(element, 'Macro.End')[0];
			if (nestedStart && nestedEnd) {
				if (!isRecoveryToken(nestedEnd)) items.push({ type: 'macro', ...getMacroRange(element), node: element });
				else flattenIncompleteMacro(element, nestedEnd, items);
			} else {
				flattenIncompleteMacro(element, excludeToken, items);
			}
		}
	}
}

function isRecoveryToken(token: IToken | undefined): boolean {
	return (
		token?.isInsertedInRecovery === true || typeof token?.startOffset !== 'number' || Number.isNaN(token.startOffset)
	);
}

function getArgumentLocation(argNode: CstNode): Range | null {
	let startOffset = Number.POSITIVE_INFINITY;
	let endOffset = Number.NEGATIVE_INFINITY;
	for (const key of Object.keys(argNode.children)) {
		for (const element of argNode.children[key] ?? []) {
			const location = isCstNode(element) ? element.location : element;
			if (!location) continue;
			if (location.startOffset < startOffset) startOffset = location.startOffset;
			if (location.endOffset! > endOffset) endOffset = location.endOffset!;
		}
	}
	if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset)) return null;
	return { startOffset, endOffset };
}

function isCstNode(value: CstElement): value is CstNode {
	return !!value && typeof value === 'object' && 'name' in value && 'children' in value;
}

/** The first leaf token by position. Children are grouped by type, so all groups are searched. */
function getFirstTokenInNode(node: CstNode): IToken | null {
	let first: IToken | null = null;
	for (const key of Object.keys(node.children)) {
		for (const element of node.children[key] ?? []) {
			if (isCstNode(element)) continue;
			if (typeof element.startOffset !== 'number' || isNaN(element.startOffset)) continue;
			if (first === null || element.startOffset < first.startOffset) first = element;
		}
	}
	return first;
}

/**
 * Pairs opening and closing tags (`{{if x}}…{{/if}}`). The content between
 * becomes the opening macro's last argument. Only the outermost pairs are
 * found here; inner ones are found when the content is worked out.
 */
function processScopedMacros(items: DocumentItem[], registry: MacroRegistry): DocumentItem[] {
	const macroInfos: { index: number; item: MacroItem; name: string; isClosing: boolean; matched: boolean }[] = [];
	items.forEach((item, index) => {
		if (item.type !== 'macro') return;
		const info = extractMacroInfo(item.node);
		if (info) macroInfos.push({ index, item, name: info.name, isClosing: info.isClosing, matched: false });
	});

	const pairs: { openingIndex: number; closingIndex: number }[] = [];
	const insideScope = new Set<number>();

	for (let i = 0; i < macroInfos.length; i++) {
		const openInfo = macroInfos[i]!;
		if (openInfo.isClosing || openInfo.matched || insideScope.has(openInfo.index)) continue;

		const closingIdx = findMatchingClosingMacro(macroInfos, i, registry);
		if (closingIdx === -1) continue;
		const closeInfo = macroInfos[closingIdx]!;

		// A macro that can't take one more argument keeps both tags as typed.
		if (!canAcceptScopedContent(openInfo.item.node, openInfo.name, registry)) {
			openInfo.item.keepRaw = true;
			closeInfo.item.keepRaw = true;
			openInfo.matched = true;
			closeInfo.matched = true;
			continue;
		}

		openInfo.matched = true;
		closeInfo.matched = true;
		pairs.push({ openingIndex: openInfo.index, closingIndex: closeInfo.index });
		for (let j = openInfo.index + 1; j < closeInfo.index; j++) insideScope.add(j);
	}

	for (const info of macroInfos) {
		if (info.isClosing && !info.matched) info.item.keepRaw = true;
	}
	if (pairs.length === 0) return items;

	const itemsToRemove = new Set<number>();
	for (const pair of pairs) {
		const openingItem = items[pair.openingIndex] as MacroItem;
		const closingItem = items[pair.closingIndex] as MacroItem;
		openingItem.scopedContent = {
			startOffset: openingItem.endOffset + 1,
			endOffset: closingItem.startOffset - 1,
			closingEndOffset: closingItem.endOffset,
		};
		for (let j = pair.openingIndex + 1; j <= pair.closingIndex; j++) itemsToRemove.add(j);
	}
	return items.filter((_, index) => !itemsToRemove.has(index));
}

/** True if one more argument (the scoped content) fits the macro. Unknown macros always accept. */
function canAcceptScopedContent(macroNode: CstNode, macroName: string, registry: MacroRegistry): boolean {
	const def = registry.getPrimary(macroName);
	if (!def) return true;
	if (def.list) return false;
	const body = nodes(macroNode, 'macroBody')[0];
	const newArgCount = nodes(nodes(body, 'arguments')[0], 'argument').length + 1;
	return newArgCount >= def.minArgs && newArgCount <= def.maxArgs;
}

function findMatchingClosingMacro(
	macroInfos: { item: MacroItem; name: string; isClosing: boolean; matched: boolean }[],
	openingIdx: number,
	registry: MacroRegistry,
): number {
	const targetName = macroInfos[openingIdx]!.name.toLowerCase();
	let depth = 1;
	for (let i = openingIdx + 1; i < macroInfos.length; i++) {
		const info = macroInfos[i]!;
		if (info.name.toLowerCase() !== targetName || info.matched) continue;
		if (info.isClosing) {
			depth--;
			if (depth === 0) return i;
		} else if (canAcceptScopedContent(info.item.node, info.name, registry)) {
			// Inline macros such as {{if x::content}} don't need a closing tag.
			depth++;
		}
	}
	return -1;
}

function parseFlags(symbols: string[]): MacroFlags {
	return { preserveWhitespace: symbols.includes('#'), raw: symbols };
}
