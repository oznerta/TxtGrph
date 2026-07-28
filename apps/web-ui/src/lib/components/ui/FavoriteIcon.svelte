<script lang="ts">
  interface Props {
    active?: boolean;
    size?: number;
    class?: string;
  }

  let { active = false, size = 16, class: className = '' }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={active ? 'url(#favorite-heart-gradient)' : 'none'}
  stroke={active ? '#F43F5E' : 'currentColor'}
  stroke-width={active ? '1.5' : '1.8'}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="transition-all duration-300 ease-out inline-block align-middle shrink-0 {active ? 'drop-shadow-[0_0_10px_rgba(244,63,94,0.65)] scale-105' : 'hover:scale-110'} {className}"
>
  <defs>
    <linearGradient id="favorite-heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185" />
      <stop offset="50%" stop-color="#F43F5E" />
      <stop offset="100%" stop-color="#E11D48" />
    </linearGradient>
  </defs>

  <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
</svg>
