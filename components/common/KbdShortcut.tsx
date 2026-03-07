"use client";

import { cn } from "@/lib/utils";

// Detects macOS to render ⌘ instead of Ctrl
function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

function formatKey(key: string): string {
  const mac = isMac();
  switch (key.toLowerCase()) {
    case "ctrl":
      return mac ? "⌘" : "Ctrl";
    case "meta":
      return "⌘";
    case "shift":
      return mac ? "⇧" : "Shift";
    case "alt":
      return mac ? "⌥" : "Alt";
    case "backspace":
      return "⌫";
    case "delete":
      return "Del";
    case "escape":
      return "Esc";
    case "enter":
      return "↵";
    case "arrowup":
      return "↑";
    case "arrowdown":
      return "↓";
    case "arrowleft":
      return "←";
    case "arrowright":
      return "→";
    default:
      return key.toUpperCase();
  }
}

interface KbdShortcutProps {
  keys: string[];
  className?: string;
}

/**
 * Renders keyboard shortcut badges, e.g. <KbdShortcut keys={['ctrl', 'k']} />
 * Automatically substitutes ⌘ on macOS.
 */
export function KbdShortcut({ keys, className }: KbdShortcutProps) {
  return (
    <span className={cn("ml-auto flex items-center gap-0.5", className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border px-1 font-mono text-[10px] leading-none text-muted-foreground"
        >
          {formatKey(key)}
        </kbd>
      ))}
    </span>
  );
}
