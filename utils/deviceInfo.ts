import * as Device from 'expo-device';

export async function getRecommendedModel() {
  try {
    const maxMemory = await Device.getMaxMemoryAsync();
    const maxMemoryGB = maxMemory / (1024 * 1024 * 1024);
    
    // Agar app ko 2GB se kam mil raha hai, to device 4GB wala hai
    if (maxMemoryGB < 2.5) {
      return { 
        ram: `~4GB Device`, 
        model: 'Qwen2.5-1.5B-Q4_K_M.gguf',
        reason: 'Low memory device detected'
      };
    }
    // 2.5GB+ mil raha hai to 8GB device ho sakta hai
    return { 
      ram: `~8GB Device`, 
      model: 'Qwen2.5-3B-Q4_K_M.gguf',
      reason: 'Sufficient memory available'
    };
  } catch (error) {
    console.error('Memory check failed:', error);
    return { 
      ram: 'Unknown', 
      model: 'Qwen2.5-1.5B-Q4_K_M.gguf',
      reason: 'Default fallback'
    };
  }
}