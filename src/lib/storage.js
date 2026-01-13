/**
 * Utility to convert Google Drive shareable links to direct download/view URLs
 * Example: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * to: https://drive.google.com/uc?export=view&id=FILE_ID
 */
export const convertDriveLink = (url) => {
    if (!url) return null;

    // Basic regex for Google Drive "file/d/ID/view" format
    const driveFileRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveFileRegex);

    if (match && match[1]) {
        // Thumbnail URL is often more reliable for direct embedding than uc
        // Added timestamp cache buster to ensure images update instantly
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000&t=${new Date().getTime()}`;
    }

    return url;
};
