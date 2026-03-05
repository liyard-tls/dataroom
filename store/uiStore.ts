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

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  openViewer: (file: FileRecord) => void
  closeViewer: () => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      isSidebarCollapsed: false,
      viewerFile: null,
      searchQuery: '',

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      openViewer: (viewerFile) => set({ viewerFile }),
      closeViewer: () => set({ viewerFile: null }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'ui-storage',
      // Only persist theme and sidebar state across sessions
      partialize: (state) => ({
        theme: state.theme,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
)
