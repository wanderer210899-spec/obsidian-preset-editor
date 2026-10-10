<script lang="ts">
	import type { PromptData } from '../preset';
	import { triggerLabel } from './triggers';
	import type { Sizes } from './types';

	const ROLE_DOT: Record<string, string> = {
		system: 'var(--text-faint)',
		user: 'var(--color-blue)',
		assistant: 'var(--color-green)',
	};

	interface Props {
		prompt: Readonly<PromptData>;
		sizes: Sizes;
		popOpen: boolean;
		update: (patch: Partial<PromptData>) => void;
		ontogglepop: () => void;
	}
	let { prompt: p, sizes, popOpen, update, ontogglepop }: Props = $props();

	const role = $derived(p.role || 'system');
	const summary = $derived.by(() => {
		const bits = [p.injection_position === 1 ? `In-chat · D${p.injection_depth ?? 4} · #${p.injection_order ?? 100}` : 'Relative'];
		// One trigger is named; several are counted; none (= all replies) shows nothing.
		const triggers = p.injection_trigger ?? [];
		if (triggers.length === 1) bits.push(triggerLabel(triggers[0] ?? ''));
		else if (triggers.length > 1) bits.push(`${triggers.length} triggers`);
		return bits.join(' · ');
	});
</script>

<!-- Role picker and settings button, shared by prompt rows and placeholder rows. -->
<label class="role">
	<span class="dot" style:background={ROLE_DOT[role] ?? 'var(--text-faint)'}></span>
	<select aria-label="Role" style:font-size={sizes.selFs} value={role} onchange={(e) => update({ role: e.currentTarget.value })}>
		<option value="system">System</option>
		<option value="user">User</option>
		<option value="assistant">Assistant</option>
	</select>
	<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="m6 9 6 6 6-6"></path></svg>
</label>
<div class="adv" class:open={popOpen} role="button" tabindex="0" data-pop-keep onclick={ontogglepop}>
	<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="flex:none"><path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"></path></svg>{summary}
</div>

<style>
	.role {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 6px 0 8px;
		border-radius: 6px;
		color: var(--text-muted);
		font-size: 12.5px;
		cursor: pointer;
	}
	.role:hover,
	.adv:hover,
	.adv.open {
		background: var(--background-modifier-hover);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		flex: none;
	}
	select {
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		border: 0;
		outline: none;
		box-shadow: none;
		height: auto;
		color: inherit;
		font-family: inherit;
		padding: 6px 0;
		cursor: pointer;
	}
	select option {
		color: #222;
		background: #fff;
	}
	.adv {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		color: var(--text-muted);
		padding: 6px 8px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
	}
</style>
