import React from 'react';

const Profile = ({ isOpen, onClose, onFavoritesClick, onMyImagesClick }) => {
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
                            onClick={onMyImagesClick}
                            className="tw-w-full tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-3 tw-mb-1 tw-bg-transparent tw-border-0 tw-cursor-pointer tw-rounded-lg hover:tw-bg-gray-100 tw-transition-colors"
                        >
                            <span className="tw-text-sm tw-text-gray-700">My Images</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tw-text-gray-400">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                        <button
                            onClick={onFavoritesClick}
                            className="tw-w-full tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-3 tw-mb-1 tw-bg-transparent tw-border-0 tw-cursor-pointer tw-rounded-lg hover:tw-bg-gray-100 tw-transition-colors"
                        >
                            <span className="tw-text-sm tw-text-gray-700">Favorites</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tw-text-gray-400">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
