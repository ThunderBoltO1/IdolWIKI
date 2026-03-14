import { useState, useEffect, useMemo } from 'react';

export function useGroupNews(displayGroup, members, activeTab) {
    const [news, setNews] = useState([]);
    const [loadingNews, setLoadingNews] = useState(false);
    const [newsSourceFilter, setNewsSourceFilter] = useState('all');

    const fetchNews = async (signal) => {
        if (!displayGroup?.name) return;
        setLoadingNews(true);
        setNews([]);
        try {
            const groupNameLower = displayGroup.name.toLowerCase();
            const koreanNameLower = (displayGroup.koreanName || '').toLowerCase();
            let mappedNews = [];

            // 1. Try Koreaboo RSS
            try {
                const rssUrl = 'https://www.koreaboo.com/feed/';
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
                const response = await fetch(apiUrl, { signal });
                const data = await response.json();

                if (data.status === 'ok') {
                    let filteredItems = data.items.filter(item => {
                        const title = (item.title || '').toLowerCase();
                        return title.includes(groupNameLower) || (koreanNameLower && title.includes(koreanNameLower));
                    });
                    if (filteredItems.length === 0 && members?.length > 0) {
                        const memberNames = members.map(m => m.name.toLowerCase());
                        filteredItems = data.items.filter(item => {
                            const title = (item.title || '').toLowerCase();
                            return memberNames.some(name => title.includes(name));
                        });
                    }
                    if (filteredItems.length > 0) {
                        mappedNews = filteredItems.map(item => {
                            const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
                            const contentImg = imgMatch ? imgMatch[1] : null;
                            const enclosureImg = item.enclosure?.link || item.thumbnail;
                            const finalThumbnail = enclosureImg || contentImg || displayGroup.image;
                            return {
                                name: item.title,
                                url: item.link,
                                description: (item.description?.replace(/<[^>]+>/g, '').substring(0, 200) || '') + '...',
                                datePublished: item.pubDate,
                                provider: [{ name: data.feed?.title || 'Koreaboo' }],
                                image: { thumbnail: { contentUrl: finalThumbnail } }
                            };
                        }).sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished)).slice(0, 10);
                    }
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.warn("Koreaboo fetch failed", err);
            }

            // 2. Fallback: Google News RSS
            if (mappedNews.length === 0) {
                try {
                    const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(displayGroup.name + ' kpop')}&hl=en-US&gl=US&ceid=US:en&when:7d`;
                    const googleApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(googleRssUrl)}`;
                    let data = null;
                    for (let i = 0; i < 4; i++) {
                        const response = await fetch(googleApiUrl, { signal });
                        data = await response.json();
                        if (data?.status === 'ok') break;
                        await new Promise(r => setTimeout(r, 1500));
                    }
                    if (data?.status === 'ok') {
                        mappedNews = data.items.map(item => {
                            const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
                            let thumbnail = item.enclosure?.link || item.thumbnail || (imgMatch ? imgMatch[1] : null);
                            if (!thumbnail && item.content) {
                                const m = item.content.match(/<img[^>]+src="([^">]+)"/);
                                if (m) thumbnail = m[1];
                            }
                            if (!thumbnail) thumbnail = displayGroup.image;
                            return {
                                name: item.title,
                                url: item.link,
                                description: (item.description?.replace(/<[^>]+>/g, '').substring(0, 200) || '') + '...',
                                datePublished: item.pubDate,
                                provider: [{ name: 'Google News' }],
                                image: { thumbnail: { contentUrl: thumbnail } }
                            };
                        }).sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished)).slice(0, 20);
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') console.error("Google News fallback failed", err);
                }
            }
            setNews(mappedNews);
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Error fetching news:", error);
        } finally {
            setLoadingNews(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (activeTab === 'news' && displayGroup?.name) {
            fetchNews(controller.signal);
        }
        return () => controller.abort();
    }, [activeTab, displayGroup?.name]);

    const filteredNews = useMemo(() => {
        if (newsSourceFilter === 'all') return news;
        return news.filter(item => item.provider?.[0]?.name?.toLowerCase().includes(newsSourceFilter.toLowerCase()));
    }, [news, newsSourceFilter]);

    return { filteredNews, loadingNews, newsSourceFilter, setNewsSourceFilter, fetchNews };
}
