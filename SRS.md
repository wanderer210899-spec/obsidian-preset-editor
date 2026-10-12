# Preset Editor: Software Requirements Specification

Draft 0.13 · 12 October 2026

Follows SRS standard principles: https://www.computer.org/resources/software-requirements-specifications#requirements-fundamentals

From: product owner · To: developer

This document says **what** the plugin does, and how it looks and behaves. It doesn't say how to build it.

- Not covered here, or unclear? Ask the product owner **before** building.
- Work that drifts from this document gets redone.
- Behaviour decisions, with dates and reasons, are logged in `DECISIONS.md`.

---

## 1. Introduction

### 1.1 Purpose

An Obsidian plugin to edit the prompts in SillyTavern Chat Completion preset files (JSON). It shows a live preview of the full prompt.

### 1.2 Versions

Each version adds one feature on top of the last.

| Version | Adds                                                                                      | Status      |
| ------- | ----------------------------------------------------------------------------------------- | ----------- |
| 1.0     | The editor screen from the mockup: open a preset, edit its prompts, save automatically. Undo and Redo. | Done        |
| 1.1     | Preview: the full prompt in order. Macros stay as typed.                                  | Done        |
| 1.2     | Macro engine: variables and `{{if}}`/`{{else}}` worked out, with SillyTavern's New engine. | Done        |
| 1.3     | Variables panel. Closing tags while typing (3.9). Folding prompts and search (3.10).      | Done        |
| 1.4     | Library panel: New preset, rename, move and delete presets, one or several at once. Ribbon button and plugin shortcuts. | Done        |
| 1.5     | Select several prompts at once. Copy or move them to another preset, delete them, or drag them together (3.7). | Planned     |
| Later   | Snapshots or version history.                                                             | Planned     |

**Not planned**

- AI settings, and the preset's other text fields (impersonation, formats, prefill, etc.).

**Never in scope**

- Any link to a SillyTavern install. The plugin only works on files in the Obsidian vault.
- Global variables.

### 1.3 Where things stand (12 October 2026)

**1.0 is done** (v1.0.0). A preset edited in the plugin was loaded into SillyTavern, and every change came across. Undo and Redo (E-6) were checked on a phone.

**1.1 is done** (v1.1.0). The Preview shows the full prompt in SillyTavern's order, with in-chat prompts inside the Chat History block. Checked in light and dark, wide and on a phone. It also holds fix 1.0.1 (E-5: switching to In-chat saves a depth and order). That fix was not released on its own.

**1.2 is done** (v1.2.0). The Preview works out local variables, `{{if}}`/`{{else}}` and simple text macros with a port of SillyTavern's New macro engine. Everything else stays as typed, and an `{{if}}` that can't be decided stays as typed, whole. Checked by the owner on desktop and mobile.

**1.3 is done** (v1.3.0). The Variables panel (3.5) lists each local variable with its final value and where it is set and read. Closing tags while typing (3.9). Folding prompts and search (3.10). All checked by the owner.

**1.4 is done** (v1.4.0). The library panel (3.8). The owner looked at it on desktop and on a phone, without real use yet, and everything seemed in order. From 1.4 the plugin needs Obsidian 1.8.7 or newer.

- Built: everything marked 1.0 to 1.4 below.
- Dragging (Q-1) was checked on a phone, through a test copy of Obsidian.
- Real use: after 1.5, the plugin is ready for testing in real use. Changes may come up from that.
- Not yet checked: a full test in the Obsidian phone app. This can only happen once the plugin can be installed. Scrolling, for example, feels different in the test copy.

### 1.4 Terms

| Term               | Meaning                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Preset             | A SillyTavern Chat Completion preset file (`.json`) with `prompts` and `prompt_order`.               |
| Preset folder      | A vault folder the user adds in the plugin settings. There can be several.                           |
| Prompt             | One entry in the preset: a name, a role and text, plus settings.                                     |
| Built-in prompt    | A prompt that comes with SillyTavern and has text you can edit, e.g. Main Prompt.                    |
| Placeholder        | A prompt SillyTavern fills in itself, e.g. Char Description or Chat History. No text to edit.        |
| Custom prompt      | A prompt the user made.                                                                              |
| Relative / In-chat | Where a prompt goes. Relative: at its spot in the list. In-chat: inside the chat history, a set number of messages (the depth) from the end. |
| Trigger            | A reply type a prompt is limited to, e.g. Continue or Impersonate. No trigger = every reply type.    |
| Macro              | A `{{…}}` code in prompt text, e.g. `{{char}}` or `{{setvar::mood::calm}}`.                          |
| Local variable     | A value that macros set and read while the prompt is put together.                                   |
| Macro engine       | The part of SillyTavern that works out macros. It has two: **New** (the default) and **Legacy** (on its way out). The plugin only uses New. |

