<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@600&family=Public+Sans:wght@400;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="min-h-screen bg-[--color-surface-app] text-[--color-text-primary] font-['Public_Sans',sans-serif] antialiased selection:bg-[--color-brass] selection:text-white">
  {@render children()}
</div>

<style>
  :global(:root) {
    --color-ink: #16213D;
    --color-brass: #9C7A31;
    --color-brass-text: #7C5F22;
    --color-surface-app: #FAF9F6;
    --color-surface-card: #FFFFFF;
    --color-surface-subtle: #F3F1EC;
    --color-border-default: #E8E5DC;
    --color-border-strong: #918B7B;
    --color-text-primary: #1A1A18;
    --color-text-secondary: #5B5850;
    --color-text-muted: #6B6759;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --color-brass-text: #C9A54D;
      --color-surface-app: #17181C;
      --color-surface-card: #1F2024;
      --color-surface-subtle: #26262A;
      --color-border-default: #33343A;
      --color-border-strong: #6E707A;
      --color-text-primary: #F5F4F1;
      --color-text-secondary: #ABA89F;
      --color-text-muted: #928F8A;
    }
  }
</style>
