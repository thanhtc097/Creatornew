/**
 * CreatorNew - AI Auto Subtitle Generator for Short Videos (TikTok, Reels, Shorts)
 * High-performance, client-side rendering with Gemini AI API, Web Speech STT,
 * and In-Browser Hardcoded Video Export.
 */

(function () {
  'use strict';

  // --- Constants & Preset Definitions ---
  const PRESETS = {
    hormozi: {
      name: 'Hormozi Viral',
      fontFamily: 'Impact, sans-serif',
      fontSizeRatio: 0.052,
      primaryColor: '#FFE600',
      highlightColor: '#22C55E',
      strokeColor: '#000000',
      strokeWidthRatio: 0.008,
      boxStyle: 'none',
      boxColor: 'rgba(0, 0, 0, 0.7)',
      yPosition: 76,
      uppercase: true,
      animation: 'karaoke'
    },
    mrbeast: {
      name: 'MrBeast Punchy',
      fontFamily: 'Montserrat, sans-serif',
      fontSizeRatio: 0.050,
      primaryColor: '#FFFFFF',
      highlightColor: '#00F2FE',
      strokeColor: '#000000',
      strokeWidthRatio: 0.009,
      boxStyle: 'none',
      boxColor: 'rgba(0, 0, 0, 0.7)',
      yPosition: 74,
      uppercase: true,
      animation: 'karaoke'
    },
    capcut: {
      name: 'CapCut Bounce',
      fontFamily: 'Inter, sans-serif',
      fontSizeRatio: 0.046,
      primaryColor: '#FFFFFF',
      highlightColor: '#F43F5E',
      strokeColor: '#000000',
      strokeWidthRatio: 0.004,
      boxStyle: 'pill',
      boxColor: 'rgba(15, 23, 42, 0.85)',
      yPosition: 78,
      uppercase: false,
      animation: 'karaoke'
    },
    neon: {
      name: 'Cyber Neon',
      fontFamily: 'Montserrat, sans-serif',
      fontSizeRatio: 0.048,
      primaryColor: '#00F2FE',
      highlightColor: '#FF007F',
      strokeColor: '#000000',
      strokeWidthRatio: 0.006,
      boxStyle: 'none',
      boxColor: 'rgba(0, 0, 0, 0.8)',
      yPosition: 75,
      uppercase: true,
      animation: 'karaoke'
    },
    minimal: {
      name: 'Clean Minimal',
      fontFamily: 'Be Vietnam Pro, Inter, sans-serif',
      fontSizeRatio: 0.040,
      primaryColor: '#FFFFFF',
      highlightColor: '#C2F834',
      strokeColor: '#000000',
      strokeWidthRatio: 0.003,
      boxStyle: 'pill',
      boxColor: 'rgba(0, 0, 0, 0.65)',
      yPosition: 80,
      uppercase: false,
      animation: 'none'
    }
  };

  // --- Studio State ---
  const state = {
    videoFile: null,
    videoUrl: null,
    videoElement: null,
    overlayCanvas: null,
    overlayCtx: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    currentAspect: '9-16',
    activeEngine: 'gemini',
    safeZoneActive: false,
    currentPreset: 'hormozi',
    style: { ...PRESETS.hormozi },
    subtitles: [],
    audioBuffer: null,
    isExporting: false,
    isSample: false
  };

  // --- Sample Subtitles Data for Instant Demo ---
  const SAMPLE_SUBTITLES = [
    {
      id: 1,
      start: 0.2,
      end: 1.8,
      text: "Chào mừng các bạn",
      words: [
        { word: "Chào", start: 0.2, end: 0.6 },
        { word: "mừng", start: 0.6, end: 1.0 },
        { word: "các", start: 1.0, end: 1.4 },
        { word: "bạn", start: 1.4, end: 1.8 }
      ]
    },
    {
      id: 2,
      start: 2.0,
      end: 3.8,
      text: "đến với CreatorNew Studio",
      words: [
        { word: "đến", start: 2.0, end: 2.3 },
        { word: "với", start: 2.3, end: 2.7 },
        { word: "CreatorNew", start: 2.7, end: 3.3 },
        { word: "Studio", start: 3.3, end: 3.8 }
      ]
    },
    {
      id: 3,
      start: 4.0,
      end: 5.8,
      text: "Tạo phụ đề video triệu view",
      words: [
        { word: "Tạo", start: 4.0, end: 4.3 },
        { word: "phụ", start: 4.3, end: 4.7 },
        { word: "đề", start: 4.7, end: 5.0 },
        { word: "triệu", start: 5.0, end: 5.4 },
        { word: "view", start: 5.4, end: 5.8 }
      ]
    },
    {
      id: 4,
      start: 6.0,
      end: 7.8,
      text: "cực kỳ đơn giản và chuẩn xác!",
      words: [
        { word: "cực", start: 6.0, end: 6.3 },
        { word: "kỳ", start: 6.3, end: 6.6 },
        { word: "đơn", start: 6.6, end: 7.0 },
        { word: "giản", start: 7.0, end: 7.3 },
        { word: "và", start: 7.3, end: 7.5 },
        { word: "chuẩn", start: 7.5, end: 7.7 },
        { word: "xác!", start: 7.7, end: 7.8 }
      ]
    }
  ];

  // --- Audio Extraction & WAV Encoding (Web Audio API) ---
  async function extractAudioToWav(fileOrBlob) {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    // Decode audio from video
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    state.audioBuffer = decodedBuffer;

    // Resample to 16,000 Hz mono for optimal AI processing speed and small payload
    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(decodedBuffer.duration * targetSampleRate), targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const resampledBuffer = await offlineCtx.startRendering();

    // Encode to 16-bit PCM WAV
    const wavBlob = bufferToWav(resampledBuffer);
    audioCtx.close();
    return wavBlob;
  }

  function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const outBuffer = new ArrayBuffer(length);
    const view = new DataView(outBuffer);
    const channels = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF identifier
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // format chunk identifier
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // format chunk length
    setUint16(1); // sample format (raw)
    setUint16(numOfChan); // channel count
    setUint32(sampleRate); // sample rate
    setUint32(sampleRate * 2 * numOfChan); // byte rate (sample rate * block align)
    setUint16(numOfChan * 2); // block align (channel count * bytes per sample)
    setUint16(16); // bits per sample

    // data chunk identifier
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // 16-bit PCM
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([outBuffer], { type: 'audio/wav' });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // --- Gemini AI Speech-to-Text Transcriber ---
  async function transcribeWithGemini(wavBlob, apiKey, language = 'vi') {
    const base64Audio = await blobToBase64(wavBlob);
    
    const prompt = `You are an expert subtitle generator specialized in short-form viral videos (TikTok, YouTube Shorts, Instagram Reels).
Listen carefully to the provided audio speech and transcribe it with high precision.
Language: ${language === 'vi' ? 'Vietnamese (tiếng Việt có dấu chuẩn xác)' : 'Spoken language in audio'}.

Task:
1. Detect all speech and break it into short, punchy phrases suitable for Shorts/Reels (each segment must be 2 to 5 words, max 7 words).
2. Provide exact start and end timestamps in seconds (floating point numbers like 1.25) for each segment AND for each individual word inside the segment.
3. Return ONLY a valid JSON array matching this exact schema:
[
  {
    "id": 1,
    "start": 0.0,
    "end": 1.4,
    "text": "Chào mừng các bạn",
    "words": [
      {"word": "Chào", "start": 0.0, "end": 0.35},
      {"word": "mừng", "start": 0.35, "end": 0.7},
      {"word": "các", "start": 0.7, "end": 1.05},
      {"word": "bạn", "start": 1.05, "end": 1.4}
    ]
  }
]
Do not output markdown backticks or explanations. Output pure JSON only.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "audio/wav",
                data: base64Audio
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Gemini API Error (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini API did not return any transcription.');
    }

    // Clean any markdown formatting if present
    let cleaned = candidateText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const segments = JSON.parse(cleaned);
    if (!Array.isArray(segments)) {
      throw new Error('Invalid transcription response format from Gemini.');
    }

    // Normalize segments
    return segments.map((seg, idx) => {
      const start = parseFloat(seg.start) || 0;
      const end = parseFloat(seg.end) || start + 1.5;
      const words = Array.isArray(seg.words) ? seg.words.map(w => ({
        word: String(w.word || '').trim(),
        start: parseFloat(w.start) || start,
        end: parseFloat(w.end) || end
      })) : seg.text.split(/\s+/).map((w, wIdx, arr) => {
        const step = (end - start) / (arr.length || 1);
        return {
          word: w,
          start: start + (wIdx * step),
          end: start + ((wIdx + 1) * step)
        };
      });

      return {
        id: seg.id || idx + 1,
        start,
        end,
        text: String(seg.text || '').trim(),
        words
      };
    });
  }

  // --- Web Speech API Speech-to-Text Transcriber (Browser Native) ---
  function transcribeWithWebSpeech(videoElem, language = 'vi-VN') {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error('Web Speech API is not supported in this browser. Please use Chrome or Edge, or switch to Gemini AI mode.'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = language;

      const segments = [];
      let segmentCounter = 1;
      let lastSpeechTime = 0;

      // Start playing video to let user/browser listen
      videoElem.currentTime = 0;
      videoElem.muted = false;

      recognition.onresult = (event) => {
        const now = videoElem.currentTime;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              const start = Math.max(0, lastSpeechTime);
              const end = Math.min(videoElem.duration || (start + 2), now > start ? now : start + 1.8);
              
              // Break long phrases into punchy short segments (max 5 words)
              const rawWords = transcript.split(/\s+/);
              const chunkSize = 4;
              const totalChunks = Math.ceil(rawWords.length / chunkSize);
              const timePerChunk = (end - start) / totalChunks;

              for (let c = 0; c < totalChunks; c++) {
                const chunkWords = rawWords.slice(c * chunkSize, (c + 1) * chunkSize);
                const chunkStart = start + c * timePerChunk;
                const chunkEnd = start + (c + 1) * timePerChunk;
                const step = (chunkEnd - chunkStart) / chunkWords.length;

                const words = chunkWords.map((w, wIdx) => ({
                  word: w,
                  start: chunkStart + (wIdx * step),
                  end: chunkStart + ((wIdx + 1) * step)
                }));

                segments.push({
                  id: segmentCounter++,
                  start: Number(chunkStart.toFixed(2)),
                  end: Number(chunkEnd.toFixed(2)),
                  text: chunkWords.join(' '),
                  words
                });
              }
              lastSpeechTime = end;
            }
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          reject(new Error('Microphone or speech permission was denied.'));
        }
      };

      recognition.onend = () => {
        if (segments.length === 0) {
          // Fallback: create at least a placeholder or notify user
          resolve([
            {
              id: 1,
              start: 0.5,
              end: Math.min(3.0, videoElem.duration || 3.0),
              text: "Không phát hiện giọng nói rõ ràng. Hãy nhập nội dung hoặc dùng Gemini AI.",
              words: [
                { word: "Chưa", start: 0.5, end: 1.0 },
                { word: "nhận", start: 1.0, end: 1.5 },
                { word: "diện", start: 1.5, end: 2.0 },
                { word: "được", start: 2.0, end: 2.5 }
              ]
            }
          ]);
        } else {
          resolve(segments);
        }
      };

      try {
        recognition.start();
        videoElem.play();
      } catch (err) {
        reject(err);
      }

      // Stop recognition when video ends
      videoElem.onended = () => {
        recognition.stop();
      };
    });
  }

  // --- Subtitle Parsers & Exporters (SRT, VTT, TXT) ---
  function parseSRT(srtContent) {
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
            start: start + (wIdx * step),
            end: start + ((wIdx + 1) * step)
          }));

          segments.push({
            id: idx + 1,
            start,
            end,
            text,
            words
          });
        }
      }
    });

    return segments;
  }

  function formatTimeSRT(seconds) {
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
  }

  function formatTimeVTT(seconds) {
    return formatTimeSRT(seconds).replace(',', '.');
  }

  function exportToSRT(subtitles) {
    return subtitles.map((seg, idx) => {
      return `${idx + 1}\n${formatTimeSRT(seg.start)} --> ${formatTimeSRT(seg.end)}\n${seg.text}\n`;
    }).join('\n');
  }

  function exportToVTT(subtitles) {
    return `WEBVTT\n\n` + subtitles.map((seg, idx) => {
      return `${idx + 1}\n${formatTimeVTT(seg.start)} --> ${formatTimeVTT(seg.end)}\n${seg.text}\n`;
    }).join('\n');
  }

  function exportToTXT(subtitles) {
    return subtitles.map(seg => `[${formatTimeSRT(seg.start)}] ${seg.text}`).join('\n');
  }

  function downloadTextFile(content, fileName, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Subtitle Canvas Renderer (60 FPS, TikTok/Shorts Karaoke Animations) ---
  function renderSubtitlesOnCanvas(canvas, ctx, currentTime, subtitles, style, _isExport = false) {
    const width = canvas.width;
    const height = canvas.height;

    // Clear overlay
    ctx.clearRect(0, 0, width, height);

    if (!subtitles || subtitles.length === 0) return;

    // Find active segment
    const activeSegment = subtitles.find(seg => currentTime >= seg.start && currentTime <= seg.end);
    if (!activeSegment) return;

    // Calculate dynamic typography scale based on canvas height (e.g. 1920 or 600)
    const baseFontSize = height * (style.fontSizeRatio || 0.05);
    const strokeWidth = height * (style.strokeWidthRatio || 0.008);
    const yPos = height * (style.yPosition / 100);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = activeSegment.words && activeSegment.words.length > 0 
      ? activeSegment.words 
      : activeSegment.text.split(/\s+/).map(w => ({ word: w, start: activeSegment.start, end: activeSegment.end }));

    // Prepare text and compute word positions
    ctx.font = `900 ${baseFontSize}px ${style.fontFamily}`;
    
    // Measure words
    const spaceWidth = ctx.measureText(' ').width;
    const wordMeasures = words.map(wObj => {
      const displayWord = style.uppercase ? wObj.word.toUpperCase() : wObj.word;
      const metrics = ctx.measureText(displayWord);
      return {
        ...wObj,
        displayWord,
        width: metrics.width
      };
    });

    const totalTextWidth = wordMeasures.reduce((acc, cur) => acc + cur.width, 0) + (words.length - 1) * spaceWidth;
    let currentX = (width - totalTextWidth) / 2;

    // Draw background box if enabled
    if (style.boxStyle === 'pill') {
      const padX = baseFontSize * 0.5;
      const padY = baseFontSize * 0.35;
      const boxW = totalTextWidth + padX * 2;
      const boxH = baseFontSize + padY * 2;
      const boxX = (width - boxW) / 2;
      const boxY = yPos - boxH / 2;

      ctx.fillStyle = style.boxColor || 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, baseFontSize * 0.3);
      ctx.fill();
    } else if (style.boxStyle === 'bar') {
      const padY = baseFontSize * 0.4;
      const boxH = baseFontSize + padY * 2;
      const boxY = yPos - boxH / 2;
      ctx.fillStyle = style.boxColor || 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, boxY, width, boxH);
    }

    // Render word by word with karaoke active highlight
    wordMeasures.forEach(w => {
      const isActive = currentTime >= w.start && currentTime <= w.end;
      const wordCenterX = currentX + w.width / 2;

      ctx.save();
      ctx.translate(wordCenterX, yPos);

      // Karaoke Bounce Animation for active word
      if (isActive && style.animation === 'karaoke') {
        const progress = Math.min(1, Math.max(0, (currentTime - w.start) / ((w.end - w.start) || 0.1)));
        // Quick scale bounce peak at 0.2
        const bounceScale = progress < 0.3 ? 1.0 + (progress / 0.3) * 0.18 : 1.18 - ((progress - 0.3) / 0.7) * 0.08;
        ctx.scale(bounceScale, bounceScale);
      }

      // Stroke / Outline
      if (strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor || '#000000';
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(w.displayWord, 0, 0);
      }

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = baseFontSize * 0.2;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;

      // Fill color (highlight if active)
      ctx.fillStyle = isActive ? style.highlightColor : style.primaryColor;
      ctx.fillText(w.displayWord, 0, 0);

      ctx.restore();
      currentX += w.width + spaceWidth;
    });

    ctx.restore();
  }

  // --- Sample Video Generator (Creates an in-browser 9:16 vertical video) ---
  function generateSampleVideoBlob() {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);

      // Add simple synth audio beep track via Web Audio API
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.01; // subtle
      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      const combinedTracks = [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        osc.stop();
        audioCtx.close();
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 30 * 8; // 8 seconds

      function drawFrame() {
        if (frame >= totalFrames) {
          recorder.stop();
          return;
        }

        const t = frame / 30;

        // Dynamic gradient background
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        const hue1 = (t * 30) % 360;
        const hue2 = (hue1 + 60) % 360;
        grad.addColorStop(0, `hsl(${hue1}, 70%, 15%)`);
        grad.addColorStop(1, `hsl(${hue2}, 80%, 8%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated glowing particle circles
        for (let i = 0; i < 5; i++) {
          const cx = canvas.width / 2 + Math.sin(t * 2 + i) * 180;
          const cy = canvas.height * 0.4 + Math.cos(t * 1.5 + i) * 120;
          const radius = 60 + Math.sin(t * 3 + i) * 20;
          ctx.fillStyle = `hsla(${(hue1 + i * 40) % 360}, 100%, 65%, 0.15)`;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center card
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(80, 260, canvas.width - 160, 480, 32);
        ctx.fill();
        ctx.stroke();

        // Sample Badge
        ctx.fillStyle = '#C2F834';
        ctx.font = '800 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ CREATORNEW SAMPLE VIDEO', canvas.width / 2, 330);

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 42px Inter, sans-serif';
        ctx.fillText('Shorts & TikTok Subtitles', canvas.width / 2, 420);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 24px Inter, sans-serif';
        ctx.fillText('Real-time AI Karaoke Preview', canvas.width / 2, 480);

        // Timer
        ctx.fillStyle = '#38BDF8';
        ctx.font = '700 28px monospace';
        ctx.fillText(`00:0${Math.floor(t)}s / 00:08s`, canvas.width / 2, 560);

        ctx.restore();

        frame++;
        requestAnimationFrame(drawFrame);
      }

      drawFrame();
    });
  }

  // --- Hardcoded Video Exporter (Burn-in Video with Audio via MediaRecorder) ---
  async function exportBurnedVideo(onProgress) {
    if (!state.videoElement || state.subtitles.length === 0) {
      throw new Error('Please load a video and subtitles first.');
    }

    state.isExporting = true;
    const video = state.videoElement;
    const origTime = video.currentTime;
    const origMuted = video.muted;

    const exportCanvas = document.createElement('canvas');
    // Maintain native video dimensions or up to 1080p
    const targetW = video.videoWidth || 720;
    const targetH = video.videoHeight || 1280;
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const expCtx = exportCanvas.getContext('2d');

    // Capture video stream from export canvas
    const videoStream = exportCanvas.captureStream(30);

    // Audio stream from video
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    let combinedStream;

    try {
      const sourceNode = audioCtx.createMediaElementSource(video);
      const destNode = audioCtx.createMediaStreamDestination();
      sourceNode.connect(destNode);
      sourceNode.connect(audioCtx.destination); // keep audible or route to dest
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks()
      ]);
    } catch {
      // Fallback if mediaElementSource already attached or fails (e.g. cross-origin)
      combinedStream = videoStream;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 6000000 });
    const recordedChunks = [];

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        state.isExporting = false;
        video.currentTime = origTime;
        video.muted = origMuted;
        audioCtx.close();
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        resolve({ blob: finalBlob, extension: ext });
      };

      recorder.onerror = err => {
        state.isExporting = false;
        audioCtx.close();
        reject(err);
      };

      // Rewind and start recording
      video.currentTime = 0;
      video.muted = false;

      video.oncanplay = () => {
        video.oncanplay = null;
        recorder.start(100);
        video.play();

        function renderExportLoop() {
          if (!state.isExporting) return;

          // Draw video frame
          expCtx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);

          // Draw burning subtitles
          renderSubtitlesOnCanvas(exportCanvas, expCtx, video.currentTime, state.subtitles, state.style, true);

          const progress = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
          if (onProgress) onProgress(progress);

          if (video.ended || video.currentTime >= video.duration - 0.05) {
            recorder.stop();
          } else {
            requestAnimationFrame(renderExportLoop);
          }
        }

        renderExportLoop();
      };
    });
  }

  // --- UI Controller & Event Binding ---
  function initAutoSubtitleApp() {
    // Elements
    const dropzone = document.getElementById('videoDropzone');
    const videoInput = document.getElementById('videoFileInput');
    const previewVideo = document.getElementById('previewVideo');
    const overlayCanvas = document.getElementById('subtitleOverlayCanvas');
    const emptyState = document.getElementById('videoEmptyState');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const timelineBar = document.getElementById('timelineBar');
    const timeDisplay = document.getElementById('timeDisplay');
    const toggleSafeZoneBtn = document.getElementById('toggleSafeZoneBtn');
    const safeZoneOverlay = document.getElementById('safeZoneOverlay');
    const stageContainer = document.getElementById('videoStageContainer');
    const aspectBtns = document.querySelectorAll('.aspect-btn');

    // Engine & Actions
    const engineOptions = document.querySelectorAll('.engine-option');
    const apiKeyBox = document.getElementById('apiKeyBox');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const languageSelect = document.getElementById('languageSelect');
    const btnTranscribe = document.getElementById('btnTranscribe');
    const btnSampleDemo = document.getElementById('btnSampleDemo');
    const srtFileInput = document.getElementById('srtFileInput');
    const btnImportSrt = document.getElementById('btnImportSrt');

    // Presets & Styles
    const presetCards = document.querySelectorAll('.preset-card');
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeRange = document.getElementById('fontSizeRange');
    const fontSizeVal = document.getElementById('fontSizeVal');
    const primaryColorInput = document.getElementById('primaryColorInput');
    const highlightColorInput = document.getElementById('highlightColorInput');
    const strokeWidthRange = document.getElementById('strokeWidthRange');
    const strokeWidthVal = document.getElementById('strokeWidthVal');
    const strokeColorInput = document.getElementById('strokeColorInput');
    const boxStyleSelect = document.getElementById('boxStyleSelect');
    const yPosRange = document.getElementById('yPosRange');
    const yPosVal = document.getElementById('yPosVal');
    const uppercaseToggle = document.getElementById('uppercaseToggle');

    // Subtitle Segments
    const segmentsContainer = document.getElementById('segmentsContainer');
    const btnAddSegment = document.getElementById('btnAddSegment');

    // Export Controls
    const btnExportBurn = document.getElementById('btnExportBurn');
    const btnExportSrt = document.getElementById('btnExportSrt');
    const btnExportVtt = document.getElementById('btnExportVtt');
    const btnCopyTxt = document.getElementById('btnCopyTxt');
    const renderProgressBox = document.getElementById('renderProgressBox');
    const renderBarFill = document.getElementById('renderBarFill');
    const renderProgressPercent = document.getElementById('renderProgressPercent');
    const toastMsg = document.getElementById('toastMsg');

    state.videoElement = previewVideo;
    state.overlayCanvas = overlayCanvas;
    state.overlayCtx = overlayCanvas.getContext('2d');

    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem('creatornew_gemini_key') || '';
    if (geminiApiKeyInput && savedApiKey) {
      geminiApiKeyInput.value = savedApiKey;
    }

    // Helper: Toast message
    function showToast(text, duration = 3000) {
      if (!toastMsg) return;
      toastMsg.textContent = text;
      toastMsg.style.display = 'flex';
      setTimeout(() => {
        toastMsg.style.display = 'none';
      }, duration);
    }

    // Canvas Resize & Sync
    function syncCanvasResolution() {
      const rect = overlayCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        overlayCanvas.width = rect.width * (window.devicePixelRatio || 1);
        overlayCanvas.height = rect.height * (window.devicePixelRatio || 1);
      }
    }

    window.addEventListener('resize', syncCanvasResolution);

    // Animation Render Loop
    function animationLoop() {
      if (previewVideo && overlayCanvas) {
        renderSubtitlesOnCanvas(
          overlayCanvas,
          state.overlayCtx,
          previewVideo.currentTime,
          state.subtitles,
          state.style
        );
        updateActiveSegmentCard(previewVideo.currentTime);
      }
      requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    // Video Load Handler
    function loadVideo(fileOrBlob, isSample = false) {
      if (state.videoUrl) {
        URL.revokeObjectURL(state.videoUrl);
      }
      state.isSample = isSample;
      state.videoFile = isSample ? null : fileOrBlob;
      state.videoUrl = URL.createObjectURL(fileOrBlob);
      previewVideo.src = state.videoUrl;
      emptyState.style.display = 'none';
      btnTranscribe.disabled = false;

      previewVideo.onloadedmetadata = () => {
        state.duration = previewVideo.duration;
        timelineBar.max = state.duration;
        syncCanvasResolution();
        showToast(isSample ? 'Đã tải video mẫu!' : 'Đã tải video thành công!');
      };
    }

    // Dropzone Events
    if (dropzone && videoInput) {
      dropzone.addEventListener('click', () => videoInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadVideo(e.dataTransfer.files[0]);
        }
      });
      videoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          loadVideo(e.target.files[0]);
        }
      });
    }

    // Sample Demo Button
    if (btnSampleDemo) {
      btnSampleDemo.addEventListener('click', async () => {
        btnSampleDemo.disabled = true;
        btnSampleDemo.textContent = '⏳ Đang khởi tạo...';
        try {
          const sampleBlob = await generateSampleVideoBlob();
          loadVideo(sampleBlob, true);
          state.subtitles = JSON.parse(JSON.stringify(SAMPLE_SUBTITLES));
          renderSegmentsEditor();
          showToast('Đã tải video mẫu kèm phụ đề viral!');
        } catch (err) {
          console.error(err);
          showToast('Lỗi tạo video mẫu: ' + err.message);
        } finally {
          btnSampleDemo.disabled = false;
          btnSampleDemo.innerHTML = '🎬 Dùng video mẫu (Thử ngay)';
        }
      });
    }

    // Playback Controls
    function togglePlay() {
      if (!previewVideo.src) return;
      if (previewVideo.paused) {
        previewVideo.play();
        playPauseBtn.innerHTML = '❚❚';
        state.isPlaying = true;
      } else {
        previewVideo.pause();
        playPauseBtn.innerHTML = '▶';
        state.isPlaying = false;
      }
    }

    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
    if (previewVideo) {
      previewVideo.addEventListener('click', togglePlay);
      previewVideo.addEventListener('timeupdate', () => {
        timelineBar.value = previewVideo.currentTime;
        timeDisplay.textContent = `${formatTimeVTT(previewVideo.currentTime).slice(3, 8)} / ${formatTimeVTT(state.duration).slice(3, 8)}`;
      });
      previewVideo.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '▶';
        state.isPlaying = false;
      });
    }

    if (timelineBar) {
      timelineBar.addEventListener('input', (e) => {
        previewVideo.currentTime = parseFloat(e.target.value);
      });
    }

    // Aspect Ratio Switcher
    aspectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const aspect = btn.dataset.aspect;
        state.currentAspect = aspect;
        stageContainer.className = `video-stage-container aspect-${aspect}`;
        setTimeout(syncCanvasResolution, 50);
      });
    });

    // Safe Zone Toggle
    if (toggleSafeZoneBtn && safeZoneOverlay) {
      toggleSafeZoneBtn.addEventListener('click', () => {
        state.safeZoneActive = !state.safeZoneActive;
        toggleSafeZoneBtn.classList.toggle('active', state.safeZoneActive);
        safeZoneOverlay.classList.toggle('active', state.safeZoneActive);
      });
    }

    // Engine Switcher
    engineOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        engineOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        state.activeEngine = opt.dataset.engine;
        if (apiKeyBox) {
          apiKeyBox.style.display = state.activeEngine === 'gemini' ? 'block' : 'none';
        }
      });
    });

    if (geminiApiKeyInput) {
      geminiApiKeyInput.addEventListener('input', (e) => {
        localStorage.setItem('creatornew_gemini_key', e.target.value.trim());
      });
    }

    // Transcribe Button
    if (btnTranscribe) {
      btnTranscribe.addEventListener('click', async () => {
        if (!state.videoFile && !state.isSample) {
          showToast('Vui lòng chọn hoặc tải lên video trước!');
          return;
        }

        btnTranscribe.disabled = true;
        const origBtnText = btnTranscribe.innerHTML;
        btnTranscribe.innerHTML = '⏳ Đang trích xuất & nhận diện AI...';

        try {
          if (state.activeEngine === 'gemini') {
            const apiKey = geminiApiKeyInput?.value?.trim() || localStorage.getItem('creatornew_gemini_key');
            if (!apiKey) {
              showToast('Vui lòng nhập Gemini API Key (hoặc chuyển sang chế độ Trình duyệt miễn phí)');
              geminiApiKeyInput?.focus();
              return;
            }

            let targetBlob = state.videoFile;
            if (state.isSample) {
              // If sample demo, already loaded
              state.subtitles = JSON.parse(JSON.stringify(SAMPLE_SUBTITLES));
              renderSegmentsEditor();
              showToast('Đã nhận diện phụ đề thành công!');
              return;
            }

            const wavBlob = await extractAudioToWav(targetBlob);
            const lang = languageSelect ? languageSelect.value : 'vi';
            const segments = await transcribeWithGemini(wavBlob, apiKey, lang);
            state.subtitles = segments;
            renderSegmentsEditor();
            showToast(`Thành công! Đã tạo ${segments.length} phân đoạn phụ đề.`);
          } else if (state.activeEngine === 'webspeech') {
            showToast('Đang nhận diện giọng nói qua trình duyệt. Video đang phát...');
            const lang = languageSelect?.value === 'en' ? 'en-US' : 'vi-VN';
            const segments = await transcribeWithWebSpeech(previewVideo, lang);
            state.subtitles = segments;
            renderSegmentsEditor();
            showToast(`Hoàn tất nhận diện qua trình duyệt!`);
          }
        } catch (err) {
          console.error(err);
          showToast('Lỗi: ' + err.message);
        } finally {
          btnTranscribe.disabled = false;
          btnTranscribe.innerHTML = origBtnText;
        }
      });
    }

    // SRT / VTT Import
    if (btnImportSrt && srtFileInput) {
      btnImportSrt.addEventListener('click', () => srtFileInput.click());
      srtFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const text = await file.text();
          const segments = parseSRT(text);
          if (segments.length > 0) {
            state.subtitles = segments;
            renderSegmentsEditor();
            showToast(`Đã nhập thành công ${segments.length} phụ đề từ file!`);
          } else {
            showToast('Không thể phân tích file phụ đề. Vui lòng kiểm tra định dạng .srt');
          }
        }
      });
    }

    // Preset Buttons
    presetCards.forEach(card => {
      card.addEventListener('click', () => {
        presetCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const presetKey = card.dataset.preset;
        if (PRESETS[presetKey]) {
          state.currentPreset = presetKey;
          state.style = { ...PRESETS[presetKey] };
          syncStyleControlsToState();
        }
      });
    });

    function syncStyleControlsToState() {
      if (fontSelect) fontSelect.value = state.style.fontFamily;
      if (fontSizeRange) {
        fontSizeRange.value = Math.round(state.style.fontSizeRatio * 1000);
        if (fontSizeVal) fontSizeVal.textContent = fontSizeRange.value;
      }
      if (primaryColorInput) primaryColorInput.value = state.style.primaryColor;
      if (highlightColorInput) highlightColorInput.value = state.style.highlightColor;
      if (strokeWidthRange) {
        strokeWidthRange.value = Math.round(state.style.strokeWidthRatio * 1000);
        if (strokeWidthVal) strokeWidthVal.textContent = strokeWidthRange.value;
      }
      if (strokeColorInput) strokeColorInput.value = state.style.strokeColor;
      if (boxStyleSelect) boxStyleSelect.value = state.style.boxStyle;
      if (yPosRange) {
        yPosRange.value = state.style.yPosition;
        if (yPosVal) yPosVal.textContent = `${state.style.yPosition}%`;
      }
      if (uppercaseToggle) uppercaseToggle.checked = state.style.uppercase;
    }

    // Style Customizer Inputs
    if (fontSelect) fontSelect.addEventListener('change', (e) => state.style.fontFamily = e.target.value);
    if (fontSizeRange) fontSizeRange.addEventListener('input', (e) => {
      state.style.fontSizeRatio = parseInt(e.target.value) / 1000;
      if (fontSizeVal) fontSizeVal.textContent = e.target.value;
    });
    if (primaryColorInput) primaryColorInput.addEventListener('input', (e) => state.style.primaryColor = e.target.value);
    if (highlightColorInput) highlightColorInput.addEventListener('input', (e) => state.style.highlightColor = e.target.value);
    if (strokeWidthRange) strokeWidthRange.addEventListener('input', (e) => {
      state.style.strokeWidthRatio = parseInt(e.target.value) / 1000;
      if (strokeWidthVal) strokeWidthVal.textContent = e.target.value;
    });
    if (strokeColorInput) strokeColorInput.addEventListener('input', (e) => state.style.strokeColor = e.target.value);
    if (boxStyleSelect) boxStyleSelect.addEventListener('change', (e) => state.style.boxStyle = e.target.value);
    if (yPosRange) yPosRange.addEventListener('input', (e) => {
      state.style.yPosition = parseInt(e.target.value);
      if (yPosVal) yPosVal.textContent = `${e.target.value}%`;
    });
    if (uppercaseToggle) uppercaseToggle.addEventListener('change', (e) => state.style.uppercase = e.target.checked);

    // Subtitle Segments Editor Rendering
    function renderSegmentsEditor() {
      if (!segmentsContainer) return;
      segmentsContainer.innerHTML = '';

      if (state.subtitles.length === 0) {
        segmentsContainer.innerHTML = `
          <div style="text-align:center; padding: 24px; color: #94a3b8; font-size: 13px;">
            Chưa có phân đoạn phụ đề. Hãy bấm "Tạo phụ đề tự động" hoặc "Dùng video mẫu".
          </div>
        `;
        return;
      }

      state.subtitles.forEach((seg, idx) => {
        const item = document.createElement('div');
        item.className = 'segment-item';
        item.dataset.id = seg.id;

        const timeBtn = document.createElement('button');
        timeBtn.className = 'segment-time-badge';
        timeBtn.textContent = `${seg.start.toFixed(1)}s`;
        timeBtn.title = 'Click để xem vị trí video';
        timeBtn.addEventListener('click', () => {
          previewVideo.currentTime = seg.start;
          previewVideo.play();
        });

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'segment-text-input';
        textInput.value = seg.text;
        textInput.addEventListener('input', (e) => {
          seg.text = e.target.value;
          // Re-estimate word timestamps if text edited
          const rawWords = seg.text.split(/\s+/).filter(Boolean);
          const step = (seg.end - seg.start) / (rawWords.length || 1);
          seg.words = rawWords.map((w, wIdx) => ({
            word: w,
            start: seg.start + (wIdx * step),
            end: seg.start + ((wIdx + 1) * step)
          }));
        });

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'segment-actions';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-seg-del';
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Xóa dòng này';
        delBtn.addEventListener('click', () => {
          state.subtitles.splice(idx, 1);
          renderSegmentsEditor();
        });
        actionsDiv.appendChild(delBtn);

        item.appendChild(timeBtn);
        item.appendChild(textInput);
        item.appendChild(actionsDiv);
        segmentsContainer.appendChild(item);
      });
    }

    function updateActiveSegmentCard(time) {
      if (!segmentsContainer) return;
      const activeSeg = state.subtitles.find(s => time >= s.start && time <= s.end);
      const items = segmentsContainer.querySelectorAll('.segment-item');
      items.forEach(item => {
        if (activeSeg && String(item.dataset.id) === String(activeSeg.id)) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Add Segment Manually
    if (btnAddSegment) {
      btnAddSegment.addEventListener('click', () => {
        const cur = previewVideo ? previewVideo.currentTime : 0;
        const newSeg = {
          id: Date.now(),
          start: Number(cur.toFixed(1)),
          end: Number((cur + 2.0).toFixed(1)),
          text: 'Văn bản phụ đề mới',
          words: [
            { word: 'Văn', start: cur, end: cur + 0.5 },
            { word: 'bản', start: cur + 0.5, end: cur + 1.0 },
            { word: 'mới', start: cur + 1.0, end: cur + 2.0 }
          ]
        };
        state.subtitles.push(newSeg);
        state.subtitles.sort((a, b) => a.start - b.start);
        renderSegmentsEditor();
      });
    }

    // Export Burned Video
    if (btnExportBurn) {
      btnExportBurn.addEventListener('click', async () => {
        if (!state.videoFile && !state.isSample) {
          showToast('Vui lòng chọn hoặc tải video trước khi xuất!');
          return;
        }
        if (state.subtitles.length === 0) {
          showToast('Vui lòng tạo hoặc thêm phụ đề trước khi xuất video!');
          return;
        }

        btnExportBurn.disabled = true;
        renderProgressBox.classList.add('active');

        try {
          const result = await exportBurnedVideo((progress) => {
            renderBarFill.style.width = `${progress}%`;
            renderProgressPercent.textContent = `${progress}%`;
          });

          // Trigger download
          const url = URL.createObjectURL(result.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `creatornew-subtitles-${Date.now()}.${result.extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          showToast('Xuất video gắn phụ đề thành công!');
        } catch (err) {
          console.error(err);
          showToast('Lỗi xuất video: ' + err.message);
        } finally {
          btnExportBurn.disabled = false;
          setTimeout(() => {
            renderProgressBox.classList.remove('active');
            renderBarFill.style.width = '0%';
            renderProgressPercent.textContent = '0%';
          }, 3000);
        }
      });
    }

    // Export SRT, VTT, TXT
    if (btnExportSrt) {
      btnExportSrt.addEventListener('click', () => {
        if (state.subtitles.length === 0) {
          showToast('Chưa có phụ đề để xuất!');
          return;
        }
        const srt = exportToSRT(state.subtitles);
        downloadTextFile(srt, `subtitles-${Date.now()}.srt`, 'application/x-subrip');
        showToast('Đã tải xuống file .SRT!');
      });
    }

    if (btnExportVtt) {
      btnExportVtt.addEventListener('click', () => {
        if (state.subtitles.length === 0) {
          showToast('Chưa có phụ đề để xuất!');
          return;
        }
        const vtt = exportToVTT(state.subtitles);
        downloadTextFile(vtt, `subtitles-${Date.now()}.vtt`, 'text/vtt');
        showToast('Đã tải xuống file .VTT!');
      });
    }

    if (btnCopyTxt) {
      btnCopyTxt.addEventListener('click', async () => {
        if (state.subtitles.length === 0) {
          showToast('Chưa có phụ đề để sao chép!');
          return;
        }
        const txt = exportToTXT(state.subtitles);
        try {
          await navigator.clipboard.writeText(txt);
          showToast('Đã sao chép toàn bộ transcript vào clipboard!');
        } catch (err) {
          showToast('Không thể copy vào clipboard: ' + err.message);
        }
      });
    }

    // Initial setup
    syncStyleControlsToState();
    renderSegmentsEditor();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoSubtitleApp);
  } else {
    initAutoSubtitleApp();
  }
})();
