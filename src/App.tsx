import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";

import type {
  Note,
  Folder,
  AppState,
  DarkMode,
  DailyPlan,
  UserSettings,
} from "./types";
import { Button } from "./components";
import { nid, fid, deriveTitleFromBody, load, save } from "./utils";
import {
  Sidebar,
  NotesList,
  Editor,
  DailyPlan as DailyPlanComponent,
  Settings,
} from "./parts";
import { CookieBanner } from "./components";
import { initializeAI, getAIService } from "./services/ai";

export default function App() {
  // ---- State ----
  const initial = load() as AppState | null;

  const [folders, setFolders] = useState<Folder[]>(
    initial?.folders ?? [
      { id: "f-default", name: "Notes" },
      { id: "f-ideas", name: "Ideas" },
      { id: "f-trash", name: "Trash" },
    ]
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
    ]
  );
  const [activeFolderId, setActiveFolderId] = useState<string>(
    initial?.activeFolderId ?? folders[0]?.id ?? "f-default"
  );
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    initial?.activeNoteId ?? notes[0]?.id ?? null
  );
  const [query, setQuery] = useState<string>(initial?.query ?? "");
  const deferredQuery = useDeferredValue(query);
  const [darkMode, setDarkMode] = useState<DarkMode>(() => {
    // Migrate from old boolean dark mode to new DarkMode type
    if (initial?.darkMode) return initial.darkMode;
    if (initial && "dark" in initial && typeof initial.dark === "boolean") {
      return initial.dark ? "dark" : "light";
    }
    return "auto";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [notesListVisible, setNotesListVisible] = useState<boolean>(true);
  const [comfortableTyping, setComfortableTyping] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<
    "notes" | "daily-plan" | "settings"
  >("notes");
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(
    initial?.dailyPlans ?? []
  );
  const [settings, setSettings] = useState<UserSettings>(
    initial?.settings ?? {
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
    }
  );
  const [cookiesAccepted, setCookiesAccepted] = useState<boolean>(
    initial?.cookiesAccepted ?? false
  );
  const [aiError, setAiError] = useState<string | null>(null);

  // Calculate if we should show dark mode
  const isDark =
    darkMode === "dark" || (darkMode === "auto" && systemPrefersDark);

  // Initialize AI service on component mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      try {
        initializeAI(apiKey);
        setAiError(null);
      } catch (error) {
        console.error("Failed to initialize AI service:", error);
        setAiError("Failed to initialize AI service");
      }
    } else {
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
            : { ...(note as Note), folderId: "f-default" }
        )
      );
    }
  }, [folders, notes]);

  const trashId = useMemo(
    () => folders.find((f) => f.name === "Trash")?.id ?? "f-trash",
    [folders]
  );

  // Active note + local editor drafts (for instant typing)
  const activeNote = useMemo<Note | null>(
    () => notes.find((n) => n.id === activeNoteId) ?? null,
    [notes, activeNoteId]
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
    const h = window.setTimeout(() => {
      const title =
        (draftTitle && draftTitle.trim()) || deriveTitleFromBody(draftBody);
      setNotes((ns) =>
        ns.map((n) =>
          n.id === activeNote.id
            ? { ...n, title, body: draftBody, updatedAt: Date.now() }
            : n
        )
      );
    }, 200);
    return () => window.clearTimeout(h);
  }, [draftTitle, draftBody, activeNote]);

  // Debounce localStorage writes (300ms) to avoid blocking main thread
  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
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
        cookiesAccepted,
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
    cookiesAccepted,
  ]);

  // ---- Derived lists ----
  const visibleNotes = useMemo(() => {
    const inFolder = notes.filter((n) =>
      activeFolderId === trashId ? !!n.trashed : !n.trashed
    );

    const filteredByFolder =
      activeFolderId === trashId
        ? inFolder
        : inFolder.filter(
            (n) => n.folderId === activeFolderId || activeFolderId === "f-all"
          );

    const q = deferredQuery.trim().toLowerCase();
    const filtered = q
      ? filteredByFolder.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q)
        )
      : filteredByFolder;

    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, activeFolderId, deferredQuery, trashId]);

  // ---- Actions ----
  function handleNewFolder() {
    const name = prompt("Folder name:", "New Folder");
    if (!name) return;
    const f: Folder = { id: fid(), name: name.trim() };
    setFolders((fs) => [...fs, f]);
    setActiveFolderId(f.id);
  }

  function handleRenameFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    const name = prompt("Rename folder:", folder.name);
    if (!name) return;
    setFolders((fs) =>
      fs.map((f) => (f.id === id ? { ...f, name: name.trim() } : f))
    );
  }

  function handleDeleteFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    if (!folder || folder.name === "Trash") {
      alert("Cannot delete Trash");
      return;
    }
    const hasNotes = notes.some((n) => n.folderId === id && !n.trashed);
    if (hasNotes && !confirm("Folder contains notes. Move them to Trash?"))
      return;

    // Move notes to Trash
    const updated = notes.map((n) =>
      n.folderId === id ? { ...n, trashed: true, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    // Remove folder
    setFolders((fs) => fs.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(trashId);
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
    setNotes((ns) => [newN, ...ns]);
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
      setNotes((ns) => ns.filter((n) => n.id !== note.id));
      setActiveNoteId(null);
      return;
    }
    // move to trash
    setNotes((ns) =>
      ns.map((n) =>
        n.id === note.id ? { ...n, trashed: true, updatedAt: Date.now() } : n
      )
    );
    if (activeFolderId !== trashId) setActiveFolderId(trashId);
  }

  function handleRestoreNote(note: Note | null) {
    if (!note) return;
    setNotes((ns) =>
      ns.map((n) =>
        n.id === note.id ? { ...n, trashed: false, updatedAt: Date.now() } : n
      )
    );
  }

  function togglePin(note: Note) {
    setNotes((ns) =>
      ns.map((n) =>
        n.id === note.id
          ? { ...n, pinned: !n.pinned, updatedAt: Date.now() }
          : n
      )
    );
  }

  function handleMoveNote(note: Note, folderId: string) {
    setNotes((ns) =>
      ns.map((n) =>
        n.id === note.id ? { ...n, folderId, updatedAt: Date.now() } : n
      )
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
      prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
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
          : "Failed to generate plan with AI"
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
    setCookiesAccepted(true);
  }

  function handleDeclineCookies() {
    setCookiesAccepted(false);
  }

  return (
    <div className={"w-full h-screen flex " + (isDark ? "dark" : "")}>
      {/* Fixed Toggle Buttons - Top Right Corner */}
      <div className="fixed top-2 right-4 z-50 flex items-center gap-2">
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
        {sidebarVisible || notesListVisible ? (
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
        ) : (
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
      </div>

      <div className="w-full h-full flex text-zinc-900 dark:text-zinc-100">
        {sidebarVisible && (
          <div className="fixed left-0 top-0 h-screen z-10">
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
          className={`flex-1 ${
            activeView === "notes" && notesListVisible
              ? sidebarVisible
                ? "ml-[560px]"
                : "ml-80"
              : sidebarVisible
              ? "ml-60"
              : comfortableTyping && !sidebarVisible && !notesListVisible
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
                  />
                </div>
              )}

              <Editor
                activeNote={activeNote}
                draftTitle={draftTitle}
                draftBody={draftBody}
                folders={folders}
                onTitleChange={setDraftTitle}
                onBodyChange={setDraftBody}
                onTogglePin={togglePin}
                onDeleteNote={handleDeleteNote}
                onRestoreNote={handleRestoreNote}
                onMoveNote={handleMoveNote}
              />
            </>
          )}

          {activeView === "daily-plan" && (
            <DailyPlanComponent
              dailyPlan={
                dailyPlans.find(
                  (plan) => plan.date === new Date().toISOString().split("T")[0]
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
      {!cookiesAccepted && (
        <CookieBanner
          onAccept={handleAcceptCookies}
          onDecline={handleDeclineCookies}
        />
      )}
    </div>
  );
}
