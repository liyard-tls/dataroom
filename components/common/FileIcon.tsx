import {
  FileText,
  FileImage,
  FileVideo,
  File,
  Folder,
  FileCode,
  BookOpen,
} from 'lucide-react'
import { FileType } from '@/types/file.types'
import { themeConfig } from '@/config/theme.config'
import { cn } from '@/lib/utils'

interface FileIconProps {
  type: FileType | 'folder' | 'folder-filled'
  className?: string
  size?: number
}

const iconConfig: Record<FileType | 'folder' | 'folder-filled', { icon: React.ElementType }> = {
  folder:          { icon: Folder },
  'folder-filled': { icon: Folder },
  pdf:             { icon: FileText },
  image:           { icon: FileImage },
  video:           { icon: FileVideo },
  text:            { icon: FileCode },
  md:              { icon: BookOpen },
  other:           { icon: File },
}

export function FileIcon({ type, className, size = 20 }: FileIconProps) {
  const { icon: Icon } = iconConfig[type] ?? iconConfig.other
  const color = themeConfig.fileIconColors[type] ?? themeConfig.fileIconColors.other
  return (
    <Icon
      size={size}
      style={{ width: size, height: size, flexShrink: 0 }}
      className={cn(color, type === 'folder-filled' && 'fill-primary/20', className)}
    />
  )
}
