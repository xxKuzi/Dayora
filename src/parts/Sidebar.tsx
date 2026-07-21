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
  activeView: "notes" | "daily-plan" | "settings";
  onViewChange: (view: "notes" | "daily-plan" | "settings") => void;
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
  activeView,
  onViewChange,
}: SidebarProps) {
  const regularFolders = folders.filter(
    (f) => f.id !== trashId && f.name !== "Trash",
  );
  const trashFolder = folders.find(
    (f) => f.id === trashId || f.name === "Trash",
  ) ?? { id: trashId || "f-trash", name: "Trash" };

  return (
    <aside className="w-60 h-full border-r border-zinc-200/80 dark:border-zinc-800/80 p-4 flex flex-col gap-4 bg-zinc-100/90 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Navigation */}
      <div className="space-y-1">
        {[
          { id: "notes", label: "📝 Notes", icon: "📄" },
          { id: "daily-plan", label: "📅 Daily Plan", icon: "🎯" },
          { id: "settings", label: "⚙️ Settings", icon: "🔧" },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id as any)}
            className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all ${
              activeView === view.id
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md dark:bg-none dark:bg-blue-600 dark:text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Notes-specific content */}
      {activeView === "notes" && (
        <>
          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              Folders
            </h2>
            <Button onClick={onNewFolder} size="sm">
              New
            </Button>
          </div>

          <div className="flex-1 overflow-auto space-y-1 pr-1">
            {regularFolders.map((f) => (
              <div
                key={f.id}
                className={`group/folder flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  activeFolderId === f.id
                    ? "bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
                onClick={() => onFolderSelect(f.id)}
              >
                <span className="truncate flex-1">{f.name}</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameFolder(f.id);
                      }}
                      title="Rename folder"
                      className="p-0.5 text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(f.id);
                      }}
                      title="Delete folder"
                      className="p-0.5 text-xs text-zinc-400 hover:text-red-500 rounded transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                  <span className="text-xs opacity-60">
                    {countInFolder(f.id, notes, folders, trashId)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom section always containing Trash folder */}
          <div className="mt-auto pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
            <div
              key={trashFolder.id}
              className={`group/folder flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeFolderId === trashFolder.id
                  ? "bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              onClick={() => onFolderSelect(trashFolder.id)}
            >
              <span className="truncate flex-1 flex items-center gap-2">
                <span className="text-base leading-none">🗑️</span>
                <span>{trashFolder.name}</span>
              </span>
              <span className="text-xs opacity-60">
                {countInFolder(trashFolder.id, notes, folders, trashId)}
              </span>
            </div>

            {activeFolderId !== trashFolder.id && (
              <div className="flex items-center space-x-2 pt-1">
                <Button onClick={() => onRenameFolder(activeFolderId)} size="sm" className="flex-1">
                  Rename
                </Button>
                <Button
                  onClick={() => onDeleteFolder(activeFolderId)}
                  variant="danger"
                  size="sm"
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Daily Plan content */}
      {activeView === "daily-plan" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-sm text-zinc-600 dark:text-zinc-200">
            Plan your day with AI assistance
          </p>
        </div>
      )}

      {/* Settings content */}
      {activeView === "settings" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-2">⚙️</div>
          <p className="text-sm text-zinc-600 dark:text-zinc-200">
            Customize your experience
          </p>
        </div>
      )}
    </aside>
  );
}
