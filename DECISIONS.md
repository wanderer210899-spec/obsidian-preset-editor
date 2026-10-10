# Behaviour decisions

Decisions the product owner has made about how the plugin behaves, with the date and what prompted each one. Newest first. Code and tooling choices are not logged here.

---

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