### 1.5 References

- **Looks:** the mockups in `UI design mock/`. Git doesn't save this folder.
  - `first draft/`: the editor screen (1.0 to 1.2)
  - `main editor tweak/`: the 1.3 editor changes
  - `library view/B2 · PC (click around)-html/` and `library view/B2 · Phone (tap around, long-press a preset)-html/`: the 1.4 library, wide and narrow. Both can be clicked through and show how it behaves.
  - Mockups O.1 to O.8: the 1.5 select mode and Copy to…, narrow (O.1 to O.7) and wide (O.8). These are screenshots the owner shared in chat, not files in the folder.
- **Behaviour:** SillyTavern source code (`/workspace/Sillytavern-reference`)
- **Platform:** docs.obsidian.md
- **Ground rules and git rules:** `CLAUDE.md`
- **Decision log:** `DECISIONS.md`

---

## 2. Overall description

### 2.1 Which source wins

| Question                                     | Follow                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| How it **looks**                             | The mockup, exactly. Only the approved changes in I-4 differ.                              |
| How it **behaves** (file format, prompt rules, macros) | SillyTavern. If SillyTavern and the mockup differ, ask the product owner. SillyTavern usually wins. |
| Anything unclear, or the two clash           | Ask the product owner. The developer never decides how the app behaves.                    |

The mockup only shows the look. Its demo logic is not a spec.

### 2.2 Platforms

Obsidian desktop and mobile. Both use the mockup's two layouts: wide and narrow.

### 2.3 How the code is built

- **Separate pieces.** Each feature is its own module. Modules only connect through small, clear links. None relies on how another works inside.
- **Replaceable.** Any module can be rewritten from scratch without touching the others. If a part doesn't behave as wanted, it gets replaced, not patched.
- **One feature per version.** A version is finished and working before the next one starts.

### 2.4 Limits

- Licence: AGPL-3.0. SillyTavern's macro engine code is reused.
- Tools: TypeScript, Svelte (as the Obsidian docs suggest), CodeMirror 6, SortableJS, and Chevrotain (reads `{{…}}` for the macro engine, as in SillyTavern).
- Simple look, like Notion and Apple Notes. Follows Obsidian's light and dark themes.

---

## 3. What the plugin does

The version each part arrives in is shown in brackets.

### 3.1 Files and folders (1.0)

- **F-1.** The settings hold a list of preset folders. Folders inside a preset folder count too.
- **F-2.** JSON files outside the preset folders are ignored. Obsidian treats them as normal.
- **F-3.** A file in a preset folder that isn't a valid preset is hidden from the plugin. Trying to open it shows a short message saying it can't be opened. A file with no main prompt order (`character_id` 100001) is not a valid preset.
- **F-4.** To open a preset, right-click it in Obsidian's file list and choose "Open in Preset Editor". This only shows for files in a preset folder. The preset opens in the current tab.
- **F-5.** _(1.4)_ New preset. See 3.8.
- **F-6.** A single click on a preset works as normal in Obsidian.
- **F-7.** Presets only show in Obsidian's file list when Obsidian's "Detect all file extensions" setting is on. While it's off, the plugin's settings page says so.
- **F-8.** Until 1.4, presets are renamed and copied with Obsidian's own file commands. An open preset follows its new name.

### 3.2 Editing prompts (1.0)

