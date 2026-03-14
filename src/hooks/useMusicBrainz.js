import { useState, useCallback } from 'react';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const COVER_BASE = 'https://coverartarchive.org/release-group';

/** MusicBrainz requires a meaningful User-Agent */
const headers = {
  Accept: 'application/json',
  'User-Agent': 'IdolWikiInfo/1.0 (https://github.com/idolwikiinfo)',
};

/**
 * Search release-groups (albums/EPs/singles) by artist name
 * @param {string} artistName - Artist or group name
 * @param {object} opts - { types: ['album','ep','single'], limit: 25 }
 */
export async function searchReleaseGroups(artistName, opts = {}) {
  const { types = ['album', 'ep', 'single'], limit = 25 } = opts;
  const query = `artist:"${String(artistName).trim()}"`;
  const typeParam = types.join('|');
  const url = `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&type=${typeParam}&limit=${limit}&fmt=json`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`MusicBrainz API error: ${res.status}`);
  const data = await res.json();
  const groups = (data['release-groups'] || []).map((rg) => ({
    mbid: rg.id,
    title: rg.title,
    date: rg['first-release-date'] || '',
    type: rg['primary-type'] || 'Album',
    secondaryTypes: rg['secondary-types'] || [],
  }));
  return groups;
}

const TADB_API = 'https://theaudiodb.com/api/v1/json/2';
const TADB_RATE_MS = 600; // ~2 req/sec

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch tracklist: try TheAudioDB first, fallback to MusicBrainz
 * @param {string} mbid - MusicBrainz release-group ID
 * @returns {Promise<string[]>} - Array of track titles
 */
export async function fetchTracklist(mbid) {
  // 1. Try TheAudioDB
  try {
    const albumRes = await fetch(`${TADB_API}/album-mb.php?i=${encodeURIComponent(mbid)}`);
    const albumData = await albumRes.json();
    const album = albumData?.album;
    if (album?.idAlbum) {
      await sleep(TADB_RATE_MS);
      const trackRes = await fetch(`${TADB_API}/track.php?m=${encodeURIComponent(album.idAlbum)}`);
      const trackData = await trackRes.json();
      const tracks = trackData?.track;
      if (Array.isArray(tracks) && tracks.length > 0) {
        return tracks.map((t) => (t.strTrack || '').trim()).filter(Boolean);
      }
    }
  } catch {
    // ignore, fallback to MusicBrainz
  }

  // 2. Fallback: MusicBrainz Release
  try {
    const rgRes = await fetch(
      `${MB_BASE}/release-group/${mbid}?inc=releases&fmt=json`,
      { headers }
    );
    if (!rgRes.ok) return [];
    const rgData = await rgRes.json();
    const releases = rgData.releases || [];
    const official = releases.find((r) => r.status === 'Official') || releases[0];
    if (!official?.id) return [];

    const relRes = await fetch(
      `${MB_BASE}/release/${official.id}?inc=recordings&fmt=json`,
      { headers }
    );
    if (!relRes.ok) return [];
    const relData = await relRes.json();
    const media = relData.media || [];
    const tracks = media.flatMap((m) => m.tracks || []).map((t) => (t.title || '').trim()).filter(Boolean);
    return tracks;
  } catch {
    return [];
  }
}

/**
 * Fetch cover art for a release-group from Cover Art Archive
 * @param {string} mbid - MusicBrainz release-group ID
 * @returns {Promise<string|null>} - Cover image URL or null
 */
export async function fetchCoverArt(mbid) {
  try {
    const res = await fetch(`${COVER_BASE}/${mbid}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const front = (data.images || []).find((img) => img.front);
    return front ? front.thumbnails?.small || front.image : null;
  } catch {
    return null;
  }
}

/**
 * Hook: search + optional cover fetch for MusicBrainz import
 */
export function useMusicBrainz() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const search = useCallback(async (artistName) => {
    if (!artistName?.trim()) {
      setResults([]);
      setError('กรุณาใส่ชื่อศิลปิน/กลุ่ม');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const groups = await searchReleaseGroups(artistName);
      setResults(groups);
      if (groups.length === 0) setError('ไม่พบผลลัพธ์จาก MusicBrainz');
    } catch (e) {
      setError(e.message || 'ดึงข้อมูลไม่สำเร็จ');
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
