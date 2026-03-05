import { describe, it, expect } from 'vitest'
import { getFileType, formatFileSize, validateFileSize, getFileExtension, generateId } from './fileHelpers'
import { FILE_SIZE_LIMIT } from '@/types/file.types'

describe('getFileType', () => {
  it('returns pdf for application/pdf', () => {
    expect(getFileType('application/pdf')).toBe('pdf')
  })
  it('returns image for image/png', () => {
    expect(getFileType('image/png')).toBe('image')
  })
  it('returns video for video/mp4', () => {
    expect(getFileType('video/mp4')).toBe('video')
  })
  it('returns text for text/plain', () => {
    expect(getFileType('text/plain')).toBe('text')
  })
  it('returns md for text/markdown', () => {
    expect(getFileType('text/markdown')).toBe('md')
  })
  it('returns other for unknown mime', () => {
    expect(getFileType('application/octet-stream')).toBe('other')
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })
  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
  it('formats megabytes', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

describe('validateFileSize', () => {
  it('accepts files within limit', () => {
    expect(validateFileSize(FILE_SIZE_LIMIT - 1).valid).toBe(true)
  })
  it('rejects files exceeding limit', () => {
    const result = validateFileSize(FILE_SIZE_LIMIT + 1)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('20MB')
  })
  it('accepts exactly the limit', () => {
    expect(validateFileSize(FILE_SIZE_LIMIT).valid).toBe(true)
  })
})

describe('getFileExtension', () => {
  it('extracts extension', () => {
    expect(getFileExtension('document.pdf')).toBe('pdf')
    expect(getFileExtension('image.PNG')).toBe('png')
  })
  it('returns empty for no extension', () => {
    expect(getFileExtension('README')).toBe('')
  })
  it('handles multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz')
  })
})

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })
  it('generates unique values', () => {
    expect(generateId()).not.toBe(generateId())
  })
})
