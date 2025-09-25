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
  return (
    <aside className="w-60 h-full border-r border-white/20 dark:border-zinc-700/50 p-4 flex flex-col gap-4 bg-white/10 dark:bg-magenta-600 backdrop-blur-md">
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
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Notes-specific content */}
      {activeView === "notes" && (
        <>
          <br></br>
          <div className="w-full h-0.5 bg-zinc-200/30 rounded-full" />

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">
              Folders
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
        </>
      )}

      {/* Daily Plan content */}
      {activeView === "daily-plan" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-sm text-zinc-200 dark:text-zinc-200">
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
