<script setup lang="ts">
/**
 * RunicJsonEditor
 *
 * CodeMirror-based JSON editor with Runic design system styling.
 * Provides syntax highlighting, line numbers, and JSON validation.
 */
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter, lintGutter } from '@codemirror/lint'
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language'
import { tags } from '@lezer/highlight'

interface Props {
  modelValue: string
  readonly?: boolean
  minHeight?: string
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  minHeight: '300px',
  maxHeight: '500px',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validation-error': [error: string | null]
}>()

// Editor container ref
const editorRef = ref<HTMLElement | null>(null)
const editorView = ref<EditorView | null>(null)

// Runic theme colors
const runicHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'rgba(220, 210, 195, 0.9)' }, // Keys
  { tag: tags.string, color: '#87ceeb' }, // Strings
  { tag: tags.number, color: '#c9a227' }, // Numbers
  { tag: tags.bool, color: '#98c379' }, // Booleans
  { tag: tags.null, color: 'rgba(150, 140, 125, 0.6)' }, // Null
  { tag: tags.punctuation, color: '#af6025' }, // Brackets
  { tag: tags.bracket, color: '#af6025' }, // Brackets
])

// Runic theme extension
const runicTheme = EditorView.theme({
  '&': {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: 'rgba(220, 210, 195, 0.9)',
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.875rem',
  },
  '.cm-content': {
    padding: '0.75rem 0',
    caretColor: '#c9a227',
  },
  '.cm-cursor': {
    borderLeftColor: '#c9a227',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(175, 96, 37, 0.3) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(60, 55, 50, 0.2)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(60, 55, 50, 0.3)',
  },
  '.cm-gutters': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'rgba(150, 140, 125, 0.5)',
    borderRight: '1px solid rgba(60, 55, 45, 0.3)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 0.5rem',
    minWidth: '3rem',
    textAlign: 'right',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(175, 96, 37, 0.3)',
    color: '#c9a227',
    outline: '1px solid rgba(175, 96, 37, 0.5)',
  },
  '.cm-lintPoint-error:after': {
    borderBottomColor: '#e05555',
  },
  '.cm-diagnostic-error': {
    borderLeftColor: '#e05555',
  },
  '.cm-tooltip': {
    backgroundColor: 'rgba(20, 18, 15, 0.98)',
    border: '1px solid rgba(60, 55, 50, 0.5)',
    color: 'rgba(220, 210, 195, 0.9)',
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.8125rem',
  },
  '.cm-tooltip-lint': {
    backgroundColor: 'rgba(20, 18, 15, 0.98)',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '&.cm-focused': {
    outline: 'none',
  },
})

// JSON linter with error reporting
const jsonLinterExtension = linter(jsonParseLinter(), {
  delay: 300,
})

// Update listener to sync with v-model and report errors
const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const content = update.state.doc.toString()
    emit('update:modelValue', content)

    // Check for JSON errors
    try {
      JSON.parse(content)
      emit('validation-error', null)
    } catch (e) {
      emit('validation-error', (e as Error).message)
    }
  }
})

// Initialize editor
const initEditor = () => {
  if (!editorRef.value) return

  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    bracketMatching(),
    json(),
    syntaxHighlighting(runicHighlightStyle),
    runicTheme,
    jsonLinterExtension,
    lintGutter(),
    updateListener,
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
  ]

  if (props.readonly) {
    extensions.push(EditorState.readOnly.of(true))
  }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions,
  })

  editorView.value = new EditorView({
    state,
    parent: editorRef.value,
  })
}

// Sync external changes to editor
watch(() => props.modelValue, (newVal) => {
  if (editorView.value) {
    const currentContent = editorView.value.state.doc.toString()
    if (newVal !== currentContent) {
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: newVal,
        },
      })
    }
  }
})

onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  editorView.value?.destroy()
})
</script>

<template>
  <div
    class="runic-json-editor"
    :style="{
      minHeight: minHeight,
      maxHeight: maxHeight,
    }"
  >
    <div ref="editorRef" class="runic-json-editor__content" />
  </div>
</template>

<style scoped>
.runic-json-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.runic-json-editor:focus-within {
  border-color: rgba(175, 96, 37, 0.5);
}

.runic-json-editor__content {
  flex: 1;
  overflow: auto;
}

/* CodeMirror overrides for scrollbar */
.runic-json-editor__content :deep(.cm-scroller) {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 90, 80, 0.4) transparent;
}

.runic-json-editor__content :deep(.cm-scroller::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

.runic-json-editor__content :deep(.cm-scroller::-webkit-scrollbar-track) {
  background: transparent;
}

.runic-json-editor__content :deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: rgba(100, 90, 80, 0.4);
  border-radius: 4px;
}

.runic-json-editor__content :deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: rgba(100, 90, 80, 0.6);
}
</style>
