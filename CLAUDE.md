# Obsidian Preset Editor

Obsidian plugin to edit prompts in SillyTavern Chat Completion preset JSON files.

# Ground rules (must follow)

- If SRS.md doesn't cover a decision, ask me first.
- Only change this file (CLAUDE.md) if I say yes.
- Stick to the plan. No extra features.
- Any feature decision: explain it to me first.
- Places to look things up:
  - /workspace/Sillytavern-reference (look only, don't change)
  - docs.obsidian.md
- the plugin must have equivalent features in mobile and desktop. every feature and interface should work well on both platforms.

# How we work

## What to build

- The plan lives in SRS.md.
- Only build what the current version in SRS.md lists.
- Nothing extra, no unneeded detail.

## Every time you start (before anything else)

Check the code is healthy, and tell me in chat so I can look:

- Are the modules still separate from each other?
- Is there code nothing uses, or code we don't need?
- Did anything start working differently without my yes?
- Has the code wandered away from what SRS.md says?

## Before every change

Tell me:

- which files will change
- what changes
- which SRS.md item it's for
  No SRS.md item for it? Don't build it. Tell me instead.

## Keep the code in separate pieces

- Each feature is its own module (its own separate piece).
- Modules only connect through small, clearly defined links.
- Any module can be rewritten from scratch
  without touching the others.

## I decide how the plugin behaves

- If how it should behave is unclear, ask me.
- Never make a change that could change how it behaves
  without telling me first.

## Build tools (your call, not mine)

- Build tools (node_modules, build steps) live outside this folder,
  in the container at /home/node/build/obsidian-preset-editor
- Only main.js and styles.css get copied here.
  Git ignores both (they don't get saved).
- package-lock.json DOES get saved in git.
- Tool and setup decisions are yours to make, not mine.

# Git rules (must follow)

## Who does what

- You do git on my computer: branches, commits,
  merges, tags, and fixing clashes.
- I push to GitHub (push). You never push.
- Never change saves I've already uploaded.

## Branches

- main = only versions I tested and said yes to.
- New version = new branch, like version 1.1
- Fixing a finished version = branch like fix/1.0.1-what-broke

## Starting a version

- Only start when SRS.md lists it should be a new version, and all previous version work is done

## Saving

- Save (commit) after each bit that works.
- Save notes in plain words: what changed + which SRS item it's for.

## When I say "yes, it works"

1. Update the plugin's version number.
2. Mark it done in SRS.md.
3. Merge it into main.
4. Add a tag, like v1.1.0
5. Tell me exactly what to type to push.

## Merge conflicts

- Claude fix them.
- If it means picking between two ways it could work, ask me first.

## I'm learning git

- Explain every git step in 1-2 simple sentences.
- At the start of each chat, tell me which branch we're on.
