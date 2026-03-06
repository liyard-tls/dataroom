import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FileRecord } from '@/types/file.types'

type Theme = 'light' | 'dark' | 'system'

export interface UploadProgress {
  // null = idle, 'uploading' = in progress, 'done' = finished, 'error' = has failures
  status: 'uploading' | 'done' | 'error' | null
  total: number
  completed: number
  startedAt: number | null
  // Files that failed to upload
  errors: { name: string; reason: string }[]
}

interface UIState {
  theme: Theme
  isSidebarCollapsed: boolean
  // The file currently open in the viewer modal (null = viewer closed)
  viewerFile: FileRecord | null
  // Search query string
  searchQuery: string
  // Favorited file/folder IDs (persisted)
  favoriteIds: Set<string>
  // Upload progress panel state
  uploadProgress: UploadProgress

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  openViewer: (file: FileRecord) => void
  closeViewer: () => void
  setSearchQuery: (query: string) => void
  toggleFavorite: (id: string) => void
  startUpload: (total: number) => void
  completeOneUpload: () => void
  failOneUpload: (name: string, reason: string) => void
  finishUpload: () => void
  dismissUpload: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      isSidebarCollapsed: false,
      viewerFile: null,
      searchQuery: '',
      favoriteIds: new Set(),
      uploadProgress: { status: null, total: 0, completed: 0, startedAt: null, errors: [] },

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      openViewer: (viewerFile) => set({ viewerFile }),
      closeViewer: () => set({ viewerFile: null }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      toggleFavorite: (id) =>
        set((state) => {
          const next = new Set(state.favoriteIds)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return { favoriteIds: next }
        }),
      startUpload: (total) =>
        set({ uploadProgress: { status: 'uploading', total, completed: 0, startedAt: Date.now(), errors: [] } }),
      completeOneUpload: () =>
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, completed: state.uploadProgress.completed + 1 },
        })),
      failOneUpload: (name, reason) =>
        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            completed: state.uploadProgress.completed + 1,
            errors: [...state.uploadProgress.errors, { name, reason }],
          },
        })),
      finishUpload: () =>
        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            status: state.uploadProgress.errors.length > 0 ? 'error' : 'done',
          },
        })),
      dismissUpload: () =>
        set({ uploadProgress: { status: null, total: 0, completed: 0, startedAt: null, errors: [] } }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        isSidebarCollapsed: state.isSidebarCollapsed,
        favoriteIds: Array.from(state.favoriteIds),
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        favoriteIds: new Set((persisted as { favoriteIds?: string[] }).favoriteIds ?? []),
      }),
    }
  )
)