- **E-1.** Shows every prompt in the preset's order, as in the mockup.
- **E-2.** Drag to reorder in the Order panel. _(Until 1.3, also in the main list. From 1.3 the main list has no drag handle, as in the new mockup.)_
- **E-3.** Switch each prompt on or off.
- **E-4.** Add a custom prompt (at the end, between prompts, or above or below one), rename it, and delete it. A new prompt is called "Untitled prompt". It's switched on, sits where the user clicked, has no trigger, and is set to Relative.
- **E-5.** Edit a prompt's name, role (System, User, Assistant) and text. Also its settings: position, depth, order, triggers and forbid overrides. Switching a prompt to In-chat also saves depth 4 and order 100 if it has none, as SillyTavern's edit form does.
- **E-6.** Deleting is instant. Undo and Redo work on one timeline for the whole preset.
  - The timeline holds every change in the order it was made: typing (prompt text and names), adding, deleting, moving, role and settings changes.
  - Switching a prompt on or off is not on the timeline. Undo and Redo leave on/off as it is.
  - Undo works the same wherever you are, even inside a text box.
  - Typing without a half-second pause is one step.
  - A new change after an Undo clears the Redo steps.
  - The last 200 steps are kept. The timeline is cleared when the file changes outside the editor (S-4).
  - The prompt that Undo or Redo changes always flashes. If it's off screen, the editor scrolls to it first. In Preview it stays in Preview.
  - Desktop: Ctrl+Z to undo; Ctrl+Shift+Z or Ctrl+Y to redo (Cmd on Mac).
  - Mobile: Undo and Redo buttons in Obsidian's tab header, next to the panel button. Both show once either can be used; the one with nothing to do is greyed out. The buttons only show in the Obsidian mobile app (phones and tablets).
- **E-7.** Clicking a prompt in the Order panel, Preview or Variables panel jumps to it in the editor. (1.0 only has the Order panel. The others come with their content.)

### 3.3 What each kind of prompt allows (1.0, follows SillyTavern)

| Kind                         | Prompts                                                                                                    | Edit text | Settings | Reorder and on/off | Delete |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- | -------- | ------------------ | ------ |
| Built-in                     | Main Prompt, Auxiliary Prompt, Post-History Instructions, Enhance Definitions                              | Yes       | Yes      | Yes                | No     |
| Placeholder with settings    | Char Description, Char Personality, Scenario, Persona Description, World Info (before), World Info (after) | No        | Yes      | Yes                | No     |
| Placeholder without settings | Chat History, Chat Examples                                                                                | No        | No       | Yes                | No     |
| Custom                       | Anything the user adds                                                                                     | Yes       | Yes      | Yes                | Yes    |

- **P-1.** "Forbid overrides" only shows on Main Prompt and Post-History Instructions.
- **P-2.** Placeholders with settings can also be renamed and given a role, as in SillyTavern. They use the same controls as other prompts.

### 3.4 Preview (screen 1.0 · content 1.1 · macros 1.2)

- **V-1.** _(1.1)_ Shows the full prompt as close as possible to what SillyTavern would put together, as in the mockup.
- **V-2.** _(1.1)_ Assumes a normal reply. Leaves out prompts that are off, or whose triggers don't include a normal reply.
- **V-3.** _(1.1)_ Anything that comes from SillyTavern stays as typed or as a placeholder. This includes character data, persona, chat history, `{{char}}` and `{{user}}`. For `{{if}}`, see V-12.
- **V-7.** _(1.1)_ In-chat prompts show where SillyTavern would put them.
  - Chat History is one shaded block, as in the Chat History mockup the owner supplied (dark and light). The in-chat prompts sit inside it, deepest first, in SillyTavern's order.
  - The block's first row shows the Chat History placeholder and how many in-chat prompts it holds, e.g. "3 in-chat prompts inside". It ends with "End of chat history". With no in-chat prompts, the count and the ending are left out.
  - Each in-chat prompt has an accent-coloured tag saying where it goes, e.g. "4 from the end", or "At the end" for depth 0.
  - SillyTavern joins in-chat prompts with the same depth, order and role into one message. The Preview shows them as separate blocks, in SillyTavern's order.
  - When Chat History is off, SillyTavern sends no in-chat prompts. The Preview leaves them out too, with no note.
