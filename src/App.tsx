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
import {
  Button,
  CookieBanner,
  FolderModal,
  AuthModal,
  UpgradeModal,
} from "./components";
import type { FolderModalType } from "./components/FolderModal";
import { nid, fid, deriveTitleFromBody, load, save } from "./utils";
import { Sidebar, NotesList } from "./parts";
import { Editor, DailyPlan as DailyPlanComponent, Settings } from "./views";
import { initializeAI, getAIService } from "./services/ai";

import { auth, db } from "./services/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  where,
} from "firebase/firestore";

export default function App() {
  // ---- State ----
  const initial = load() as AppState | null;

  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Monetization limits states
  const [isPro, setIsPro] = useState<boolean>(false);
  const [dailyUsage, setDailyUsage] = useState<{
    emailCount: number;
    aiCount: number;
  }>({ emailCount: 0, aiCount: 0 });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [anonAiCount, setAnonAiCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const dateStr = new Date().toISOString().split("T")[0];
      const stored = localStorage.getItem("dayora_anon_usage");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.date === dateStr) {
            return data.aiCount || 0;
          }
        } catch (e) {
          console.error("Failed to parse anonymous AI count:", e);
        }
      }
    }
    return 0;
  });

  const lastSyncedFoldersRef = useRef<Folder[]>([]);
  const lastSyncedNotesRef = useRef<Note[]>([]);
  const lastSyncedPlansRef = useRef<DailyPlan[]>([]);
  const lastSyncedSettingsRef = useRef<UserSettings | null>(null);

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
    update: Note[] | ((prev: Note[]) => Note[]),
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
  >(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "notes" || hash === "daily-plan" || hash === "settings") {
        return hash as "notes" | "daily-plan" | "settings";
      }
    }
    return "notes";
  });
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(
    initial?.dailyPlans ?? [],
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
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
    })(),
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
      console.warn("GEMINI_API_KEY not found in environment variables");
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

  // Synchronize activeView with URL Hash
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash !== activeView) {
      window.location.hash = activeView;
    }
  }, [activeView]);

  // Listen to browser back/forward (hashchange) events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "notes" || hash === "daily-plan" || hash === "settings") {
        setActiveView(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Save dark mode preference to local storage or Firestore when it changes
  useEffect(() => {
    const database = db;
    if (user) {
      if (isSynced && database) {
        setDoc(
          doc(database, "users", user.uid),
          { darkMode },
          { merge: true },
        ).catch((err) => console.error("Error syncing darkMode:", err));
      }
    } else if (cookiePreference !== "declined") {
      localStorage.setItem("dayora_dark_mode", darkMode);
    }
  }, [darkMode, cookiePreference, user, isSynced]);

  // Synchronize dark class on document element for tailwind and global styles
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Save comfortable typing preference to local storage or Firestore when it changes
  useEffect(() => {
    const database = db;
    if (user) {
      if (isSynced && database) {
        setDoc(
          doc(database, "users", user.uid),
          { comfortableTyping },
          { merge: true },
        ).catch((err) =>
          console.error("Error syncing comfortableTyping:", err),
        );
      }
    } else if (cookiePreference !== "declined") {
      localStorage.setItem(
        "dayora_comfortable_typing",
        String(comfortableTyping),
      );
    }
  }, [comfortableTyping, cookiePreference, user, isSynced]);

  // Keyboard shortcuts for toggling sections and switching views
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar or notes list
      if (e.ctrlKey || e.metaKey) {
        // Only trigger view-switching shortcuts if the user is NOT typing in an input/textarea
        const isEditing = document.activeElement && (
          document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.getAttribute("contenteditable") === "true"
        );

        if (!isEditing) {
          if (e.key === "a" || e.key === "A") {
            e.preventDefault();
            setActiveView("notes");
            return;
          } else if (e.key === "s" || e.key === "S") {
            e.preventDefault();
            setActiveView("daily-plan");
            return;
          } else if (e.key === "d" || e.key === "D") {
            e.preventDefault();
            setActiveView("settings");
            return;
          }
        }

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

      // Switch views: Alt + A/S/D or Ctrl + Shift + A/S/D (works even when editing)
      if (
        (e.altKey && !e.ctrlKey && !e.metaKey) ||
        (e.ctrlKey && e.shiftKey && !e.metaKey)
      ) {
        const isNotesKey = e.code === "KeyA" || e.key.toLowerCase() === "a" || e.key === "å";
        const isPlanKey = e.code === "KeyS" || e.key.toLowerCase() === "s" || e.key === "ß";
        const isSettingsKey = e.code === "KeyD" || e.key.toLowerCase() === "d" || e.key === "∂";

        if (isNotesKey) {
          e.preventDefault();
          setActiveView("notes");
        } else if (isPlanKey) {
          e.preventDefault();
          setActiveView("daily-plan");
        } else if (isSettingsKey) {
          e.preventDefault();
          setActiveView("settings");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveView]);

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

  // ---- Firebase Auth & Sync Effects ----
  async function handleSignOut() {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false);
      return;
    }
    let unsubUserDoc: (() => void) | null = null;
    let unsubUsageDoc: (() => void) | null = null;
    let unsubSubsDoc: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listeners if any
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      if (unsubUsageDoc) {
        unsubUsageDoc();
        unsubUsageDoc = null;
      }
      if (unsubSubsDoc) {
        unsubSubsDoc();
        unsubSubsDoc = null;
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        setIsSynced(false);
        try {
          const userDocRef = doc(db!, "users", firebaseUser.uid);

          // Setup real-time listener for user document
          unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.settings) setSettings(data.settings);
              if (data.darkMode) setDarkMode(data.darkMode);
              if (
                data.comfortableTyping !== undefined &&
                data.comfortableTyping !== null
              ) {
                setComfortableTyping(data.comfortableTyping);
              }
              if (data.cookiePreference)
                setCookiePreference(data.cookiePreference);
            }
          });

          // Setup real-time listener for active subscriptions
          const subsRef = collection(
            db!,
            "users",
            firebaseUser.uid,
            "subscriptions",
          );
          const subsQuery = firestoreQuery(
            subsRef,
            where("status", "in", ["active", "trialing"]),
          );
          unsubSubsDoc = onSnapshot(subsQuery, (snap) => {
            setIsPro(!snap.empty);
          });

          // Setup real-time listener for daily usage document
          const dateStr = new Date().toISOString().split("T")[0];
          const usageDocRef = doc(
            db!,
            "users",
            firebaseUser.uid,
            "dailyUsage",
            dateStr,
          );
          unsubUsageDoc = onSnapshot(usageDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setDailyUsage({
                emailCount: data.emailCount || 0,
                aiCount: data.aiCount || 0,
              });
            } else {
              setDailyUsage({ emailCount: 0, aiCount: 0 });
            }
          });

          const foldersSnap = await getDocs(
            collection(db!, "users", firebaseUser.uid, "folders"),
          );
          const notesSnap = await getDocs(
            collection(db!, "users", firebaseUser.uid, "notes"),
          );
          const plansSnap = await getDocs(
            collection(db!, "users", firebaseUser.uid, "dailyPlans"),
          );

          const userDocSnap = await getDoc(userDocRef);
          const dbSettings = userDocSnap.exists()
            ? userDocSnap.data().settings
            : null;
          const dbFolders = foldersSnap.docs.map((doc) => doc.data() as Folder);
          const dbNotes = notesSnap.docs.map((doc) => doc.data() as Note);
          const dbPlans = plansSnap.docs.map((doc) => doc.data() as DailyPlan);

          const hasFirestoreData =
            dbFolders.length > 0 || dbNotes.length > 0 || !!dbSettings;

          if (hasFirestoreData) {
            if (dbFolders.length > 0) setFolders(dbFolders);
            if (dbNotes.length > 0) {
              setNotes(dbNotes);
              setActiveNoteId(dbNotes[0]?.id || null);
            }
            if (dbPlans.length > 0) setDailyPlans(dbPlans);
          } else {
            // First sign in migration: Upload local data to Firestore
            const batch = writeBatch(db!);
            batch.set(userDocRef, {
              settings,
              darkMode,
              comfortableTyping,
              cookiePreference: "accepted",
            });

            folders.forEach((f) => {
              batch.set(
                doc(db!, "users", firebaseUser.uid, "folders", f.id),
                f,
              );
            });
            notes.forEach((n) => {
              batch.set(doc(db!, "users", firebaseUser.uid, "notes", n.id), n);
            });
            dailyPlans.forEach((plan) => {
              batch.set(
                doc(db!, "users", firebaseUser.uid, "dailyPlans", plan.id),
                plan,
              );
            });

            await batch.commit();
          }

          // Clear local storage completely on sign-in
          localStorage.removeItem("dayora_v1");
          localStorage.removeItem("dayora_dark_mode");
          localStorage.removeItem("dayora_comfortable_typing");
          setCookiePreference("accepted");

          lastSyncedFoldersRef.current = hasFirestoreData ? dbFolders : folders;
          lastSyncedNotesRef.current = hasFirestoreData ? dbNotes : notes;
          lastSyncedPlansRef.current = hasFirestoreData ? dbPlans : dailyPlans;
          lastSyncedSettingsRef.current = hasFirestoreData
            ? dbSettings || settings
            : settings;

          setIsSynced(true);
        } catch (error) {
          console.error("Error loading user data from Firestore:", error);
          setIsSynced(true);
        } finally {
          setLoadingAuth(false);
        }
      } else {
        setIsPro(false);
        setDailyUsage({ emailCount: 0, aiCount: 0 });
        setIsSynced(false);
        const localData = load() as AppState | null;
        if (localData) {
          setFolders(localData.folders);
          setNotes(localData.notes);
          setActiveFolderId(localData.activeFolderId);
          setActiveNoteId(localData.activeNoteId);
          setDailyPlans(localData.dailyPlans);
          setSettings(localData.settings);
        } else {
          setFolders([
            { id: "f-default", name: "Notes" },
            { id: "f-ideas", name: "Ideas" },
            { id: "f-trash", name: "Trash" },
          ]);
          setNotes([
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
          ]);
          setActiveFolderId("f-default");
          setActiveNoteId(null);
          setDailyPlans([]);
          setSettings({
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
          });
        }
        setLoadingAuth(false);
      }
    });
    return () => {
      unsub();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubUsageDoc) unsubUsageDoc();
      if (unsubSubsDoc) unsubSubsDoc();
    };
  }, [auth]);

  // Sync folders to Firestore
  useEffect(() => {
    const database = db;
    if (!user || !isSynced || !database) return;
    const currentFolders = folders;
    const lastFolders = lastSyncedFoldersRef.current;

    const toWrite = currentFolders.filter(
      (f) => !lastFolders.some((lf) => lf.id === f.id && lf.name === f.name),
    );
    const toDelete = lastFolders.filter(
      (lf) => !currentFolders.some((f) => f.id === lf.id),
    );

    lastSyncedFoldersRef.current = currentFolders;

    if (toWrite.length > 0 || toDelete.length > 0) {
      const batch = writeBatch(database);
      toWrite.forEach((f) => {
        batch.set(doc(database, "users", user.uid, "folders", f.id), f);
      });
      toDelete.forEach((lf) => {
        batch.delete(doc(database, "users", user.uid, "folders", lf.id));
      });
      batch
        .commit()
        .catch((err) => console.error("Error syncing folders:", err));
    }
  }, [folders, user, isSynced]);

  // Sync notes to Firestore
  useEffect(() => {
    const database = db;
    if (!user || !isSynced || !database) return;
    const currentNotes = notes;
    const lastNotes = lastSyncedNotesRef.current;

    const toWrite = currentNotes.filter((n) => {
      const prev = lastNotes.find((ln) => ln.id === n.id);
      if (!prev) return true;
      return (
        prev.title !== n.title ||
        prev.body !== n.body ||
        prev.pinned !== n.pinned ||
        prev.trashed !== n.trashed ||
        prev.folderId !== n.folderId ||
        prev.updatedAt !== n.updatedAt
      );
    });

    const toDelete = lastNotes.filter(
      (ln) => !currentNotes.some((n) => n.id === ln.id),
    );

    lastSyncedNotesRef.current = currentNotes;

    if (toWrite.length > 0 || toDelete.length > 0) {
      const batch = writeBatch(database);
      toWrite.forEach((n) => {
        batch.set(doc(database, "users", user.uid, "notes", n.id), n);
      });
      toDelete.forEach((ln) => {
        batch.delete(doc(database, "users", user.uid, "notes", ln.id));
      });
      batch.commit().catch((err) => console.error("Error syncing notes:", err));
    }
  }, [notes, user, isSynced]);

  // Sync daily plans to Firestore
  useEffect(() => {
    const database = db;
    if (!user || !isSynced || !database) return;
    const currentPlans = dailyPlans;
    const lastPlans = lastSyncedPlansRef.current;

    const toWrite = currentPlans.filter((p) => {
      const prev = lastPlans.find((lp) => lp.id === p.id);
      if (!prev) return true;
      return (
        prev.updatedAt !== p.updatedAt ||
        prev.date !== p.date ||
        JSON.stringify(prev.tasks) !== JSON.stringify(p.tasks)
      );
    });

    const toDelete = lastPlans.filter(
      (lp) => !currentPlans.some((p) => p.id === lp.id),
    );

    lastSyncedPlansRef.current = currentPlans;

    if (toWrite.length > 0 || toDelete.length > 0) {
      const batch = writeBatch(database);
      toWrite.forEach((p) => {
        batch.set(doc(database, "users", user.uid, "dailyPlans", p.id), p);
      });
      toDelete.forEach((lp) => {
        batch.delete(doc(database, "users", user.uid, "dailyPlans", lp.id));
      });
      batch
        .commit()
        .catch((err) => console.error("Error syncing dailyPlans:", err));
    }
  }, [dailyPlans, user, isSynced]);

  // Sync settings to Firestore
  useEffect(() => {
    const database = db;
    if (!user || !isSynced || !database) return;
    const currentSettings = settings;
    const lastSettings = lastSyncedSettingsRef.current;

    if (JSON.stringify(currentSettings) !== JSON.stringify(lastSettings)) {
      lastSyncedSettingsRef.current = currentSettings;
      setDoc(
        doc(database, "users", user.uid),
        { settings: currentSettings },
        { merge: true },
      ).catch((err) => console.error("Error syncing settings:", err));
    }
  }, [settings, user, isSynced]);

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
    if (!shouldPersistData || user) return; // Don't save if cookies not accepted or user is logged in

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
    user,
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

  async function handleGenerateWithGemini(tasks: string, date: string) {
    // 1. Enforce client-side limit check
    if (user) {
      const limit = isPro ? 20 : 3;
      if (dailyUsage.aiCount >= limit) {
        if (isPro) {
          setAiError(
            "You have reached your Pro daily limit of 20 AI prompts. Limits reset daily.",
          );
        } else {
          setIsUpgradeModalOpen(true);
        }
        return;
      }
    } else {
      if (anonAiCount >= 1) {
        setIsUpgradeModalOpen(true);
        return;
      }
    }

    try {
      setAiError(null);
      const aiService = getAIService();

      // Get Bearer token if logged in
      const token = user ? await user.getIdToken() : undefined;
      const generatedPlan = await aiService.generateDailyPlan(
        tasks,
        settings,
        token,
      );

      const existingPlan = dailyPlans.find((plan) => plan.date === date);

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
          date: date,
          tasks: generatedPlan.tasks,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setDailyPlans((prev) => [newPlan, ...prev]);
      }

      // If anonymous, increment local limit count
      if (!user) {
        const nextAnonCount = anonAiCount + 1;
        setAnonAiCount(nextAnonCount);
        const dateStr = new Date().toISOString().split("T")[0];
        localStorage.setItem(
          "dayora_anon_usage",
          JSON.stringify({ date: dateStr, aiCount: nextAnonCount }),
        );
      }
    } catch (error: any) {
      console.error("AI generation failed:", error);

      // Open UpgradeModal if limit exceeded error matches
      if (
        error instanceof Error &&
        (error.message.includes("LIMIT_EXCEEDED") ||
          error.message.includes("limit"))
      ) {
        setIsUpgradeModalOpen(true);
      }

      setAiError(
        error instanceof Error
          ? error.message
          : "Failed to generate plan with AI",
      );
    }
  }

  function handleMoveTaskToTomorrow(taskId: string, currentPlanDate: string) {
    const action = () => {
      const [year, month, day] = currentPlanDate.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const tomorrowDate = `${y}-${m}-${d}`;

      const currentPlan = dailyPlans.find(
        (plan) => plan.date === currentPlanDate,
      );
      if (!currentPlan) return;

      const taskToMove = currentPlan.tasks.find((task) => task.id === taskId);
      if (!taskToMove) return;

      const updatedCurrentPlan = {
        ...currentPlan,
        tasks: currentPlan.tasks.filter((task) => task.id !== taskId),
        updatedAt: Date.now(),
      };

      const tomorrowPlan = dailyPlans.find(
        (plan) => plan.date === tomorrowDate,
      );
      let updatedTomorrowPlan: DailyPlan;
      if (tomorrowPlan) {
        updatedTomorrowPlan = {
          ...tomorrowPlan,
          tasks: [...tomorrowPlan.tasks, { ...taskToMove, completed: false }],
          updatedAt: Date.now(),
        };
      } else {
        updatedTomorrowPlan = {
          id: `plan_${Math.random().toString(36).slice(2, 9)}`,
          date: tomorrowDate,
          tasks: [{ ...taskToMove, completed: false }],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      setDailyPlans((prev) => {
        const filtered = prev.map((plan) => {
          if (plan.date === currentPlanDate) return updatedCurrentPlan;
          if (plan.date === tomorrowDate) return updatedTomorrowPlan;
          return plan;
        });

        if (!tomorrowPlan) {
          return [updatedTomorrowPlan, ...filtered];
        }
        return filtered;
      });
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          action();
        });
      });
    } else {
      action();
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
      <div className="w-full h-full flex text-zinc-900 dark:text-zinc-100">
        {sidebarVisible && (
          <div className="fixed left-0 top-0 h-screen bg-zinc-100 dark:bg-zinc-950 z-10 no-print">
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
              user={user}
              onSignInClick={() => setAuthModalOpen(true)}
              onSignOutClick={handleSignOut}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              isPro={isPro}
              onUpgradeClick={() => setIsUpgradeModalOpen(true)}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 h-screen flex flex-col overflow-y-auto bg-transparent print-full-width ${
            activeView === "notes"
              ? notesListVisible
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
              : sidebarVisible
                ? "ml-60"
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
                onToggleComfortableTyping={() =>
                  setComfortableTyping(!comfortableTyping)
                }
                onToggleAllPanels={handleToggleAllPanels}
              />
            </>
          )}

          {activeView === "daily-plan" && (
            <DailyPlanComponent
              dailyPlan={
                dailyPlans.find((plan) => plan.date === selectedDate) || null
              }
              settings={settings}
              onUpdatePlan={handleUpdateDailyPlan}
              onCreatePlan={handleCreateDailyPlan}
              onGenerateWithGemini={handleGenerateWithGemini}
              aiError={aiError}
              user={user}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onMoveTaskToTomorrow={handleMoveTaskToTomorrow}
              isPro={isPro}
              dailyUsage={dailyUsage}
              anonAiCount={anonAiCount}
              onUpgradeClick={() => setIsUpgradeModalOpen(true)}
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
      {!loadingAuth && !user && cookiePreference === undefined && (
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        user={user}
        onSignInClick={() => setAuthModalOpen(true)}
      />
    </div>
  );
}
