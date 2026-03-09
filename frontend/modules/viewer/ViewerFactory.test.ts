import { describe, it, expect } from 'vitest'
import { getViewerType } from './ViewerFactory'

describe('getViewerType', () => {
  it('returns pdf for pdf type', () => {
    expect(getViewerType('pdf')).toBe('pdf')
  })
  it('returns image for image type', () => {
    expect(getViewerType('image')).toBe('image')
  })
  it('returns video for video type', () => {
    expect(getViewerType('video')).toBe('video')
  })
  it('returns text for text type', () => {
    expect(getViewerType('text')).toBe('text')
  })
  it('returns text for md type', () => {
    expect(getViewerType('md')).toBe('text')
  })
  it('returns unsupported for other type', () => {
    expect(getViewerType('other')).toBe('unsupported')
  })
})
