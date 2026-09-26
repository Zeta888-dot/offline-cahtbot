import * as FS from 'expo-file-system/legacy';

export type LocalModel = { name: string; uri: string; size: number };

export async function findLocalModels(): Promise<LocalModel[]> {
  const dirs = [FS.documentDirectory, FS.cacheDirectory].filter(Boolean) as string[];
  const found: LocalModel[] = [];

  for (const dir of dirs) {
    try {
      const files = await FS.readDirectoryAsync(dir);
      for (const name of files) {
        if (name.toLowerCase().endsWith('.gguf')) {
          const info = await FS.getInfoAsync(dir + name);
          if (info.exists && !info.isDirectory) {
            found.push({ name, uri: info.uri, size: info.size ?? 0 });
          }
        }
      }
    } catch (e) {
      console.error('Scan failed:', dir, e);
    }
  }

  return found.sort((a, b) => b.size - a.size);
}