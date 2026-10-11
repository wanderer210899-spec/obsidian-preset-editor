/**
 * Joins the closing-tags module to CodeMirror (SRS 3.9). Auto complete
 * (W-1 to W-3) can be switched on and off; tag marks (W-4) always show.
 */
import { Compartment, EditorSelection, EditorState, type Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { onBackspace, onType, pairAt, type Plan, renamePartner, type Span } from '../closing-tags';

const addedEffect = StateEffect.define<Span>();

/** `{{…}}` macros whose `}}` was added for the user, kept while the cursor is inside them. */
const added = StateField.define<Span[]>({
	create: () => [],
	update(list, tr) {
		const next = list.map((m) => ({ from: tr.changes.mapPos(m.from, 1), to: tr.changes.mapPos(m.to, -1) }));
		for (const e of tr.effects) if (e.is(addedEffect)) next.push(e.value);
		const head = tr.state.selection.main.head;
		return next.filter((m) => m.from < head && head <= m.to && tr.state.doc.sliceString(m.to - 2, m.to) === '}}');
	},
});

function run(view: EditorView, plan: Plan): void {
	view.dispatch({
		changes: plan.changes,
		selection: EditorSelection.cursor(plan.cursor),
		effects: plan.added ? addedEffect.of(plan.added) : [],
		userEvent: 'input.type',
		scrollIntoView: true,
	});
}

/** One cursor and nothing selected: auto complete only acts then. */
function plainCursor(state: EditorState): number | null {
	const sel = state.selection;
	return sel.ranges.length === 1 && sel.main.empty ? sel.main.head : null;
}

const autoCompleteOn: Extension = [
	added,
	// W-1, W-2: keys that close tags.
	EditorView.inputHandler.of((view, from, to, text) => {
		if (view.composing || from !== to || text.length !== 1 || plainCursor(view.state) !== from) return false;
		const plan = onType(view.state.doc.toString(), from, text, view.state.field(added));
		if (!plan) return false;
		run(view, plan);
		return true;
	}),
	Prec.high(
		keymap.of([
			{
				key: 'Backspace',
				run: (view) => {
					const pos = plainCursor(view.state);
					const plan = pos === null ? null : onBackspace(view.state.doc.toString(), pos);
					if (plan) view.dispatch({ changes: plan.changes, selection: EditorSelection.cursor(plan.cursor), userEvent: 'delete.backward' });
					return !!plan;
				},
			},
		]),
	),
	// W-3: an edit to a tag name also renames its partner.
	EditorState.transactionFilter.of((tr) => {
		if (!tr.docChanged || !(tr.isUserEvent('input') || tr.isUserEvent('delete'))) return tr;
		const edits: { from: number; to: number; insert: string }[] = [];
		tr.changes.iterChanges((from, to, _f, _t, inserted) => edits.push({ from, to, insert: inserted.toString() }));
		if (edits.length !== 1) return tr;
		const c = renamePartner(tr.startState.doc.toString(), edits[0]!.from, edits[0]!.to, edits[0]!.insert);
		if (!c) return tr;
		const changes = { from: tr.changes.mapPos(c.from), to: tr.changes.mapPos(c.to), insert: c.insert };
		return [tr, { changes, sequential: true }];
	}),
];

/** Auto complete, in a slot that `setAutoComplete` can switch on and off. */
export const autoCompleteSlot = new Compartment();

export function autoComplete(on: boolean): Extension {
	return on ? autoCompleteOn : [];
}

const PAIR = Decoration.mark({ class: 'pe-pair' });

function pairMarks(view: EditorView): DecorationSet {
	const head = plainCursor(view.state);
	if (!view.hasFocus || head === null) return Decoration.none;
	const pair = pairAt(view.state.doc.toString(), head);
	return pair ? Decoration.set(pair.map((s) => PAIR.range(s.from, s.to))) : Decoration.none;
}

/** W-4: while the cursor is in a tag, it and its partner get the class `pe-pair`. */
export function tagMarks(): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = pairMarks(view);
			}
			update(u: ViewUpdate) {
				if (u.docChanged || u.selectionSet || u.focusChanged) this.decorations = pairMarks(u.view);
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
