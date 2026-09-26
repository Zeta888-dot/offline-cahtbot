import { Platform } from 'react-native';

let context: any = null;

export async function loadModel(modelPath: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    context = { mock: true };
    return true;
  }
  try {
    const FS = require('expo-file-system/legacy');
    const info = await FS.getInfoAsync(modelPath);
    console.log('LLM path:', modelPath, 'exists:', info.exists, 'size:', info.size);

    const cleanPath = modelPath.replace('file://', '');
    console.log('LLM cleanPath:', cleanPath);

    const { initLlama } = require('llama.rn');
    context = await initLlama({
      model: cleanPath,
      use_mlock: true,
      n_gpu_layers: 0,
    });
    return true;
  } catch (error) {
    console.error('Model load failed:', error);
    return false;
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

  const result = await context.completion(
    { messages, n_predict: 200, temperature: 0.7 },
    (data: any) => onToken?.(data.token),
  );
  return result.content.trim();
}

export async function unloadModel() {
  if (Platform.OS !== 'web' && context) {
    const { releaseAllLlama } = require('llama.rn');
    await releaseAllLlama();
  }
  context = null;
}