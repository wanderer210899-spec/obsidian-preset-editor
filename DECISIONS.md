# Behaviour decisions

Decisions the product owner has made about how the plugin behaves, with the date and what prompted each one. Newest first. Code and tooling choices are not logged here.

---

## 2026-10-11 · Closing tags details

**Decision:**
- Typing `{{` adds `}}`, with the cursor in between.
- Only `{{if}}` closes by itself: finishing `{{if mood}}` adds `{{/if}}`. This is a trial. Other macros that can wrap text, like `{{trim}}`, stay as they are for now.
- With the cursor on `{{if}}`, its `{{/if}}` is marked too, as XML tags are.
- The plugin settings have one switch for all of this, called "Auto complete". It covers `{{ }}`, `{{if}}`, XML tags and renaming the partner tag. The matching-tag marks always show.
- Smaller details, proposed and not changed by the owner: typing `}` in front of an added `}}` steps over it; Backspace in an empty `{{}}` removes both pairs; `{{/if}}` and `</tag>` are only added when the tag isn't closed yet; the cursor lands between the two tags; `<br/>` and closing tags add nothing; `{{else}}` is not marked.

**Context:** SRS open item 7, before building closing tags on `feature/1.3-closing-tags`.

## 2026-10-11 · Select mode joins 1.5

**Decision:** Version 1.5 gets a select mode, next to moving prompts between presets. A button turns it on, and several prompts can then be picked at once. The picked prompts can be deleted together, or moved to another preset together. It must work on desktop and mobile. Details are still open (SRS M-2, open item 3).

**Context:** New feature request after testing the 1.3 editor changes.

## 2026-10-11 · Folding and search accepted as built

**Decision:** The owner tested folding and search and said they work. These details were raised with the build and kept:
- "12 lines" counts lines as typed, not as wrapped on screen.
- An empty folded prompt shows "Empty" with no line count.
- Preview search also looks at prompt names, as Edit does.
- Switching between Edit and Preview keeps the search; the count starts again at "1 of …".
- Undo/Redo, jumping from the Order panel and adding a prompt open that prompt.
- "2 of 5" counts prompts, not single matches. Next goes to the next prompt that matches.
- A match in a prompt's name counts but isn't highlighted (names sit in a text box).
- Typing in the search bar jumps straight to the first match.
- Esc closes the search bar, even while typing in a prompt.

**Context:** Built on `feature/1.3-editor-tweak` and merged into `version-1.3`.

## 2026-10-11 · Each view searches what it shows

**Decision:** Edit searches the typed text. Preview searches the worked-out text. Example: a prompt has `Mood: {{getvar::mood}}` and Preview shows `Mood: calm`. In Preview, "calm" finds it and "getvar" doesn't. In Edit, it's the other way round.

**Context:** Follows from search working in Preview (entry below). A match then always lands on text you can see.

## 2026-10-11 · Folding and search details

**Decision:**
- Only one prompt is open at a time. Opening a prompt folds the one that was open, as in the mockup.
- Prompts are dragged only in the Order panel. The main list has no drag handle, as in the mockup. This changes SRS E-2.
- When a preset is opened, every prompt is folded. The open prompt is not remembered.
- Search works in Preview too, and highlights matches there. The mockup only searched in Edit and switched to Edit to show a match.

**Context:** SRS open item 8, raised after reading the "Outline" mockup.

## 2026-10-11 · New editor mockup replaces divider prompts; search joins 1.3

**Decision:** The owner's new mockup (`UI design mock/main editor tweak/`, the "Outline" design) sets how the editor looks in 1.3. Prompts fold down to a short form, and there's a "Find in prompts" search bar. Divider prompts (old C-2, C-3) are dropped: the new design replaces them. The search bar goes into the SRS as an approved change to the look.

This replaces the divider part of "Collapsing prompts, and empty prompts as dividers" below.

**Context:** The owner made the mockup with a designer after open item 8 was raised. They asked for the editor changes, closing tags and the Variables panel to be built side by side in 1.3.

