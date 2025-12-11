import { onMounted, onUnmounted, type Ref } from "vue";

export type KeyboardModifier = "ctrl" | "alt" | "shift" | "meta";

export interface KeyboardShortcut {
  key: string;
  modifiers?: KeyboardModifier[];
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are active (can be a reactive ref) */
  enabled?: boolean | Ref<boolean>;
  /** Prevent default browser behavior for matched shortcuts */
  preventDefault?: boolean;
}

/**
 * Register multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options;

  const handleKeydown = (event: KeyboardEvent) => {
    // Check if enabled (handle both ref and boolean)
    const isEnabled = typeof enabled === "boolean" ? enabled : enabled.value;
    if (!isEnabled) return;

    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        if (shortcut.preventDefault ?? preventDefault) {
          event.preventDefault();
        }
        shortcut.handler(event);
        break;
      }
    }
  };

  onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  return {
    cleanup: () => document.removeEventListener("keydown", handleKeydown),
  };
}

export function useEscapeKey(
  handler: () => void,
  options: { enabled?: boolean | Ref<boolean> } = {}
) {
  return useKeyboardShortcuts(
    [
      {
        key: "Escape",
        handler,
        preventDefault: false,
      },
    ],
    options
  );
}

export function useArrowNavigation(
  handlers: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
  },
  options: UseKeyboardShortcutsOptions = {}
) {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onUp) {
    shortcuts.push({ key: "ArrowUp", handler: handlers.onUp });
  }
  if (handlers.onDown) {
    shortcuts.push({ key: "ArrowDown", handler: handlers.onDown });
  }
  if (handlers.onLeft) {
    shortcuts.push({ key: "ArrowLeft", handler: handlers.onLeft });
  }
  if (handlers.onRight) {
    shortcuts.push({ key: "ArrowRight", handler: handlers.onRight });
  }

  return useKeyboardShortcuts(shortcuts, options);
}

function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  // Check key match (case-insensitive for letters)
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  const modifiers = shortcut.modifiers || [];

  // Check each modifier
  const ctrlRequired = modifiers.includes("ctrl");
  const altRequired = modifiers.includes("alt");
  const shiftRequired = modifiers.includes("shift");
  const metaRequired = modifiers.includes("meta");

  if (ctrlRequired !== event.ctrlKey) return false;
  if (altRequired !== event.altKey) return false;
  if (shiftRequired !== event.shiftKey) return false;
  if (metaRequired !== event.metaKey) return false;

  return true;
}
