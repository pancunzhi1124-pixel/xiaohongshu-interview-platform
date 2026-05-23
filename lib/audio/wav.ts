export type ParsedWavPcm16 = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  pcm: Int16Array;
};

const TARGET_SAMPLE_RATE = 8000;

function linearResample(input: Int16Array, sourceRate: number, targetRate: number): Int16Array {
  if (sourceRate === targetRate || input.length === 0) return input;
  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(input.length - 1, left + 1);
    const fraction = sourceIndex - left;
    output[i] = Math.round(input[left] * (1 - fraction) + input[right] * fraction);
  }
  return output;
}

function downsample16000To8000(input: Int16Array): Int16Array {
  const outputLength = Math.floor(input.length / 2);
  const output = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) output[i] = input[i * 2];
  return output;
}

export function int16ToBuffer(input: Int16Array): Buffer {
  const out = Buffer.alloc(input.length * 2);
  for (let i = 0; i < input.length; i += 1) out.writeInt16LE(input[i], i * 2);
  return out;
}

export function int16ToArrayBuffer(input: Int16Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i += 1) view.setInt16(i * 2, input[i], true);
  return buffer;
}

export function parseWavPcm16(buffer: Buffer): ParsedWavPcm16 {
  if (buffer.length < 44) throw new Error("WAV 文件过短，无法解析。");
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("无效 WAV：缺少 RIFF/WAVE 头。");

  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let audioFormat = 0;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    if (chunkDataStart + chunkSize > buffer.length) break;
    if (chunkId === "fmt ") {
      audioFormat = buffer.readUInt16LE(chunkDataStart);
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    }
    if (chunkId === "data") {
      dataOffset = chunkDataStart;
      dataSize = chunkSize;
      break;
    }
    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample) throw new Error("无效 WAV：缺少 fmt chunk。");
  if (dataOffset < 0 || dataSize <= 0) throw new Error("无效 WAV：缺少 data chunk。");
  if (audioFormat !== 1) throw new Error("仅支持 PCM WAV（audioFormat=1）。");
  if (bitsPerSample !== 16) throw new Error("仅支持 16-bit PCM WAV。");
  if (channels < 1) throw new Error("WAV 声道数必须大于 0。");

  const frameCount = Math.floor(dataSize / (channels * 2));
  const mono = new Int16Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    if (channels === 1) mono[i] = buffer.readInt16LE(dataOffset + i * 2);
    else {
      let sum = 0;
      for (let ch = 0; ch < channels; ch += 1) sum += buffer.readInt16LE(dataOffset + (i * channels + ch) * 2);
      mono[i] = Math.round(sum / channels);
    }
  }

  if (sampleRate === TARGET_SAMPLE_RATE) return { sampleRate, channels, bitsPerSample, pcm: mono };
  if (sampleRate === 16000) return { sampleRate: TARGET_SAMPLE_RATE, channels: 1, bitsPerSample, pcm: downsample16000To8000(mono) };
  return { sampleRate: TARGET_SAMPLE_RATE, channels: 1, bitsPerSample, pcm: linearResample(mono, sampleRate, TARGET_SAMPLE_RATE) };
}
