import { describe, expect, it } from 'vitest'
import {
  exportToSRT,
  exportToTXT,
  exportToVTT,
  formatTimeSRT,
  formatTimeVTT,
  parseSRT
} from '../../js/subtitle-engine.js'

describe('Subtitle Engine Utilities', () => {
  it('correctly formats timestamps for SRT and VTT', () => {
    expect(formatTimeSRT(0)).toBe('00:00:00,000')
    expect(formatTimeSRT(65.5)).toBe('00:01:05,500')
    expect(formatTimeSRT(3661.123)).toBe('01:01:01,123')

    expect(formatTimeVTT(0)).toBe('00:00:00.000')
    expect(formatTimeVTT(65.5)).toBe('00:01:05.500')
  })

  it('parses valid SRT content into synchronized segments with word timestamps', () => {
    const srtSample = `1
00:00:01,200 --> 00:00:03,600
Xin chào các bạn

2
00:00:04,000 --> 00:00:06,500
Đây là video ngắn TikTok`

    const segments = parseSRT(srtSample)
    expect(segments).toHaveLength(2)

    expect(segments[0].id).toBe(1)
    expect(segments[0].start).toBe(1.2)
    expect(segments[0].end).toBe(3.6)
    expect(segments[0].text).toBe('Xin chào các bạn')
    expect(segments[0].words).toHaveLength(4)
    expect(segments[0].words[0].word).toBe('Xin')

    expect(segments[1].id).toBe(2)
    expect(segments[1].start).toBe(4)
    expect(segments[1].end).toBe(6.5)
    expect(segments[1].text).toBe('Đây là video ngắn TikTok')
    expect(segments[1].words).toHaveLength(5)
  })

  it('exports segments back to valid SRT, VTT and TXT formats', () => {
    const segments = [
      {
        id: 1,
        start: 1.5,
        end: 3.5,
        text: 'CreatorNew AI Studio',
        words: [
          { word: 'CreatorNew', start: 1.5, end: 2.1 },
          { word: 'AI', start: 2.1, end: 2.8 },
          { word: 'Studio', start: 2.8, end: 3.5 }
        ]
      }
    ]

    const srt = exportToSRT(segments)
    expect(srt).toContain('1\n00:00:01,500 --> 00:00:03,500\nCreatorNew AI Studio')

    const vtt = exportToVTT(segments)
    expect(vtt.startsWith('WEBVTT')).toBe(true)
    expect(vtt).toContain('00:00:01.500 --> 00:00:03.500')

    const txt = exportToTXT(segments)
    expect(txt).toBe('[00:00:01,500] CreatorNew AI Studio')
  })

  it('handles empty or malformed input gracefully', () => {
    expect(parseSRT('')).toEqual([])
    expect(parseSRT(null)).toEqual([])
    expect(exportToSRT([])).toBe('')
    expect(exportToVTT([])).toBe('')
    expect(exportToTXT([])).toBe('')
  })
})
