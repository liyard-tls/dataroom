import { create } from 'zustand'
import { Folder } from '@/types/folder.types'

interface FolderState {
  // Flat list of all folders — tree is built in-memory from this
  folders: Folder[]
  // Currently open folder (null = root)
  currentFolderId: string | null
  isLoading: boolean
  error: string | null

  setFolders: (folders: Folder[]) => void
  addFolder: (folder: Folder) => void
  updateFolder: (updated: Folder) => void
  removeFolder: (id: string) => void
  setCurrentFolderId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useFolderStore = create<FolderState>()((set) => ({
  folders: [],
  currentFolderId: null,
  isLoading: false,
  error: null,

  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  updateFolder: (updated) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === updated.id ? updated : f)),
    })),
  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      // If we deleted the current folder, go back to root
      currentFolderId: state.currentFolderId === id ? null : state.currentFolderId,
    })),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
