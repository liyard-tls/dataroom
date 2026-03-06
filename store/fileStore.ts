import { create } from 'zustand'
import { FileMetadata } from '@/types/file.types'

interface FileState {
  // Files for the currently open folder (metadata only — no blobs)
  files: FileMetadata[]
  // IDs of selected files for bulk operations
  selectedIds: Set<string>
  isLoading: boolean
  error: string | null

  setFiles: (files: FileMetadata[]) => void
  addFile: (file: FileMetadata) => void
  updateFile: (updated: FileMetadata) => void
  removeFile: (id: string) => void
  removeFiles: (ids: string[]) => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useFileStore = create<FileState>()((set) => ({
  files: [],
  selectedIds: new Set(),
  isLoading: false,
  error: null,

  setFiles: (files) => set({ files, selectedIds: new Set() }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  updateFile: (updated) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === updated.id ? updated : f)),
    })),
  removeFile: (id) =>
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      selectedIds.delete(id)
      return { files: state.files.filter((f) => f.id !== id), selectedIds }
    }),
  removeFiles: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      const selectedIds = new Set(state.selectedIds)
      ids.forEach((id) => selectedIds.delete(id))
      return { files: state.files.filter((f) => !idSet.has(f.id)), selectedIds }
    }),
  toggleSelection: (id) =>
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      if (selectedIds.has(id)) {
        selectedIds.delete(id)
      } else {
        selectedIds.add(id)
      }
      return { selectedIds }
    }),
  selectAll: () =>
    set((state) => ({ selectedIds: new Set(state.files.map((f) => f.id)) })),
  clearSelection: () => set({ selectedIds: new Set() }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
