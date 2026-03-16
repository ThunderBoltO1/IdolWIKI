import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Restore page scroll and force repaint after closing modals.
 * Fixes issue where content doesn't render until user scrolls/refreshes.
 */
/**
 * Strip HTML tags – leave only plain text (for AI/chat responses)
 */
export function stripHtml(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/<[^>]+>/g, '');
}

/**
 * Escape HTML for safe display (Biography etc.)
 */
function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Format biography plain text with simple markup into safe HTML.
 * Use **ตัวหนา** for bold, *ตัวเอียง* for italic, __ขีดเส้นใต้__ for underline.
 */
export function formatBiographyText(text) {
    if (!text || typeof text !== 'string') return '';
    const escaped = escapeHtml(text);
    return escaped
        .replace(/__(.+?)__/g, '<u>$1</u>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*]+?)\*/g, '<i>$1</i>');
}

export function restorePageScroll() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    requestAnimationFrame(() => {
        const y = window.scrollY ?? document.documentElement.scrollTop;
        window.scrollTo(0, y);
    });
}

/**
 * Get YouTube embed URL for both videos and playlists.
 * Video: https://www.youtube.com/embed/VIDEO_ID
 * Playlist: https://www.youtube.com/embed/videoseries?list=PLAYLIST_ID
 */
export function getYouTubeEmbedSrc(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname?.includes('youtube.com')) {
            const listId = urlObj.searchParams.get('list');
            if (listId) {
                return `https://www.youtube.com/embed/videoseries?list=${listId}`;
            }
            const v = urlObj.searchParams.get('v');
            if (v) return `https://www.youtube.com/embed/${v}`;
            if (urlObj.pathname?.startsWith('/embed/')) {
                const id = urlObj.pathname.substring('/embed/'.length).split('?')[0];
                if (id && id !== 'videoseries') return `https://www.youtube.com/embed/${id}`;
            }
        } else if (urlObj.hostname === 'youtu.be') {
            const videoId = urlObj.pathname?.substring(1)?.split('?')[0];
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {
        if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
            return `https://www.youtube.com/embed/${url}`;
        }
    }
    return null;
}

/**
 * Categorize album/release by title text.
 * @returns {'album'|'mini'|'single'|'other'}
 */
export function getAlbumType(title) {
    if (!title || typeof title !== 'string') return 'other';
    const t = title.toLowerCase();
    if (/\bsingle\b/i.test(t) || /digital single/i.test(t)) return 'single';
    if (/mini album/i.test(t) || /\bep\b/i.test(t) || / - ep$/i.test(t)) return 'mini';
    if (/\balbum\b/i.test(t)) return 'album';
    return 'other';
}

/**
 * Group albums into { albums, mini, singles, other } by title
 */
export function groupAlbumsByType(albums) {
    const result = { albums: [], mini: [], singles: [], other: [] };
    (albums || []).forEach((a) => {
        const type = getAlbumType(a.title);
        result[type === 'album' ? 'albums' : type === 'mini' ? 'mini' : type === 'single' ? 'singles' : 'other'].push(a);
    });
    const sortByDate = (arr) => arr.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    sortByDate(result.albums);
    sortByDate(result.mini);
    sortByDate(result.singles);
    sortByDate(result.other);
    return result;
}

export function getRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const ts = typeof timestamp === 'number' ? timestamp : (timestamp?.toMillis ? timestamp.toMillis() : Number(timestamp));
    const diff = Date.now() - ts;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}
