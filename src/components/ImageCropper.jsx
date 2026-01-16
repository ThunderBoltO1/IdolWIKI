import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import getCroppedImgDataUrl from '../lib/cropImage';
import { Check, X, ZoomIn, ZoomOut, Crop as CropIcon, Loader2, Maximize, Minimize } from 'lucide-react';

export function ImageCropper({ imageSrc, onCropComplete, onCancel, aspect = 1 }) {
    const { theme } = useTheme();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [objectFit, setObjectFit] = useState('contain');
    const [cropShape, setCropShape] = useState("round"); // Default to round, can be "rect"
    const [loading, setLoading] = useState(true);
    const [image, setImage] = useState(null);
    const [error, setError] = useState(null);

    const onCropChange = useCallback((location) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((zoom) => {
        setZoom(zoom);
    }, []);

    const onCropFull = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    useEffect(() => {
        if (!imageSrc) return;
        setLoading(true);
        setError(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setImage(img.src);
            setLoading(false);
        };
        img.onerror = () => {
            setError("Could not load image. Please check the URL and ensure it allows cross-origin access (CORS).");
            setLoading(false);
        };
        img.src = imageSrc;
    }, [imageSrc]);

    const handleCrop = async () => {
        if (!croppedAreaPixels || !image) return;
        try {
            const croppedImageDataUrl = await getCroppedImgDataUrl(
                image,
                croppedAreaPixels
            );
            onCropComplete(croppedImageDataUrl);
        } catch (e) {
            console.error(e);
            setError('Could not crop image. This may be due to cross-origin security restrictions on the image host.');
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[101] flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}

                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={cn(
                        "relative w-full max-w-2xl h-[70vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col",
                        theme === 'dark' ? "bg-slate-900 border border-white/10" : "bg-white"
                    )}
                >
                    <div className={cn("p-4 border-b flex items-center justify-center", theme === 'dark' ? 'border-white/10' : 'border-slate-200')}>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <CropIcon size={14} />
                            Crop & Position Image
                        </h3>
                    </div>
                    <div className="relative flex-1 bg-black">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                            </div>
                        )}
                        {error && (
                            <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                                <p className="text-red-400 font-medium">{error}</p>
                            </div>
                        )}
                        {!loading && image && !error && (
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspect}
                                onCropChange={onCropChange}
                                onZoomChange={onZoomChange}
                                onCropComplete={onCropFull}
                            />
                        )}
                    </div>
                    <div className={cn(
                        "p-4 border-t flex items-center justify-between",
                        theme === 'dark' ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                    )}>
                        <div className="flex items-center gap-2 w-1/3">
                            <ZoomOut size={20} className="text-slate-500" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                            />
                            <ZoomIn size={20} className="text-slate-500" />
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />
                            <button
                                type="button"
                                onClick={() => setObjectFit(prev => prev === 'contain' ? 'horizontal-cover' : 'contain')}
                                className={cn("p-2 rounded-lg transition-colors", theme === 'dark' ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                                title={objectFit === 'contain' ? "Fill Frame" : "Fit Image"}
                            >
                                {objectFit === 'contain' ? <Maximize size={20} /> : <Minimize size={20} />}
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className={cn("px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors", theme === 'dark' ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                            ><X size={16} /></button>
                            <button
                                onClick={handleCrop}
                                disabled={loading || !!error}
                                className="px-6 py-2.5 rounded-xl bg-brand-pink text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-pink/90 transition-colors shadow-lg shadow-brand-pink/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            ><Check size={16} /> Apply</button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

ImageCropper.defaultProps = {
    aspect: 3 / 4,
    cropShape: "round"
};