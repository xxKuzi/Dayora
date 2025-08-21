import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
} from "react";

// Apple Notes–style web app (TypeScript/TSX) — performance optimized
// Drop this into src/App.tsx of a Vite React + TS project
// Quick Tailwind: add <script src="https://cdn.tailwindcss.com"></script> to index.html

// ---- Types ----
interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
  trashed?: boolean;
}

interface Folder {
  id: string;
  name: string;
}

export default function App() {
  // ---- Persistence helpers ----
  const STORAGE_KEY = "notes_like_app_v1";
  const load = (): any | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse state", e);
      return null;
    }
  };
  const save = (state: unknown) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  };

  // ---- State ----
  const initial = load() as {
    folders: Folder[];
    notes: Note[];
    activeFolderId: string;
    activeNoteId: string | null;
    query: string;
    dark: boolean;
  } | null;

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
      },
      {
        id: nid(),
        title: "Todo",
        body: "- Try dark mode (top right)\n- Press Ctrl/Cmd+N for new note\n- Search notes in the middle pane\n- Delete moves to Trash",
        pinned: false,
        updatedAt: Date.now() - 10000,
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
  const deferredQuery = useDeferredValue(query); // defers filtering work
  const [dark, setDark] = useState<boolean>(initial?.dark ?? false);

  // Ensure Trash folder exists once
  useEffect(() => {
    if (!folders.some((f) => f.name === "Trash")) {
      setFolders((fs) => [...fs, { id: "f-trash", name: "Trash" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [activeNote?.id]);

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
  }, [draftTitle, draftBody, activeNote?.id]);

  // Debounce localStorage writes (300ms) to avoid blocking main thread
  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      save({ folders, notes, activeFolderId, activeNoteId, query, dark });
    }, 300);
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [folders, notes, activeFolderId, activeNoteId, query, dark]);

  // ---- Derived lists ----
  const visibleNotes = useMemo(() => {
    const inFolder = notes.filter((n) =>
      activeFolderId === trashId ? !!n.trashed : !n.trashed
    );

    const filteredByFolder =
      activeFolderId === trashId
        ? inFolder
        : inFolder.filter(
            (n) =>
              noteFolderId(n.id, folders, notes, trashId) === activeFolderId ||
              activeFolderId === "f-all"
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
  }, [notes, activeFolderId, deferredQuery, folders, trashId]);

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
    const hasNotes = notes.some(
      (n) => noteFolderId(n.id, folders, notes, trashId) === id && !n.trashed
    );
    if (hasNotes && !confirm("Folder contains notes. Move them to Trash?"))
      return;

    // Move notes to Trash
    const updated = notes.map((n) =>
      noteFolderId(n.id, folders, notes, trashId) === id
        ? { ...n, trashed: true, updatedAt: Date.now() }
        : n
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
      id: nid(targetFolderId),
      title: "",
      body: "",
      pinned: false,
      updatedAt: Date.now(),
      trashed: false,
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

  return (
    <div className={"w-full h-screen flex " + (dark ? "dark" : "")}>
      <div className="w-full h-full flex bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
        {/* Sidebar: Folders */}
        <aside className="w-60 border-r border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">
              Folders
            </h2>
            <button
              className="text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              onClick={handleNewFolder}
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-auto space-y-1">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFolderId(f.id)}
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
            <button
              className="text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              onClick={() => handleRenameFolder(activeFolderId)}
            >
              Rename
            </button>
            <button
              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              onClick={() => handleDeleteFolder(activeFolderId)}
            >
              Delete
            </button>
          </div>
        </aside>

        {/* Notes list */}
        <section className="w-80 border-r border-zinc-200 dark:border-zinc-800 p-3 flex flex-col">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              placeholder="Search"
              className="w-full px-3 py-2 rounded bg-zinc-200/80 dark:bg-zinc-800 outline-none focus:ring"
            />
            <button
              className="px-3 py-2 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              onClick={handleNewNote}
              title="New note (Ctrl/Cmd+N)"
            >
              New
            </button>
            <button
              className="px-3 py-2 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              onClick={() => setDark((d) => !d)}
              title="Toggle light/dark"
            >
              {dark ? "☾" : "☀"}
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-auto">
            {visibleNotes.length === 0 && (
              <div className="text-sm opacity-60 p-4">No notes</div>
            )}
            <ul className="space-y-1">
              {visibleNotes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => setActiveNoteId(n.id)}
                    className={`w-full text-left p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                      activeNoteId === n.id
                        ? "bg-zinc-200 dark:bg-zinc-800"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {n.pinned && <span title="Pinned">📌</span>}
                        <span className="font-medium truncate">
                          {n.title || "(Untitled)"}
                        </span>
                      </div>
                      <span className="text-xs opacity-60 ml-2 whitespace-nowrap">
                        {timeAgo(n.updatedAt)}
                      </span>
                    </div>
                    <div className="text-xs opacity-60 mt-1 line-clamp-2 whitespace-pre-wrap">
                      {preview(n.body)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Editor */}
        <main className="flex-1 p-4 flex flex-col min-w-0">
          {!activeNote && (
            <div className="m-auto opacity-60">Select or create a note</div>
          )}
          {activeNote && (
            <>
              <div className="flex items-center gap-2 justify-between">
                <input
                  value={draftTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDraftTitle(e.target.value)
                  }
                  placeholder="Title"
                  className="w-full text-2xl font-semibold bg-transparent outline-none px-1 py-2 rounded"
                />
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    onClick={() => activeNote && togglePin(activeNote)}
                  >
                    {activeNote.pinned ? "Unpin" : "Pin"}
                  </button>
                  {activeNote.trashed ? (
                    <>
                      <button
                        className="px-3 py-2 rounded bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                        onClick={() => handleRestoreNote(activeNote)}
                      >
                        Restore
                      </button>
                      <button
                        className="px-3 py-2 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                        onClick={() => handleDeleteNote(activeNote)}
                      >
                        Delete permanently
                      </button>
                    </>
                  ) : (
                    <button
                      className="px-3 py-2 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                      onClick={() => handleDeleteNote(activeNote)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={draftBody}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDraftBody(e.target.value)
                }
                placeholder="Start typing…"
                className="flex-1 mt-3 w-full resize-none bg-transparent outline-none leading-relaxed px-1 py-2 rounded whitespace-pre-wrap"
              />
              <div className="pt-2 text-xs opacity-60">
                Last edited {new Date(activeNote.updatedAt).toLocaleString()}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ---- Utilities ----
function nid(folderId: string = "f-default"): string {
  return `n_${folderId}_${Math.random().toString(36).slice(2, 9)}`;
}
function fid(): string {
  return `f_${Math.random().toString(36).slice(2, 9)}`;
}
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
function deriveTitleFromBody(body: string): string {
  const firstLine =
    (body || "").split(/\r?\n/).find((l) => l.trim().length > 0) || "Untitled";
  return firstLine.trim().slice(0, 120);
}
function preview(body: string, max = 160): string {
  const s = (body || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// We infer folder for a note by decoding its id prefix (created with folder id)
function noteFolderId(
  noteId: string,
  folders: Folder[],
  _notes: Note[],
  trashId: string
): string {
  if (!noteId) return folders[0]?.id ?? trashId;
  if (noteId.startsWith("n_")) {
    const parts = noteId.split("_");
    // n_<folderId>_<rand>
    const fidPart = parts.length >= 3 ? parts[1] : folders[0]?.id;
    return fidPart || folders[0]?.id || trashId;
  }
  return folders[0]?.id || trashId;
}

function countInFolder(
  folderId: string,
  notes: Note[],
  folders: Folder[],
  trashId: string
): number {
  if (folderId === trashId) return notes.filter((n) => !!n.trashed).length;
  return notes.filter(
    (n) =>
      !n.trashed && noteFolderId(n.id, folders, notes, trashId) === folderId
  ).length;
}
