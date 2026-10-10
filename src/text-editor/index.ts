/**
 * Text-editor module: the CodeMirror 6 box used for a prompt's text
 * (SRS E-5, 2.4). The rest of the plugin only sees `createPromptEditor`.
 */
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	keymap,
	placeholder,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import { macroSpans } from './highlight';

export interface PromptEditor {
	/** Replaces the text, unless it is already the same. */
	setText(text: string): void;
	destroy(): void;
}

export interface PromptEditorOptions {
	text: string;
	placeholder: string;
	onChange: (text: string) => void;
}

/** Elements get the classes `pe-macro`, `pe-variable` and `pe-control`. */
export function createPromptEditor(parent: HTMLElement, options: PromptEditorOptions): PromptEditor {
	const view = new EditorView({
		parent,
		doc: options.text,
		extensions: [
			EditorView.lineWrapping,
			history(),
			keymap.of([...defaultKeymap, ...historyKeymap]),
			placeholder(options.placeholder),
			EditorView.contentAttributes.of({ spellcheck: 'false', 'aria-label': 'Prompt content' }),
			macroColours(),
			EditorView.updateListener.of((u) => {
				if (u.docChanged) options.onChange(u.state.doc.toString());
			}),
		],
	});
	return {
		setText(text) {
			if (text === view.state.doc.toString()) return;
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
		},
		destroy() {
			view.destroy();
		},
	};
}

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