## 2026-10-11 · Collapsing prompts, and empty prompts as dividers

**Decision:** Long presets are decluttered two ways. Prompts can be collapsed; collapsing only changes the editor's look. Empty prompts act as dividers that group the prompts under them. Visual folders saved outside the preset are not used. How a prompt is recognised as a divider, and how dividers look, are still being discussed. The owner doesn't want divider controls to clutter the editor.

**Context:** SRS open item 8. Options offered: collapsible prompts, visual folders, heading prompts, one-at-a-time, filter.

## 2026-10-11 · 1.3 also gets closing tags, collapsing and grouping

**Decision:** Version 1.3 holds the Variables panel, closing tags while typing (SRS 3.9), and a way to declutter long presets: collapsing prompts and grouping them into visual folders (SRS 3.10). Folders and collapsing only change how the editor looks. Whether to build folders, collapsing, or both is still open (SRS open item 8).

**Context:** 1.2 was tested and released. The owner wants long presets with many prompts to have a minimal view.

## 2026-10-11 · Closing tags, but no suggestion lists

**Decision:** A later version helps with closing tags while typing prompt text. Scoped macros close by themselves (`{{if}}` adds `{{/if}}`). XML tags close by themselves, rename together, and show their matching pair. There are no macro or variable suggestion lists. Version and details are still open (SRS open item 7).

**Context:** The owner asked what autocomplete could look like. SillyTavern's own prompt editor shows a macro list when typing `{{`. The owner judged that such lists would clutter the screen on mobile.

## 2026-10-11 · An {{if}} that can't be decided stays as typed

**Decision:** If an `{{if}}` condition uses something the Preview can't work out, the whole block stays as typed and nothing inside it runs. This includes SillyTavern data such as `{{char}}` and `{{description}}`, and also dice, dates and global variables. Example: `{{if $flag}}A{{else}}B{{/if}}` shows exactly as typed.

This replaces the V-3 rule that SillyTavern data counts as "true" in `{{if}}`.

**Context:** Raised while building the 1.2 engine. The owner tested the engine on desktop and mobile first.

## 2026-10-11 · The Preview works out simple text macros

**Decision:** Besides variables and `{{if}}`/`{{else}}`, the Preview works out macros whose result comes only from the prompt text: `{{// comment}}`, `{{newline}}`, `{{space}}`, `{{trim}}`, `{{noop}}`, `{{reverse}}` (and `{{banned}}`, which SillyTavern removes in Chat Completion). A comment, for example, disappears as it does in SillyTavern.

**Context:** Raised while building the 1.2 engine. The SRS only named variables and `{{if}}`/`{{else}}`.

## 2026-10-11 · A variable that isn't set yet shows as empty

**Decision:** In the Preview, a variable read before any prompt sets it is empty, as in a brand-new SillyTavern chat. Example: `Mood: {{getvar::mood}}` shows `Mood: ` with the mockup's "empty" tag. In `{{if}}`, an unset variable counts as "no", so the `{{else}}` part shows.

**Context:** SRS open item 6. In SillyTavern, local variables live in the chat and can carry over from earlier replies. The Preview has no chat. The other choice was to keep the code as typed.

## 2026-10-11 · Only the New macro engine

**Decision:** The plugin only uses SillyTavern's New macro engine. There is no Legacy engine and no engine switch, in the Preview or on the settings page. The mockup's "Not run by Legacy" highlight and note are dropped too.

This replaces the entry below (switch moves to the settings page).

Accepted trade-off: users who still run Legacy in SillyTavern may see a Preview that differs from what their SillyTavern sends. This happens with `{{if}}` blocks, with `setvar` and `getvar` in the same prompt, and with macros inside macros. Legacy could be added later as its own module if needed.

**Context:** New understands all of Legacy's macros. It is SillyTavern's default (1.19), and SillyTavern's code marks the old system as on its way out. One engine keeps the plugin simpler.

## 2026-10-11 · Macro engine switch moves to the settings page

