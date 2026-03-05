'use client'

import { useCallback } from 'react'
import { useFileStore } from '@/store/fileStore'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/modules/auth'
import { fileService } from '../services/file.service'
import { toast } from 'sonner'

export function useFiles(folderId: string | null) {
  const { user } = useAuth()
  const { files, selectedIds, sortField, sortDirection, isLoading, setFiles, addFile, updateFile, removeFile, removeFiles, setLoading, setError } = useFileStore()
  const { openViewer } = useUIStore()

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fileService.getFiles(folderId)
      setFiles(data)
    } catch {
      setError('Failed to load files')
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [folderId, setFiles, setLoading, setError])

  const uploadFiles = useCallback(async (browserFiles: File[]) => {
    if (!user) return
    const results = await Promise.allSettled(
      browserFiles.map((f) => fileService.uploadFile(f, folderId, user.uid))
    )

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const { blob: _blob, ...metadata } = result.value
        addFile(metadata)
        toast.success(`"${browserFiles[i].name}" uploaded`)
      } else {
        toast.error(result.reason?.message ?? `Failed to upload "${browserFiles[i].name}"`)
      }
    })
  }, [user, folderId, addFile])

  const renameFile = useCallback(async (id: string, name: string) => {
    try {
      const updated = await fileService.renameFile(id, name)
      const { blob: _blob, ...metadata } = updated
      updateFile(metadata)
    } catch {
      toast.error('Failed to rename file')
    }
  }, [updateFile])

  const deleteFile = useCallback(async (id: string) => {
    try {
      await fileService.deleteFile(id)
      removeFile(id)
    } catch {
      toast.error('Failed to delete file')
    }
  }, [removeFile])

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    try {
      await fileService.deleteFiles(ids)
      removeFiles(ids)
      toast.success(`${ids.length} file(s) deleted`)
    } catch {
      toast.error('Failed to delete files')
    }
  }, [selectedIds, removeFiles])

  const openFile = useCallback(async (id: string) => {
    try {
      const file = await fileService.getFile(id)
      if (file) openViewer(file)
    } catch {
      toast.error('Failed to open file')
    }
  }, [openViewer])

  const moveFile = useCallback(async (id: string, newFolderId: string) => {
    try {
      await fileService.moveFile(id, newFolderId)
      removeFile(id)
    } catch {
      toast.error('Failed to move file')
    }
  }, [removeFile])

  // Sort files in-memory based on current sort settings
  const sortedFiles = [...files].sort((a, b) => {
    let cmp = 0
    if (sortField === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortField === 'size') cmp = a.size - b.size
    else if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return sortDirection === 'asc' ? cmp : -cmp
  })

  return {
    files: sortedFiles,
    selectedIds,
    isLoading,
    sortField,
    sortDirection,
    loadFiles,
    uploadFiles,
    renameFile,
    deleteFile,
    deleteSelected,
    openFile,
    moveFile,
  }
}
