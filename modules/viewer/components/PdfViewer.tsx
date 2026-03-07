'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createObjectURL, revokeObjectURL } from '../ViewerFactory'

// react-pdf uses browser-only APIs (DOMMatrix, canvas) — must be loaded client-side only
const Document = dynamic(() => import('react-pdf').then((m) => m.Document), { ssr: false })
const Page = dynamic(() => import('react-pdf').then((m) => m.Page), { ssr: false })

async function setupPdfWorker() {
  const { pdfjs } = await import('react-pdf')
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

interface PdfViewerProps {
  blob: Blob
}

export function PdfViewer({ blob }: PdfViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageWidth, setPageWidth] = useState<number>()
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null)
  const fitBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setupPdfWorker()
    const objectUrl = createObjectURL(blob)
    setUrl(objectUrl)
    setCurrentPage(1)
    setPageSize(null)
    setPageWidth(undefined)
    return () => revokeObjectURL(objectUrl)
  }, [blob])

  useEffect(() => {
    if (!url) return

    const container = fitBoxRef.current
    if (!container) return

    const updateFit = () => {
      if (!pageSize) return

      const availableWidth = Math.floor(container.clientWidth) - 8
      const availableHeight = Math.floor(container.clientHeight) - 8
      if (availableWidth <= 0 || availableHeight <= 0) return

      const widthByHeight = Math.floor((availableHeight / pageSize.height) * pageSize.width)
      const nextWidth = Math.max(1, Math.min(availableWidth, widthByHeight))
      setPageWidth((prev) => {
        if (!prev) return nextWidth
        return Math.abs(prev - nextWidth) <= 1 ? prev : nextWidth
      })
    }

    const rafId = window.requestAnimationFrame(updateFit)

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateFit)
      return () => {
        window.cancelAnimationFrame(rafId)
        window.removeEventListener('resize', updateFit)
      }
    }

    const observer = new ResizeObserver(updateFit)
    observer.observe(container)
    return () => {
      window.cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [url, pageSize])

  if (!url) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-3 border-b py-2">
        <Button variant="ghost" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {numPages}
        </span>
        <Button variant="ghost" size="icon" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <div ref={fitBoxRef} className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="mx-auto">
          <Document
            file={url}
            onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
            loading={
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              className="mx-auto shadow-lg"
              onLoadSuccess={(page: { getViewport: (params: { scale: number }) => { width: number; height: number } }) => {
                const viewport = page.getViewport({ scale: 1 })
                setPageSize({ width: viewport.width, height: viewport.height })
              }}
            />
          </Document>
        </div>
      </div>
    </div>
  )
}