- **V-8.** _(1.1)_ Prompts with no text are left out, as SillyTavern does. So are prompts SillyTavern would skip for any other reason. Placeholders always show.
- **V-9.** _(1.1)_ Each block shows its role (System, User, Assistant). This includes placeholders with settings. Chat History and Chat Examples show "Inserted".
- **V-10.** _(1.1)_ The Preview only shows what the preset holds.
  - Main Prompt and Post-History Instructions show the preset's own text. A character card can replace them in SillyTavern, but that is character data (V-3).
  - Things SillyTavern adds from outside the preset are left out: Author's Note, Summary, extension prompts.
  - Prompt text shows exactly as typed. The Preview updates while you edit.
- **V-4.** _(1.2)_ Local variables, `{{if}}`/`{{else}}`, and text macros whose result comes only from the prompt text (comments, `{{newline}}`, `{{space}}`, `{{trim}}`, `{{noop}}`, `{{reverse}}`) are worked out exactly as SillyTavern's New macro engine would.
- **V-5.** _(1.2)_ Global variables, and macros that can't sensibly be worked out in Obsidian (dice, random picks, date and time, etc.), stay as typed.
- **V-6.** _(1.2)_ Only the **New** macro engine is used. There is no Legacy engine and no engine switch.
- **V-11.** _(1.2)_ A variable read before any prompt sets it is empty, as in a brand-new SillyTavern chat. The Preview marks it as empty. In `{{if}}` it counts as "no".
- **V-12.** _(1.2)_ An `{{if}}` whose condition uses something that can't be worked out (V-3, V-5) stays as typed, the whole block. Nothing inside it is worked out.

### 3.5 Variables panel (panel 1.0 · content 1.3)

It looks like the Variables tab in the `first draft/` mockup. Until 1.3 the panel was empty.

- **T-1.** Lists every local variable in the prompts the Preview works out: prompts that are on and run for a normal reply (V-2). They're listed in the order they're first used, going down the prompt list.
- **T-2.** For each variable: its final value as the Preview works it out, which prompts set it, and which prompts read it. Clicking a prompt jumps to it (E-7).
- **T-3.** Flags a variable that's read but never set ("Never set — reads empty").
- **T-4.** Every variable macro as typed counts, even one inside an `{{if}}` part that doesn't run. Example: `{{if .flag}}{{getvar::x}}{{/if}}` lists `x` as read, even when `flag` is empty. The final value only comes from what runs.
- **T-5.** A variable read before a later prompt sets it gets no extra warning. The Preview already shows it as empty there (V-11).
- **T-6.** Global variables never show (see "Never in scope" in 1.2).

### 3.6 Saving (1.0)

- **S-1.** Changes save automatically.
- **S-2.** Only the prompts and the main prompt order (`character_id` 100001) ever change. Everything else in the file stays exactly the same.
- **S-3.** The saved file keeps its key order and 4-space indents.
- **S-4.** If the file changes outside the editor while it's open (sync, git, another app), the editor reloads it. Any edit not yet saved is dropped. The file on disk always wins.
- **S-5.** A status line shows "Saving…", "Saved" or "Not saved". If saving fails, a "Couldn't save" message also shows.

### 3.7 Selecting, copying and moving prompts (1.5)

The look follows mockups O.1 to O.8. Works on desktop and mobile.

- **M-2.** A "Select" button in the Order panel starts select mode. Circles show on every prompt. A bar offers Copy to…, Move to… and Delete. It works the same way as picking presets in the library (L-9), so it only has to be learned once.
  - On a phone, pressing and holding a prompt also starts select mode.
  - Select mode ends after every action: Copy to…, Move to…, Delete, or a group drag.
- **M-3.** Dragging one picked prompt moves all the picked prompts. They land together, in the order they were in.
- **M-1.** Copy to… and Move to… send the picked prompts to another preset.
  - First pick the preset from a list grouped by folder, with search. The preset you're in is greyed out.
  - Then tap the spot in that preset where they go. No spot is chosen until you tap one.
  - Move takes them out of this preset. Copy leaves them here too.
  - On a phone, the list slides up from the bottom (O.5, O.6). On desktop, the same list shows in a box in the middle of the screen, like the library's Move to… (L-8).
- **M-4.** Only custom prompts are copied, moved or deleted. Picked built-ins and placeholders are skipped, and a message names them. Every preset already has its own (3.3).
  - If only these are picked, nothing happens and a message says why. Select mode stays on.
