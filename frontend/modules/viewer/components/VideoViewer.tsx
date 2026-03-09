'use client'

import { useEffect, useState } from 'react'
import { createObjectURL, revokeObjectURL } from '../ViewerFactory'

interface VideoViewerProps {
  blob: Blob
  mimeType: string
}

export function VideoViewer({ blob, mimeType }: VideoViewerProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = createObjectURL(blob)
    setUrl(objectUrl)
    return () => revokeObjectURL(objectUrl)
  }, [blob])

  if (!url) return null

  return (
    <div className="flex h-full items-center justify-center bg-black p-4">
      <video
        src={url}
        controls
        className="max-h-full max-w-full rounded shadow"
      >
        <source src={url} type={mimeType} />
        Your browser does not support this video format.
      </video>
    </div>
  )
}
