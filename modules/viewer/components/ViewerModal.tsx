'use client'

import { X, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'
import { getViewerType } from '../ViewerFactory'
import { PdfViewer } from './PdfViewer'
import { ImageViewer } from './ImageViewer'
import { VideoViewer } from './VideoViewer'
import { TextViewer } from './TextViewer'
import { Button } from '@/components/ui/button'
import { FileIcon } from '@/components/common/FileIcon'

export function ViewerModal() {
  const { viewerFile, closeViewer } = useUIStore()

  if (!viewerFile) return null

  const viewerType = getViewerType(viewerFile.type)

  function handleDownload() {
    const url = URL.createObjectURL(viewerFile!.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = viewerFile!.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="viewer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={closeViewer}
      >
        <motion.div
          key="viewer-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="relative flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <FileIcon type={viewerFile.type} size={18} />
            <span className="flex-1 truncate font-medium">{viewerFile.name}</span>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <Download size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={closeViewer} title="Close">
              <X size={16} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {viewerType === 'pdf' && <PdfViewer blob={viewerFile.blob} />}
            {viewerType === 'image' && <ImageViewer blob={viewerFile.blob} name={viewerFile.name} />}
            {viewerType === 'video' && <VideoViewer blob={viewerFile.blob} mimeType={viewerFile.mimeType} />}
            {viewerType === 'text' && <TextViewer blob={viewerFile.blob} isMarkdown={viewerFile.type === 'md'} />}
            {viewerType === 'unsupported' && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                <FileIcon type={viewerFile.type} size={48} />
                <p className="text-sm">Preview not available for this file type</p>
                <Button variant="outline" onClick={handleDownload}>
                  <Download size={14} className="mr-2" />
                  Download to view
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
