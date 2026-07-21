import React, { useState, useEffect, useRef } from "react";

const BASE_INPUT_CLASS =
  "w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0";

// Props for the LivePreviewEditor
interface LivePreviewEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export default function LivePreviewEditor({
  value,
  onChange,
  placeholder = "Start typing…",
  className = "",
  readOnly = false,
}: LivePreviewEditorProps) {
  const [focusedLineIndex, setFocusedLineIndex] = useState<number | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    index: number;
    cursorPos: number | "end" | "start";
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<(HTMLInputElement | null)[]>([]);

  const lines = value ? value.split("\n") : [""];

  // Sync ref array size
  if (textareaRefs.current.length !== lines.length) {
    textareaRefs.current = textareaRefs.current.slice(0, lines.length);
  }

  // Helper to parse checklist prefix markers
  const parseChecklistLine = (text: string) => {
    if (text.startsWith("- [ ] ")) {
      return {
        isChecklist: true,
        checked: false,
        marker: "- [ ] ",
        content: text.slice(6),
      };
    }
    if (text.startsWith("- [x] ") || text.startsWith("- [X] ")) {
      return {
        isChecklist: true,
        checked: true,
        marker: text.slice(0, 6),
        content: text.slice(6),
      };
    }
    if (text.startsWith("* [ ] ")) {
      return {
        isChecklist: true,
        checked: false,
        marker: "* [ ] ",
        content: text.slice(6),
      };
    }
    if (text.startsWith("* [x] ") || text.startsWith("* [X] ")) {
      return {
        isChecklist: true,
        checked: true,
        marker: text.slice(0, 6),
        content: text.slice(6),
      };
    }
    return { isChecklist: false, checked: false, marker: "", content: text };
  };

  // Handle caret placement when lines receive programmatic focus
  useEffect(() => {
    if (focusTarget !== null) {
      const textarea = textareaRefs.current[focusTarget.index];
      if (textarea) {
        textarea.focus();
        const lineText = lines[focusTarget.index] || "";
        const { isChecklist } = parseChecklistLine(lineText);

        let pos = 0;
        if (focusTarget.cursorPos === "end") {
          pos = textarea.value.length;
        } else if (focusTarget.cursorPos === "start") {
          pos = 0;
        } else {
          // If programmatic focus target is offset, check if it's a checklist.
          // Since the input has shorter content by 6 characters, subtract the prefix length.
          pos = isChecklist ? focusTarget.cursorPos - 6 : focusTarget.cursorPos;
          if (pos < 0) pos = 0;
          if (pos > textarea.value.length) pos = textarea.value.length;
        }
        textarea.setSelectionRange(pos, pos);
      }
      setFocusTarget(null);
    }
  }, [focusTarget]);

  // Click outside to blur all lines and enter full Preview mode
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocusedLineIndex(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    // If user clicks on the empty space at the bottom of the container, focus the last line
    if (e.target === containerRef.current) {
      const lastIndex = lines.length - 1;
      setFocusedLineIndex(lastIndex);
      setFocusTarget({ index: lastIndex, cursorPos: "end" });
    }
  };

  const handleLineClick = (index: number) => {
    if (readOnly) return;
    setFocusedLineIndex(index);
    setFocusTarget({ index, cursorPos: "end" });
  };

  const handleLineChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const newValue = e.target.value;
    const newLines = [...lines];
    newLines[index] = newValue;
    onChange(newLines.join("\n"));

    const { isChecklist } = parseChecklistLine(newValue);
    if (isChecklist) {
      setFocusedLineIndex(index);
      setFocusTarget({ index, cursorPos: 6 }); // Focus at start of text (after 6-char prefix)
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    i: number,
  ) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const currentLineText = lines[i];
      const left = currentLineText.slice(0, start);
      const right = currentLineText.slice(start);

      // Markdown list autocomplete indentation
      let marker = "";
      if (
        currentLineText.startsWith("- [ ] ") ||
        currentLineText.startsWith("- [x] ")
      ) {
        marker = "- [ ] ";
      } else if (currentLineText.startsWith("- ")) {
        marker = "- ";
      } else if (currentLineText.startsWith("* ")) {
        marker = "* ";
      } else if (currentLineText.startsWith("> ")) {
        marker = "> ";
      } else {
        const match = currentLineText.match(/^(\d+)\.\s+/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          marker = `${nextNum}. `;
        }
      }

      const newLines = [...lines];
      newLines[i] = left;
      newLines.splice(i + 1, 0, marker + right);

      onChange(newLines.join("\n"));
      setFocusedLineIndex(i + 1);
      setFocusTarget({ index: i + 1, cursorPos: marker.length });
    } else if (e.key === "Backspace") {
      if (start === 0 && end === 0) {
        e.preventDefault();
        if (i > 0) {
          const prevLineText = lines[i - 1];
          const currentLineText = lines[i];

          const newLines = [...lines];
          newLines[i - 1] = prevLineText + currentLineText;
          newLines.splice(i, 1);

          onChange(newLines.join("\n"));
          setFocusedLineIndex(i - 1);
          setFocusTarget({ index: i - 1, cursorPos: prevLineText.length });
        }
      }
    } else if (e.key === "ArrowUp") {
      const cursorLine = textarea.value.slice(0, start).split("\n").length;
      if (cursorLine === 1) {
        if (i > 0) {
          e.preventDefault();
          setFocusedLineIndex(i - 1);
          setFocusTarget({ index: i - 1, cursorPos: start });
        }
      }
    } else if (e.key === "ArrowDown") {
      const totalLines = textarea.value.split("\n").length;
      const cursorLine = textarea.value.slice(0, start).split("\n").length;
      if (cursorLine === totalLines) {
        if (i < lines.length - 1) {
          e.preventDefault();
          setFocusedLineIndex(i + 1);
          setFocusTarget({ index: i + 1, cursorPos: start });
        }
      }
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentValue = textarea.value;

    const updatedLineText =
      currentValue.slice(0, start) + text + currentValue.slice(end);
    const pastedLines = updatedLineText.split("\n");

    const newLines = [...lines];
    newLines.splice(index, 1, ...pastedLines);

    onChange(newLines.join("\n"));

    const lastPastedLineIndex = index + pastedLines.length - 1;
    const lastPastedLineText = pastedLines[pastedLines.length - 1];
    setFocusedLineIndex(lastPastedLineIndex);
    setFocusTarget({
      index: lastPastedLineIndex,
      cursorPos: lastPastedLineText.length,
    });
  };

  const handleCheckboxToggle = (index: number) => {
    const newLines = [...lines];
    const line = newLines[index];
    let newLine = line;
    if (line.startsWith("- [ ] ")) {
      newLine = "- [x] " + line.slice(6);
    } else if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
      newLine = "- [ ] " + line.slice(6);
    } else if (line.startsWith("* [ ] ")) {
      newLine = "* [x] " + line.slice(6);
    } else if (line.startsWith("* [x] ") || line.startsWith("* [X] ")) {
      newLine = "* [ ] " + line.slice(6);
    }
    newLines[index] = newLine;
    onChange(newLines.join("\n"));
  };

  const handleChecklistLineChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    marker: string,
  ) => {
    const newLines = [...lines];
    newLines[index] = marker + e.target.value;
    onChange(newLines.join("\n"));
  };

  const handleChecklistKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    i: number,
    marker: string,
    content: string,
  ) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const left = content.slice(0, start);
      const right = content.slice(start);

      // Auto-create next checklist item unchecked
      const cleanMarker = marker.includes("[x]")
        ? marker.replace("[x]", "[ ]")
        : marker.includes("[X]")
          ? marker.replace("[X]", "[ ]")
          : marker;

      const newLines = [...lines];
      newLines[i] = marker + left;
      newLines.splice(i + 1, 0, cleanMarker + right);

      onChange(newLines.join("\n"));
      setFocusedLineIndex(i + 1);
      setFocusTarget({ index: i + 1, cursorPos: 0 });
    } else if (e.key === "Backspace") {
      if (start === 0 && end === 0) {
        e.preventDefault();
        // Remove checklist prefix, converting the line to normal text
        const newLines = [...lines];
        newLines[i] = content;
        onChange(newLines.join("\n"));
        setFocusedLineIndex(i);
        setFocusTarget({ index: i, cursorPos: 0 });
      }
    } else if (e.key === "ArrowUp") {
      const cursorLine = textarea.value.slice(0, start).split("\n").length;
      if (cursorLine === 1) {
        if (i > 0) {
          e.preventDefault();
          setFocusedLineIndex(i - 1);
          setFocusTarget({ index: i - 1, cursorPos: start + 6 });
        }
      }
    } else if (e.key === "ArrowDown") {
      const totalLines = textarea.value.split("\n").length;
      const cursorLine = textarea.value.slice(0, start).split("\n").length;
      if (cursorLine === totalLines) {
        if (i < lines.length - 1) {
          e.preventDefault();
          setFocusedLineIndex(i + 1);
          setFocusTarget({ index: i + 1, cursorPos: start + 6 });
        }
      }
    }
  };

  const handleChecklistPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
    marker: string,
    content: string,
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const updatedLineText = content.slice(0, start) + text + content.slice(end);
    const pastedLines = updatedLineText.split("\n");

    const newLines = [...lines];
    const splitLinesToInsert = pastedLines.map((l, idx) =>
      idx === 0 ? marker + l : l,
    );
    newLines.splice(index, 1, ...splitLinesToInsert);

    onChange(newLines.join("\n"));

    const lastPastedLineIndex = index + pastedLines.length - 1;
    const lastPastedLineText = pastedLines[pastedLines.length - 1];
    setFocusedLineIndex(lastPastedLineIndex);
    setFocusTarget({
      index: lastPastedLineIndex,
      cursorPos:
        lastPastedLineIndex === index
          ? marker.length + lastPastedLineText.length
          : lastPastedLineText.length,
    });
  };

  // Helper to parse bold, italic, code, links inline
  const renderInline = (text: string): React.ReactNode => {
    if (!text) return "\u200B";
    const regex =
      /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|(`)(.*?)\5|(\[)(.*?)\]\((.*?)\)/g;

    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        result.push(text.slice(lastIndex, matchIndex));
      }

      if (match[1]) {
        // Bold
        result.push(
          <strong
            key={matchIndex}
            className="font-bold text-zinc-100 dark:text-zinc-100"
          >
            {match[2]}
          </strong>,
        );
      } else if (match[3]) {
        // Italic
        result.push(
          <em key={matchIndex} className="italic text-zinc-100">
            {match[4]}
          </em>,
        );
      } else if (match[5]) {
        // Inline code
        result.push(
          <code
            key={matchIndex}
            className="bg-zinc-200/50 dark:bg-zinc-800/80 px-1 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400"
          >
            {match[6]}
          </code>,
        );
      } else if (match[7]) {
        // Link
        const linkText = match[8];
        const linkUrl = match[9];
        result.push(
          <a
            key={matchIndex}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {linkText}
          </a>,
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result.length > 0 ? <>{result}</> : text;
  };

  const renderMarkdownLine = (text: string, index: number) => {
    const trimText = text.trim();

    // 1. Headings
    if (text.startsWith("# ")) {
      return (
        <h1 className="text-3xl font-bold text-zinc-100 dark:text-zinc-100 leading-tight">
          {renderInline(text.slice(2))}
        </h1>
      );
    }
    if (text.startsWith("## ")) {
      return (
        <h2 className="text-2xl font-bold text-zinc-100 dark:text-zinc-100 leading-tight">
          {renderInline(text.slice(3))}
        </h2>
      );
    }
    if (text.startsWith("### ")) {
      return (
        <h3 className="text-xl font-bold text-zinc-100 dark:text-zinc-100 leading-tight">
          {renderInline(text.slice(4))}
        </h3>
      );
    }
    if (text.startsWith("#### ")) {
      return (
        <h4 className="text-lg font-bold text-zinc-100 dark:text-zinc-100 leading-tight">
          {renderInline(text.slice(5))}
        </h4>
      );
    }

    // 2. Blockquotes
    if (text.startsWith("> ")) {
      return (
        <blockquote className="border-l-4 border-zinc-500 pl-4 italic text-zinc-400 leading-relaxed">
          {renderInline(text.slice(2))}
        </blockquote>
      );
    }

    // 3. Unordered Lists / Checklists
    if (text.startsWith("- ") || text.startsWith("* ")) {
      const content = text.slice(2);
      if (
        content.startsWith("[ ] ") ||
        content.startsWith("[x] ") ||
        content.startsWith("[X] ")
      ) {
        const checked = !content.startsWith("[ ] ");
        return (
          <div
            className={`flex items-start gap-2.5 group ${!readOnly ? "cursor-text" : ""}`}
            onClick={() => handleLineClick(index)}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => handleCheckboxToggle(index)}
              onClick={(e) => e.stopPropagation()}
              className="custom-checkbox"
            />
            <span
              className={`text-zinc-100 ${checked ? "line-through opacity-50" : ""}`}
            >
              {renderInline(content.slice(4))}
            </span>
          </div>
        );
      }
      return (
        <ul className="list-disc pl-5 text-zinc-100">
          <li
            className={!readOnly ? "cursor-text" : ""}
            onClick={() => handleLineClick(index)}
          >
            {renderInline(content)}
          </li>
        </ul>
      );
    }

    // 4. Ordered Lists
    const orderedListMatch = text.match(/^(\d+)\.\s+(.*)/);
    if (orderedListMatch) {
      const num = orderedListMatch[1];
      const content = orderedListMatch[2];
      return (
        <ol
          className="list-decimal pl-5 text-zinc-100"
          start={parseInt(num, 10)}
        >
          <li
            className={!readOnly ? "cursor-text" : ""}
            onClick={() => handleLineClick(index)}
          >
            {renderInline(content)}
          </li>
        </ol>
      );
    }

    // 5. Code blocks fencing
    if (text.startsWith("```")) {
      return (
        <div className="font-mono text-xs text-pink-400 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700">
          {text}
        </div>
      );
    }

    // 6. Horizontal Rule
    if (trimText === "---" || trimText === "***" || trimText === "___") {
      return <hr className="my-4 border-t border-zinc-600" />;
    }

    // 7. Empty line
    if (trimText === "") {
      return (
        <div
          className={`h-[1.625em] w-full ${!readOnly ? "cursor-text" : ""}`}
          onClick={() => handleLineClick(index)}
        />
      );
    }

    // 8. Normal paragraph text
    return (
      <p
        className={`text-zinc-100 leading-relaxed ${!readOnly ? "cursor-text" : ""}`}
        onClick={() => handleLineClick(index)}
      >
        {renderInline(text)}
      </p>
    );
  };

  const getTextareaClassName = (text: string): string => {
    if (text.startsWith("# ")) {
      return "text-3xl font-bold text-zinc-100 dark:text-zinc-100 leading-tight h-[1.25em] m-0 p-0";
    }
    if (text.startsWith("## ")) {
      return "text-2xl font-bold text-zinc-100 dark:text-zinc-100 leading-tight h-[1.25em] m-0 p-0";
    }
    if (text.startsWith("### ")) {
      return "text-xl font-bold text-zinc-100 dark:text-zinc-100 leading-tight h-[1.25em] m-0 p-0";
    }
    if (text.startsWith("#### ")) {
      return "text-lg font-bold text-zinc-100 dark:text-zinc-100 leading-tight h-[1.25em] m-0 p-0";
    }
    if (text.startsWith("> ")) {
      return "border-l-4 border-zinc-500 pl-4 italic text-zinc-400 leading-relaxed h-[1.625em] m-0 p-0";
    }
    return "text-zinc-100 dark:text-zinc-100 leading-relaxed h-[1.625em] m-0 p-0";
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`flex-1 overflow-y-auto w-full px-3 py-2 leading-relaxed focus:outline-none min-h-[200px] ${className}`}
    >
      {lines.map((line, index) => {
        const { isChecklist, checked, marker, content } =
          parseChecklistLine(line);
        return (
          <div key={index} className="w-full relative min-h-[1.5rem]">
            {focusedLineIndex === index ? (
              isChecklist ? (
                <div className="flex items-start gap-2.5 w-full">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCheckboxToggle(index)}
                    className="custom-checkbox"
                  />
                  <input
                    ref={(el) => {
                      textareaRefs.current[index] = el;
                    }}
                    value={content}
                    onChange={(e) =>
                      handleChecklistLineChange(e, index, marker)
                    }
                    onKeyDown={(e) =>
                      handleChecklistKeyDown(e, index, marker, content)
                    }
                    onPaste={(e) =>
                      handleChecklistPaste(e, index, marker, content)
                    }
                    placeholder={
                      index === 0 && lines.length === 1 ? placeholder : ""
                    }
                    className={`${BASE_INPUT_CLASS} ${getTextareaClassName(content)}`}
                  />
                </div>
              ) : (
                <input
                  ref={(el) => {
                    textareaRefs.current[index] = el;
                  }}
                  value={line}
                  onChange={(e) => handleLineChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  placeholder={
                    index === 0 && lines.length === 1 ? placeholder : ""
                  }
                  className={`${BASE_INPUT_CLASS} ${getTextareaClassName(line)}`}
                />
              )
            ) : (
              <div
                className="w-full min-h-[1.5rem]"
                onClick={() => handleLineClick(index)}
              >
                {renderMarkdownLine(line, index)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
