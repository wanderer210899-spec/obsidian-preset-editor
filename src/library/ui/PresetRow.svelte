<script lang="ts">
	import { t } from '../../i18n';
	import { focusSelect, pressable } from './actions';
	import Icon from './Icon.svelte';
	import MenuList from './MenuList.svelte';
	import type { MenuItem } from './types';

	/**
	 * One preset in the list (L-2, L-7, L-9, L-12). A click or tap opens it,
	 * or picks it in select mode. Press and hold on a touch screen starts
	 * select mode.
	 */
	interface Props {
		name: string;
		/** "24 prompts" */
		prompts: string;
		/** "2h ago" */
		when: string;
		/** Folder depth in the tree; -1 in search results. */
		depth: number;
		/** Search results show each preset's folder (L-10). */
		folderName?: string;
		narrow: boolean;
		/** The "⋯" only shows on hover (wide layout with a mouse). */
		moreOnHover: boolean;
		selecting: boolean;
		picked: boolean;
		flash: boolean;
		renaming: boolean;
		renameValue: string;
		renameError: string;
		/** Desktop menu items, shown while `menuOpen`. */
		menuItems: MenuItem[];
		menuOpen: boolean;
		onTap: () => void;
		onLongPress: () => void;
		onMore: () => void;
		onRenameInput: (value: string) => void;
		onRenameSave: () => void;
		onRenameCancel: () => void;
	}
	let {
		name,
		prompts,
		when,
		depth,
		folderName,
		narrow,
		moreOnHover,
		selecting,
		picked,
		flash,
		renaming,
		renameValue,
		renameError,
		menuItems,
		menuOpen,
		onTap,
		onLongPress,
		onMore,
		onRenameInput,
		onRenameSave,
		onRenameCancel,
	}: Props = $props();

	const pad = $derived(narrow ? (depth < 0 ? 14 : 42 + depth * 22) : depth < 0 ? 0 : 30 + depth * 24);

	// Press and hold (L-9). Moving the finger (scrolling) cancels it.
	const HOLD_MS = 500;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let held = false;
	let lastPointer = 'mouse';
	let start = { x: 0, y: 0 };

	function down(e: PointerEvent) {
		lastPointer = e.pointerType;
		held = false;
		clearTimeout(holdTimer);
		if (e.pointerType !== 'touch' || selecting || renaming) return;
		start = { x: e.clientX, y: e.clientY };
		holdTimer = setTimeout(() => {
			held = true;
			onLongPress();
			navigator.vibrate?.(10);
		}, HOLD_MS);
	}
	function move(e: PointerEvent) {
		if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) clearTimeout(holdTimer);
	}
	function up() {
		clearTimeout(holdTimer);
	}
	function click() {
		if (held) {
			held = false;
			return;
		}
		onTap();
	}
	/** Right-click opens the menu, as in Obsidian. A touch hold must not. */
	function contextMenu(e: MouseEvent) {
		e.preventDefault();
		if (lastPointer === 'touch' || selecting || narrow) return;
		onMore();
	}
	function key(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Enter') {
			e.preventDefault();
			onRenameSave();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onRenameCancel();
		}
	}
</script>

