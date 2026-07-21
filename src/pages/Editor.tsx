import type { Note, Folder } from "../types";
import { Input, Textarea, MenuButton } from "../components";

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
  showLastEdited?: boolean;
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
  showLastEdited = true,
}: EditorProps) {
  if (!activeNote) {
    return (
      <main className="flex-1 h-full p-4 flex flex-col min-w-0">
        <div className="m-auto opacity-60">Select or create a note</div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full px-4 py-6 flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 justify-between shrink-0">
        <div className="flex items-center gap-2 w-full bg-zinc-200/80 dark:bg-zinc-800 rounded-5xl">
          <Input
            value={draftTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Title"
            className="flex-1 text-2xl font-semibold bg-transparent outline-none px-1 py-2 rounded"
          />
          <MenuButton
            items={[
              ...(activeNote.trashed
                ? [
                    {
                      label: "Restore",
                      icon: "↩️",
                      onClick: () => onRestoreNote(activeNote),
                    },
                    {
                      label: "Delete permanently",
                      icon: "🗑️",
                      onClick: () => onDeleteNote(activeNote),
                      variant: "danger" as const,
                    },
                  ]
                : [
                    {
                      label: activeNote.pinned ? "Unpin" : "Pin",
                      icon: "📌",
                      onClick: () => onTogglePin(activeNote),
                    },
                    ...folders
                      .filter(
                        (f) =>
                          f.name !== "Trash" && f.id !== activeNote.folderId,
                      )
                      .map((folder) => ({
                        label: `Move to ${folder.name}`,
                        icon: "📁",
                        onClick: () => onMoveNote(activeNote, folder.id),
                      })),
                    {
                      label: "Delete",
                      icon: "🗑️",
                      onClick: () => onDeleteNote(activeNote),
                      variant: "danger" as const,
                    },
                  ]),
            ]}
            title="Note actions"
          />
        </div>
      </div>

      <Textarea
        value={draftBody}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder="Start typing…"
        className="flex-1 mt-3 h-full placeholder:text-zinc-200/50 dark:placeholder:text-zinc-200/50 resize-none"
      />

      {showLastEdited && (
        <div className="pt-2 text-xs opacity-60 shrink-0">
          Last edited {new Date(activeNote.updatedAt).toLocaleString()}
        </div>
      )}
    </main>
  );
}
