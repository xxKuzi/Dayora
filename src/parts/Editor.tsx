import { useState, useEffect, useRef } from "react";
import type { Note, Folder } from "../types";
import { Button, Input, Textarea } from "../components";

interface EditorProps {
  activeNote: Note | null;
  draftTitle: string;
  draftBody: string;
  folders: Folder[];
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  onTogglePin: (note: Note) => void;
  onDeleteNote: (note: Note | null) => void;
  onRestoreNote: (note: Note | null) => void;
  onMoveNote: (note: Note, folderId: string) => void;
}

export default function Editor({
  activeNote,
  draftTitle,
  draftBody,
  folders,
  onTitleChange,
  onBodyChange,
  onTogglePin,
  onDeleteNote,
  onRestoreNote,
  onMoveNote,
}: EditorProps) {
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMoveDropdown(false);
      }
    }

    if (showMoveDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoveDropdown]);
  if (!activeNote) {
    return (
      <main className="flex-1 p-4 flex flex-col min-w-0">
        <div className="m-auto opacity-60">Select or create a note</div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 flex flex-col min-w-0">
      <div className="flex items-center gap-2 justify-between">
        <Input
          value={draftTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
          className="w-full text-2xl font-semibold bg-transparent outline-none px-1 py-2 rounded"
        />
        <div className="shrink-0 flex items-center gap-2">
          {!activeNote.trashed && (
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-60">
                In:{" "}
                {folders.find((f) => f.id === activeNote.folderId)?.name ||
                  "Unknown"}
              </span>
              <div className="relative" ref={dropdownRef}>
                <Button
                  onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                  title="Move to folder"
                >
                  📁 Move
                </Button>
                {showMoveDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-10 min-w-32">
                    {folders
                      .filter(
                        (f) =>
                          f.name !== "Trash" && f.id !== activeNote.folderId
                      )
                      .map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            onMoveNote(activeNote, folder.id);
                            setShowMoveDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm"
                        >
                          {folder.name}
                        </button>
                      ))}
                    {folders.filter(
                      (f) => f.name !== "Trash" && f.id !== activeNote.folderId
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm opacity-60">
                        No other folders
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <Button onClick={() => onTogglePin(activeNote)}>
            {activeNote.pinned ? "Unpin" : "Pin"}
          </Button>
          {activeNote.trashed ? (
            <>
              <Button
                onClick={() => onRestoreNote(activeNote)}
                variant="success"
              >
                Restore
              </Button>
              <Button onClick={() => onDeleteNote(activeNote)} variant="danger">
                Delete permanently
              </Button>
            </>
          ) : (
            <Button onClick={() => onDeleteNote(activeNote)} variant="danger">
              Delete
            </Button>
          )}
        </div>
      </div>

      <Textarea
        value={draftBody}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder="Start typing…"
        className="flex-1 mt-3"
      />

      <div className="pt-2 text-xs opacity-60">
        Last edited {new Date(activeNote.updatedAt).toLocaleString()}
      </div>
    </main>
  );
}
