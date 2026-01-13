import React, { createContext, useContext, useState, useEffect } from 'react';

const GoogleDriveContext = createContext();

export const useGoogleDrive = () => useContext(GoogleDriveContext);

// Google Client ID provided by user
const GOOGLE_CLIENT_ID = '378479235200-m425cc7sq5mu2vv2pu5ou7o3o7bqge1h.apps.googleusercontent.com';

export const GoogleDriveProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(null);
    const [tokenClient, setTokenClient] = useState(null);

    useEffect(() => {
        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (response) => {
                    if (response.error) {
                        console.error('GIS Error:', response.error);
                    } else {
                        setAccessToken(response.access_token);
                    }
                },
            });
            setTokenClient(client);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const connectDrive = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            alert('Google Identity Services not loaded yet.');
        }
    };

    const disconnectDrive = () => {
        setAccessToken(null);
    };

    return (
        <GoogleDriveContext.Provider value={{ accessToken, connectDrive, disconnectDrive, isConnected: !!accessToken }}>
            {children}
        </GoogleDriveContext.Provider>
    );
};
