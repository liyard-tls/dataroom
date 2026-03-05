import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FileRecord } from '@/types/file.types'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  isSidebarCollapsed: boolean
  // The file currently open in the viewer modal (null = viewer closed)
  viewerFile: FileRecord | null
  // Search query string
  searchQuery: string
  // Favorited file/folder IDs (persisted)
  favoriteIds: Set<string>

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  openViewer: (file: FileRecord) => void
  closeViewer: () => void
  setSearchQuery: (query: string) => void
  toggleFavorite: (id: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      isSidebarCollapsed: false,
      viewerFile: null,
      searchQuery: '',
      favoriteIds: new Set(),

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
