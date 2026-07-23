import { useState, useEffect } from "react";
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
  isPro?: boolean;
  onUpgradeClick?: () => void;
  isLoading?: boolean;
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
  isPro = false,
  onUpgradeClick,
  isLoading = false,
}: SidebarProps) {
  const [isMac, setIsMac] = useState(false);
  const [wasLoggedIn, setWasLoggedIn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dayora_user_logged_in") === "true";
    }
    return false;
  });
  const [wasPro, setWasPro] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dayora_is_pro") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(
        /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform),
      );
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setWasLoggedIn(!!user);
      setWasPro(isPro);
    }
  }, [isLoading, user, isPro]);

  const regularFolders = folders.filter(
    (f) => f.id !== trashId && f.name !== "Trash",
  );
  const trashFolder = folders.find(
    (f) => f.id === trashId || f.name === "Trash",
  ) ?? { id: trashId || "f-trash", name: "Trash" };

  return (
    <aside className="w-60 h-full border-r border-zinc-200/80 dark:border-zinc-800/80 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] flex flex-col bg-zinc-100/90 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top: Navigation */}
      <div className="space-y-1 mb-4">
        {[
          { id: "notes", label: "📝 Notes", icon: "📄", key: "A" },
          { id: "daily-plan", label: "📅 Daily Plan", icon: "🎯", key: "S" },
          { id: "settings", label: "⚙️ Settings", icon: "🔧", key: "D" },
        ].map((view) => {
          const shortcut = isMac ? `⌘${view.key}` : `Ctrl+${view.key}`;
          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id as any)}
              title={`Switch to ${view.id === "daily-plan" ? "Daily Plan" : view.id.charAt(0).toUpperCase() + view.id.slice(1)} (${shortcut})`}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                activeView === view.id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md dark:bg-none dark:bg-blue-600 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span>{view.label}</span>
              <kbd
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition-colors ${
                  activeView === view.id
                    ? "bg-white/20 border-white/20 text-white"
                    : "bg-zinc-200/60 dark:bg-zinc-800/60 border-zinc-300/40 dark:border-zinc-700/40 text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {shortcut}
              </kbd>
            </button>
          );
        })}
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
              <Button onClick={onNewFolder} size="sm" disabled={isLoading}>
                New
              </Button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col min-h-0 gap-3">
                <div className="flex-1 overflow-auto space-y-2 pr-1 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 bg-black/5 dark:bg-white/5 rounded-lg w-full" />
                  ))}
                </div>
                <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 animate-pulse">
                  <div className="h-9 bg-black/5 dark:bg-white/5 rounded-lg w-full" />
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
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
            <span>
              {darkMode === "light"
                ? "☀ Light"
                : darkMode === "dark"
                  ? "☾ Dark"
                  : "🌓 Auto"}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Feedback
          </span>
          <a
            href="mailto:juicyy.developer@gmail.com?subject=Dayora%20Feedback&body=Hi%20Dayora%20Team%2C%0A%0AI%20have%20some%20feedback%20about%20the%20app%3A%0A%0A"
            title="Send us feedback via email"
            className="px-2.5 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-xs transition-colors border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center gap-1 cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <span>Send Feedback</span>
          </a>
        </div>

        <div className="flex justify-between px-1.5 pt-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Terms of Service
          </a>
          <span>•</span>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Privacy Policy
          </a>
        </div>

        {isLoading ? (
          wasLoggedIn ? (
            wasPro ? (
              <div className="h-[52px] bg-black/5 dark:bg-white/5 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl animate-pulse w-full" />
            ) : (
              <div className="space-y-2">
                <div className="h-[52px] bg-black/5 dark:bg-white/5 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl animate-pulse w-full" />
                <div className="h-8 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse w-full" />
              </div>
            )
          ) : (
            <div className="h-[38px] bg-black/5 dark:bg-white/5 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl animate-pulse w-full" />
          )
        ) : user ? (
          <div className="space-y-2">
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
                    {(user.displayName || user.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                      {user.displayName || "Online User"}
                    </span>
                    {isPro && (
                      <span className="px-1.5 py-0.5 text-[8px] font-black bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded uppercase tracking-wider flex-shrink-0">
                        Pro
                      </span>
                    )}
                  </div>
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

            {!isPro && onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="w-full text-center py-2 px-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✨ Upgrade to Pro</span>
              </button>
            )}
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
