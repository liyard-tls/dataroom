'use client'

/**
 * GoogleDriveModal — opens the native Google Picker UI.
 *
 * Flow:
 *  1. Load gapi + picker scripts
 *  2. Authenticate via google.accounts.oauth2.initTokenClient (popup)
 *  3. Open Google Picker — user selects files
 *  4. POST selected file IDs + access_token to backend for download
 *
 * Required env vars (public):
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID  — OAuth 2.0 client ID
 *   NEXT_PUBLIC_GOOGLE_API_KEY    — API key (for Picker)
 */

import { useEffect, useRef, useState } from 'react'
import { HardDriveDownload, X, Check, AlertCircle } from 'lucide-react'
import { gdriveService } from './gdrive.service'
import { Button } from '@/components/ui/button'

interface GoogleDriveModalProps {
  currentFolderId: string | null
  onImported: () => void
  onClose: () => void
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'
const PICKER_APP_ID = CLIENT_ID.split('-')[0] // numeric project ID

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

export function GoogleDriveModal({ currentFolderId, onImported, onClose }: GoogleDriveModalProps) {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tokenClientRef = useRef<any>(null)
  const accessTokenRef = useRef<string>('')
  const pickerInited = useRef(false)
  const gapiInited = useRef(false)

  useEffect(() => {
    loadScripts()
  }, [])

  function loadScripts() {
    // Load gapi
    if (!document.getElementById('gapi-script')) {
      const s = document.createElement('script')
      s.id = 'gapi-script'
      s.src = 'https://apis.google.com/js/api.js'
      s.onload = () => window.gapi.load('picker', () => { gapiInited.current = true })
      document.body.appendChild(s)
    } else if (window.gapi) {
      window.gapi.load('picker', () => { gapiInited.current = true })
    }

    // Load GIS (Google Identity Services)
    if (!document.getElementById('gis-script')) {
      const s = document.createElement('script')
      s.id = 'gis-script'
      s.src = 'https://accounts.google.com/gsi/client'
      s.onload = initTokenClient
      document.body.appendChild(s)
    } else if (window.google?.accounts) {
      initTokenClient()
    }
  }

  function initTokenClient() {
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          setError(resp.error)
          return
        }
        accessTokenRef.current = resp.access_token
        openPicker(resp.access_token)
      },
    })
    pickerInited.current = true
  }

  function openPicker(token: string) {
    if (!window.gapi?.picker) {
      setError('Google Picker not loaded yet, try again')
      return
    }
    const picker = new window.google.picker.PickerBuilder()
      .addView(
        new window.google.picker.View(window.google.picker.ViewId.DOCS)
          .setMimeTypes([
            'application/pdf',
            'image/*',
            'video/*',
            'text/plain',
            'text/markdown',
            'application/json',
            'application/zip',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ].join(','))
      )
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setAppId(PICKER_APP_ID)
      .setTitle('Select files to import')
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: any) => handlePickerCallback(data, token))
      .build()
    picker.setVisible(true)
  }

  async function handlePickerCallback(data: any, token: string) {
    if (data.action !== window.google.picker.Action.PICKED) return
    const fileIds: string[] = data.docs.map((d: any) => d.id)
    if (fileIds.length === 0) return

    setImporting(true)
    setError(null)
    try {
      const result = await gdriveService.importFiles(token, fileIds, currentFolderId)
      setImportResult({ imported: result.imported.length, errors: result.errors.length })
      onImported()
      if (result.errors.length === 0) setTimeout(onClose, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function handleOpen() {
    if (!CLIENT_ID || !API_KEY) {
      setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY must be set')
      return
    }
    setError(null)
    setImportResult(null)
    if (accessTokenRef.current) {
      openPicker(accessTokenRef.current)
    } else if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken()
    } else {
      setError('Google scripts not loaded yet, try again')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative flex w-[420px] flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <HardDriveDownload size={18} className="text-primary" />
          <span className="font-medium">Import from Google Drive</span>
          <div className="flex-1" />
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-muted-foreground">
            Click the button below to open the Google Drive file picker and select files to import.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {importResult && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              <Check size={13} />
              Imported {importResult.imported} file{importResult.imported !== 1 ? 's' : ''}
              {importResult.errors > 0 && `, ${importResult.errors} failed`}
            </div>
          )}

          <Button onClick={handleOpen} disabled={importing} className="gap-2">
            {importing
              ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border border-primary-foreground border-t-transparent" /> Importing…</>
              : <><HardDriveDownload size={14} /> Open Google Drive</>
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