**Decision:** The New/Legacy macro engine switch goes on the plugin's settings page, not in the Preview as the mockup shows. This keeps the editor screen uncluttered. It changes SRS V-6 and adds an approved change to I-4.

**Context:** Planning 1.2. SillyTavern also keeps its engine choice in its settings ("Experimental Macro Engine" in User Settings), not next to the prompts.

## 2026-10-10 · 1.1 released with fix 1.0.1 inside

**Decision:**
- The Chat History block's assumed cases are kept: one prompt reads "1 in-chat prompt inside"; with no in-chat prompts, the count and "End of chat history" are hidden.
- Fix 1.0.1 is not released on its own. It goes to main inside v1.1.0, and the merge note says so.

**Context:** The owner tested the Chat History block (light and dark), fix 1.0.1 and 1.1, and said all three work.

## 2026-10-10 · Chat History block follows the owner's mockup

**Decision:** The Chat History block in the Preview follows a mockup the owner supplied (dark theme, and light theme on a phone):
- A shaded block (no border), between two divider lines.
- First row: the Chat History placeholder, then "3 in-chat prompts inside".
- Each in-chat prompt gets an accent-coloured tag: "4 from the end", "2 from the end", "At the end" (depth 0).
- It ends with "End of chat history".

Assumed, not in the mockup: one prompt reads "1 in-chat prompt inside"; with no in-chat prompts, the count and the ending are left out.

This replaces the look in the entry below. Prompts still sit inside the block, deepest first.

**Context:** Testing the bordered block.

## 2026-10-10 · In-chat prompts sit inside a bordered Chat History block

**Decision:** Chat History is one block in the Preview, with a border in the theme's accent colour (first tried as a tint; the owner preferred a border). The in-chat prompts sit inside it, deepest first, in SillyTavern's order. Each keeps its label, e.g. "4 messages from the end". The split parts ("Chat History · 2 messages", "… last 2 messages") are gone. The owner chose this instead of making a new design.

This replaces the first point of "How the Preview shows the prompt (1.1)" below.

**Context:** Testing 1.1. With prompts at depths 4 and 2, the split parts showed the gaps between prompts ("2 messages"), which read like depths. The depth-4 prompts seemed to be missing.

## 2026-10-10 · Switching to In-chat saves a depth and order

**Decision:** When a prompt is switched to In-chat and has no depth or order saved, the editor saves depth 4 and order 100, the values it already shows. SillyTavern's own edit form does the same. Shipped as fix 1.0.1.

**Context:** Found while building the 1.1 Preview. Switching to In-chat only saved the position. SillyTavern never sends an in-chat prompt with no depth, and its prompt list reads the depth to show it.

## 2026-10-10 · How the Preview shows the prompt (1.1)

