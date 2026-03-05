'use client'

import { useCallback } from 'react'
import { useFolderStore } from '@/store/folderStore'
import { useAuth } from '@/modules/auth'
import { folderService } from '../services/folder.service'
import { toast } from 'sonner'

export function useFolders() {
  const { user } = useAuth()
  const { folders, currentFolderId, isLoading, setFolders, addFolder, updateFolder, removeFolder, setCurrentFolderId, setLoading, setError } = useFolderStore()

  const loadFolders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await folderService.loadFolderTree(user.uid)
      setFolders(data)
    } catch {
      setError('Failed to load folders')
      toast.error('Failed to load folders')
    } finally {
      setLoading(false)
    }
  }, [user, setFolders, setLoading, setError])

  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    if (!user) return
    try {
      const folder = await folderService.createFolder({ name, parentId, ownerId: user.uid })
      addFolder(folder)
      toast.success(`Folder "${name}" created`)
      return folder
    } catch {
      toast.error('Failed to create folder')
    }
  }, [user, addFolder])

  const renameFolder = useCallback(async (id: string, name: string) => {
    try {
      const updated = await folderService.renameFolder(id, name)
      updateFolder(updated)
    } catch {
      toast.error('Failed to rename folder')
    }
  }, [updateFolder])

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await folderService.deleteFolder(id)
      removeFolder(id)
    } catch {
      toast.error('Failed to delete folder')
    }
  }, [removeFolder])

  const moveFolder = useCallback(async (id: string, newParentId: string | null) => {
    const folder = folders.find((f) => f.id === id)
    if (!folder) return

    // Optimistic update so folder moves instantly in the UI
    const optimisticFolder = { ...folder, parentId: newParentId, updatedAt: new Date() }
    updateFolder(optimisticFolder)

    try {
      await folderService.moveFolder(id, newParentId)
    } catch (err) {
      // Roll back optimistic state on failure
      updateFolder(folder)
      const message = err instanceof Error ? err.message : 'Failed to move folder'
      toast.error(message)
      await loadFolders()
    }
  }, [folders, updateFolder, loadFolders])

  return {
    folders,
    currentFolderId,
    isLoading,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    setCurrentFolderId,
  }
}
