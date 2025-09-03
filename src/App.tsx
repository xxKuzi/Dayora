import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";

import type { Note, Folder, AppState, DarkMode } from "./types";
import { nid, fid, deriveTitleFromBody, load, save } from "./utils";
import { Sidebar, NotesList, Editor } from "./parts";

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

  // Calculate if we should show dark mode
  const isDark =
    darkMode === "dark" || (darkMode === "auto" && systemPrefersDark);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
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
      save({ folders, notes, activeFolderId, activeNoteId, query, darkMode });
    }, 300);
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [folders, notes, activeFolderId, activeNoteId, query, darkMode]);

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

  return (
    <div className={"w-full h-screen flex " + (isDark ? "dark" : "")}>
      <div className="w-full h-full flex bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
        <Sidebar
          folders={folders}
          activeFolderId={activeFolderId}
          onFolderSelect={setActiveFolderId}
          onNewFolder={handleNewFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          notes={notes}
          trashId={trashId}
        />

        <NotesList
          notes={visibleNotes}
          activeNoteId={activeNoteId}
          query={query}
          onQueryChange={setQuery}
          onNoteSelect={setActiveNoteId}
          onNewNote={handleNewNote}
          onToggleDarkMode={handleToggleDarkMode}
          darkMode={darkMode}
          isDark={isDark}
        />

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
      </div>
    </div>
  );
}
