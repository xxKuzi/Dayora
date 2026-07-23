import { useState } from "react";
import type { Note, DarkMode, Folder } from "../types";
import { timeAgo, preview } from "../utils";
import { Button, Input, MenuButton } from "../components";

interface NotesListProps {
  notes: Note[];
  activeNoteId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onNoteSelect: (noteId: string) => void;
  onNewNote: () => void;
  folders: Folder[];
  onTogglePin: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onRestoreNote: (note: Note) => void;
  onMoveNote: (note: Note, folderId: string) => void;
  onMenuClick?: () => void;
}

export default function NotesList({
  notes,
  activeNoteId,
  query,
  onQueryChange,
  onNoteSelect,
  onNewNote,
  folders,
  onTogglePin,
  onDeleteNote,
  onRestoreNote,
  onMoveNote,
  onMenuClick,
}: NotesListProps) {
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const getNoteMenuItems = (note: Note) => {
    if (note.trashed) {
      return [
        {
          label: "Restore",
          icon: "↩️",
          onClick: () => onRestoreNote(note),
        },
        {
          label: "Delete permanently",
          icon: "🗑️",
          onClick: () => onDeleteNote(note),
          variant: "danger" as const,
        },
      ];
    }

    return [
      {
        label: note.pinned ? "Unpin" : "Pin",
        icon: "📌",
        onClick: () => onTogglePin(note),
      },
      ...folders
        .filter((f) => f.name !== "Trash" && f.id !== note.folderId)
        .map((folder) => ({
          label: `Move to ${folder.name}`,
          icon: "📁",
          onClick: () => onMoveNote(note, folder.id),
        })),
      {
        label: "Delete",
        icon: "🗑️",
        onClick: () => onDeleteNote(note),
        variant: "danger" as const,
      },
    ];
  };

  return (
    <section className="w-full md:w-80 h-screen border-r border-white/20 dark:border-zinc-700/50 p-4 flex flex-col bg-white/35 dark:bg-zinc-900/70 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer shrink-0 md:hidden"
            title="Open folders menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-zinc-700 dark:text-zinc-300"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="w-full"
        />
        <Button onClick={onNewNote} title="New note (Ctrl/Cmd+N)">
          New
        </Button>
      </div>

      <div className="mt-3 flex-1 overflow-auto">
        {notes.length === 0 && (
          <div className="text-sm opacity-60 p-4">No notes</div>
        )}
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li
              key={n.id}
              style={{
                viewTransitionName: `note-${n.id}`,
                viewTransitionClass: "note-item",
                position: openMenuNoteId === n.id ? "relative" : undefined,
                zIndex: openMenuNoteId === n.id ? 50 : undefined,
              } as React.CSSProperties}
            >
              <div
                onClick={() => onNoteSelect(n.id)}
                className={`group relative w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  activeNoteId === n.id
                    ? "bg-zinc-200/90 dark:bg-zinc-800/90 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium shadow-sm"
                    : "bg-white/40 dark:bg-zinc-900/40 border-transparent hover:bg-white/70 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {n.pinned && !n.trashed && (
                      <span title="Pinned" className="text-xs shrink-0">
                        📌
                      </span>
                    )}
                    <span className="font-semibold truncate text-sm">
                      {n.title || "(Untitled)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {n.trashed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreNote(n);
                        }}
                        title="Restore note"
                        className="p-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded transition-colors flex items-center gap-0.5 font-medium"
                      >
                        <span>↩️</span>
                        <span className="text-[11px]">Restore</span>
                      </button>
                    )}

                    <span className="text-[11px] opacity-50 whitespace-nowrap">
                      {timeAgo(n.updatedAt)}
                    </span>

                    <div onClick={(e) => e.stopPropagation()}>
                      <MenuButton
                        items={getNoteMenuItems(n)}
                        title="Note actions"
                        className="mx-0"
                        onOpenChange={(isOpen) => {
                          setOpenMenuNoteId(isOpen ? n.id : null);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-xs opacity-60 mt-1 line-clamp-2 whitespace-pre-wrap">
                  {preview(n.body)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
