import type { Folder, Note } from "../types";
import { countInFolder } from "../utils";
import { Button } from "../components";

interface SidebarProps {
  folders: Folder[];
  activeFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onNewFolder: () => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  notes: Note[];
  trashId: string;
}

export default function Sidebar({
  folders,
  activeFolderId,
  onFolderSelect,
  onNewFolder,
  onRenameFolder,
  onDeleteFolder,
  notes,
  trashId,
}: SidebarProps) {
  return (
    <aside className="w-60 border-r border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">
          Folders | JEJIJEEJ
        </h2>
        <Button onClick={onNewFolder} size="sm">
          New
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-1">
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => onFolderSelect(f.id)}
            className={`w-full text-left px-2 py-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              activeFolderId === f.id ? "bg-zinc-200 dark:bg-zinc-800" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate">{f.name}</span>
              <span className="text-xs opacity-60 ml-2">
                {countInFolder(f.id, notes, folders, trashId)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto space-x-2">
        <Button onClick={() => onRenameFolder(activeFolderId)} size="sm">
          Rename
        </Button>
        <Button
          onClick={() => onDeleteFolder(activeFolderId)}
          variant="danger"
          size="sm"
        >
          Delete
        </Button>
      </div>
    </aside>
  );
}
