import React, { useState, useEffect } from 'react';
import { fetchFavorites, addFavorite, deleteFavorite, updateFavorite } from '../services/favoritesService';
import { DeleteDialog } from '../components/shared';

const FavoritesPage = ({ onClose, isExiting }) => {
    const [favorites, setFavorites] = useState([]);
    const [favoriteUrl, setFavoriteUrl] = useState('');
    const [favoriteTitle, setFavoriteTitle] = useState('');
    const [addingFavorite, setAddingFavorite] = useState(false);
    const [validatingUrl, setValidatingUrl] = useState(false);
    const [favoriteError, setFavoriteError] = useState('');
    const [toggleError, setToggleError] = useState('');
    const [favoriteToDelete, setFavoriteToDelete] = useState(null);

    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const data = await fetchFavorites();
                setFavorites(data);
            } catch (error) {
                console.error('Error loading favorites:', error);
            }
        };
        loadFavorites();
    }, []);

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

    const handleToggleOne = async (favorite) => {
        const newEnabled = !favorite.enabled;
        setToggleError('');

        if (!newEnabled) {
            const enabledCount = favorites.filter(f => f.enabled).length;
            if (enabledCount <= 1) {
                setToggleError('At least one favorite must be enabled.');
                setTimeout(() => setToggleError(''), 2500);
                return;
            }
        }

        try {
            const updated = await updateFavorite(favorite._id, { enabled: newEnabled });
            setFavorites(prev => prev.map(f => f._id === favorite._id ? updated : f));
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    };

    const handleMasterToggle = async () => {
        if (favorites.length === 0) return;
        const allEnabled = favorites.every(f => f.enabled);

        try {
            if (allEnabled) {
                // Turn all off except the most recently added (favorites are sorted createdAt desc)
                const keepOnId = favorites[0]._id;
                const toUpdate = favorites.filter(f => f._id !== keepOnId && f.enabled);
                await Promise.all(toUpdate.map(f => updateFavorite(f._id, { enabled: false })));
                setFavorites(prev => prev.map(f => ({ ...f, enabled: f._id === keepOnId })));
            } else {
                const toUpdate = favorites.filter(f => !f.enabled);
                await Promise.all(toUpdate.map(f => updateFavorite(f._id, { enabled: true })));
                setFavorites(prev => prev.map(f => ({ ...f, enabled: true })));
            }
        } catch (error) {
            console.error('Error applying master toggle:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            const deleted = favorites.find(f => f._id === id);
            await deleteFavorite(id);
            let remaining = favorites.filter(f => f._id !== id);

            if (deleted?.enabled && remaining.length > 0 && !remaining.some(f => f.enabled)) {
                const mostRecent = remaining[0];
                const updated = await updateFavorite(mostRecent._id, { enabled: true });
                remaining = remaining.map(f => f._id === mostRecent._id ? updated : f);
            }

            setFavorites(remaining);
        } catch (error) {
            console.error('Error deleting favorite:', error);
        }
    };

    const allEnabled = favorites.length > 0 && favorites.every(f => f.enabled);
    const enabledCount = favorites.filter(f => f.enabled).length;

    const Toggle = ({ checked, onClick, disabled, ariaLabel }) => (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={onClick}
            disabled={disabled}
            className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-items-center tw-rounded-full tw-transition-colors tw-border-0 tw-cursor-pointer tw-p-0 ${checked ? 'tw-bg-gray-800' : 'tw-bg-gray-300'} ${disabled ? 'tw-opacity-50 tw-cursor-not-allowed' : ''}`}
        >
            <span
                className={`tw-inline-block tw-h-4 tw-w-4 tw-transform tw-rounded-full tw-bg-white tw-transition-transform ${checked ? 'tw-translate-x-6' : 'tw-translate-x-1'}`}
            />
        </button>
    );

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-white tw-z-50 ${isExiting ? 'slide-out' : 'slide-in'}`}>
            <div className="tw-h-full tw-overflow-y-auto">
                <div className="tw-p-3 sm:tw-p-6">
                    {/* Header */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
                        <div className="tw-flex tw-items-center">
                            <button
                                onClick={onClose}
                                className="tw-appearance-none tw-bg-transparent tw-border-none tw-p-0 tw-m-0 tw-mr-4 tw-text-gray-500 tw-cursor-pointer"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="tw-w-6 tw-h-6"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Favorites</h2>
                        </div>
                    </div>

                    <div className="tw-max-w-5xl tw-mx-auto tw-space-y-6">
                        {/* Add favorite form */}
                        <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-space-y-2">
                            <h3 className="tw-text-sm tw-font-semibold tw-text-gray-700 tw-mb-2">Add a favorite image</h3>
                            <input
                                type="text"
                                value={favoriteTitle}
                                onChange={(e) => setFavoriteTitle(e.target.value)}
                                placeholder="Title (optional)"
                                className="tw-w-full tw-py-2 tw-px-3 tw-border tw-border-gray-200 tw-rounded-lg tw-text-sm tw-outline-none focus:tw-border-gray-400"
                            />
                            <input
                                type="text"
                                value={favoriteUrl}
                                onChange={(e) => {
                                    setFavoriteUrl(e.target.value);
                                    setFavoriteError('');
                                }}
                                placeholder="Image URL (https://...)"
                                className="tw-w-full tw-py-2 tw-px-3 tw-border tw-border-gray-200 tw-rounded-lg tw-text-sm tw-outline-none focus:tw-border-gray-400"
                            />
                            {favoriteError && (
                                <p className="tw-text-red-500 tw-text-xs">{favoriteError}</p>
                            )}
                            <button
                                onClick={handleAddFavorite}
                                disabled={addingFavorite || validatingUrl}
                                className="tw-w-full tw-py-2 tw-px-3 tw-bg-gray-800 tw-text-white tw-rounded-lg tw-border-0 tw-cursor-pointer tw-text-sm tw-font-semibold hover:tw-bg-gray-700 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            >
                                {validatingUrl ? 'Checking image...' : addingFavorite ? 'Adding...' : 'Add Image'}
                            </button>
                        </div>

                        {/* Master toggle */}
                        {favorites.length > 0 && (
                            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-4 tw-bg-gray-50 tw-rounded-lg">
                                <div>
                                    <p className="tw-text-sm tw-font-semibold tw-text-gray-800">Enable all for rotation</p>
                                    <p className="tw-text-xs tw-text-gray-500">{enabledCount} of {favorites.length} enabled</p>
                                </div>
                                <Toggle
                                    checked={allEnabled}
                                    onClick={handleMasterToggle}
                                    ariaLabel="Toggle all favorites"
                                />
                            </div>
                        )}

                        {toggleError && (
                            <p className="tw-text-red-500 tw-text-xs tw-text-center">{toggleError}</p>
                        )}

                        {/* Gallery */}
                        {favorites.length === 0 ? (
                            <p className="tw-text-center tw-text-gray-400 tw-text-sm tw-py-8">No favorite images yet. Add one above.</p>
                        ) : (
                            <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-4 tw-gap-4">
                                {favorites.map((favorite) => (
                                    <div
                                        key={favorite._id}
                                        className={`tw-rounded-lg tw-overflow-hidden tw-border tw-border-gray-200 tw-bg-white tw-transition-opacity ${favorite.enabled ? '' : 'tw-opacity-50'}`}
                                    >
                                        <div className="tw-relative tw-group tw-aspect-video tw-bg-gray-100">
                                            <img
                                                src={favorite.imageUrl}
                                                alt={favorite.title}
                                                className="tw-w-full tw-h-full tw-object-cover"
                                                onError={(e) => {
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMDAiIHk9IjU1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkJyb2tlbiBJbWFnZTwvdGV4dD48L3N2Zz4=';
                                                }}
                                            />
                                            {favorite.title && (
                                                <div className="tw-absolute tw-inset-0 tw-bg-black tw-bg-opacity-60 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-flex tw-items-center tw-justify-center tw-p-3 tw-pointer-events-none">
                                                    <p className="tw-text-white tw-text-sm tw-text-center tw-break-words">{favorite.title}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="tw-flex tw-items-center tw-justify-between tw-px-3 tw-py-2 tw-border-t tw-border-gray-100">
                                            <Toggle
                                                checked={favorite.enabled}
                                                onClick={() => handleToggleOne(favorite)}
                                                ariaLabel={`Toggle ${favorite.title}`}
                                            />
                                            <button
                                                onClick={() => setFavoriteToDelete(favorite)}
                                                className="tw-text-gray-400 hover:tw-text-red-500 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-text-lg"
                                                aria-label={`Delete ${favorite.title}`}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DeleteDialog
                isOpen={favoriteToDelete !== null}
                onClose={() => setFavoriteToDelete(null)}
                onConfirm={() => {
                    if (favoriteToDelete) {
                        handleDelete(favoriteToDelete._id);
                    }
                }}
                title="Delete Favorite"
                message={
                    favoriteToDelete
                        ? `Are you sure you want to delete "${favoriteToDelete.title}"?`
                        : ''
                }
                confirmButtonText="Delete"
            />
        </div>
    );
};

export default FavoritesPage;
