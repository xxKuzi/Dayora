import type { Folder, Note } from "../types";
import { countInFolder } from "../utils";
import { Button } from "../components";
import type { User } from "firebase/auth";

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
  user: User | null;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  darkMode: string;
  onToggleDarkMode: () => void;
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
  user,
  onSignInClick,
  onSignOutClick,
  darkMode,
  onToggleDarkMode,
}: SidebarProps) {
  const regularFolders = folders.filter(
    (f) => f.id !== trashId && f.name !== "Trash",
  );
  const trashFolder = folders.find(
    (f) => f.id === trashId || f.name === "Trash",
  ) ?? { id: trashId || "f-trash", name: "Trash" };

  return (
    <aside className="w-60 h-full border-r border-zinc-200/80 dark:border-zinc-800/80 p-4 flex flex-col bg-zinc-100/90 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top: Navigation */}
      <div className="space-y-1 mb-4">
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

      {/* Middle Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeView === "notes" && (
          <div className="flex-1 flex flex-col min-h-0 gap-3">
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

            {/* Bottom section containing Trash folder */}
            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
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


            </div>
          </div>
        )}

        {activeView === "daily-plan" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Plan your day with AI assistance
            </p>
          </div>
        )}

        {activeView === "settings" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="text-4xl mb-2">⚙️</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Customize your experience
            </p>
          </div>
        )}
      </div>

      {/* Bottom: Theme Toggle & Auth / Profile Section */}
      <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 mt-4 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Theme
          </span>
          <button
            onClick={onToggleDarkMode}
            title={`Toggle theme mode (currently ${darkMode})`}
            className="px-2.5 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-xs transition-colors border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center gap-1 cursor-pointer font-medium text-zinc-700 dark:text-zinc-300"
          >
            <span>{darkMode === "light" ? "☀ Light" : darkMode === "dark" ? "☾ Dark" : "🌓 Auto"}</span>
          </button>
        </div>

        {user ? (
          <div className="flex items-center justify-between gap-2 bg-zinc-200/30 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40">
            <div className="flex items-center gap-2 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-zinc-300/50 dark:border-zinc-700/50 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                  {user.displayName || "Online User"}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={onSignOutClick}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex-shrink-0"
              title="Sign Out"
            >
              🚪
            </button>
          </div>
        ) : (
          <button
            onClick={onSignInClick}
            className="w-full text-center py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>👤</span>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}
