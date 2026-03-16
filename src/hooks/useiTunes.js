import { useState, useCallback } from 'react';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup';

/**
 * Search albums by artist/group name using iTunes Search API
 * @param {string} artistName - Artist or group name
 * @param {object} opts - { limit: 25 }
 * @returns {Promise<Array>} Array of { id, title, date, type, artistName, cover }
 */
export async function searchAlbums(artistName, opts = {}) {
  const { limit = 50 } = opts;
  const term = String(artistName).trim();
  if (!term) return [];

  const params = new URLSearchParams({
    term,
    entity: 'album',
    limit: String(limit),
    media: 'music',
  });
  const res = await fetch(`${ITUNES_SEARCH}?${params}`);
  if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);

  const data = await res.json();
  const mapped = (data.results || []).map((item) => ({
    id: String(item.collectionId),
    title: item.collectionName || '',
    date: item.releaseDate ? item.releaseDate.substring(0, 10) : '',
    type: item.collectionType === 'Compilation' ? 'Compilation' : 'Album',
    artistName: item.artistName || '',
    cover: item.artworkUrl100
      ? item.artworkUrl100.replace(/100x100/, '300x300')
      : '',
    trackCount: item.trackCount || 0,
  }));

  // Sort: 1) release date desc (newest first ว.ด.ป.), 2) trackCount desc (full albums first)
  const results = mapped.sort((a, b) => {
    const dateCompare = (b.date || '').localeCompare(a.date || '');
    if (dateCompare !== 0) return dateCompare;
    return (b.trackCount || 0) - (a.trackCount || 0);
  });

  return results;
}

/**
 * Fetch tracklist for an album by collection ID
 * @param {string} collectionId - iTunes collection ID
 * @returns {Promise<string[]>} - Array of track titles
 */
export async function fetchTracklist(collectionId) {
  if (!collectionId) return [];

  const params = new URLSearchParams({
    id: String(collectionId),
    entity: 'song',
  });
  const res = await fetch(`${ITUNES_LOOKUP}?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  const results = data.results || [];
  // First result is the collection; rest are tracks
  const tracks = results
    .filter((r) => r.wrapperType === 'track')
    .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0))
    .map((t) => (t.trackName || '').trim())
    .filter(Boolean);

  return tracks;
}

/**
 * Hook: search albums via iTunes for import modal
 */
export function useiTunes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const search = useCallback(async (artistName) => {
    if (!artistName?.trim()) {
      setResults([]);
      setError('Please enter artist/group name');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const albums = await searchAlbums(artistName);
      setResults(albums);
      if (albums.length === 0) setError('No results from iTunes');
    } catch (e) {
      setError(e.message || 'Failed to fetch data');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { search, results, loading, error, clear };
}
