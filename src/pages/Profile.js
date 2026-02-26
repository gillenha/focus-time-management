import React, { useState, useEffect, useRef } from 'react';
import { authFetch, getAuthToken } from '../utils/api';
import { fetchFavorites, addFavorite, deleteFavorite } from '../services/favoritesService';

const Profile = ({ isOpen, onClose }) => {
    const [currentView, setCurrentView] = useState('menu');
    // My Images state
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    // Favorites state
    const [favorites, setFavorites] = useState([]);
    const [favoriteUrl, setFavoriteUrl] = useState('');
    const [favoriteTitle, setFavoriteTitle] = useState('');
    const [addingFavorite, setAddingFavorite] = useState(false);
    const [favoriteError, setFavoriteError] = useState('');
    const [validatingUrl, setValidatingUrl] = useState(false);

    const fetchImages = async () => {
        try {
            const response = await authFetch(`${process.env.REACT_APP_API_URL}/api/files/list-images`);
            if (!response.ok) throw new Error('Failed to fetch images');
            const data = await response.json();
            setImages(data.items || []);
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    };

    const loadFavorites = async () => {
        try {
            const data = await fetchFavorites();
            setFavorites(data);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchImages();
            loadFavorites();
        }
    }, [isOpen]);

    // Reset to menu when drawer closes
    useEffect(() => {
        if (!isOpen) {
            setCurrentView('menu');
            setFavoriteUrl('');
            setFavoriteTitle('');
            setFavoriteError('');
        }
    }, [isOpen]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    setUploadProgress(Math.round((event.loaded / event.total) * 100));
                }
            });

            await new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };
                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.open('POST', `${process.env.REACT_APP_API_URL}/api/files/upload-image`);
                const token = getAuthToken();
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
                xhr.send(formData);
            });

            await fetchImages();
        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (filename) => {
        try {
            const encodedPath = filename.split('/').map(encodeURIComponent).join('/');
            const response = await authFetch(`${process.env.REACT_APP_API_URL}/api/files/${encodedPath}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete image');
            setImages(prev => prev.filter(img => img.name !== filename));
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const testImageLoad = (url) => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            setTimeout(() => resolve(false), 5000);
        });
    };

    const cleanUrl = (url) => {
        return url
            .trim()
            .replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F\u00A0\u2028\u2029]/g, '');
    };

    const handleAddFavorite = async () => {
        const url = cleanUrl(favoriteUrl);
        if (!url) {
            setFavoriteError('Please enter an image URL');
            return;
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            setFavoriteError('Please enter a valid URL starting with http:// or https://');
            return;
        }

        setFavoriteError('');
        setValidatingUrl(true);

        const isImage = await testImageLoad(url);
        setValidatingUrl(false);

        if (!isImage) {
            setFavoriteError('URL does not point to a valid image, or the image failed to load');
            return;
        }

        setAddingFavorite(true);
        try {
            const title = favoriteTitle.trim() || parsedUrl.hostname;
            const saved = await addFavorite({
                title,
                imageUrl: url,
                source: 'custom',
            });
            setFavorites(prev => [saved, ...prev]);
            setFavoriteUrl('');
            setFavoriteTitle('');
            setFavoriteError('');
        } catch (error) {
            console.error('Error adding favorite:', error);
            setFavoriteError('Failed to save favorite');
        } finally {
            setAddingFavorite(false);
        }
    };

    const handleDeleteFavorite = async (id) => {
        try {
            await deleteFavorite(id);
            setFavorites(prev => prev.filter(f => f._id !== id));
        } catch (error) {
            console.error('Error deleting favorite:', error);
        }
    };

    const BackArrow = ({ onClick }) => (
        <button
            onClick={onClick}
            className="tw-text-gray-500 hover:tw-text-gray-700 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-outline-none tw-appearance-none tw-p-0 tw-mr-3"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
        </button>
    );

    const renderMenu = () => (
        <>
            <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
                <p className="tw-text-xl tw-font-bold tw-text-gray-800">Profile Settings</p>
                <button
                    onClick={onClose}
                    className="tw-text-gray-500 hover:tw-text-gray-700 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-outline-none tw-appearance-none tw-text-2xl tw-font-bold"
                >
                    ✕
                </button>
            </div>

            <div className="tw-flex-1">
                <p className="tw-text-xs tw-text-left tw-text-gray-500 tw-mb-2">PERSONALIZE</p>
                <button
                    onClick={() => setCurrentView('my-images')}
                    className="tw-w-full tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-3 tw-mb-1 tw-bg-transparent tw-border-0 tw-cursor-pointer tw-rounded-lg hover:tw-bg-gray-100 tw-transition-colors"
                >
                    <span className="tw-text-sm tw-text-gray-700">My Images</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tw-text-gray-400">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentView('favorites')}
                    className="tw-w-full tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-3 tw-mb-1 tw-bg-transparent tw-border-0 tw-cursor-pointer tw-rounded-lg hover:tw-bg-gray-100 tw-transition-colors"
                >
                    <span className="tw-text-sm tw-text-gray-700">Favorites</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tw-text-gray-400">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>
        </>
    );

    const renderMyImages = () => (
        <>
            <div className="tw-flex tw-items-center tw-mb-6">
                <BackArrow onClick={() => setCurrentView('menu')} />
                <p className="tw-text-xl tw-font-bold tw-text-gray-800">My Images</p>
            </div>

            <div className="tw-flex-1 tw-overflow-y-auto">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="tw-w-full tw-py-2 tw-px-3 tw-mb-3 tw-bg-gray-800 tw-text-white tw-rounded-lg tw-border-0 tw-cursor-pointer tw-text-sm tw-font-semibold hover:tw-bg-gray-700 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                >
                    {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Image'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="tw-hidden"
                />

                <ul className="tw-list-none tw-p-0 tw-m-0">
                    {images.map((image) => (
                        <li key={image.name} className="tw-flex tw-items-center tw-gap-2 tw-py-2 tw-border-b tw-border-gray-100">
                            <img
                                src={image.url}
                                alt={image.name.split('/').pop()}
                                className="tw-w-10 tw-h-10 tw-object-cover tw-rounded tw-flex-shrink-0"
                            />
                            <span className="tw-text-xs tw-text-gray-700 tw-flex-1 tw-truncate">
                                {image.name.split('/').pop()}
                            </span>
                            <button
                                onClick={() => handleDelete(image.name)}
                                className="tw-text-gray-400 hover:tw-text-red-500 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-text-lg tw-flex-shrink-0"
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>

                {images.length === 0 && !uploading && (
                    <p className="tw-text-center tw-text-gray-400 tw-text-sm tw-py-4">No images uploaded yet</p>
                )}
            </div>
        </>
    );

    const renderFavorites = () => (
        <>
            <div className="tw-flex tw-items-center tw-mb-6">
                <BackArrow onClick={() => setCurrentView('menu')} />
                <p className="tw-text-xl tw-font-bold tw-text-gray-800">Favorites</p>
            </div>

            <div className="tw-flex-1 tw-overflow-y-auto">
                {/* Add Favorite Form */}
                <div className="tw-mb-4">
                    <input
                        type="text"
                        value={favoriteTitle}
                        onChange={(e) => setFavoriteTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="tw-w-full tw-py-2 tw-px-3 tw-mb-2 tw-border tw-border-gray-200 tw-rounded-lg tw-text-sm tw-outline-none focus:tw-border-gray-400"
                    />
                    <input
                        type="text"
                        value={favoriteUrl}
                        onChange={(e) => {
                            setFavoriteUrl(e.target.value);
                            setFavoriteError('');
                        }}
                        placeholder="Image URL (https://...)"
                        className="tw-w-full tw-py-2 tw-px-3 tw-mb-2 tw-border tw-border-gray-200 tw-rounded-lg tw-text-sm tw-outline-none focus:tw-border-gray-400"
                    />
                    {favoriteError && (
                        <p className="tw-text-red-500 tw-text-xs tw-mb-2">{favoriteError}</p>
                    )}
                    <button
                        onClick={handleAddFavorite}
                        disabled={addingFavorite || validatingUrl}
                        className="tw-w-full tw-py-2 tw-px-3 tw-bg-gray-800 tw-text-white tw-rounded-lg tw-border-0 tw-cursor-pointer tw-text-sm tw-font-semibold hover:tw-bg-gray-700 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                    >
                        {validatingUrl ? 'Checking image...' : addingFavorite ? 'Adding...' : 'Add Image'}
                    </button>
                </div>

                {/* Favorites List */}
                <ul className="tw-list-none tw-p-0 tw-m-0">
                    {favorites.map((favorite) => (
                        <li key={favorite._id} className="tw-flex tw-items-center tw-gap-2 tw-py-2 tw-border-b tw-border-gray-100">
                            <img
                                src={favorite.imageUrl}
                                alt={favorite.title}
                                className="tw-w-10 tw-h-10 tw-object-cover tw-rounded tw-flex-shrink-0"
                                onError={(e) => {
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIyMCIgeT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5QjlCQTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCI+PzwvdGV4dD48L3N2Zz4=';
                                }}
                            />
                            <span className="tw-text-xs tw-text-gray-700 tw-flex-1 tw-truncate">
                                {favorite.title}
                            </span>
                            <button
                                onClick={() => handleDeleteFavorite(favorite._id)}
                                className="tw-text-gray-400 hover:tw-text-red-500 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-text-lg tw-flex-shrink-0"
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>

                {favorites.length === 0 && (
                    <p className="tw-text-center tw-text-gray-400 tw-text-sm tw-py-4">No favorite images yet</p>
                )}
            </div>
        </>
    );

    return (
        <div className={`menu ${isOpen ? 'open' : ''}`} style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
            {/* Overlay */}
            <div
                className={`tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-transition-opacity tw-z-50 ${
                    isOpen ? 'tw-opacity-100' : 'tw-opacity-0 tw-pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`tw-fixed tw-top-0 tw-left-0 tw-h-full tw-w-64 tw-bg-white tw-shadow-lg tw-transform tw-transition-transform tw-z-50 tw-rounded-r-xl ${
                    isOpen ? 'tw-translate-x-0' : '-tw-translate-x-full tw-pointer-events-none'
                }`}
            >
                <div className="tw-p-4 tw-h-full tw-flex tw-flex-col">
                    {currentView === 'menu' && renderMenu()}
                    {currentView === 'my-images' && renderMyImages()}
                    {currentView === 'favorites' && renderFavorites()}
                </div>
            </div>
        </div>
    );
};

export default Profile;
