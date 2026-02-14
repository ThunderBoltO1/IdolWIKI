import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../lib/audit';

export function PageViewLogger() {
    const location = useLocation();
    const { user } = useAuth();
    const lastPathRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Prevent duplicate logs for the same path in rapid succession (e.g. strict mode double invoke)
        if (lastPathRef.current === location.pathname + location.search) return;
        lastPathRef.current = location.pathname + location.search;

        const logView = async () => {
            try {
                // Determine page context for better logging
                let pageType = 'page';
                let pageName = location.pathname;

                if (location.pathname.startsWith('/group/')) {
                    pageType = 'group_view';
                    pageName = decodeURIComponent(location.pathname.split('/group/')[1]);
                } else if (location.pathname.startsWith('/idol/')) {
                    pageType = 'idol_view';
                } else if (location.pathname.startsWith('/company/')) {
                    pageType = 'company_view';
                    pageName = decodeURIComponent(location.pathname.split('/company/')[1]);
                }

                await logAudit({
                    action: 'view',
                    targetType: pageType,
                    targetId: pageName,
                    user: user,
                    details: {
                        path: location.pathname,
                        search: location.search,
                        fullUrl: window.location.href
                    }
                });
            } catch (error) {
                console.error("Failed to log page view:", error);
            }
        };

        logView();

    }, [location.pathname, location.search, user]);

    return null;
}
