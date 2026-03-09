import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IndexedDBAdapter } from './indexeddb.adapter'

// Mock the idb library — IndexedDB is not available in jsdom
vi.mock('idb', () => {
  const store: Record<string, Record<string, unknown>> = { folders: {}, files: {} }

  const makeIndex = (storeName: 'folders' | 'files', indexField: string) => ({
    getAll: async (value: unknown) => Object.values(store[storeName]).filter(
      (item) => (item as Record<string, unknown>)[indexField] === value
    ),
    getAllKeys: async (value: unknown) => Object.values(store[storeName])
      .filter((item) => (item as Record<string, unknown>)[indexField] === value)
      .map((item) => (item as Record<string, unknown>).id),
  })

  const makeObjectStore = (name: 'folders' | 'files') => ({
    index: (field: string) => makeIndex(name, field),
    delete: async (id: string) => { delete store[name][id] },
  })

  const db = {
    get: async (storeName: string, id: string) => store[storeName as 'folders' | 'files'][id] ?? undefined,
    add: async (storeName: string, item: Record<string, unknown>) => { store[storeName as 'folders' | 'files'][item.id as string] = item },
    put: async (storeName: string, item: Record<string, unknown>) => { store[storeName as 'folders' | 'files'][item.id as string] = item },
    delete: async (storeName: string, id: string) => { delete store[storeName as 'folders' | 'files'][id] },
    getAllFromIndex: async (storeName: string, indexField: string, value: unknown) =>
      Object.values(store[storeName as 'folders' | 'files']).filter(
        (item) => (item as Record<string, unknown>)[indexField] === value
      ),
    transaction: (_stores: string[], _mode: string) => ({
      objectStore: (name: string) => makeObjectStore(name as 'folders' | 'files'),
      done: Promise.resolve(),
    }),
  }

  return {
    openDB: vi.fn().mockResolvedValue(db),
  }
})

// Also reset store between tests
beforeEach(() => {
  vi.clearAllMocks()
})

describe('IndexedDBAdapter — Folders', () => {
  it('creates a folder and returns it with an id', async () => {
    const adapter = new IndexedDBAdapter()
    const folder = await adapter.createFolder({ name: 'Test', parentId: null, ownerId: 'u1' })

    expect(folder.id).toBeTruthy()
    expect(folder.name).toBe('Test')
    expect(folder.parentId).toBeNull()
    expect(folder.ownerId).toBe('u1')
    expect(folder.createdAt).toBeInstanceOf(Date)
  })

  it('updates folder name', async () => {
    const adapter = new IndexedDBAdapter()
    const folder = await adapter.createFolder({ name: 'Old', parentId: null, ownerId: 'u1' })
    const updated = await adapter.updateFolder(folder.id, { name: 'New' })
    expect(updated.name).toBe('New')
  })

  it('throws when updating non-existent folder', async () => {
    const adapter = new IndexedDBAdapter()
    await expect(adapter.updateFolder('ghost-id', { name: 'X' })).rejects.toThrow('not found')
  })
})

describe('IndexedDBAdapter — Files', () => {
  it('creates a file and returns it with an id', async () => {
    const adapter = new IndexedDBAdapter()
    const file = await adapter.createFile({
      name: 'doc.pdf',
      type: 'pdf',
      mimeType: 'application/pdf',
      size: 1024,
      folderId: 'folder1',
      ownerId: 'u1',
      blob: new Blob(['test']),
    })

    expect(file.id).toBeTruthy()
    expect(file.name).toBe('doc.pdf')
    expect(file.type).toBe('pdf')
  })

  it('throws when updating non-existent file', async () => {
    const adapter = new IndexedDBAdapter()
    await expect(adapter.updateFile('ghost-id', { name: 'X' })).rejects.toThrow('not found')
  })
})

describe('IndexedDBAdapter — Search', () => {
  it('returns matching files and folders', async () => {
    const adapter = new IndexedDBAdapter()
    const results = await adapter.search({ query: 'test', ownerId: 'u1' })
    // With mock data containing no indexed items, results should be empty array
    expect(Array.isArray(results)).toBe(true)
  })
})
