'use client'

import { useCallback, useRef } from 'react'
import { useFileStore } from '@/store/fileStore'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/modules/auth'
import { fileService } from '../services/file.service'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

export function useFiles(folderId: string | null) {
  const { user } = useAuth()
  // Track the most recent folderId for which a loadFiles request was started.
  // Used to discard stale responses that arrive after the folder has changed.
  const currentFolderRef = useRef(folderId)
  const { files, selectedIds, isLoading, setFiles, addFile, updateFile, removeFile, removeFiles, setLoading, setError } = useFileStore()
  const { openViewer, startUpload, completeOneUpload, failOneUpload, finishUpload } = useUIStore(
    useShallow((s) => ({
      openViewer: s.openViewer,
      startUpload: s.startUpload,
      completeOneUpload: s.completeOneUpload,
      failOneUpload: s.failOneUpload,
      finishUpload: s.finishUpload,
    }))
  )

  const loadFiles = useCallback(async () => {
    if (!user) return
    const requestFolderId = folderId
    currentFolderRef.current = requestFolderId
    console.log('[useFiles] loadFiles() called, folderId=', requestFolderId)
    setLoading(true)
    try {
      const data = await fileService.getFiles(requestFolderId)
      // Guard: discard stale response if folderId changed while request was in-flight
      if (currentFolderRef.current !== requestFolderId) {
        console.log('[useFiles] loadFiles() DISCARDED stale response for folderId=', requestFolderId, '(current=', currentFolderRef.current, ')')
        return
      }
      console.log('[useFiles] loadFiles() done, folderId=', requestFolderId, '→ files=', data.map(f => `${f.name}(folder=${f.folderId ?? 'null'})`))
      setFiles(data)
    } catch {
      setError('Failed to load files')
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [user, folderId, setFiles, setLoading, setError])

  const uploadFiles = useCallback(async (browserFiles: File[]) => {
    if (!user) return
    startUpload(browserFiles.length)

    const results = await Promise.allSettled(
      browserFiles.map(async (f, i) => {
        try {
          const record = await fileService.uploadFile(f, folderId, user.uid)
          completeOneUpload()
          return { index: i, record }
        } catch (err) {
          const reason = err instanceof Error ? err.message : `Failed to upload "${f.name}"`
          failOneUpload(f.name, reason)
          throw err
        }
      })
    )

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const { blob: _blob, ...metadata } = result.value.record
        addFile(metadata)
      } else {
        void i // already tracked via failOneUpload
      }
    })

    finishUpload()
  }, [user, folderId, addFile, startUpload, completeOneUpload, failOneUpload, finishUpload])

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

  const moveFile = useCallback(async (id: string, newFolderId: string | null) => {
    try {
      await fileService.moveFile(id, newFolderId)
    } catch {
      toast.error('Failed to move file')
    }
  }, [])

  const downloadSelected = useCallback(async (allFolders: import('@/types/folder.types').Folder[]) => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    const allFileMetadata = await fileService.getFilesByOwner(user?.uid ?? '')
    const fileIds = ids.filter((id) => allFileMetadata.some((f) => f.id === id))
    const folderIds = ids.filter((id) => !fileIds.includes(id))
    try {
      await fileService.downloadAsZip(fileIds, folderIds, allFolders)
      toast.success('Download started')
    } catch {
      toast.error('Failed to create zip')
    }
  }, [selectedIds, user])

  return {
    files,
    selectedIds,
    isLoading,
    loadFiles,
    uploadFiles,
    renameFile,
    deleteFile,
    deleteSelected,
    downloadSelected,
    openFile,
    moveFile,
  }
}
