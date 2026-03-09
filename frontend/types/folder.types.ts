export interface Folder {
  id: string
  name: string
  parentId: string | null // null = root
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export type FolderCreateInput = Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>
export type FolderUpdateInput = Pick<Folder, 'name'>
