import { useState, useEffect } from "react";
import type { Note } from "../types";
import { Input, Textarea } from "../components";
import { LivePreviewEditor } from "../parts";

interface EditorProps {
  activeNote: Note | null;
  draftTitle: string;
  draftBody: string;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  showLastEdited?: boolean;
}

export default function Editor({
  activeNote,
  draftTitle,
  draftBody,
  onTitleChange,
  onBodyChange,
  showLastEdited = true,
}: EditorProps) {
  type EditorMode = "markdown" | "live" | "preview";

  const [editorMode, setEditorMode] = useState<EditorMode>(() => {
    const saved = localStorage.getItem("dayora_editor_mode");
    if (saved === "markdown" || saved === "live" || saved === "preview") {
      return saved;
    }
    // Fallback migration check for old settings
    const oldSaved = localStorage.getItem("dayora_obsidian_mode");
    if (oldSaved === "false") {
      return "markdown";
    }
    return "live";
  });

  const changeEditorMode = (mode: EditorMode) => {
    setEditorMode(mode);
    localStorage.setItem("dayora_editor_mode", mode);
  };

  if (!activeNote) {
    return (
      <main className="flex-1 h-full p-4 flex flex-col min-w-0">
        <div className="m-auto opacity-60">Select or create a note</div>
      </main>
    );
  }

  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    setHasTyped(false);
  }, [activeNote?.id]);

  const handleTitleChange = (title: string) => {
    setHasTyped(true);
    onTitleChange(title);
  };

  const handleBodyChange = (body: string) => {
    setHasTyped(true);
    onBodyChange(body);
  };

  return (
    <main className="no-transition flex-1 h-full px-4 py-6 flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 justify-between shrink-0">
        <div className="flex items-center gap-2 w-full bg-zinc-200/80 dark:bg-zinc-800 rounded-5xl pr-4">
          <Input
            value={draftTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Title"
            className="flex-1 text-2xl font-semibold bg-transparent outline-none px-1 py-2 rounded"
          />
          <div className="flex items-center gap-1 bg-zinc-300/60 dark:bg-zinc-700/50 p-1 rounded-full text-xs select-none">
            <button
              onClick={() => changeEditorMode("markdown")}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                editorMode === "markdown"
                  ? "bg-zinc-100 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Plain Text Editor"
            >
              Text
            </button>
            <button
              onClick={() => changeEditorMode("live")}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                editorMode === "live"
                  ? "bg-zinc-100 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Live Preview (Obsidian mode)"
            >
              Markdown
            </button>
          </div>
        </div>
      </div>

      {editorMode === "markdown" ? (
        <Textarea
          value={draftBody}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder="Start typing…"
          className="flex-1 mt-3 h-full placeholder:text-zinc-200/50 dark:placeholder:text-zinc-200/50 resize-none"
        />
      ) : (
        <LivePreviewEditor
          value={draftBody}
          onChange={handleBodyChange}
          readOnly={editorMode === "preview"}
          placeholder={editorMode === "preview" ? "" : "Start typing…"}
          className="mt-3 placeholder:text-zinc-200/50 dark:placeholder:text-zinc-200/50"
        />
      )}

      {showLastEdited && !hasTyped && (
        <div className="pt-2 text-xs text-zinc-200 shrink-0">
          Last edited {new Date(activeNote.updatedAt).toLocaleString()}
        </div>
      )}
    </main>
  );
}