**Decision:**
- In-chat prompts: the Chat History placeholder is split at each depth used, with the in-chat prompts between the parts. If this doesn't look right once built, the owner will design this part of the screen.
- In-chat prompts that SillyTavern joins into one message (same depth, order and role) show as separate blocks, in SillyTavern's order.
- When Chat History is off, in-chat prompts are left out, as in SillyTavern. No note explains it.
- Prompts with no text are left out, as in SillyTavern.
- Placeholders with settings show their role, not the mockup's "Inserted".
- The macro engine switch and "Worked-out value" in the colour key are hidden until 1.2, when they do something.
- Also accepted: the Preview shows only what the preset holds (no character card overrides, Author's Note or extension prompts), shows text exactly as typed, and updates while you edit.

**Context:** Questions raised before building 1.1. Settles open item 5 in the SRS.

## 2026-10-10 · Dragging on a phone counts as checked

**Decision:** Q-1 (smooth dragging) counts as checked on mobile. A full test in the Obsidian phone app waits until the plugin can be installed.

**Context:** The owner tested on a phone through the Obsidian test instance. Some things, like scrolling, feel different there than in the real app.

## 2026-10-10 · One undo timeline, with Redo

**Decision:** Undo becomes one timeline for the whole preset, as in Google Docs or Notion, and Redo is added.
- The timeline holds typing (text and names), adding, deleting, moving, role and settings changes. On/off is left out and stays as it is through Undo and Redo.
- Undo works the same wherever you are, even inside a text box. Typing without a half-second pause is one step.
- The prompt that Undo or Redo changes always flashes, so the change is easy to spot. If it's off screen, the editor scrolls to it first. (Changed the same day after testing: at first only off-screen prompts flashed.)
- Desktop: Ctrl+Z, and Ctrl+Shift+Z or Ctrl+Y for Redo. Mobile: Undo and Redo buttons in the tab header. Both show once either can be used; the unusable one is greyed out.
- The last 200 steps are kept. The timeline is cleared when the file changes outside the editor.

This replaces "Undo stays narrow" below, and the "what it does" and "hidden" parts of the mobile undo button entry.

**Context:** Testing the first mobile undo button on a phone. When typing and adding prompts were mixed, too few steps could be undone: each text box had its own undo, and adding a prompt couldn't be undone at all.

## 2026-10-10 · Mobile undo button, in 1.0

**Decision:** Version 1.0 gets an Undo button on mobile.
- It does the same as Ctrl+Z. In a text box (prompt text or name), it undoes typing there. Anywhere else, it brings back the last deleted prompt.
- It sits in Obsidian's tab header, next to the panel button.
- It only shows in the Obsidian mobile app. Desktop keeps Ctrl+Z.
- It's hidden when there's nothing to undo.

**Context:** Open item 4 in the SRS. On mobile there was no way to bring back a deleted prompt. The mockup has no undo button.

## 2026-10-10 · Moving prompts between presets added to the roadmap

**Decision:** A later version lets the user move a prompt from one preset to another, by cut and paste or by drag and drop, whichever is simpler to build.

**Context:** New feature request during the roadmap discussion after 1.0 was tested.

## 2026-10-10 · Undo stays narrow; mobile gets an equivalent

**Decision:** Undo covers deleted prompts and typing in a text box only. Reorder, on/off and settings changes are not undone. Mobile must have an equivalent of Ctrl+Z. The form it takes is still open.

**Context:** Open item 4 in the SRS. On mobile there is no Ctrl+Z, so a deleted prompt couldn't be brought back there.

## 2026-10-10 · Rename and duplicate use Obsidian until the library panel

**Decision:** Presets are renamed and duplicated with Obsidian's own file commands; the open editor follows a rename. The library panel will add renaming later.

**Context:** Open item 3 in the SRS. The owner tested renaming a preset file in Obsidian, and it worked.

## 2026-10-10 · New preset comes with the library panel

**Decision:** New preset ships in the same version as the library panel. It can be started from the command palette or from the library panel. It is named "Untitled preset", then "Untitled preset 1", "Untitled preset 2" and so on. Its content is a copy of SillyTavern's Default preset with every prompt's text blank.

**Context:** Open item 2 in the SRS.

## 2026-10-10 · In-chat prompts in the Preview

**Decision:** The Preview shows in-chat prompts in roughly the place SillyTavern would put them. Each one is labelled with its exact position, such as "4 messages from the end", so the Preview matches SillyTavern's assembly as closely as possible.

**Context:** Open item 1 in the SRS. SillyTavern places in-chat prompts inside the chat history, which the Preview only shows as a placeholder.

## 2026-10-10 · Trigger shown by name in the prompt summary

**Decision:** The settings summary next to each prompt names its trigger when it has exactly one (e.g. "Relative · Normal"), shows "n triggers" when it has several, and shows nothing when it has none (none = every reply type).

**Context:** "1 trigger" didn't say which one.

## 2026-10-10 · New prompts start with no trigger, as in SillyTavern

**Decision:** A new prompt starts with no trigger (it runs for every reply type) and position Relative, the same as SillyTavern.

**Context:** The owner first asked for new prompts to start with "Normal". In SillyTavern, swipe, regenerate, continue, impersonate and quiet are separate trigger types, so a Normal-only prompt would be left out of swipes and regenerates. Once that was known, the owner chose SillyTavern's default.

## 2026-10-10 · All on/off switches line up

**Decision:** In the wide layout, every row's on/off switch sits in the same column. Placeholder rows keep an empty space where prompt rows show their lock or delete icon.

**Context:** The owner noticed the switches were misaligned (the mockup has the same offset).

## 2026-10-10 · Adding prompts on touch and narrow screens

**Decision:** Where there is no hover (narrow layout or a touch screen), the divider between two prompts can be tapped. The first tap shows the mockup's "Add prompt here" line; tapping that line adds the prompt. Tapping anywhere else hides it again. With a mouse in the wide layout, hovering works as in the mockup.

**Context:** On mobile there was no way to add a prompt between two placeholders without settings (e.g. Chat Examples and Chat History), and adding anywhere else meant opening a prompt's settings first.

## 2026-10-10 · Placeholders with settings follow SillyTavern

**Decision:** Char Description, Char Personality, Scenario, Persona Description and World Info (before/after) can be renamed and have a role and settings (position, depth, order, triggers), as in SillyTavern. Their text stays uneditable. They use the same role picker, settings button and settings popover as other prompts, so the interface stays consistent.

**Context:** SRS 3.3 gives them settings, but the mockup showed no settings control for them (open question #6 after the first editor build).

## 2026-10-10 · Settings page warns when JSON files are hidden

**Decision:** While Obsidian's "Detect all file extensions" is off, the plugin's settings page shows a note saying it's needed for presets to appear in the file list.

**Context:** Follows from the decision below.

## 2026-10-10 · Narrow layout uses Obsidian's header

**Decision:** In the narrow layout, Obsidian's own tab header (folder path and file name) is used instead of the mockup's large-title header; the Edit/Preview switch sits at the top of the editor.

**Context:** Open question #9 after the first editor build. Preview and Variables content for 1.0 (open item 5) is deferred.

## 2026-10-10 · Users turn on "Detect all file extensions"

**Decision:** To see presets in Obsidian's file list (and right-click them, F-4), users turn on Obsidian's own setting "Detect all file extensions" (Settings → Files and links). The plugin does not register `.json` and does not list presets itself in 1.0.

**Context:** Found while testing: with that setting off (Obsidian's default), Obsidian doesn't index `.json` files at all, so presets were invisible. Registering `.json` would have made a single click on any JSON file open the editor, which breaks F-2 and F-6. A plugin-made list would be a new feature.

## 2026-10-10 · The file on disk always wins

**Decision:** If a preset changes on disk while it is open in the editor (sync, git, another app), the editor reloads it. Any edit not yet saved is dropped.

**Context:** Found while building the editor view: the editor kept its own copy and would have written it back over outside changes (risk to Q-3).

## 2026-10-10 · Editor view basics confirmed

**Decision:** The owner accepted these behaviours of the first editor build:
- Subfolders of a preset folder count as preset folders.
- "Open in Preset Editor" appears for every `.json` file in a preset folder; whether it is a valid preset is checked on click (F-3 message then).
- A preset opens in the current tab, like a normal click.
- A new prompt follows the mockup: named "Untitled prompt", switched on, placed where the user clicked. (SillyTavern instead adds it unnamed, switched off, at the top.)
- Ctrl/Cmd+Z brings back deleted prompts only; inside a text box it undoes typing (open item 4).
- The status line shows "Saving…", "Saved", or "Not saved" with a "Couldn't save" notice.

**Context:** Raised as gaps after the editor view was first built.

## 2026-10-10 · A file with no main prompt order is not a preset

**Decision:** A preset file that has prompts but no main prompt order (SillyTavern's `character_id` 100001) is treated as not a preset. The plugin hides it and won't open it (F-3).

**Context:** This came up while building the module that reads preset files. SillyTavern handles such a file differently: it fills in its default order when loading it. The owner judged the case rare. Revisit if real presets turn up without a main order.
