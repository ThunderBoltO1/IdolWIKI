import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
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
