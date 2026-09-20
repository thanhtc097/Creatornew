/**
 * CreatorNew - Subtitle Engine Utilities
 * Pure functions for parsing, formatting, and time calculations.
 */

export function formatTimeSRT(seconds) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

export function formatTimeVTT(seconds) {
  return formatTimeSRT(seconds).replace(',', '.');
}

export function parseSRT(srtContent) {
  if (!srtContent || typeof srtContent !== 'string') return [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);
  const segments = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      let timeLine = lines[1].includes('-->') ? lines[1] : lines[0];
      let textLines = lines.slice(lines[1].includes('-->') ? 2 : 1);
      const text = textLines.join(' ');

      const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (match) {
        const start = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
        const end = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;

        const rawWords = text.split(/\s+/).filter(Boolean);
        const step = (end - start) / (rawWords.length || 1);
        const words = rawWords.map((w, wIdx) => ({
          word: w,
          start: Number((start + (wIdx * step)).toFixed(2)),
          end: Number((start + ((wIdx + 1) * step)).toFixed(2))
        }));

        segments.push({
          id: idx + 1,
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
          text,
          words
        });
      }
    }
  });

  return segments;
}

export function exportToSRT(subtitles) {
  if (!Array.isArray(subtitles)) return '';
  return subtitles.map((seg, idx) => {
    return `${idx + 1}\n${formatTimeSRT(seg.start)} --> ${formatTimeSRT(seg.end)}\n${seg.text}\n`;
  }).join('\n');
}

export function exportToVTT(subtitles) {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return '';
  return `WEBVTT\n\n` + subtitles.map((seg, idx) => {
    return `${idx + 1}\n${formatTimeVTT(seg.start)} --> ${formatTimeVTT(seg.end)}\n${seg.text}\n`;
  }).join('\n');
}

export function exportToTXT(subtitles) {
  if (!Array.isArray(subtitles)) return '';
  return subtitles.map(seg => `[${formatTimeSRT(seg.start)}] ${seg.text}`).join('\n');
}
