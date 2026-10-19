<script lang="ts">
	import { t } from '../i18n';

	/** M-2: the bar for picked prompts, as in mockups O.2 (narrow) and O.8 (wide). */
	interface Props {
		count: number;
		narrow: boolean;
		oncopy: () => void;
		onmove: () => void;
		ondelete: () => void;
	}
	let { count, narrow, oncopy, onmove, ondelete }: Props = $props();
	const off = $derived(count === 0);
	const run = (action: () => void) => () => {
		if (!off) action();
	};
</script>

<div class="sb-bar" class:sb-narrow={narrow} role="toolbar" aria-label={t('order.pickedBar')}>
	<div class="sb-btn" class:sb-off={off} role="button" tabindex="0" aria-disabled={off} onclick={run(oncopy)}>
		{#if narrow}
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>
		{/if}
		<span>{t('order.copyTo')}</span>
	</div>
	<div class="sb-btn" class:sb-off={off} role="button" tabindex="0" aria-disabled={off} onclick={run(onmove)}>
		{#if narrow}
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
		{/if}
		<span>{t('order.moveTo')}</span>
	</div>
	<div class="sb-btn sb-danger" class:sb-off={off} role="button" tabindex="0" aria-disabled={off} onclick={run(ondelete)}>
		{#if narrow}
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"></path></svg>
		{/if}
		<span>{t('order.delete')}</span>
	</div>
</div>

<style>
	.sb-bar {
		flex: none;
		display: flex;
		gap: 6px;
		padding: 8px;
		border-top: 1px solid var(--background-modifier-border);
		background: var(--background-secondary);
	}
	.sb-btn {
		flex: 1;
		min-width: 0;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--background-modifier-border);
		border-radius: 6px;
		background: var(--background-primary);
		color: var(--text-normal);
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
	}
	.sb-btn:hover {
		background: var(--background-modifier-hover);
	}
	.sb-btn.sb-danger {
		color: var(--text-error);
	}
	.sb-btn.sb-off {
		opacity: 0.4;
		cursor: default;
	}
	.sb-bar.sb-narrow {
		gap: 0;
		padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 0px));
		background: var(--background-primary);
	}
	/* I-5: on a phone, the buttons sit just above Obsidian's bottom bar. Obsidian sets the spacing; it is 0 when its bar doesn't float over the view. */
	:global(body.is-phone) .sb-bar.sb-narrow {
		padding-bottom: calc(8px + var(--view-bottom-spacing, 0px));
	}
	.sb-narrow .sb-btn {
		height: 56px;
		flex-direction: column;
		gap: 4px;
		border: 0;
		background: none;
		font-size: 12px;
	}
	.sb-narrow .sb-btn:hover {
		background: none;
	}
</style>
