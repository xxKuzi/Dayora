import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import type { Folder } from "../types";

export type FolderModalType = "new" | "rename" | "delete" | null;

interface FolderModalProps {
  isOpen: boolean;
  type: FolderModalType;
  folder: Folder | null;
  hasNotes?: boolean;
  onClose: () => void;
  onConfirmNew: (name: string) => void;
  onConfirmRename: (folderId: string, newName: string) => void;
  onConfirmDelete: (folderId: string) => void;
}

export default function FolderModal({
  isOpen,
  type,
  folder,
  hasNotes = false,
  onClose,
  onConfirmNew,
  onConfirmRename,
  onConfirmDelete,
}: FolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isSystemFolder = folder?.name === "Trash" || folder?.id === "f-trash";

  useEffect(() => {
    if (isOpen) {
      if (type === "new") {
        setFolderName("New Folder");
      } else if (type === "rename" && folder) {
        setFolderName(folder.name);
      } else {
        setFolderName("");
      }

      if (type === "new" || (type === "rename" && !isSystemFolder)) {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
  }, [isOpen, type, folder, isSystemFolder]);

  if (!isOpen || !type) return null;

  // Handler for form submission (Rename or New)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "new") {
      if (!folderName.trim()) return;
      onConfirmNew(folderName.trim());
    } else if (type === "rename" && folder && !isSystemFolder) {
      if (!folderName.trim()) return;
      onConfirmRename(folder.id, folderName.trim());
    }
  };

  // Render modal titles and content based on action type
  if (type === "new") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Folder"
        footer={
          <>
            <Button onClick={onClose} variant="default" size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (folderName.trim()) onConfirmNew(folderName.trim());
              }}
              variant="success"
              size="sm"
              disabled={!folderName.trim()}
            >
              Create Folder
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter a name for the new folder:
          </p>
          <Input
            ref={inputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full"
            autoFocus
          />
        </form>
      </Modal>
    );
  }

  if (type === "rename") {
    if (isSystemFolder) {
      return (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Cannot Rename Folder"
          footer={
            <Button onClick={onClose} variant="default" size="sm">
              OK
            </Button>
          }
        >
          <p>The <strong>Trash</strong> folder is a system folder and cannot be renamed.</p>
        </Modal>
      );
    }

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Rename Folder"
        footer={
          <>
            <Button onClick={onClose} variant="default" size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (folder && folderName.trim()) {
                  onConfirmRename(folder.id, folderName.trim());
                }
              }}
              variant="default"
              size="sm"
              disabled={!folderName.trim() || folderName.trim() === folder?.name}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter a new name for folder <strong>"{folder?.name}"</strong>:
          </p>
          <Input
            ref={inputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full"
            autoFocus
          />
        </form>
      </Modal>
    );
  }

  if (type === "delete") {
    if (isSystemFolder || !folder) {
      return (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Cannot Delete Folder"
          footer={
            <Button onClick={onClose} variant="default" size="sm">
              OK
            </Button>
          }
        >
          <p>The <strong>Trash</strong> folder is a system folder and cannot be deleted.</p>
        </Modal>
      );
    }

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Delete Folder"
        footer={
          <>
            <Button onClick={onClose} variant="default" size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => onConfirmDelete(folder.id)}
              variant="danger"
              size="sm"
            >
              Delete Folder
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm">
            Are you sure you want to delete the folder <strong>"{folder.name}"</strong>?
          </p>
          {hasNotes && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
              ⚠️ This folder contains notes. Deleting it will move all of its notes to the <strong>Trash</strong> folder.
            </p>
          )}
        </div>
      </Modal>
    );
  }

  return null;
}
