import React, { useRef } from "react";

interface TextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function Textarea({
  value,
  onChange,
  placeholder,
  className = "",
  onKeyDown,
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Call external onKeyDown handler first
    if (onKeyDown) {
      onKeyDown(e);
    }

    // Handle checkbox toggling with Ctrl/Cmd + Enter (only if not prevented by external handler)
    if (!e.defaultPrevented && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const text = value;

      // Find the line containing the cursor
      const lines = text.split("\n");
      let currentLineStart = 0;
      let lineIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineEnd = currentLineStart + lines[i].length;
        if (start >= currentLineStart && start <= lineEnd) {
          lineIndex = i;
          break;
        }
        currentLineStart = lineEnd + 1; // +1 for newline
      }

      const line = lines[lineIndex];
      const trimmedLine = line.trim();

      // Check if line contains a checkbox
      if (
        trimmedLine.startsWith("- [ ]") ||
        trimmedLine.startsWith("- [x]") ||
        trimmedLine.startsWith("- [X]")
      ) {
        const newLine = line
          .replace(/^- \[ \]/, "- [x]")
          .replace(/^- \[x\]/i, "- [ ]");
        const newLines = [...lines];
        newLines[lineIndex] = newLine;
        const newText = newLines.join("\n");

        onChange({
          target: { value: newText },
        } as React.ChangeEvent<HTMLTextAreaElement>);
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full resize-none bg-transparent outline-none leading-relaxed px-3 py-2 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${className}`}
    />
  );
}
