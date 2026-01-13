/**
 * Utility to convert Google Drive shareable links to direct download/view URLs
 * Example: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * to: https://drive.google.com/uc?export=view&id=FILE_ID
 */
export const convertDriveLink = (url) => {
    if (!url) return url;

    // Basic regex for Google Drive "file/d/ID/view" format
    const driveFileRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveFileRegex);

    if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    return url;
};

const DRIVE_FOLDER_ID = '1pqJiEvaJQ1HgBIcD7t5n8r-1Awlw-ecj';

/**
 * Upload a file to the specified Google Drive folder
 * Requires a valid access token from OAuth2
 */
export const uploadToDrive = async (file, accessToken) => {
    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: [DRIVE_FOLDER_ID]
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload to Google Drive');
    }

    const result = await response.json();
    // Return a "shareable" link that we can convert later
    return `https://drive.google.com/file/d/${result.id}/view?usp=sharing`;
};
