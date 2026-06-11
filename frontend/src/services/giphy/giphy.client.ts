export type GiphyGif = {
  id: string;
  title: string;
  previewUrl: string;
  sendUrl: string;
  width: number;
  height: number;
};

type GiphyApiImage = {
  url: string;
  width: string;
  height: string;
};

type GiphyApiGif = {
  id: string;
  title: string;
  images: {
    fixed_width?: GiphyApiImage;
    fixed_height?: GiphyApiImage;
    downsized?: GiphyApiImage;
    original?: GiphyApiImage;
  };
};

type GiphyListResponse = {
  data: GiphyApiGif[];
  pagination: { count: number; offset: number; total_count: number };
};

const PAGE_SIZE = 24;

function getApiKey(): string {
  const key = import.meta.env.VITE_GIPHY_API_KEY?.trim();
  if (!key) throw new Error('Giphy API key is missing. Add VITE_GIPHY_API_KEY to frontend/.env.local');
  return key;
}

function pickStorageUrl(item: GiphyApiGif): GiphyApiImage | undefined {
  const candidates = [
    item.images.original,
    item.images.downsized,
    item.images.fixed_height,
    item.images.fixed_width,
  ].filter((img): img is GiphyApiImage => Boolean(img?.url));
  return candidates.find((img) => img.url.toLowerCase().includes('.gif')) ?? candidates[0];
}

function mapGif(item: GiphyApiGif): GiphyGif {
  const preview = item.images.fixed_width ?? item.images.fixed_height ?? item.images.downsized;
  const send = pickStorageUrl(item);
  if (!preview?.url || !send?.url) {
    throw new Error('Invalid Giphy response');
  }
  return {
    id: item.id,
    title: item.title || 'GIF',
    previewUrl: preview.url,
    sendUrl: send.url,
    width: Number(preview.width) || 200,
    height: Number(preview.height) || 200,
  };
}

async function fetchGiphy(path: string, params: Record<string, string>): Promise<GiphyListResponse> {
  const url = new URL(`https://api.giphy.com/v1/gifs/${path}`);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('rating', 'pg');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Giphy request failed (${res.status})`);
  }
  return res.json() as Promise<GiphyListResponse>;
}

export async function fetchTrendingGifs(offset = 0): Promise<{ gifs: GiphyGif[]; hasMore: boolean }> {
  const data = await fetchGiphy('trending', { offset: String(offset) });
  return {
    gifs: data.data.map(mapGif),
    hasMore: offset + data.pagination.count < data.pagination.total_count,
  };
}

export async function searchGifs(query: string, offset = 0): Promise<{ gifs: GiphyGif[]; hasMore: boolean }> {
  const q = query.trim();
  if (!q) return fetchTrendingGifs(offset);
  const data = await fetchGiphy('search', { q, offset: String(offset) });
  return {
    gifs: data.data.map(mapGif),
    hasMore: offset + data.pagination.count < data.pagination.total_count,
  };
}

export function hasGiphyApiKey(): boolean {
  return Boolean(import.meta.env.VITE_GIPHY_API_KEY?.trim());
}