- **M-5.** If the other preset already has the same prompt, a second one is added. Nothing in the other preset is replaced or lost.
- **M-6.** Undo:
  - Each action is one Undo step: Delete, a group drag, or Move to….
  - Undoing a Move to… puts things back as they were. The prompts return to this preset and leave the other one.
  - Copy to… doesn't change this preset, so Ctrl+Z and the phone Undo button skip it. Only the Undo link in its message undoes it. The copies then leave the other preset.
  - A copied or moved prompt that was changed in the other preset stays there on Undo. A message names it.
- **M-7.** Messages use Obsidian's normal message box, as in the library (L-14). An Undo or Open link sits inside it. The mockup's dark bar is not used.

  | Action                | Message                                          | Links      |
  | --------------------- | ------------------------------------------------ | ---------- |
  | Delete                | "Deleted 3 prompts"                              | Undo       |
  | Group drag            | "Moved 3 prompts"                                | Undo       |
  | Move to…              | "Moved 3 prompts to Narrator, third person"      | Undo, Open |
  | Copy to…              | "Copied 3 prompts to Narrator, third person"     | Undo, Open |
  | Some prompts skipped  | Second line: "Main Prompt stays: every preset has its own." More than two: "Main Prompt, Chat History and 2 more stay…" | |
  | Only locked prompts picked | "Main Prompt can't be copied, moved or deleted." | |
  | Changed copy stays on Undo | "Pacing rules was changed in Narrator, so it stays there." | |

  - One prompt uses its name: "Deleted Pacing rules".
  - No message, as now: deleting or dragging one prompt outside select mode, and pressing Undo (the prompt flashes, E-6).
  - "Open" opens the other preset in a new tab, as in the library (L-7).
  - A message with an Undo link stays 10 seconds. Tapping it closes it sooner.
  - Any new change in this preset closes a Delete, group drag or Move to… message. Ctrl+Z still works step by step. A Copy to… message stays, since copying doesn't change this preset.

Details are in open item 3.

### 3.8 Library panel and New preset (1.4)

The look follows the two B2 mockups in `UI design mock/library view/`: "B2 · PC" for the wide layout and "B2 · Phone" for the narrow one. The other library designs (A, B, and the first B2) are not used.

- **L-1.** A library tab lists presets, grouped by folder. A "Recent" row on top shows the 4 presets opened last. Folders start folded. A folded folder shows its first few preset names. It has a ribbon button and plugin shortcuts.
- **L-2.** Rename turns the name into a text box, right in the row. Enter saves, Esc cancels. A name already used in that folder shows a small red warning and isn't saved. (Renaming in the editor already works, F-8.)
- **L-3.** New preset can be started from the command palette or the library panel.
- **L-4.** A new preset is called "Untitled preset". If that name is taken: "Untitled preset 1", "Untitled preset 2", and so on.
- **L-5.** A new preset is a copy of SillyTavern's Default preset with every prompt's text left blank.
- **L-6.** New preset first asks which folder it goes in ("New preset in…"). A preset is never made without a folder. In the library, the new preset then shows with its name ready to rename.
- **L-7.** A click or tap on a preset always opens it, in a new tab.
- **L-8.** "Move to…" lists the preset folders and the folders inside them. The folder it's already in is greyed out.
- **L-9.** A "Select" button next to Sort starts picking. Circles show on each preset, and a bar offers "Move to…" and "Delete". On a phone, pressing and holding a preset also starts it.
- **L-10.** Search looks at preset names only. Results show as one list, with each preset's folder.
- **L-11.** Sort choices: Last edited, Name A to Z, Most prompts.
- **L-12.** Each preset has a "⋯" menu with Rename, Move to… and Delete. The desktop menu also has "Open in new tab". There is no plain "Open": a click already does that.
  - Desktop: the "⋯" shows when the mouse is over the row. Right-click opens the same menu, as in Obsidian.
  - Phone: the "⋯" always shows, and opens a sheet from the bottom.
- **L-13.** Delete uses Obsidian's own delete box and message. It follows Obsidian's settings for deleted files: Obsidian's trash folder, the computer's trash, or deleted for good. Deleting several presets asks once for each, as Obsidian's file list does.
- **L-14.** Short messages ("Renamed to …") use Obsidian's normal message box (I-2), not the mockup's dark bar.
- **L-15.** The plugin doesn't make folders. New folders are made in Obsidian's file list, and then show in the library.