<div class="pl-row" class:pl-narrow={narrow} class:pl-hoverable={moreOnHover} class:pl-picked={picked} class:pl-flash={flash} class:pl-menu-open={menuOpen} style:padding-left="{pad}px">
	{#if renaming}
		<div class="pl-rename">
			{#if !narrow}<span class="pl-fileicon"><Icon name="file" size={15} /></span>{/if}
			<span class="pl-field">
				<span class="pl-inputline">
					<input
						type="text"
						aria-label={t('library.presetName')}
						enterkeyhint="done"
						value={renameValue}
						use:focusSelect
						oninput={(e) => onRenameInput(e.currentTarget.value)}
						onkeydown={key}
						onblur={onRenameSave}
					/>
					{#if narrow}
						<div role="button" tabindex="0" use:pressable class="pl-save" onpointerdown={(e) => e.preventDefault()} onclick={onRenameSave}>{t('library.save')}</div>
					{/if}
				</span>
				{#if renameError}<span class="pl-err">{renameError}</span>{/if}
			</span>
			{#if !narrow}<span class="pl-hint">{t('library.renameHint')}</span>{/if}
		</div>
	{:else}
		<div role="button" tabindex="0" use:pressable
			class="pl-main"
			aria-pressed={selecting ? picked : undefined}
			onclick={click}
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointerleave={up}
			onpointercancel={up}
			oncontextmenu={contextMenu}
		>
			{#if selecting}
				<span class="pl-circle" class:pl-on={picked}>{#if picked}<Icon name="check" size={narrow ? 14 : 12} stroke={3} />{/if}</span>
			{/if}
			{#if narrow}
				<span class="pl-col">
					<span class="pl-name">{name}</span>
					<span class="pl-meta">{folderName ? `${folderName} · ` : ''}{prompts} · {when}</span>
				</span>
			{:else}
				<span class="pl-fileicon"><Icon name="file" size={15} /></span>
				<span class="pl-name pl-grow">{name}</span>
				{#if folderName}<span class="pl-folder">{folderName}</span>{/if}
				<span class="pl-prompts">{prompts}</span>
				<span class="pl-when">{when}</span>
			{/if}
		</div>
		{#if !selecting}
			<div role="button" tabindex="0" use:pressable class="pl-more" aria-label={t('library.more', { name })} aria-haspopup="menu" aria-expanded={menuOpen} onclick={onMore}>
				<Icon name="more" size={narrow ? 16 : 15} />
			</div>
		{:else if narrow}
			<span class="pl-endgap"></span>
		{/if}
	{/if}
	{#if menuOpen && !narrow}
		<div class="pl-menuspot"><MenuList items={menuItems} label={t('library.actions', { name })} /></div>
	{/if}
</div>

<style>
	.pl-row {
		position: relative;
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--pl-line);
		color: var(--text-normal);
		transition: background-color 0.3s;
	}
	.pl-row:not(.pl-narrow):hover {
		background: var(--pl-hover);
	}
	.pl-row.pl-menu-open {
		z-index: 5;
	}
	.pl-row.pl-narrow {
		border-bottom-color: var(--pl-group-line);
		background: var(--pl-row-bg);
	}
	.pl-row.pl-picked,
	.pl-row.pl-picked:hover {
		background: var(--pl-pick-bg);
	}
	.pl-row.pl-flash,
	.pl-row.pl-flash:hover {
		background: var(--pl-flash);
	}
	.pl-main {
		flex: 1;
		min-width: 0;
		height: 40px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 8px;
		color: inherit;
	}
	.pl-narrow .pl-main {
		height: auto;
		min-height: 56px;
		gap: 12px;
		padding: 6px 0;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}
	.pl-circle {
		width: 18px;
		height: 18px;
		flex: none;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: 2px solid var(--pl-circle);
		background: var(--background-primary);
		color: #ffffff;
	}
	.pl-narrow .pl-circle {
		width: 22px;
		height: 22px;
	}
	.pl-circle.pl-on {
		border: 0;
		background: var(--pl-accent);
	}
	.pl-fileicon {
		display: flex;
		flex: none;
		color: var(--text-faint);
	}
	.pl-name {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-grow {
		flex: 1;
	}
	.pl-col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.pl-meta {
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.pl-folder {
		flex: none;
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-prompts {
		width: 90px;
		flex: none;
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-when {
		width: 76px;
		flex: none;
		text-align: right;
		font-size: 13px;
		color: var(--text-muted);
	}
	.pl-more {
		width: 28px;
		height: 28px;
		flex: none;
		margin-right: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		color: var(--text-muted);
	}
	.pl-more:hover {
		background: var(--pl-menu-hover);
	}
	.pl-hoverable .pl-more {
		opacity: 0;
	}
	.pl-hoverable:hover .pl-more,
	.pl-hoverable:focus-within .pl-more,
	.pl-hoverable.pl-menu-open .pl-more {
		opacity: 1;
	}
	.pl-narrow .pl-more {
		width: 44px;
		height: 44px;
		margin: 0;
	}
	.pl-endgap {
		width: 14px;
		flex: none;
	}
	.pl-rename {
		flex: 1;
		min-width: 0;
		min-height: 40px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 8px;
	}
	.pl-narrow .pl-rename {
		padding: 8px 10px 8px 0;
	}
	.pl-field {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.pl-inputline {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	input,
	input:hover,
	input:focus {
		width: 100%;
		max-width: 340px;
		height: 28px;
		box-sizing: border-box;
		padding: 0 8px;
		margin-left: -9px;
		border: 1px solid var(--pl-ring-line);
		border-radius: 6px;
		outline: none;
		box-shadow: 0 0 0 3px var(--pl-ring);
		background: var(--background-primary);
		color: var(--text-normal);
		font: inherit;
		font-size: 14px;
	}
	.pl-narrow input,
	.pl-narrow input:hover,
	.pl-narrow input:focus {
		max-width: none;
		height: 40px;
		padding: 0 10px;
		margin-left: -11px;
		border-radius: 8px;
		font-size: 16px;
	}
	.pl-save {
		display: flex;
		align-items: center;
		height: 40px;
		flex: none;
		padding: 0 10px;
		font-size: 15px;
		font-weight: 600;
		color: var(--pl-accent-text);
	}
	.pl-err {
		font-size: 12px;
		color: var(--pl-danger);
	}
	.pl-narrow .pl-err {
		font-size: 12.5px;
	}
	.pl-hint {
		flex: none;
		font-size: 12px;
		color: var(--text-muted);
	}
	.pl-menuspot :global(.pl-menu) {
		right: 6px;
		top: 36px;
	}
</style>
