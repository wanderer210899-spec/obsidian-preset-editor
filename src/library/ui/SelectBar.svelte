<script lang="ts">
	import { t } from '../../i18n';
	import { pressable } from './actions';
	import Icon from './Icon.svelte';

	/** L-9: the bar for picked presets: Move to… and Delete. */
	interface Props {
		count: number;
		narrow: boolean;
		onMove: () => void;
		onDelete: () => void;
		onStop: () => void;
	}
	let { count, narrow, onMove, onDelete, onStop }: Props = $props();
	const off = $derived(count === 0);
</script>

{#if narrow}
	<div class="pl-bar pl-narrow" role="toolbar" aria-label={t('library.pickedBar')}>
		<div role="button" tabindex="0" use:pressable class="pl-big" class:pl-off={off} aria-disabled={off} onclick={() => !off && onMove()}>
			<Icon name="move" size={22} /><span>{t('library.moveTo')}</span>
		</div>
		<div role="button" tabindex="0" use:pressable class="pl-big pl-danger" class:pl-off={off} aria-disabled={off} onclick={() => !off && onDelete()}>
			<Icon name="trash" size={22} /><span>{t('library.delete')}</span>
		</div>
	</div>
{:else}
	<div class="pl-bar" role="toolbar" aria-label={t('library.pickedBar')}>
		<span class="pl-count">{t('library.picked', { n: count })}</span>
		<span class="pl-sep"></span>
		<div role="button" tabindex="0" use:pressable class="pl-act" class:pl-off={off} aria-disabled={off} onclick={() => !off && onMove()}>{t('library.moveTo')}</div>
		<div role="button" tabindex="0" use:pressable class="pl-act pl-danger" class:pl-off={off} aria-disabled={off} onclick={() => !off && onDelete()}>{t('library.delete')}</div>
		<span class="pl-sep"></span>
		<div role="button" tabindex="0" use:pressable class="pl-stop" aria-label={t('library.stopPicking')} onclick={onStop}><Icon name="x" size={15} stroke={2} /></div>
	</div>
{/if}

<style>
	.pl-bar {
		position: absolute;
		left: 50%;
		bottom: 24px;
		transform: translateX(-50%);
		z-index: 8;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px;
		border-radius: 12px;
		background: var(--pl-bar);
		color: #ffffff;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
		white-space: nowrap;
	}
	.pl-count {
		padding: 0 12px 0 8px;
		font-weight: 600;
	}
	.pl-sep {
		width: 1px;
		height: 22px;
		background: var(--pl-bar-sep);
	}
	.pl-act {
		display: flex;
		align-items: center;
		height: 36px;
		padding: 0 12px;
		border-radius: 8px;
		color: #ffffff;
	}
	.pl-act:hover,
	.pl-stop:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.pl-act.pl-danger {
		color: var(--pl-bar-danger);
	}
	.pl-off {
		opacity: 0.4;
		cursor: default;
	}
	.pl-stop {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: #b0b0b0;
	}
	.pl-bar.pl-narrow {
		left: 0;
		right: 0;
		bottom: 0;
		transform: none;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0;
		padding: 6px 8px calc(30px + env(safe-area-inset-bottom, 0px));
		border-radius: 0;
		background: var(--pl-group);
		border-top: 1px solid var(--pl-menu-line);
		box-shadow: none;
		color: var(--text-normal);
	}
	.pl-big {
		height: 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-size: 12px;
		color: var(--text-normal);
	}
	.pl-big.pl-danger {
		color: var(--pl-danger);
	}
</style>