Details are in open item 1.

### 3.9 Closing tags (1.3)

Help with closing tags while typing prompt text. No suggestion lists: they would clutter the screen on mobile.

- **W-1.** Macros close by themselves.
  - Typing `{{` adds `}}`, with the cursor in between.
  - Typing `{{if` adds `{{/if}}` straight after it. The cursor stays where it was, inside `{{if}}`. Only `{{if}}` does this, as a trial. Other macros that can wrap text, like `{{trim}}`, may join later.
- **W-2.** An XML tag closes by itself: typing `<rules>` adds `</rules>`.
- **W-3.** Renaming an XML tag renames its partner too.
- **W-4.** The matching XML tag shows when the cursor is in a tag. `{{if}}` and `{{/if}}` are not marked: their macro colour is enough.
- **W-5.** The plugin settings have one switch, "Auto complete", that turns W-1, W-2 and W-3 on or off. It starts on. The matching-tag marks (W-4) always show.

Details are in open item 7.

### 3.10 Folding prompts and search (1.3)

Long presets get a minimal view, so many prompts are easier to scan. The look follows the "Outline" design in `UI design mock/main editor tweak/`.

- **C-1.** Prompts fold down to a short form. This only changes how the editor looks. Nothing is saved to the preset.
- **C-5.** Only one prompt is open at a time. Opening a prompt folds the one that was open.
- **C-6.** When a preset is opened, every prompt is folded.
- **C-2.** ~~Empty prompts act as dividers.~~ Dropped: the new mockup replaces dividers.
- **C-3.** ~~Dividers show in SillyTavern.~~ Dropped with C-2.
- **C-4.** A "Find in prompts" search bar finds text in prompt names and text. It works in Edit and in Preview. Each searches what it shows: Edit the typed text, Preview the worked-out text.

Details are in open item 8.

---

## 4. Look and feel

- **I-1.** The screen matches the mockup exactly, in both layouts (wide and narrow) and both themes (light and dark). Only the changes in I-4 differ.
- **I-2.** The settings page, notices and error messages use Obsidian's normal look. No custom styling.
- **I-3.** The mockup's design-tool options (handle style, frame, theme switch) are not features. Use the mockup's defaults.
- **I-4.** Approved changes from the mockup:
  - Narrow layout: uses Obsidian's own tab header instead of the mockup's big title. The Edit/Preview switch sits at the top of the editor.
  - Wide layout: every row's on/off switch lines up in one column.
  - The summary next to a prompt names its trigger if it has one (e.g. "Relative · Normal"), says "2 triggers" if it has several, and shows nothing if it has none.
  - No hover (narrow layout or touch screen): tap the gap between two prompts to show "Add prompt here", then tap that to add a prompt.
  - Obsidian mobile: Undo and Redo buttons in the tab header (E-6). The mockup has none.
  - _(1.3)_ The editor follows the "Outline" design in `UI design mock/main editor tweak/`: folding prompts and a "Find in prompts" search bar (3.10).
  - _(1.3)_ Variables panel: no hint line at the top ("In the order they were first used…").
  - Preview: placeholders with settings show their role, not "Inserted" (V-9). Chat History is a shaded block that holds the in-chat prompts, and each in-chat prompt has a tag saying where it goes (V-7). This follows the owner's Chat History mockup. There is no engine switch and no "Not run by Legacy" note (V-6).

## 5. Quality

- **Q-1.** Dragging is smooth on desktop and mobile.
- **Q-2.** A preset saved by the plugin still loads correctly in SillyTavern.
- **Q-3.** The plugin never damages or loses data in a preset file.

---

## 6. Open items (to settle later)

1. **Library panel:** (1.4)
   - ~~Design?~~ Settled: the B2 mockups (3.8).
   - ~~Open or rename on click?~~ Settled: a click opens (L-7). Rename is in the menu (L-2, L-12).
   - ~~Where do move and delete live?~~ Settled: the "⋯" menu (L-12), and select mode for several (L-9).
   - ~~How is picking several turned on?~~ Settled: a Select button, or press and hold on a phone (L-9).
   - ~~Deleting: ask first?~~ Settled: always (L-13).
   - ~~Phone layout?~~ Settled: the B2 Phone mockup.
   - ~~Sort choices?~~ Settled: L-11.
   - ~~"Open" in the desktop menu?~~ Settled: removed (L-12).
   - ~~The mockup's dark message bar, or Obsidian's?~~ Settled: Obsidian's (L-14).
   - ~~Delete message when Obsidian deletes for good?~~ Settled: Obsidian's own delete box (L-13).
   - ~~New folders?~~ Settled: made in Obsidian, not the plugin (L-15).
