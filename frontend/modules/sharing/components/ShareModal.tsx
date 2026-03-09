'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link, Copy, Check, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { sharingService, ShareLink } from '../sharing.service'

interface ShareModalProps {
  resourceType: 'file' | 'folder'
  resourceId: string
  resourceName: string
  onClose: () => void
}

export function ShareModal({ resourceType, resourceId, resourceName, onClose }: ShareModalProps) {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadShares = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await sharingService.getSharesForResource(resourceType, resourceId)
      if (data.length === 0) {
        // Auto-create a link on first open
        const share = await sharingService.createShare(resourceType, resourceId)
        setShares([share])
      } else {
        setShares(data)
      }
    } catch {
      toast.error('Failed to load share links')
    } finally {
      setIsLoading(false)
    }
  }, [resourceType, resourceId])

  useEffect(() => {
    void loadShares()
  }, [loadShares])

  async function handleCreate() {
    setIsCreating(true)
    try {
      const share = await sharingService.createShare(resourceType, resourceId)
      setShares((prev) => [share, ...prev])
      toast.success('Share link created')
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(shareId: string) {
    try {
      await sharingService.deleteShare(shareId)
      setShares((prev) => prev.filter((s) => s.id !== shareId))
      toast.success('Share link revoked')
    } catch {
      toast.error('Failed to revoke share link')
    }
  }

  async function handleCopy(share: ShareLink) {
    const url = sharingService.sharePageUrl(share.token)
    await navigator.clipboard.writeText(url)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link size={16} />
            Share &ldquo;{resourceName}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Anyone with a link can view and download{resourceType === 'folder' ? ' all files in this folder' : ' this file'}.
            No sign-in required.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex min-w-0 flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {shares.map((share) => {
                const url = sharingService.sharePageUrl(share.token)
                const isCopied = copiedId === share.id
                return (
                  <div key={share.id} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                        {url}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleCopy(share)}
                        title="Copy link"
                      >
                        {isCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(share.id)}
                        title="Revoke link"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleCopy(share)}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      {isCopied ? 'Copied!' : 'Copy link'}
                    </Button>
                  </div>
                )
              })}

              {shares.length === 0 && (
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                  {isCreating ? 'Creating...' : 'Create link'}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
