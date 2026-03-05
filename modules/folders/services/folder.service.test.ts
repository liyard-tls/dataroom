import { describe, it, expect } from 'vitest'
import { buildBreadcrumb, getChildFolders } from './folder.service'
import { Folder } from '@/types/folder.types'

function makeFolder(id: string, parentId: string | null): Folder {
  return {
    id,
    name: `Folder ${id}`,
    parentId,
    ownerId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const folders = [
  makeFolder('root1', null),
  makeFolder('child1', 'root1'),
  makeFolder('child2', 'root1'),
  makeFolder('grandchild1', 'child1'),
]

describe('buildBreadcrumb', () => {
  it('returns empty array for null folderId', () => {
    expect(buildBreadcrumb(folders, null)).toEqual([])
  })

  it('returns single item for root folder', () => {
    const path = buildBreadcrumb(folders, 'root1')
    expect(path).toHaveLength(1)
    expect(path[0].id).toBe('root1')
  })

  it('returns full path for nested folder', () => {
    const path = buildBreadcrumb(folders, 'grandchild1')
    expect(path.map((f) => f.id)).toEqual(['root1', 'child1', 'grandchild1'])
  })

  it('returns empty for unknown folderId', () => {
    expect(buildBreadcrumb(folders, 'nonexistent')).toEqual([])
  })
})

describe('getChildFolders', () => {
  it('returns root folders when parentId is null', () => {
    const roots = getChildFolders(folders, null)
    expect(roots).toHaveLength(1)
    expect(roots[0].id).toBe('root1')
  })

  it('returns direct children of a folder', () => {
    const children = getChildFolders(folders, 'root1')
    expect(children).toHaveLength(2)
    expect(children.map((f) => f.id).sort()).toEqual(['child1', 'child2'])
  })

  it('returns empty for leaf folder', () => {
    expect(getChildFolders(folders, 'grandchild1')).toHaveLength(0)
  })
})