2. ~~**New preset from the command palette:** which folder does it go in when there are several preset folders?~~ Settled: it asks (L-6). (1.4)
3. **Moving and selecting prompts:** (1.5)
   - ~~Cut and paste, or drag and drop?~~ Settled: Copy to… and Move to…, with a preset list (M-1).
   - ~~Which kinds of prompt can be moved? Only custom ones?~~ Settled: only custom ones (M-4).
   - ~~What if the other preset already has that prompt?~~ Settled: a second one is added (M-5).
   - ~~Where does it land?~~ Settled: the user taps the spot (M-1).
   - ~~Does Undo bring back a moved prompt?~~ Settled: yes, and it leaves the other preset (M-6).
   - ~~Select mode (M-2): where is its button, and how are prompts picked?~~ Settled: the same way as in the library (L-9).
   - ~~Can every kind of prompt be picked?~~ Settled: yes, circles show on every prompt (M-2, M-4).
   - ~~Needs a mockup?~~ Settled: O.1 to O.8.
   - ~~Is each action (Delete, a group drag, Move to…) one Undo step?~~ Settled: yes (M-6).
   - ~~Can Copy to… be undone?~~ Settled: only from the Undo link in its message (M-6).
   - ~~On a phone, does pressing and holding a prompt start select mode?~~ Settled: yes (M-2).
   - ~~Does select mode end after each action?~~ Settled: yes (M-2).
   - ~~In the other preset's list, is a spot already chosen before you tap one?~~ Settled: no (M-1).
   - ~~How do the preset list and spot picker look on desktop?~~ Settled: the same list in a box in the middle of the screen (M-1).
   - ~~Which actions show a message, and what does each say?~~ Settled: M-7.
   - ~~Does "Open" in the Copy message open the other preset in a new tab?~~ Settled: yes (M-7).
   - ~~How long does a message with Undo stay on screen?~~ Settled: 10 seconds (M-7).
   - ~~What does the Undo link do after a later change?~~ Settled: a later change closes the message (M-7).
4. ~~**Undo on mobile:** what it looks like, and which version it comes in.~~ Settled: see E-6. (1.0)
6. ~~**Starting values of local variables:** in SillyTavern, local variables live in the chat and carry over from earlier replies. The Preview has no chat. Do they start empty every time?~~ Settled: see V-11. (1.2)
7. **Closing tags:** (1.3)
   - ~~Does typing `{{` also add `}}`?~~ Settled: yes (W-1).
   - ~~Which macros close by themselves: only `{{if}}`, or every macro that can wrap text?~~ Settled: only `{{if}}`, as a trial (W-1).
   - ~~Should W-4 also work for `{{if}}` and `{{/if}}`?~~ Settled: no, the macro colour is enough (W-4).
   - ~~Settings (W-5): one switch for all closing help, or one switch for each kind?~~ Settled: one switch, "Auto complete" (W-5).
8. **Folding and search:** (1.3)
   - ~~Collapsible prompts, visual folders, or both?~~ Settled: the new mockup's folding prompts and search (C-1, C-4). Dividers are dropped.
   - ~~Can several prompts be open at once, or only one?~~ Settled: only one (C-5).
   - ~~Can prompts still be dragged in the main list, or only in the Order panel?~~ Settled: only in the Order panel (E-2).
   - ~~Is the open prompt remembered when the preset is reopened?~~ Settled: no, every prompt starts folded (C-6).
   - ~~Does search also look in Preview?~~ Settled: yes (C-4).
   - ~~In Preview, does search find the typed text or the worked-out text?~~ Settled: each view searches what it shows (C-4).
5. ~~**In-chat prompts in the Preview:** does "roughly where SillyTavern would put them" mean grouped around the Chat History placeholder, in SillyTavern's order?~~ Settled: see V-7. (1.1)
