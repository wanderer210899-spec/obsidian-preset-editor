<script lang="ts">
	import { t } from '../i18n';

	/**
	 * A panel's search box: the library's look (B2 mockups), with its field
	 * colour. Used by the Variables panel (T-7) and the Order panel (E-8).
	 * It grows to fill the row it sits in.
	 */
	interface Props {
		value: string;
		placeholder: string;
		narrow: boolean;
	}
	let { value = $bindable(), placeholder, narrow }: Props = $props();
</script>

<label class="search" class:narrow>
	<svg width={narrow ? 16 : 15} height={narrow ? 16 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
	<input type="text" {placeholder} aria-label={placeholder} bind:value />
	{#if value}
		<div role="button" tabindex="0" class="clear" aria-label={t('order.clearSearch')} onclick={() => (value = '')}>
			<svg width={narrow ? 14 : 13} height={narrow ? 14 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>
		</div>
	{/if}
</label>

<style>
	.search {
		--field: #f3f3f3;
		flex: 1;
		min-width: 0;
		height: 34px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 6px 0 10px;
		border-radius: 8px;
		background: var(--field);
		color: var(--text-muted);
	}
	:global(body.theme-dark) .search {
		--field: #2a2a2a;
	}
	.search.narrow {
		height: 40px;
		padding: 0 6px 0 12px;
		border-radius: 10px;
	}
	.search input,
	.search input:hover,
	.search input:focus {
		flex: 1;
		min-width: 0;
		height: auto;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		outline: none;
		color: var(--text-normal);
		font: inherit;
		font-size: 14px;
	}
	.search.narrow input {
		font-size: 16px;
	}
	.clear {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 5px;
		color: var(--text-muted);
		cursor: pointer;
	}
	.narrow .clear {
		width: 32px;
		height: 32px;
	}
</style>
