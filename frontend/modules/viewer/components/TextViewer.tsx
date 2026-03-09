'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TextViewerProps {
  blob: Blob
  isMarkdown: boolean
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="mb-4 mt-1 text-2xl font-semibold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mb-3 mt-6 border-b pb-2 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-2 mt-5 text-lg font-semibold" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="my-3 leading-7 text-foreground/95" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-3 list-disc space-y-1 pl-6" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-6 border-border" {...props} />,
  a: ({ children, ...props }) => (
    <a className="font-medium text-primary underline underline-offset-4 hover:opacity-90" {...props}>
      {children}
    </a>
  ),
  table: ({ children, ...props }) => (
    <table className="my-4 w-full border-collapse text-sm" {...props}>
      {children}
    </table>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/30 text-left" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-border px-3 py-2 font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => {
    const content = String(children ?? '').replace(/\n$/, '')
    const isBlock = content.includes('\n') || !!className
    if (isBlock) {
      return (
        <pre className="my-4 overflow-x-auto rounded-md border border-border bg-muted/20 p-4">
          <code className="font-mono text-sm leading-6" {...props}>
            {content}
          </code>
        </pre>
      )
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]" {...props}>
        {children}
      </code>
    )
  },
}

export function TextViewer({ blob, isMarkdown }: TextViewerProps) {
  const [content, setContent] = useState<string>('')

  useEffect(() => {
    blob.text().then(setContent)
  }, [blob])

  return (
    <ScrollArea className="h-full select-text">
      <div className="p-6">
        {isMarkdown ? (
          <article className="max-w-none text-left select-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </article>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground select-text">
            {content}
          </pre>
        )}
      </div>
    </ScrollArea>
  )
}
