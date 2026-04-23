import React, { useState, useEffect, useRef } from 'react';
import { getAuthToken } from '../utils/api';
import { fetchImages, updateImagePreference, deleteImage } from '../services/imagesService';
import { DeleteDialog } from '../components/shared';

const MyImagesPage = ({ onClose, isExiting }) => {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [toggleError, setToggleError] = useState('');
    const [imageToDelete, setImageToDelete] = useState(null);
    const fileInputRef = useRef(null);

    const loadImages = async () => {
        try {
            const items = await fetchImages();
            setImages(items);
        } catch (error) {
            console.error('Error loading images:', error);
        }
    };

    useEffect(() => {
        loadImages();
    }, []);

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

            await loadImages();
        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleToggleOne = async (image) => {
        const newEnabled = !image.enabled;
        setToggleError('');

        if (!newEnabled) {
            const enabledCount = images.filter(i => i.enabled).length;
            if (enabledCount <= 1) {
                setToggleError('At least one image must be enabled.');
                setTimeout(() => setToggleError(''), 2500);
                return;
            }
        }

        try {
            await updateImagePreference(image.name, newEnabled);
            setImages(prev => prev.map(i => i.name === image.name ? { ...i, enabled: newEnabled } : i));
        } catch (error) {
            console.error('Error updating image preference:', error);
        }
    };

    const handleMasterToggle = async () => {
        if (images.length === 0) return;
        const allEnabled = images.every(i => i.enabled);

        try {
            if (allEnabled) {
                // Items are sorted createdAt desc, so images[0] is most recent.
                const keepOnName = images[0].name;
                const toUpdate = images.filter(i => i.name !== keepOnName && i.enabled);
                await Promise.all(toUpdate.map(i => updateImagePreference(i.name, false)));
                setImages(prev => prev.map(i => ({ ...i, enabled: i.name === keepOnName })));
            } else {
                const toUpdate = images.filter(i => !i.enabled);
                await Promise.all(toUpdate.map(i => updateImagePreference(i.name, true)));
                setImages(prev => prev.map(i => ({ ...i, enabled: true })));
            }
        } catch (error) {
            console.error('Error applying master toggle:', error);
        }
    };

    const handleDelete = async (name) => {
        try {
            const deleted = images.find(i => i.name === name);
            await deleteImage(name);
            let remaining = images.filter(i => i.name !== name);

            if (deleted?.enabled && remaining.length > 0 && !remaining.some(i => i.enabled)) {
                const mostRecent = remaining[0];
                await updateImagePreference(mostRecent.name, true);
                remaining = remaining.map(i => i.name === mostRecent.name ? { ...i, enabled: true } : i);
            }

            setImages(remaining);
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const allEnabled = images.length > 0 && images.every(i => i.enabled);
    const enabledCount = images.filter(i => i.enabled).length;

    const displayName = (name) => (name ? name.split('/').pop() : '');

    const Toggle = ({ checked, onClick, ariaLabel }) => (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={onClick}
            className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-items-center tw-rounded-full tw-transition-colors tw-border-0 tw-cursor-pointer tw-p-0 ${checked ? 'tw-bg-gray-800' : 'tw-bg-gray-300'}`}
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
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">My Images</h2>
                        </div>
                    </div>

                    <div className="tw-max-w-5xl tw-mx-auto tw-space-y-6">
                        {/* Upload */}
                        <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-space-y-2">
                            <h3 className="tw-text-sm tw-font-semibold tw-text-gray-700 tw-mb-2">Upload an image</h3>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="tw-w-full tw-py-2 tw-px-3 tw-bg-gray-800 tw-text-white tw-rounded-lg tw-border-0 tw-cursor-pointer tw-text-sm tw-font-semibold hover:tw-bg-gray-700 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
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
                        </div>

                        {/* Master toggle */}
                        {images.length > 0 && (
                            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-4 tw-bg-gray-50 tw-rounded-lg">
                                <div>
                                    <p className="tw-text-sm tw-font-semibold tw-text-gray-800">Enable all for rotation</p>
                                    <p className="tw-text-xs tw-text-gray-500">{enabledCount} of {images.length} enabled</p>
                                </div>
                                <Toggle
                                    checked={allEnabled}
                                    onClick={handleMasterToggle}
                                    ariaLabel="Toggle all images"
                                />
                            </div>
                        )}

                        {toggleError && (
                            <p className="tw-text-red-500 tw-text-xs tw-text-center">{toggleError}</p>
                        )}

                        {/* Gallery */}
                        {images.length === 0 ? (
                            <p className="tw-text-center tw-text-gray-400 tw-text-sm tw-py-8">No images uploaded yet. Upload one above.</p>
                        ) : (
                            <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-4 tw-gap-4">
                                {images.map((image) => (
                                    <div
                                        key={image.name}
                                        className={`tw-rounded-lg tw-overflow-hidden tw-border tw-border-gray-200 tw-bg-white tw-transition-opacity ${image.enabled ? '' : 'tw-opacity-50'}`}
                                    >
                                        <div className="tw-relative tw-group tw-aspect-video tw-bg-gray-100">
                                            <img
                                                src={image.url}
                                                alt={displayName(image.name)}
                                                className="tw-w-full tw-h-full tw-object-cover"
                                                onError={(e) => {
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMDAiIHk9IjU1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkJyb2tlbiBJbWFnZTwvdGV4dD48L3N2Zz4=';
                                                }}
                                            />
                                            <div className="tw-absolute tw-inset-0 tw-bg-black tw-bg-opacity-60 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-flex tw-items-center tw-justify-center tw-p-3 tw-pointer-events-none">
                                                <p className="tw-text-white tw-text-sm tw-text-center tw-break-words">{displayName(image.name)}</p>
                                            </div>
                                        </div>
                                        <div className="tw-flex tw-items-center tw-justify-between tw-px-3 tw-py-2 tw-border-t tw-border-gray-100">
                                            <Toggle
                                                checked={image.enabled}
                                                onClick={() => handleToggleOne(image)}
                                                ariaLabel={`Toggle ${displayName(image.name)}`}
                                            />
                                            <button
                                                onClick={() => setImageToDelete(image)}
                                                className="tw-text-gray-400 hover:tw-text-red-500 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-text-lg"
                                                aria-label={`Delete ${displayName(image.name)}`}
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
                isOpen={imageToDelete !== null}
                onClose={() => setImageToDelete(null)}
                onConfirm={() => {
                    if (imageToDelete) {
                        handleDelete(imageToDelete.name);
                    }
                }}
                title="Delete Image"
                message={
                    imageToDelete
                        ? `Are you sure you want to delete "${displayName(imageToDelete.name)}"?`
                        : ''
                }
                confirmButtonText="Delete"
            />
        </div>
    );
};

export default MyImagesPage;
