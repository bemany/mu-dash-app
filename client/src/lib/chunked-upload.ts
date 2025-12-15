const CHUNK_SIZE = 5000;

export interface UploadProgress {
  phase: 'trips' | 'transactions';
  current: number;
  total: number;
  percent: number;
}

export async function uploadInChunks<T>(
  data: T[],
  endpoint: string,
  fieldName: string,
  onProgress?: (progress: UploadProgress, phase: 'trips' | 'transactions') => void,
  phase: 'trips' | 'transactions' = 'trips'
): Promise<{ success: boolean; added: number }> {
  if (data.length === 0) {
    return { success: true, added: 0 };
  }

  const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
  let totalAdded = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, data.length);
    const chunk = data.slice(start, end);

    const percent = Math.round(((i + 1) / totalChunks) * 100);
    
    if (onProgress) {
      onProgress({
        phase,
        current: end,
        total: data.length,
        percent: Math.min(percent, 99)
      }, phase);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldName]: chunk }),
    });

    if (!res.ok) {
      throw new Error(`Failed to upload ${phase} chunk ${i + 1}/${totalChunks}`);
    }

    const result = await res.json();
    totalAdded += result.added || chunk.length;
  }

  if (onProgress) {
    onProgress({
      phase,
      current: data.length,
      total: data.length,
      percent: 100
    }, phase);
  }

  return { success: true, added: totalAdded };
}
