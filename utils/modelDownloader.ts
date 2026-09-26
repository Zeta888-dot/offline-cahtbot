import * as FS from 'expo-file-system/legacy';

export type ModelOption = {
  id: string;
  name: string;
  family: string;
  size: string;
  url: string;
  fileName: string;
};

const MODELS: ModelOption[] = [
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M',
    family: 'HuggingFaceTB',
    size: '386 MB',
    // The official repo only publishes a Q8_0 quant (lowercase filename) —
    // "SmolLM2-360M-Instruct-Q4_K_M.gguf" doesn't exist there, hence the 404
    // that was masquerading as a network error.
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    fileName: 'smollm2-360m-instruct-q8_0.gguf',
  },
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5 0.5B Instruct',
    family: 'Qwen',
    size: '378 MB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    fileName: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen3-0.6b',
    name: 'Qwen3 0.6B',
    family: 'Qwen',
    size: '485 MB',
    url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf',
    fileName: 'Qwen3-0.6B-Q4_K_M.gguf',
  },
  {
    id: 'qwen3.5-0.8b',
    name: 'Qwen3.5 0.8B',
    family: 'Qwen',
    size: '592 MB',
    url: 'https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf',
    fileName: 'Qwen3.5-0.8B-Q4_K_M.gguf',
  },
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5 1.5B Instruct',
    family: 'Qwen',
    size: '990 MB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  },
];

const MIN_VALID_SIZE = 50 * 1024 * 1024; // 50MB

export function getAvailableModels(): ModelOption[] {
  return MODELS;
}

export type DownloadProgress = { written: number; total: number; percent: number };
export type DownloadHandle = {
  promise: Promise<string>;
  cancel: () => void;
};

function getHeader(headers: Record<string, string> | undefined, name: string): string {
  if (!headers) return '';
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

export function downloadModel(model: ModelOption, onProgress: (p: DownloadProgress) => void): DownloadHandle {
  const dest = `${FS.documentDirectory}${model.fileName}`;

  let cancelled = false;
  let sizeCheckFailed = false;

  const dl = FS.createDownloadResumable(
    model.url,
    dest,
    {
      // NOTE: removed the spoofed desktop User-Agent that was here before.
      // Hugging Face's CDN sits behind Cloudflare, and an unusual/spoofed
      // UA can get flagged as bot traffic, which returns a small HTML
      // "challenge" page instead of the actual .gguf file. That page
      // downloads almost instantly (hence the progress bar jumping to
      // 100% right away) and then failed our size check below, which is
      // what surfaced as the generic "check your connection" error.
      headers: {
        Accept: '*/*',
      },
    },
    (p) => {
      const total = p.totalBytesExpectedToWrite;
      const written = p.totalBytesWritten;

      // Bail out as soon as the server tells us the total size, instead of
      // waiting for the whole (bogus) transfer to finish. If HF/Cloudflare
      // is serving an error/challenge page, total will be a few KB, not
      // hundreds of MB — catch that immediately.
      if (total > 0 && total < MIN_VALID_SIZE && !sizeCheckFailed) {
        sizeCheckFailed = true;
        cancelled = true;
        dl.pauseAsync?.().catch(() => {});
      }

      onProgress({
        written,
        total,
        percent: total > 0 ? Math.floor((written / total) * 100) : 0,
      });
    },
  );

  const promise = (async () => {
    const result = await dl.downloadAsync();

    if (cancelled) {
      await FS.deleteAsync(dest, { idempotent: true });
      if (sizeCheckFailed) {
        throw new Error(
          'Server did not send the actual model file (reported size was way too small). ' +
            'This usually means the link got blocked or rate-limited, not that your Wi-Fi is down — try again in a bit or switch networks.',
        );
      }
      throw new Error('Download cancelled');
    }

    if (!result) throw new Error('Download failed');

    // expo-file-system does NOT throw on non-2xx responses — it happily
    // writes whatever body the server sent, even an error page. We have
    // to check the status ourselves.
    if (result.status < 200 || result.status >= 300) {
      await FS.deleteAsync(dest, { idempotent: true });
      throw new Error(`Server returned HTTP ${result.status} instead of the file. Check the model URL or try again later.`);
    }

    const contentType = result.mimeType || getHeader(result.headers, 'content-type');
    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
      await FS.deleteAsync(dest, { idempotent: true });
      throw new Error(`Server returned an error page instead of the model file (content-type: ${contentType}). The link may be blocked or expired.`);
    }

    const info = await FS.getInfoAsync(dest);
    const fileSize = (info as any).size ?? 0;
    if (!info.exists || fileSize < MIN_VALID_SIZE) {
      await FS.deleteAsync(dest, { idempotent: true });
      throw new Error(`Downloaded file is too small (${fileSize} bytes, expected ~${model.size}). Check your internet connection and retry.`);
    }

    return dest;
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      dl.pauseAsync?.().catch(() => {});
    },
  };
}

export async function deleteDownloadedModel(fileName: string): Promise<void> {
  try {
    const dest = `${FS.documentDirectory}${fileName}`;
    const info = await FS.getInfoAsync(dest);
    if (info.exists) await FS.deleteAsync(dest, { idempotent: true });
  } catch {}
}