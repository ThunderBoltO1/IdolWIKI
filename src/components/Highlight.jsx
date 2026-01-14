import React from 'react';

export const Highlight = ({ text = '', highlight = '' }) => {
    if (!highlight?.trim() || !text) {
        return <>{text}</>;
    }
    // Escape special characters in the highlight string for use in regex
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.filter(String).map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-brand-pink/50 text-white rounded not-italic px-0.5 mx-0">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};