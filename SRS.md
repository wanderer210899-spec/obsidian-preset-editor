# Preset Editor: Software Requirements Specification

Draft 0.6 · 11 October 2026

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
| 1.2     | Macro engine: variables and `{{if}}`/`{{else}}` worked out, with SillyTavern's New engine. | Planned     |
| 1.3     | Variables panel.                                                                          | Planned     |
| 1.4     | Library panel, with New preset and rename. Ribbon button and plugin shortcuts.            | Planned     |
| 1.5     | Move prompts between presets.                                                             | Planned     |
| Later   | Snapshots or version history.                                                             | Planned     |

**Not planned**

- AI settings, and the preset's other text fields (impersonation, formats, prefill, etc.).

**Never in scope**

- Any link to a SillyTavern install. The plugin only works on files in the Obsidian vault.
- Global variables.

### 1.3 Where things stand (10 October 2026)

**1.0 is done** (v1.0.0). A preset edited in the plugin was loaded into SillyTavern, and every change came across. Undo and Redo (E-6) were checked on a phone.

**1.1 is done** (v1.1.0). The Preview shows the full prompt in SillyTavern's order, with in-chat prompts inside the Chat History block. Checked in light and dark, wide and on a phone. It also holds fix 1.0.1 (E-5: switching to In-chat saves a depth and order). That fix was not released on its own.

- Built: everything marked 1.0 and 1.1 below.
- The Variables panel is there, but empty. Its content comes in 1.3.
- Dragging (Q-1) was checked on a phone, through a test copy of Obsidian.
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

- **Looks:** `Preset Editor UI Brief/` (the mockup)
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
- Tools: TypeScript, Svelte (as the Obsidian docs suggest), CodeMirror 6, SortableJS.
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
- **E-2.** Drag to reorder, in the main list and in the Order panel.
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
- **V-3.** _(1.1)_ Anything that comes from SillyTavern stays as typed or as a placeholder. This includes character data, persona, chat history, `{{char}}` and `{{user}}`. In `{{if}}`, these count as "true".
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
- **V-4.** _(1.2)_ Local variables and `{{if}}`/`{{else}}` are worked out exactly as SillyTavern's New macro engine would.
- **V-5.** _(1.2)_ Global variables, and macros that can't sensibly be worked out in Obsidian (dice, random picks, date and time, etc.), stay as typed.
- **V-6.** _(1.2)_ Only the **New** macro engine is used. There is no Legacy engine and no engine switch. "Worked-out value" in the colour key only shows from 1.2. Until then nothing is worked out.
- **V-11.** _(1.2)_ A variable read before any prompt sets it is empty, as in a brand-new SillyTavern chat. The Preview marks it as empty. In `{{if}}` it counts as "no".

### 3.5 Variables panel (panel 1.0 · content 1.3)

In 1.0 the panel is empty.

- **T-1.** Lists every local variable used by prompts that are on, in the order they're first used.
- **T-2.** For each variable: its final value, which prompts set it, and which prompts read it.
- **T-3.** Flags a variable that's read but never set.

### 3.6 Saving (1.0)

- **S-1.** Changes save automatically.
- **S-2.** Only the prompts and the main prompt order (`character_id` 100001) ever change. Everything else in the file stays exactly the same.
- **S-3.** The saved file keeps its key order and 4-space indents.
- **S-4.** If the file changes outside the editor while it's open (sync, git, another app), the editor reloads it. Any edit not yet saved is dropped. The file on disk always wins.
- **S-5.** A status line shows "Saving…", "Saved" or "Not saved". If saving fails, a "Couldn't save" message also shows.

### 3.7 Moving prompts between presets (1.5)

- **M-1.** The user can move a prompt from one preset to another. Cut and paste is the likely way: it works on desktop and mobile. Drag and drop needs both presets side by side, which mobile can't do. Details are in open item 3.

### 3.8 Library panel and New preset (1.4)

- **L-1.** A library panel lists presets, grouped by folder. It has a ribbon button and plugin shortcuts. Design to come (open item 1).
- **L-2.** Presets can be renamed from the library panel.
- **L-3.** New preset can be started from the command palette or the library panel.
- **L-4.** A new preset is called "Untitled preset". If that name is taken: "Untitled preset 1", "Untitled preset 2", and so on.
- **L-5.** A new preset is a copy of SillyTavern's Default preset with every prompt's text left blank.

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
  - Preview: placeholders with settings show their role, not "Inserted" (V-9). Chat History is a shaded block that holds the in-chat prompts, and each in-chat prompt has a tag saying where it goes (V-7). This follows the owner's Chat History mockup. There is no engine switch and no "Not run by Legacy" note (V-6). "Worked-out value" waits for 1.2.

## 5. Quality

- **Q-1.** Dragging is smooth on desktop and mobile.
- **Q-2.** A preset saved by the plugin still loads correctly in SillyTavern.
- **Q-3.** The plugin never damages or loses data in a preset file.

---

## 6. Open items (to settle later)

1. **Library panel:** design and behaviour. Needs a mockup. (1.4)
2. **New preset from the command palette:** which folder does it go in when there are several preset folders? (1.4)
3. **Moving prompts:** (1.5)
   - Cut and paste, or drag and drop?
   - Which kinds of prompt can be moved? Only custom ones?
   - What if the other preset already has that prompt?
   - Where does it land?
   - Does Undo bring back a cut prompt?
4. ~~**Undo on mobile:** what it looks like, and which version it comes in.~~ Settled: see E-6. (1.0)
6. ~~**Starting values of local variables:** in SillyTavern, local variables live in the chat and carry over from earlier replies. The Preview has no chat. Do they start empty every time?~~ Settled: see V-11. (1.2)
5. ~~**In-chat prompts in the Preview:** does "roughly where SillyTavern would put them" mean grouped around the Chat History placeholder, in SillyTavern's order?~~ Settled: see V-7. (1.1)
