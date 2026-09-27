import { Platform } from 'react-native';

let context: any = null;

export type LoadResult = { ok: boolean; error?: string };

export async function loadModel(modelPath: string): Promise<LoadResult> {
  if (Platform.OS === 'web') {
    context = { mock: true };
    return { ok: true };
  }
  try {
    // Release any previously loaded context first. Without this, reloading
    // (hot-reload during dev, or switching models) leaks native memory —
    // multiple 400-600MB llama contexts stacking up, which can crash the
    // app on a memory-constrained phone with no JS-catchable error at all.
    if (context) {
      try {
        const { releaseAllLlama } = require('llama.rn');
        await releaseAllLlama();
      } catch (releaseErr) {
        console.warn('releaseAllLlama before reload failed:', releaseErr);
      }
      context = null;
    }

    const FS = require('expo-file-system/legacy');
    const info = await FS.getInfoAsync(modelPath);
    console.log('LLM path:', modelPath, 'exists:', info.exists, 'size:', info.size);

    if (!info.exists) {
      return { ok: false, error: `Model file nahi mila is path par: ${modelPath}` };
    }

    // content:// URIs (some Android pickers, or copyToCacheDirectory:false) can't be
    // opened by the native llama.cpp binding, which needs a real filesystem path.
    if (modelPath.startsWith('content://')) {
      return {
        ok: false,
        error:
          'Yeh content:// URI hai, native model loader isse directly nahi khol sakta. ' +
          'File Manager se select karo (Files app), ya document picker copyToCacheDirectory:true use kar raha hai yeh confirm karo.',
      };
    }

    const cleanPath = modelPath.replace('file://', '');
    console.log('LLM cleanPath:', cleanPath);

    // Explicit n_ctx/n_threads/n_batch instead of library defaults — a large
    // default context window allocates a big KV cache up front (slow + RAM
    // heavy on a phone), and thread count isn't always tuned to the device.
    // 2048 ctx is plenty for a chat app; 4 threads is a safe middle ground —
    // bump/lower this to match the phone's core count once we see timings.
    const initParams = {
      model: cleanPath,
      use_mlock: true,
      n_gpu_layers: 0,
      n_ctx: 2048,
      n_threads: 4,
      n_batch: 512,
    };

    const { initLlama } = require('llama.rn');
    const loadStart = Date.now();
    try {
      context = await initLlama(initParams);
    } catch (mlockErr: any) {
      // use_mlock can fail on devices that won't grant enough locked memory —
      // retry once without it before giving up.
      console.warn('initLlama with use_mlock failed, retrying without it:', mlockErr?.message);
      context = await initLlama({ ...initParams, use_mlock: false });
    }
    console.log('LLM initLlama took', Date.now() - loadStart, 'ms');
    return { ok: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('Model load failed:', error);
    return { ok: false, error: message };
  }
}

export async function generateResponse(
  messages: Array<{ role: string; content: string }>,
  onToken?: (token: string) => void,
): Promise<string> {
  if (!context) throw new Error('Model not loaded');

  if (Platform.OS === 'web') {
    const reply = `Mock reply: ${messages[messages.length - 1].content}`;
    for (const word of reply.split(' ')) {
      await new Promise(r => setTimeout(r, 40));
      onToken?.(word + ' ');
    }
    return reply;
  }

  const start = Date.now();
  let tokenCount = 0;

  const result = await context.completion(
    { messages, n_predict: 128, temperature: 0.7 },
    (data: any) => {
      tokenCount += 1;
      if (tokenCount === 1) {
        console.log('LLM first token after', Date.now() - start, 'ms');
      }
      onToken?.(data.token);
    },
  );

  console.log(
    'LLM completion done:', tokenCount, 'tokens in', Date.now() - start, 'ms',
    '(~', (tokenCount / ((Date.now() - start) / 1000)).toFixed(1), 'tok/s)',
  );

  // Some community GGUF quants don't embed a proper chat_template, so
  // llama.rn's chat-format parsing can leave `content` empty/undefined even
  // though generation succeeded. `text` always has the raw output — fall
  // back to it instead of crashing on `.trim()` of undefined.
  const finalText = result?.content || result?.text || '';
  if (!result?.content && result?.text) {
    console.warn('completion(): result.content was empty, falling back to result.text — model GGUF likely missing chat_template metadata.');
  }
  return finalText.trim();
}

export async function stopGeneration() {
  if (context && typeof context.stopCompletion === 'function') {
    try {
      await context.stopCompletion();
    } catch (e) {
      console.warn('stopCompletion failed:', e);
    }
  }
}

export async function unloadModel() {
  if (Platform.OS !== 'web' && context) {
    const { releaseAllLlama } = require('llama.rn');
    await releaseAllLlama();
  }
  context = null;
}