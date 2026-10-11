/**
 * The list of known macros, and how a macro call is checked and run. Ported
 * from public/scripts/macros/engine/MacroRegistry.js (SillyTavern 1.19.0,
 * AGPL-3.0). Documentation fields (descriptions, examples, categories) are
 * left out; only what changes a result is kept.
 */
import { unmark } from './marks';
import type { LocalVariables } from './variables';

export type ValueType = 'string' | 'integer' | 'number' | 'boolean';

export interface MacroFlags {
	/** `#`: scoped content keeps its whitespace. */
	preserveWhitespace: boolean;
	raw: string[];
}

/** What every macro can read while the prompt is put together. */
export interface MacroEnv {
	variables: LocalVariables;
}

export interface MacroCall {
	name: string;
	/** Arguments with nested macros worked out (raw text if `delayArgResolution`). */
	args: string[];
	flags: MacroFlags;
	isScoped: boolean;
	/** The text between the braces, with nested macros worked out. */
	rawInner: string;
	/** For scoped calls: the tags as typed, and the content between them. */
	scoped?: { open: string; content: string; close: string };
	env: MacroEnv;
}

export interface ArgDef {
	name: string;
	optional?: boolean;
	type?: ValueType | ValueType[];
}

export interface MacroContext {
	args: string[];
	unnamedArgs: string[];
	list: string[] | null;
	flags: MacroFlags;
	isScoped: boolean;
	call: MacroCall;
	env: MacroEnv;
	/** Works out macros in more text, with the same variables. */
	resolve: (text: string) => string;
	trimContent: (content: string) => string;
}

export type MacroHandler = (context: MacroContext) => unknown;

export interface MacroOptions {
	aliases?: string[];
	unnamedArgs?: number | ArgDef[];
	list?: boolean;
	strictArgs?: boolean;
	/** Arguments are passed as typed; the handler works them out itself (for {{if}}). */
	delayArgResolution?: boolean;
	/** The result is a worked-out value (SRS V-6). */
	value?: boolean;
	/** Arguments keep their value marks, because the handler returns them as output. */
	keepMarks?: boolean;
	handler: MacroHandler;
}

export interface MacroDefinition {
	name: string;
	aliasOf: string | null;
	minArgs: number;
	maxArgs: number;
	unnamedArgDefs: ArgDef[];
	list: { min: number; max: number | null } | null;
	strictArgs: boolean;
	delayArgResolution: boolean;
	value: boolean;
	keepMarks: boolean;
	handler: MacroHandler;
}

/** The engine functions a handler can call. */
export interface MacroEngineHooks {
	resolve: (text: string, env: MacroEnv) => string;
	trimContent: (content: string) => string;
}

export class MacroRegistry {
	private readonly macros = new Map<string, MacroDefinition>();

	register(name: string, options: MacroOptions): void {
		const definition = buildDefinition(name, options);
		this.macros.set(name.toLowerCase(), definition);
		for (const alias of options.aliases ?? []) {
			this.macros.set(alias.toLowerCase(), { ...definition, name: alias, aliasOf: name });
		}
	}

	get(name: string): MacroDefinition | undefined {
		if (!name.trim()) return undefined;
		return this.macros.get(name.trim().toLowerCase());
	}

	/** The macro itself, when `name` is an alias. */
	getPrimary(name: string): MacroDefinition | undefined {
		const def = this.get(name);
		return def?.aliasOf ? this.get(def.aliasOf) : def;
	}
}

function buildDefinition(name: string, options: MacroOptions): MacroDefinition {
	let unnamedArgDefs: ArgDef[] = [];
	let minArgs = 0;
	let maxArgs = 0;
	if (Array.isArray(options.unnamedArgs)) {
		unnamedArgDefs = options.unnamedArgs;
		maxArgs = unnamedArgDefs.length;
		minArgs = unnamedArgDefs.findIndex((d) => d.optional);
		if (minArgs === -1) minArgs = maxArgs;
	} else if (typeof options.unnamedArgs === 'number') {
		minArgs = maxArgs = options.unnamedArgs;
		unnamedArgDefs = Array.from({ length: maxArgs }, (_, i) => ({ name: `arg${i + 1}` }));
	}
	return {
		name,
		aliasOf: null,
		minArgs,
		maxArgs,
		unnamedArgDefs,
		list: options.list ? { min: 0, max: null } : null,
		strictArgs: options.strictArgs ?? true,
		delayArgResolution: options.delayArgResolution ?? false,
		value: options.value ?? false,
		keepMarks: options.keepMarks ?? false,
		handler: options.handler,
	};
}

/** Runs a call. Throws if the arguments don't fit, so the caller can keep the macro as typed. */
export function executeMacro(call: MacroCall, def: MacroDefinition, engine: MacroEngineHooks): string {
	const args = def.keepMarks ? call.args : call.args.map(unmark);
	if (!isArgsValid(def, args) && def.strictArgs) {
		throw new Error(`Macro "${def.name}" called with ${args.length} arguments.`);
	}

	const unnamedArgs = args.slice(0, Math.min(args.length, def.maxArgs));
	const list = !def.list ? null : args.length > def.maxArgs ? args.slice(def.maxArgs) : [];
	validateArgTypes(def, unnamedArgs);

	const result = def.handler({
		args,
		unnamedArgs,
		list,
		flags: call.flags,
		isScoped: call.isScoped,
		call,
		env: call.env,
		resolve: (text) => engine.resolve(text, call.env),
		trimContent: engine.trimContent,
	});
	return normalize(result);
}

function isArgsValid(def: MacroDefinition, args: string[]): boolean {
	if (!def.list) return args.length >= def.minArgs && args.length <= def.maxArgs;
	if (args.length < def.minArgs + def.list.min) return false;
	const listCount = Math.max(0, args.length - def.maxArgs);
	return def.list.max === null || listCount <= def.list.max;
}

function validateArgTypes(def: MacroDefinition, unnamedArgs: string[]): void {
	const count = Math.min(def.unnamedArgDefs.length, unnamedArgs.length);
	for (let i = 0; i < count; i++) {
		const type = def.unnamedArgDefs[i]!.type ?? 'string';
		const types = Array.isArray(type) ? type : [type];
		if (!types.some((t) => isValueOfType(unnamedArgs[i]!, t)) && def.strictArgs) {
			throw new Error(`Macro "${def.name}" argument ${i + 1} should be ${type}.`);
		}
	}
}

function isValueOfType(value: string, type: ValueType): boolean {
	const trimmed = value.trim();
	if (type === 'string') return true;
	if (type === 'integer') return /^-?\d+$/.test(trimmed);
	if (type === 'number') return Number.isFinite(Number(trimmed));
	return isTrueBoolean(trimmed) || isFalseBoolean(trimmed);
}

/** MacroEngine.normalizeMacroResult: any result as text. */
export function normalize(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

/** utils.js isTrueBoolean. */
export function isTrueBoolean(arg: string | undefined): boolean {
	return ['on', 'true', '1'].includes(arg?.trim()?.toLowerCase() ?? '');
}

/** utils.js isFalseBoolean. */
export function isFalseBoolean(arg: string | undefined): boolean {
	return ['off', 'false', '0'].includes(arg?.trim()?.toLowerCase() ?? '');
}
