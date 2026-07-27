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

<div class="min-h-screen bg-[var(--color-surface-app)] text-[var(--color-text-primary)] font-['Public_Sans',sans-serif] antialiased selection:bg-[var(--color-brass)] selection:text-white">
  {@render children()}
</div>

<style>
  :global(:root) {
    /* core */
    --color-ink: #16213D;
    --color-brass: #9C7A31;
    --color-brass-text: #7C5F22;

    /* surfaces */
    --color-surface-app: #FAF9F6;
    --color-surface-card: #FFFFFF;
    --color-surface-subtle: #F3F1EC;
    --color-border-default: #E8E5DC;
    --color-border-strong: #918B7B;

    /* text */
    --color-text-primary: #1A1A18;
    --color-text-secondary: #5B5850;
    --color-text-muted: #6B6759;

    /* semantic */
    --color-success: #2F6844;      --color-success-bg: #EDF3EC;   --color-success-text: #245538;
    --color-warning: #8A5A12;      --color-warning-bg: #F7EFDE;   --color-warning-text: #6B4710;
    --color-error: #7A2331;        --color-error-bg: #F7EBEA;     --color-error-text: #601A25;
    --color-info: #35507E;         --color-info-bg: #EEF1F6;      --color-info-text: #2A3F63;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --color-ink: #3B4A75;
      --color-brass-text: #C9A54D;

      --color-surface-app: #17181C;
      --color-surface-card: #1F2024;
      --color-surface-subtle: #26262A;
      --color-border-default: #33343A;
      --color-border-strong: #6E707A;

      --color-text-primary: #F5F4F1;
      --color-text-secondary: #ABA89F;
      --color-text-muted: #928F8A;

      --color-success-bg: #0E1F16;   --color-success-text: #8FBE9E;
      --color-warning-bg: #2E2110;   --color-warning-text: #D8B36B;
      --color-error-bg: #2B1113;     --color-error-text: #D89AA0;
      --color-info-bg: #131D2E;      --color-info-text: #A9BEDD;
    }
  }
</style>
