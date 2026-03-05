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
import { cn } from '@/lib/utils'

interface FileIconProps {
  type: FileType | 'folder'
  className?: string
  size?: number
}

const iconConfig: Record<FileType | 'folder', { icon: React.ElementType; color: string }> = {
  folder: { icon: Folder, color: 'text-yellow-500' },
  pdf:    { icon: FileText, color: 'text-red-500' },
  image:  { icon: FileImage, color: 'text-green-500' },
  video:  { icon: FileVideo, color: 'text-blue-500' },
  text:   { icon: FileCode, color: 'text-purple-500' },
  md:     { icon: BookOpen, color: 'text-cyan-500' },
  other:  { icon: File, color: 'text-muted-foreground' },
}

export function FileIcon({ type, className, size = 20 }: FileIconProps) {
  const { icon: Icon, color } = iconConfig[type] ?? iconConfig.other
  return <Icon size={size} className={cn(color, className)} />
}
