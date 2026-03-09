'use client'

import { useEffect, useState } from 'react'
import { createObjectURL, revokeObjectURL } from '../ViewerFactory'

interface ImageViewerProps {
  blob: Blob
  name: string
}

export function ImageViewer({ blob, name }: ImageViewerProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = createObjectURL(blob)
    setUrl(objectUrl)
    return () => revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return null

  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-muted/20 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        className="max-h-full max-w-full rounded object-contain shadow"
      />
    </div>
  )
}
