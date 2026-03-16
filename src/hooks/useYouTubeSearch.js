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
    throw new Error('YouTube API key is not configured (VITE_YOUTUBE_API_KEY)');
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
    const publishedAt = item.snippet?.publishedAt;
    const dateStr = publishedAt ? new Date(publishedAt).toISOString().split('T')[0] : '';
    if (item.id?.videoId) {
      videos.push({
        id,
        type: 'video',
        title: item.snippet?.title || '',
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: thumb,
        publishedAt,
        date: dateStr,
      });
    } else if (item.id?.playlistId) {
      playlists.push({
        id,
        type: 'playlist',
        title: item.snippet?.title || '',
        url: `https://www.youtube.com/playlist?list=${id}`,
        thumbnail: thumb,
        publishedAt,
        date: dateStr,
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
      setError('Please enter a search term');
      return;
    }
    setLoading(true);
    setError(null);
    setResults({ videos: [], playlists: [] });
    try {
      const data = await searchYouTube(query, { maxResults: 8 });
      setResults(data);
      if (data.videos.length === 0 && data.playlists.length === 0) {
        setError('No results found');
      }
    } catch (e) {
      setError(e.message || 'Search failed');
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
