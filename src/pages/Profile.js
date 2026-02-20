import React, { useState, useEffect, useRef } from 'react';
import { authFetch, getAuthToken } from '../utils/api';

const Profile = ({ isOpen, onClose }) => {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

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

    useEffect(() => {
        if (isOpen) {
            fetchImages();
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
                    {/* Header */}
                    <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
                        <p className="tw-text-xl tw-font-bold tw-text-gray-800">Profile Settings</p>
                        <button
                            onClick={onClose}
                            className="tw-text-gray-500 hover:tw-text-gray-700 tw-cursor-pointer tw-bg-transparent tw-border-0 tw-outline-none tw-appearance-none tw-text-2xl tw-font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Background Images Section */}
                    <div className="tw-flex-1 tw-overflow-y-auto">
                        <p className="tw-text-xs tw-text-left tw-text-gray-500 tw-mb-2">BACKGROUND IMAGES</p>

                        {/* Upload Button */}
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

                        {/* Image List */}
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
                </div>
            </div>
        </div>
    );
};

export default Profile;
