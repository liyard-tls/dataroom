'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TextViewerProps {
  blob: Blob
  isMarkdown: boolean
}

export function TextViewer({ blob, isMarkdown }: TextViewerProps) {
  const [content, setContent] = useState<string>('')

  useEffect(() => {
    blob.text().then(setContent)
  }, [blob])

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {isMarkdown ? (
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
            {content}
          </pre>
        )}
      </div>
    </ScrollArea>
  )
}
