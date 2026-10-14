<script lang="ts">
	import { t } from '../i18n';
	import type { PromptData } from '../preset';
	import { hasForbidOverrides, rulesFor } from '../kinds';
	import Segmented from './Segmented.svelte';
	import Toggle from './Toggle.svelte';
	import { TRIGGERS } from './triggers';
	import type { Sizes } from './types';

	interface Props {
		prompt: Readonly<PromptData>;
		sizes: Sizes;
		update: (patch: Partial<PromptData>) => void;
		onclose: () => void;
		oninsert: (offset: 0 | 1) => void;
		ondelete: () => void;
	}
	let { prompt, sizes, update, onclose, oninsert, ondelete }: Props = $props();

	/** SillyTavern's defaults (PromptManager.js). */
	const DEFAULT_DEPTH = 4;
	const DEFAULT_ORDER = 100;

	const inChat = $derived(prompt.injection_position === 1);
	const triggers = $derived(prompt.injection_trigger ?? []);
	const removable = $derived(rulesFor(prompt.identifier).remove);

	/**
	 * E-5: switching to In-chat also saves the depth and order shown, if the
	 * prompt has none. SillyTavern needs a depth to send an in-chat prompt,
	 * and its own edit form always saves both.
	 */
	function setPosition(position: number) {
		const patch: Partial<PromptData> = { injection_position: position };
		if (position === 1) {
			if (prompt.injection_depth == null) patch.injection_depth = DEFAULT_DEPTH;
			if (prompt.injection_order == null) patch.injection_order = DEFAULT_ORDER;
		}
		update(patch);
	}
	function toNumber(value: string): number {
		return parseInt(value || '0', 10) || 0;
	}
	function toggleTrigger(value: string) {
		update({
			injection_trigger: triggers.includes(value) ? triggers.filter((t) => t !== value) : [...triggers, value],
		});
	}
</script>

<div class="pop" class:narrow={sizes.narrow} data-pop-keep>
	<div class="line">
		<div class="title">{t('ps.title')}</div>
		<div class="close" role="button" tabindex="0" title={t('ps.close')} style:width={sizes.btnH} style:height={sizes.btnH} onclick={onclose}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
		</div>
	</div>
	<div class="line">
		<div class="label">{t('ps.position')}</div>
		<Segmented
			options={[
				{ value: 0, label: t('ps.relative') },
				{ value: 1, label: t('ps.inChat') },
			]}
			value={inChat ? 1 : 0}
			onpick={setPosition}
			height={sizes.ctlH}
		/>
	</div>
	<div class="line" style:opacity={inChat ? 1 : 0.45}>
		<div class="label">{t('ps.depthOrder')}</div>
		<input
			type="number"
			inputmode="numeric"
			aria-label={t('ps.depth')}
			style:font-size={sizes.inFs}
			value={prompt.injection_depth ?? DEFAULT_DEPTH}
			onchange={(e) => update({ injection_depth: toNumber(e.currentTarget.value) })}
		/>
		<input
			type="number"
			inputmode="numeric"
			aria-label={t('ps.order')}
			style:font-size={sizes.inFs}
			value={prompt.injection_order ?? DEFAULT_ORDER}
			onchange={(e) => update({ injection_order: toNumber(e.currentTarget.value) })}
		/>
	</div>
	{#if !inChat}<div class="note">{t('ps.onlyInChat')}</div>{/if}
	<div class="line top">
		<div class="label" style:padding-top="4px">{t('ps.triggers')}</div>
		<div class="chips">
			{#each TRIGGERS as [value, label] (value)}
				<div class="chip" class:on={triggers.includes(value)} role="button" tabindex="0" style:min-height={sizes.ctlH} onclick={() => toggleTrigger(value)}>
					{t(label)}
				</div>
			{/each}
			{#if !triggers.length}<span class="none">{t('ps.nonePicked')}</span>{/if}
		</div>
	</div>
	{#if hasForbidOverrides(prompt.identifier)}
		<div class="line">
			<div class="label">{t('ps.forbid')}</div>
			<Toggle on={prompt.forbid_overrides === true} ontoggle={() => update({ forbid_overrides: prompt.forbid_overrides !== true })} />
		</div>
	{/if}
	<div class="foot">
		<div class="act" role="button" tabindex="0" style:min-height={sizes.btnH} onclick={() => oninsert(0)}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>{t('ps.insertAbove')}
		</div>
		<div class="act" role="button" tabindex="0" style:min-height={sizes.btnH} onclick={() => oninsert(1)}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"></path></svg>{t('ps.insertBelow')}
		</div>
		<div style:flex="1"></div>
		{#if removable}
			<div class="act danger" role="button" tabindex="0" style:min-height={sizes.btnH} onclick={ondelete}>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>{t('ps.delete')}
			</div>
		{:else}
			<div class="locked" style:min-height={sizes.btnH}>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>{t('ps.builtIn')}
			</div>
		{/if}
	</div>
</div>

<style>
	.pop {
		position: absolute;
		right: 12px;
		top: 52px;
		width: 348px;
		box-sizing: border-box;
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 12px;
		box-shadow: var(--pe-shadow-pop);
		padding: 12px 14px;
		z-index: 6;
		display: flex;
		flex-direction: column;
		gap: 12px;
		font-size: 13px;
		color: var(--text-muted);
	}
	.pop.narrow {
		position: relative;
		right: auto;
		top: auto;
		width: auto;
		margin-top: 12px;
		box-shadow: none;
		background: var(--background-secondary);
	}
	.line {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.line.top {
		align-items: flex-start;
	}
	.title {
		flex: 1;
		font-weight: 600;
		color: var(--text-normal);
	}
	.close {
		margin: -6px -8px -6px 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		color: var(--text-muted);
		cursor: pointer;
	}
	.close:hover,
	.act:hover {
		background: var(--background-modifier-hover);
	}
	.label {
		width: 104px;
		flex: none;
	}
	input {
		width: 64px;
		min-width: 0;
		height: auto;
		box-sizing: border-box;
		background: var(--background-modifier-form-field);
		border: 1px solid var(--background-modifier-border);
		border-radius: 6px;
		padding: 5px 8px;
		color: var(--text-normal);
		font-family: inherit;
		outline: none;
		box-shadow: none;
	}
	.note {
		font-size: 12px;
		color: var(--text-muted);
		margin: -6px 0 0 114px;
	}
	.chips {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.chip {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 12px;
		cursor: pointer;
		border: 1px solid var(--background-modifier-border);
		background: transparent;
		color: var(--text-muted);
	}
	.chip.on {
		border-color: rgba(138, 92, 245, 0.55);
		background: var(--background-modifier-active-hover);
		color: var(--text-accent);
	}
	.none {
		font-size: 12px;
		color: var(--text-muted);
		align-self: center;
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		border-top: 1px solid var(--background-modifier-border);
		padding-top: 10px;
		margin: 0 -6px;
	}
	.act {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 8px;
		border-radius: 6px;
		cursor: pointer;
		color: var(--text-normal);
		font-size: 12.5px;
	}
	.act.danger {
		color: var(--text-error);
	}
	.locked {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 8px;
		color: var(--text-muted);
		font-size: 12px;
	}
</style>
