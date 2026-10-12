/**
 * Prompt transfer module (SRS 3.7, M-1, M-5, M-6): reads and changes another
 * preset for Copy to… and Move to…. If that preset is open in an editor tab,
 * the change goes through its open document, so nothing waiting to be saved
 * there is lost and its own Undo still works. Otherwise the file is changed.
 */
import { type App, TFile } from 'obsidian';
import { type IncomingPrompt, PresetDocument } from '../document';
import { kindOf } from '../kinds';
import { type PromptData, readPreset, writePreset } from '../preset';

/** A valid preset in the preset folders. */
export interface PresetListEntry {
	path: string;
	name: string;
	folder: string;
	prompts: number;
}

export interface TransferDeps {
	app: App;
	/** Every valid preset in the preset folders. */
	listPresets(): Promise<PresetListEntry[]>;
	/** The document of an editor tab showing this preset, if one is open. */
	openDocument(path: string): PresetDocument | null;
	/** Opens a preset in a new tab. */
	openPreset(path: string): void;
}

export function presetPort(deps: TransferDeps, currentPath: () => string | undefined) {
	const { app } = deps;

	/** Runs `change` on the preset at `path` and saves it. Null if it isn't a valid preset or saving fails. */
	async function withPreset<T>(path: string, change: (doc: PresetDocument) => T): Promise<T | null> {
		const open = deps.openDocument(path);
		if (open) return change(open);
		const file = app.vault.getFileByPath(path);
		if (!(file instanceof TFile)) return null;
		let result: T | null = null;
		try {
			await app.vault.process(file, (text) => {
				const content = readPreset(text);
				if (!content) return text;
				const doc = new PresetDocument(content);
				result = change(doc);
				return writePreset(text, doc.content);
			});
		} catch (e) {
			console.error('Preset Editor: could not change', path, e);
			return null;
		}
		return result;
	}

	async function documentFor(path: string): Promise<PresetDocument | null> {
		const open = deps.openDocument(path);
		if (open) return open;
		const file = app.vault.getFileByPath(path);
		const content = file ? readPreset(await app.vault.cachedRead(file)) : null;
		return content ? new PresetDocument(content) : null;
	}

	return {
		async presets() {
			const current = currentPath();
			return (await deps.listPresets()).map((p) => ({ ...p, current: p.path === current }));
		},

		async rows(path: string) {
			const doc = await documentFor(path);
			return doc?.rows().map((r) => ({ name: r.prompt.name ?? r.id, placeholder: kindOf(r.id).startsWith('placeholder') })) ?? null;
		},

		async add(path: string, at: number, prompts: IncomingPrompt[]) {
			const added = await withPreset(path, (doc) => doc.insertMany(at, prompts));
			if (!added) return null;
			// M-6: takes them back out. Prompts changed there since stay.
			return () =>
				withPreset(path, (doc) => {
					const kept: string[] = [];
					const drop: string[] = [];
					for (const prompt of added) {
						const now = doc.prompt(prompt.identifier);
						if (!now) continue;
						if (samePrompt(now, prompt)) drop.push(prompt.identifier);
						else kept.push(now.name ?? prompt.identifier);
					}
					doc.removeMany(drop);
					return kept;
				});
		},

		open: (path: string) => deps.openPreset(path),
	};
}

/** True if two prompts have the same fields and values, in any key order. */
function samePrompt(a: Readonly<PromptData>, b: Readonly<PromptData>): boolean {
	return stable(a) === stable(b);
}

function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
	if (value && typeof value === 'object') {
		const entries = Object.entries(value).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
		return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
	}
	return JSON.stringify(value);
}
