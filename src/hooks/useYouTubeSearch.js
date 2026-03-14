import { useState, useCallback } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube for videos and playlists
 * @param {string} query - Search query (e.g. "BLACKPINK KILL THIS LOVE playlist")
 * @param {object} opts - { type: 'video,playlist', maxResults: 10 }
 * @returns {Promise<{ videos: [], playlists: [] }>}
 */
export async function searchYouTube(query, opts = {}) {
  const { type = 'video,playlist', maxResults = 10 } = opts;
  if (!API_KEY) {
    throw new Error('YouTube API key ไม่ได้ตั้งค่า (VITE_YOUTUBE_API_KEY)');
  }
  const params = new URLSearchParams({
    part: 'snippet',
    q: String(query).trim(),
    type,
    maxResults: String(maxResults),
    key: API_KEY,
  });
  const res = await fetch(`${BASE}/search?${params}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error?.message || 'YouTube API error');
  }
  const videos = [];
  const playlists = [];
  (data.items || []).forEach((item) => {
    const id = item.id?.videoId || item.id?.playlistId;
    const thumb = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
    if (item.id?.videoId) {
      videos.push({
        id,
        type: 'video',
        title: item.snippet?.title || '',
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: thumb,
      });
    } else if (item.id?.playlistId) {
      playlists.push({
        id,
        type: 'playlist',
        title: item.snippet?.title || '',
        url: `https://www.youtube.com/playlist?list=${id}`,
        thumbnail: thumb,
      });
    }
  });
  return { videos, playlists };
}

export function useYouTubeSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({ videos: [], playlists: [] });

  const search = useCallback(async (query) => {
    if (!query?.trim()) {
      setResults({ videos: [], playlists: [] });
      setError('กรุณาใส่คำค้น');
      return;
    }
    setLoading(true);
    setError(null);
    setResults({ videos: [], playlists: [] });
    try {
      const data = await searchYouTube(query, { maxResults: 8 });
      setResults(data);
      if (data.videos.length === 0 && data.playlists.length === 0) {
        setError('ไม่พบผลลัพธ์');
      }
    } catch (e) {
      setError(e.message || 'ค้นหาไม่สำเร็จ');
      setResults({ videos: [], playlists: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults({ videos: [], playlists: [] });
    setError(null);
  }, []);

  return { search, results, loading, error, clear };
}
