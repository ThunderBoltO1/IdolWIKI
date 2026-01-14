export function convertDriveLink(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  // If not a Google Drive link, just return as-is
  if (!trimmed.includes('drive.google.com')) {
    return trimmed;
  }

  try {
    // Pattern: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const fileIdMatch = trimmed.match(/\/d\/([^/]+)/);
    let id = fileIdMatch ? fileIdMatch[1] : null;

    // Pattern: https://drive.google.com/uc?id=FILE_ID or open?id=FILE_ID
    if (!id) {
      const u = new URL(trimmed);
      id = u.searchParams.get('id');
    }

    if (!id) return trimmed;

    // Use Google image CDN style URL for better performance
    return `https://lh3.googleusercontent.com/d/${id}=w1000`;
  } catch {
    return trimmed;
  }
}

