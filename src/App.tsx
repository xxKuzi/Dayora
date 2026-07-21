import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { flushSync } from "react-dom";

import type {
  Note,
  Folder,
  AppState,
  DarkMode,
  DailyPlan,
  UserSettings,
  CookiePreference,
} from "./types";
import { Button, CookieBanner, FolderModal } from "./components";
import type { FolderModalType } from "./components/FolderModal";
import { nid, fid, deriveTitleFromBody, load, save } from "./utils";
import { Sidebar, NotesList } from "./parts";
import { Editor, DailyPlan as DailyPlanComponent, Settings } from "./pages";
import { initializeAI, getAIService } from "./services/ai";

export default function App() {
  // ---- State ----
  const initial = load() as AppState | null;

  const [folders, setFolders] = useState<Folder[]>(
    initial?.folders ?? [
      { id: "f-default", name: "Notes" },
      { id: "f-ideas", name: "Ideas" },
      { id: "f-trash", name: "Trash" },
    ],
  );
  const [notes, setNotes] = useState<Note[]>(
    initial?.notes ?? [
      {
        id: nid(),
        title: "Welcome",
        body: "This is your first note.\nType away!",
        pinned: true,
        updatedAt: Date.now(),
        folderId: "f-default",
      },
      {
        id: nid(),
        title: "Todo",
        body: "- Try dark mode (top right)\n- Press Ctrl/Cmd+N for new note\n- Search notes in the middle pane\n- Delete moves to Trash",
        pinned: false,
        updatedAt: Date.now() - 10000,
        folderId: "f-default",
      },
    ],
  );

  const setNotesWithTransition = (
    update: Note[] | ((prev: Note[]) => Note[])
  ) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          setNotes(update);
        });
      });
    } else {
      setNotes(update);
    }
  };

  const [activeFolderId, setActiveFolderId] = useState<string>(
    initial?.activeFolderId ?? folders[0]?.id ?? "f-default",
  );
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    initial?.activeNoteId ?? notes[0]?.id ?? null,
  );
  const [query, setQuery] = useState<string>(initial?.query ?? "");
  const deferredQuery = useDeferredValue(query);
  const [darkMode, setDarkMode] = useState<DarkMode>(() => {
    const saved = localStorage.getItem("dayora_dark_mode");
    if (saved === "light" || saved === "dark" || saved === "auto") {
      return saved as DarkMode;
    }
    // Migrate from old boolean dark mode to new DarkMode type
    if (initial?.darkMode) return initial.darkMode;
    if (initial && "dark" in initial && typeof initial.dark === "boolean") {
      return initial.dark ? "dark" : "light";
    }
    return "auto";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [notesListVisible, setNotesListVisible] = useState<boolean>(true);
  const [comfortableTyping, setComfortableTyping] = useState<boolean>(() => {
    const saved = localStorage.getItem("dayora_comfortable_typing");
    return saved === null ? true : saved === "true";
  });
  const [activeView, setActiveView] = useState<
    "notes" | "daily-plan" | "settings"
  >("notes");
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(
    initial?.dailyPlans ?? [],
  );
  const [settings, setSettings] = useState<UserSettings>(
    initial?.settings ?? {
      userType: "worker",
      mealTimes: {
        breakfast: "08:00",
        lunch: "12:30",
        dinner: "19:00",
      },
      workHours: {
        start: "09:00",
        end: "17:00",
      },
      habits: [],
      goals: [],
    },
  );
  const [cookiePreference, setCookiePreference] = useState<
    CookiePreference | undefined
  >(
    (() => {
      // Handle migration from old cookiesAccepted boolean
      if (initial?.cookiePreference) return initial.cookiePreference;
      if (
        initial &&
        "cookiesAccepted" in initial &&
        typeof initial.cookiesAccepted === "boolean"
      ) {
        return initial.cookiesAccepted ? "accepted" : "declined";
      }
      return undefined;
    })()
  );
  const [aiError, setAiError] = useState<string | null>(null);

  // Folder modal state
  const [folderModal, setFolderModal] = useState<{
    isOpen: boolean;
    type: FolderModalType;
    folderId: string | null;
  }>({
    isOpen: false,
    type: null,
    folderId: null,
  });

  // Calculate if we should show dark mode
  const isDark =
    darkMode === "dark" || (darkMode === "auto" && systemPrefersDark);

  // Helper to check if data should be persisted
  const shouldPersistData = cookiePreference === "accepted";

  // Initialize AI service on component mount
  useEffect(() => {
    try {
      initializeAI();
      setAiError(null);
    } catch {
      console.warn("VITE_GEMINI_API_KEY not found in environment variables");
      setAiError("AI API key not configured");
    }
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Save dark mode preference to local storage when it changes
  useEffect(() => {
    if (cookiePreference !== "declined") {
      localStorage.setItem("dayora_dark_mode", darkMode);
    }
  }, [darkMode, cookiePreference]);

  // Save comfortable typing preference to local storage when it changes
  useEffect(() => {
    if (cookiePreference !== "declined") {
      localStorage.setItem("dayora_comfortable_typing", String(comfortableTyping));
    }
  }, [comfortableTyping, cookiePreference]);

  // Keyboard shortcuts for toggling sections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault();
            setSidebarVisible((prev) => !prev);
            break;
          case "n":
            e.preventDefault();
            setNotesListVisible((prev) => !prev);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Ensure Trash folder exists once and migrate notes without folderId
  useEffect(() => {
    if (!folders.some((f) => f.name === "Trash")) {
      setFolders((fs) => [...fs, { id: "f-trash", name: "Trash" }]);
    }

    // Migrate existing notes that don't have folderId
    const needsMigration = notes.some((note) => !("folderId" in note));
    if (needsMigration) {
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          "folderId" in note
            ? note
            : { ...(note as Note), folderId: "f-default" },
        ),
      );
    }
  }, [folders, notes]);

  const trashId = useMemo(
    () => folders.find((f) => f.name === "Trash")?.id ?? "f-trash",
    [folders],
  );

  // Active note + local editor drafts (for instant typing)
  const activeNote = useMemo<Note | null>(
    () => notes.find((n) => n.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );
  const [draftTitle, setDraftTitle] = useState<string>(activeNote?.title ?? "");
  const [draftBody, setDraftBody] = useState<string>(activeNote?.body ?? "");

  // When switching notes, load drafts from the selected note
  useEffect(() => {
    setDraftTitle(activeNote?.title ?? "");
    setDraftBody(activeNote?.body ?? "");
  }, [activeNote?.id, activeNote?.title, activeNote?.body]);

  // Debounce persisting drafts into notes (200ms)
  useEffect(() => {
    if (!activeNote) return;

    // Only save and update updatedAt if there are actual changes
    if (draftTitle === activeNote.title && draftBody === activeNote.body) {
      return;
    }

    const h = window.setTimeout(() => {
      const title =
        (draftTitle && draftTitle.trim()) || deriveTitleFromBody(draftBody);
      setNotes((ns) =>
        ns.map((n) =>
          n.id === activeNote.id
            ? { ...n, title, body: draftBody, updatedAt: Date.now() }
            : n,
        ),
      );
    }, 200);
    return () => window.clearTimeout(h);
  }, [draftTitle, draftBody, activeNote]);

  // Debounce localStorage writes (300ms) to avoid blocking main thread
  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!shouldPersistData) return; // Don't save if cookies not accepted

    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      save({
        folders,
        notes,
        activeFolderId,
        activeNoteId,
        query,
        darkMode,
        dailyPlans,
        settings,
        cookiePreference,
      });
    }, 300);
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [
    folders,
    notes,
    activeFolderId,
    activeNoteId,
    query,
    darkMode,
    dailyPlans,
    settings,
    cookiePreference,
    shouldPersistData,
  ]);

  // ---- Derived lists ----
  const visibleNotes = useMemo(() => {
    const inFolder = notes.filter((n) =>
      activeFolderId === trashId ? !!n.trashed : !n.trashed,
    );

    const filteredByFolder =
      activeFolderId === trashId
        ? inFolder
        : inFolder.filter(
            (n) => n.folderId === activeFolderId || activeFolderId === "f-all",
          );

    const q = deferredQuery.trim().toLowerCase();
    const filtered = q
      ? filteredByFolder.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q),
        )
      : filteredByFolder;

    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, activeFolderId, deferredQuery, trashId]);

  // ---- Folder Action Handlers ----
  function handleNewFolder() {
    setFolderModal({
      isOpen: true,
      type: "new",
      folderId: null,
    });
  }

  function handleRenameFolder(id: string) {
    setFolderModal({
      isOpen: true,
      type: "rename",
      folderId: id,
    });
  }

  function handleDeleteFolder(id: string) {
    setFolderModal({
      isOpen: true,
      type: "delete",
      folderId: id,
    });
  }

  function handleConfirmNewFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const f: Folder = { id: fid(), name: trimmed };
    setFolders((fs) => [...fs, f]);
    setActiveFolderId(f.id);
    handleCloseFolderModal();
  }

  function handleConfirmRenameFolder(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFolders((fs) =>
      fs.map((f) => (f.id === id ? { ...f, name: trimmed } : f)),
    );
    handleCloseFolderModal();
  }

  function handleConfirmDeleteFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    if (!folder || folder.name === "Trash" || id === trashId) {
      handleCloseFolderModal();
      return;
    }
    // Move notes to Trash
    const updated = notes.map((n) =>
      n.folderId === id ? { ...n, trashed: true, updatedAt: Date.now() } : n,
    );
    setNotesWithTransition(updated);
    // Remove folder
    setFolders((fs) => fs.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(trashId);
    handleCloseFolderModal();
  }

  function handleCloseFolderModal() {
    setFolderModal({ isOpen: false, type: null, folderId: null });
  }

  function handleNewNote() {
    // Place in active folder (if Trash, use default Notes folder)
    const targetFolderId =
      activeFolderId === trashId ? folders[0].id : activeFolderId;
    const newN: Note = {
      id: nid(),
      title: "",
      body: "",
      pinned: false,
      updatedAt: Date.now(),
      trashed: false,
      folderId: targetFolderId,
    };
    setNotesWithTransition((ns) => [newN, ...ns]);
    setActiveNoteId(newN.id);
    if (activeFolderId === trashId) setActiveFolderId(targetFolderId);
    // Reset drafts to keep editor fast
    setDraftTitle("");
    setDraftBody("");
  }

  function handleDeleteNote(note: Note | null) {
    if (!note) return;
    if (note.trashed) {
      // permanent delete
      setNotesWithTransition((ns) => ns.filter((n) => n.id !== note.id));
      setActiveNoteId(null);
      return;
    }
    // move to trash
    setNotesWithTransition((ns) =>
      ns.map((n) =>
        n.id === note.id ? { ...n, trashed: true, updatedAt: Date.now() } : n,
      ),
    );
    if (activeFolderId !== trashId) setActiveFolderId(trashId);
  }

  function handleRestoreNote(note: Note | null) {
    if (!note) return;
    setNotesWithTransition((ns) =>
      ns.map((n) =>
        n.id === note.id ? { ...n, trashed: false, updatedAt: Date.now() } : n,
      ),
    );
  }

  function togglePin(note: Note) {
    setNotesWithTransition((ns) =>
      ns.map((n) =>
        n.id === note.id
          ? { ...n, pinned: !n.pinned, updatedAt: Date.now() }
          : n,
      ),
    );
  }

  function handleMoveNote(note: Note, folderId: string) {
    // Only transition if the folder is changing
    setNotesWithTransition((ns) =>
      ns.map((n) =>
        n.id === note.id ? { ...n, folderId, updatedAt: Date.now() } : n,
      ),
    );
  }

  function handleToggleDarkMode() {
    setDarkMode((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "auto";
      return "light";
    });
  }

  function handleToggleAllPanels() {
    if (sidebarVisible || notesListVisible) {
      // Hide both panels
      setSidebarVisible(false);
      setNotesListVisible(false);
    } else {
      // Show both panels
      setSidebarVisible(true);
      setNotesListVisible(true);
    }
  }

  // Daily Plan handlers
  function handleCreateDailyPlan(date: string) {
    const newPlan: DailyPlan = {
      id: `plan_${Math.random().toString(36).slice(2, 9)}`,
      date,
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDailyPlans((prev) => [newPlan, ...prev]);
  }

  function handleUpdateDailyPlan(updatedPlan: DailyPlan) {
    setDailyPlans((prev) =>
      prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)),
    );
  }

  async function handleGenerateWithGemini(tasks: string) {
    try {
      setAiError(null);
      const aiService = getAIService();
      const generatedPlan = await aiService.generateDailyPlan(tasks, settings);

      const today = new Date().toISOString().split("T")[0];
      const existingPlan = dailyPlans.find((plan) => plan.date === today);

      if (existingPlan) {
        const updatedPlan = {
          ...existingPlan,
          tasks: [...existingPlan.tasks, ...generatedPlan.tasks],
          updatedAt: Date.now(),
        };
        handleUpdateDailyPlan(updatedPlan);
      } else {
        const newPlan: DailyPlan = {
          id: `plan_${Math.random().toString(36).slice(2, 9)}`,
          date: today,
          tasks: generatedPlan.tasks,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setDailyPlans((prev) => [newPlan, ...prev]);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      setAiError(
        error instanceof Error
          ? error.message
          : "Failed to generate plan with AI",
      );
      // Don't automatically fall back - let user choose
    }
  }

  // Settings handlers
  function handleUpdateSettings(newSettings: UserSettings) {
    setSettings(newSettings);
  }

  // Cookie handlers
  function handleAcceptCookies() {
    setCookiePreference("accepted");
  }

  function handleDeclineCookies() {
    setCookiePreference("declined");
    // Clear existing data from localStorage when declining
    localStorage.removeItem("dayora_v1");
    localStorage.removeItem("dayora_dark_mode");
    localStorage.removeItem("dayora_comfortable_typing");
  }

  return (
    <div className={"w-full h-screen flex " + (isDark ? "dark" : "")}>
      {/* Fixed Toggle Buttons - Top Right Corner */}
      {(activeView !== "notes" || !activeNote) && (
        <div className="fixed top-2 right-4 z-50 flex items-center gap-2">
          {(!sidebarVisible || !notesListVisible) && (
            /* Comfortable Typing Button - only when panels are hidden */
            <Button
              onClick={() => setComfortableTyping(!comfortableTyping)}
              title={`${
                comfortableTyping ? "Disable" : "Enable"
              } Comfortable Typing`}
              size="sm"
              className="!bg-gray-600 hover:!bg-gray-700 !text-white !border-gray-500 hover:!scale-100 !rounded-full !w-8 !h-8 !p-0 flex items-center justify-center"
            >
              <div className="relative w-4 h-4">
                {/* Outer circle */}
                <div className="absolute inset-0 rounded-full border-2 border-white"></div>
                {/* Inner fill - only visible when comfortable typing is active */}
                {comfortableTyping && (
                  <div className="absolute inset-0.5 rounded-full bg-white"></div>
                )}
              </div>
            </Button>
          )}
          <Button
            onClick={handleToggleAllPanels}
            title={`${
              sidebarVisible || notesListVisible ? "Hide" : "Show"
            } All Panels`}
            size="sm"
            className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-500 hover:!scale-100"
          >
            {sidebarVisible || notesListVisible ? "◀◀" : "▶▶"}
          </Button>
          {(sidebarVisible || notesListVisible) && (
            <>
              <Button
                onClick={() => setSidebarVisible(!sidebarVisible)}
                title={`${sidebarVisible ? "Hide" : "Show"} Sidebar (Ctrl/Cmd+B)`}
                size="sm"
              >
                {sidebarVisible ? "◀" : "▶"}
              </Button>
              <Button
                onClick={() => setNotesListVisible(!notesListVisible)}
                title={`${
                  notesListVisible ? "Hide" : "Show"
                } Notes List (Ctrl/Cmd+N)`}
                size="sm"
              >
                {notesListVisible ? "◀" : "▶"}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="w-full h-full flex text-zinc-900 dark:text-zinc-100">
        {sidebarVisible && (
          <div className="fixed left-0 top-0 h-screen bg-zinc-100 dark:bg-zinc-950 z-10">
            <Sidebar
              folders={folders}
              activeFolderId={activeFolderId}
              onFolderSelect={setActiveFolderId}
              onNewFolder={handleNewFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              notes={notes}
              trashId={trashId}
              activeView={activeView}
              onViewChange={setActiveView}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 h-screen flex flex-col bg-black/d0 ${
            activeView === "notes" && notesListVisible
              ? sidebarVisible
                ? "ml-[560px]"
                : comfortableTyping
                  ? "ml-[400px]"
                  : "ml-80"
              : sidebarVisible
                ? comfortableTyping
                  ? "ml-80"
                  : "ml-60"
                : comfortableTyping
                  ? "ml-20"
                  : ""
          }`}
        >
          {activeView === "notes" && (
            <>
              {notesListVisible && (
                <div
                  className={`fixed top-0 h-screen z-10 ${
                    sidebarVisible ? "left-60" : "left-0"
                  }`}
                >
                  <NotesList
                    notes={visibleNotes}
                    activeNoteId={activeNoteId}
                    query={query}
                    onQueryChange={setQuery}
                    onNoteSelect={setActiveNoteId}
                    onNewNote={handleNewNote}
                    onToggleDarkMode={handleToggleDarkMode}
                    darkMode={darkMode}
                    folders={folders}
                    onTogglePin={togglePin}
                    onDeleteNote={handleDeleteNote}
                    onRestoreNote={handleRestoreNote}
                    onMoveNote={handleMoveNote}
                  />
                </div>
              )}

              <Editor
                activeNote={activeNote}
                draftTitle={draftTitle}
                draftBody={draftBody}
                onTitleChange={setDraftTitle}
                onBodyChange={setDraftBody}
                showLastEdited={sidebarVisible && notesListVisible}
                sidebarVisible={sidebarVisible}
                onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
                notesListVisible={notesListVisible}
                onToggleNotesList={() => setNotesListVisible(!notesListVisible)}
                comfortableTyping={comfortableTyping}
                onToggleComfortableTyping={() => setComfortableTyping(!comfortableTyping)}
                onToggleAllPanels={handleToggleAllPanels}
              />
            </>
          )}

          {activeView === "daily-plan" && (
            <DailyPlanComponent
              dailyPlan={
                dailyPlans.find(
                  (plan) =>
                    plan.date === new Date().toISOString().split("T")[0],
                ) || null
              }
              settings={settings}
              onUpdatePlan={handleUpdateDailyPlan}
              onCreatePlan={handleCreateDailyPlan}
              onGenerateWithGemini={handleGenerateWithGemini}
              aiError={aiError}
            />
          )}

          {activeView === "settings" && (
            <Settings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </div>
      </div>

      {/* Cookie Banner */}
      {cookiePreference === undefined && (
        <CookieBanner
          onAccept={handleAcceptCookies}
          onDecline={handleDeclineCookies}
        />
      )}

      {/* Folder Modal */}
      <FolderModal
        isOpen={folderModal.isOpen}
        type={folderModal.type}
        folder={folders.find((f) => f.id === folderModal.folderId) ?? null}
        hasNotes={notes.some(
          (n) => n.folderId === folderModal.folderId && !n.trashed,
        )}
        onClose={handleCloseFolderModal}
        onConfirmNew={handleConfirmNewFolder}
        onConfirmRename={handleConfirmRenameFolder}
        onConfirmDelete={handleConfirmDeleteFolder}
      />
    </div>
  );
}
