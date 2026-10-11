/**
 * Text-editor module: the CodeMirror 6 box used for a prompt's text
 * (SRS E-5, 2.4). The rest of the plugin only sees `createPromptEditor`.
 */
import { defaultKeymap } from '@codemirror/commands';
import { Annotation, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	keymap,
	placeholder,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import { autoComplete, autoCompleteSlot, tagMarks } from './closing';
import { macroSpans } from './highlight';

export interface PromptEditor {
	/** Replaces the text, unless it is already the same. Doesn't call `onChange`. */
	setText(text: string): void;
	/** Marks these parts of the text (class `pe-hit`), e.g. search matches. Replaces the last marks. */
	setHits(ranges: readonly { from: number; to: number }[]): void;
	/** W-5: switches auto complete (closing tags while typing) on or off. */
	setAutoComplete(on: boolean): void;
	destroy(): void;
}

export interface PromptEditorOptions {
	text: string;
	placeholder: string;
	/** W-5: close tags while typing (W-1 to W-3). */
	autoComplete: boolean;
	onChange: (text: string) => void;
}

/** Marks changes made by `setText`, so they aren't reported back as typing. */
const fromOutside = Annotation.define<boolean>();

/**
 * Elements get the classes `pe-macro`, `pe-variable`, `pe-control`, `pe-hit`
 * (search) and `pe-pair` (the tag pair the cursor is in).
 * The box has no undo of its own: the plugin's undo timeline covers it (SRS E-6).
 */
export function createPromptEditor(parent: HTMLElement, options: PromptEditorOptions): PromptEditor {
	const view = new EditorView({
		parent,
		doc: options.text,
		extensions: [
			EditorView.lineWrapping,
			keymap.of(defaultKeymap),
			placeholder(options.placeholder),
			EditorView.contentAttributes.of({ spellcheck: 'false', 'aria-label': 'Prompt content' }),
			macroColours(),
			hits,
			autoCompleteSlot.of(autoComplete(options.autoComplete)),
			tagMarks(),
			EditorView.updateListener.of((u) => {
				if (u.docChanged && !u.transactions.some((t) => t.annotation(fromOutside))) options.onChange(u.state.doc.toString());
			}),
		],
	});
	return {
		setText(text) {
			const old = view.state.doc.toString();
			if (text === old) return;
			// Replace only the part that differs, so the cursor stays near the change.
			let start = 0;
			while (start < old.length && start < text.length && old[start] === text[start]) start++;
			let end = 0;
			while (end < old.length - start && end < text.length - start && old[old.length - 1 - end] === text[text.length - 1 - end]) end++;
			view.dispatch({
				changes: { from: start, to: old.length - end, insert: text.slice(start, text.length - end) },
				annotations: fromOutside.of(true),
			});
		},
		setHits(ranges) {
			view.dispatch({ effects: setHitsEffect.of(ranges) });
		},
		setAutoComplete(on) {
			view.dispatch({ effects: autoCompleteSlot.reconfigure(autoComplete(on)) });
		},
		destroy() {
			view.destroy();
		},
	};
}

const HIT = Decoration.mark({ class: 'pe-hit' });
const setHitsEffect = StateEffect.define<readonly { from: number; to: number }[]>();

/** Marks set from outside with `setHits`. They move with the text while typing. */
const hits = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(marks, tr) {
		marks = marks.map(tr.changes);
		for (const e of tr.effects) {
			if (!e.is(setHitsEffect)) continue;
			const len = tr.state.doc.length;
			const builder = new RangeSetBuilder<Decoration>();
			for (const r of e.value) if (r.from < r.to && r.to <= len) builder.add(r.from, r.to, HIT);
			marks = builder.finish();
		}
		return marks;
	},
	provide: (f) => EditorView.decorations.from(f),
});

const MARKS = {
	macro: Decoration.mark({ class: 'pe-macro' }),
	variable: Decoration.mark({ class: 'pe-variable' }),
	control: Decoration.mark({ class: 'pe-control' }),
};

function decorate(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	for (const span of macroSpans(view.state.doc.toString())) builder.add(span.from, span.to, MARKS[span.kind]);
	return builder.finish();
}

function macroColours(): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = decorate(view);
			}
			update(u: ViewUpdate) {
				if (u.docChanged) this.decorations = decorate(u.view);
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
