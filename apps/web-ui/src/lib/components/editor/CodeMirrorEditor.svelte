<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { keymap } from '@codemirror/view';
  import { defaultKeymap, historyKeymap } from '@codemirror/commands';
  import { StreamLanguage } from '@codemirror/language';

  // Custom lightweight Mermaid syntax highlighter for CodeMirror
  const mermaidLanguage = StreamLanguage.define({
    token(stream) {
      if (stream.eatSpace()) return null;

      // Single-line comments
      if (stream.match('%%')) {
        stream.skipToEnd();
        return 'comment';
      }

      // Keywords & Diagram types
      if (
        stream.match(
          /^(flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram-v2|erDiagram|journey|gitGraph|pie|mindmap|architecture-beta)\b/i
        )
      ) {
        return 'keyword';
      }

      // Structural keywords
      if (stream.match(/^(subgraph|end|direction|TD|LR|BT|RL|TB)\b/i)) {
        return 'atom';
      }

      // Connectors / Arrows
      if (stream.match(/^(-->|==>|---|-.->|--x|--\|)/)) {
        return 'operator';
      }

      // Strings / Labels inside brackets or quotes
      if (stream.match(/^"[^"]*"/)) {
        return 'string';
      }

      // Node labels inside brackets [Label], (Label), {Label}
      if (stream.match(/^[\[\(\{][^\]\)\}]*[\]\)\}]/)) {
        return 'label';
      }

      stream.next();
      return null;
    }
  });

  let {
    value = $bindable(''),
    readOnly = false,
    onchange = () => {}
  }: {
    value: string;
    readOnly?: boolean;
    onchange?: (val: string) => void;
  } = $props();

  let container: HTMLDivElement;
  let view: EditorView | null = null;
  let isInternalChange = false;

  const txtgrphTheme = EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      color: 'var(--color-text-primary)',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '13px'
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: 'var(--color-brass)'
    },
    '.cm-line': {
      padding: '0 16px',
      lineHeight: '1.6'
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--color-brass)'
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--color-surface-subtle)'
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--color-text-tertiary)',
      borderRight: '1px solid var(--color-border-default)'
    },
    '.cm-gutterElement': {
      padding: '0 8px 0 12px'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)'
    },
    '.cm-activeLineGutter': {
      color: 'var(--color-text-primary)',
      backgroundColor: 'transparent'
    }
  });

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const docString = update.state.doc.toString();
        if (docString !== value) {
          isInternalChange = true;
          value = docString;
          onchange(docString);
          isInternalChange = false;
        }
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        mermaidLanguage,
        txtgrphTheme,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.editable.of(!readOnly),
        EditorView.lineWrapping
      ]
    });

    view = new EditorView({
      state,
      parent: container
    });
  });

  $effect(() => {
    if (view && !isInternalChange) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value }
        });
      }
    }
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });
</script>

<div bind:this={container} class="h-full w-full overflow-hidden bg-[var(--color-surface-card)]"></div>
