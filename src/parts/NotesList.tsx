import type { Note, DarkMode } from "../types";
import { timeAgo, preview } from "../utils";
import { Button, Input } from "../components";

interface NotesListProps {
  notes: Note[];
  activeNoteId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onNoteSelect: (noteId: string) => void;
  onNewNote: () => void;
  onToggleDarkMode: () => void;
  darkMode: DarkMode;
}

export default function NotesList({
  notes,
  activeNoteId,
  query,
  onQueryChange,
  onNoteSelect,
  onNewNote,
  onToggleDarkMode,
  darkMode,
}: NotesListProps) {
  return (
    <section className="w-80 h-screen border-r border-white/20 dark:border-zinc-700/50 p-4 flex flex-col bg-white/5 dark:bg-zinc-900/30 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="w-full"
        />
        <Button onClick={onNewNote} title="New note (Ctrl/Cmd+N)">
          New
        </Button>
        <Button
          onClick={onToggleDarkMode}
          title={`Toggle theme mode (currently ${darkMode})`}
          className="min-w-[44px]"
        >
          {darkMode === "light" ? "☀" : darkMode === "dark" ? "☾" : "🌓"}
        </Button>
      </div>

      <div className="mt-3 flex-1 overflow-auto">
        {notes.length === 0 && (
          <div className="text-sm opacity-60 p-4">No notes</div>
        )}
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => onNoteSelect(n.id)}
                className={`w-full text-left p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                  activeNoteId === n.id ? "bg-zinc-200 dark:bg-zinc-800" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {n.pinned && <span title="Pinned">📌</span>}
                    <span className="font-medium truncate">
                      {n.title || "(Untitled)"}
                    </span>
                  </div>
                  <span className="text-xs opacity-60 ml-2 whitespace-nowrap">
                    {timeAgo(n.updatedAt)}
                  </span>
                </div>
                <div className="text-xs opacity-60 mt-1 line-clamp-2 whitespace-pre-wrap">
                  {preview(n.body)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
