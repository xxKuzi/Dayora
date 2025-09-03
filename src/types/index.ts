export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
  trashed?: boolean;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface AppState {
  folders: Folder[];
  notes: Note[];
  activeFolderId: string;
  activeNoteId: string | null;
  query: string;
  dark: boolean;
}
