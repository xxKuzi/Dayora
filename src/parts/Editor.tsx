import type { Note, Folder } from "../types";
import { Input, Textarea, MenuButton, Button } from "../components";

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
  sidebarVisible: boolean;
  notesListVisible: boolean;
  onToggleSidebar: () => void;
  onToggleNotesList: () => void;
  onToggleAllPanels: () => void;
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
  sidebarVisible,
  notesListVisible,
  onToggleSidebar,
  onToggleNotesList,
  onToggleAllPanels,
}: EditorProps) {
  if (!activeNote) {
    return (
      <main className="flex-1 p-4 flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Button
            onClick={onToggleAllPanels}
            title={`${
              sidebarVisible || notesListVisible ? "Hide" : "Show"
            } All Panels`}
            size="sm"
            className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-500 hover:!scale-100"
          >
            {sidebarVisible || notesListVisible ? "◀◀" : "▶▶"}
          </Button>
          <Button
            onClick={onToggleSidebar}
            title={`${sidebarVisible ? "Hide" : "Show"} Sidebar (Ctrl/Cmd+B)`}
            size="sm"
          >
            {sidebarVisible ? "◀" : "▶"}
          </Button>
          <Button
            onClick={onToggleNotesList}
            title={`${
              notesListVisible ? "Hide" : "Show"
            } Notes List (Ctrl/Cmd+N)`}
            size="sm"
          >
            {notesListVisible ? "◀" : "▶"}
          </Button>
        </div>
        <div className="m-auto opacity-60">Select or create a note</div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={onToggleAllPanels}
          title={`${
            sidebarVisible || notesListVisible ? "Hide" : "Show"
          } All Panels`}
          size="sm"
          className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-500 hover:!scale-100"
        >
          {sidebarVisible || notesListVisible ? "◀◀" : "▶▶"}
        </Button>
        <Button
          onClick={onToggleSidebar}
          title={`${sidebarVisible ? "Hide" : "Show"} Sidebar (Ctrl/Cmd+B)`}
          size="sm"
        >
          {sidebarVisible ? "◀" : "▶"}
        </Button>
        <Button
          onClick={onToggleNotesList}
          title={`${
            notesListVisible ? "Hide" : "Show"
          } Notes List (Ctrl/Cmd+N)`}
          size="sm"
        >
          {notesListVisible ? "◀" : "▶"}
        </Button>
      </div>

      <div className="flex items-center gap-2 justify-between">
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
                          f.name !== "Trash" && f.id !== activeNote.folderId
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
        className="flex-1 mt-3"
      />

      <div className="pt-2 text-xs opacity-60">
        Last edited {new Date(activeNote.updatedAt).toLocaleString()}
      </div>
    </main>
  );
}
