<script lang="ts">
	interface Props {
		on: boolean;
		ontoggle: () => void;
		title?: string;
		/** No negative left margin (prompt rows). */
		flushLeft?: boolean;
	}
	let { on, ontoggle, title, flushLeft = false }: Props = $props();
</script>

<div
	class="hit"
	class:flushLeft
	role="switch"
	aria-checked={on}
	tabindex="0"
	{title}
	onclick={(e) => {
		e.stopPropagation();
		ontoggle();
	}}
>
	<div class="track" class:on><div class="knob"></div></div>
</div>

<style>
	.hit {
		flex: none;
		padding: 8px;
		margin: -8px;
		cursor: pointer;
	}
	.flushLeft {
		margin-left: 0;
	}
	.track {
		width: 36px;
		height: 22px;
		border-radius: 11px;
		background: var(--pe-toggle-off);
		position: relative;
		transition: background 0.15s;
	}
	.track.on {
		background: var(--interactive-accent);
	}
	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 9px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
		transition: left 0.15s;
	}
	.on .knob {
		left: 16px;
	}
</style>
