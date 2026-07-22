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
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  notesListVisible?: boolean;
  onToggleNotesList?: () => void;
  comfortableTyping?: boolean;
  onToggleComfortableTyping?: () => void;
  onToggleAllPanels?: () => void;
}

export default function Editor({
  activeNote,
  draftTitle,
  draftBody,
  onTitleChange,
  onBodyChange,
  showLastEdited = true,
  sidebarVisible = true,
  onToggleSidebar,
  notesListVisible = true,
  onToggleNotesList,
  comfortableTyping = false,
  onToggleComfortableTyping,
  onToggleAllPanels,
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

  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    setHasTyped(false);
  }, [activeNote?.id]);

  if (!activeNote) {
    return (
      <main className="flex-1 h-full p-4 flex flex-col min-w-0">
        <div className="m-auto opacity-60">Select or create a note</div>
      </main>
    );
  }

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
        <div className="flex items-center gap-2 w-full bg-zinc-200/80 dark:bg-zinc-800 rounded-5xl pr-4 pl-2">
          {/* Panel Control Buttons Group */}
          <div className="flex items-center gap-1 bg-zinc-300/40 dark:bg-zinc-700/30 p-0.5 rounded-full mr-1">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={`${sidebarVisible ? "Hide" : "Show"} Sidebar (Ctrl/Cmd+B)`}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 active:scale-95 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/40 ${
                  sidebarVisible
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4.5 h-4.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            )}

            {onToggleNotesList && (
              <button
                onClick={onToggleNotesList}
                title={`${notesListVisible ? "Hide" : "Show"} Notes List (Ctrl/Cmd+N)`}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 active:scale-95 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/40 ${
                  notesListVisible
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4.5 h-4.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                </svg>
              </button>
            )}

            {onToggleAllPanels && (
              <button
                onClick={onToggleAllPanels}
                title={`${sidebarVisible || notesListVisible ? "Hide" : "Show"} All Panels`}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 active:scale-95 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/40"
              >
                {sidebarVisible || notesListVisible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4.5 h-4.5"
                  >
                    <path d="m18 16-4-4 4-4" />
                    <path d="m12 16-4-4 4-4" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4.5 h-4.5"
                  >
                    <path d="m6 8 4 4-4 4" />
                    <path d="m12 8 4 4-4 4" />
                  </svg>
                )}
              </button>
            )}

            {onToggleComfortableTyping &&
              (!sidebarVisible || !notesListVisible) && (
                <button
                  onClick={onToggleComfortableTyping}
                  title={`${comfortableTyping ? "Disable" : "Enable"} Comfortable Typing`}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 active:scale-95 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/40 ${
                    comfortableTyping
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                    {comfortableTyping ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                    ) : (
                      <div className="absolute inset-0 rounded-full border-2 border-current"></div>
                    )}
                  </div>
                </button>
              )}
          </div>
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
          className="flex-1 mt-3 h-full placeholder:text-zinc-200/50 dark:placeholder:text-zinc-200/50 resize-none typing-area"
        />
      ) : (
        <LivePreviewEditor
          value={draftBody}
          onChange={handleBodyChange}
          readOnly={editorMode === "preview"}
          placeholder={editorMode === "preview" ? "" : "Start typing…"}
          className="mt-3 placeholder:text-zinc-200/50 dark:placeholder:text-zinc-200/50 typing-area"
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
