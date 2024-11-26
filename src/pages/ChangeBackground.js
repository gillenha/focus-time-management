import React, { useState } from 'react';

const ChangeBackground = ({ onClose, theme, setTheme, isExiting, fetchBackgroundImage }) => {
    const [selectedTheme, setSelectedTheme] = useState(theme);

    const handleThemeChange = (e) => {
        setSelectedTheme(e.target.value);
    };

    const handleApplyTheme = () => {
        setTheme(selectedTheme);
        localStorage.setItem('unsplashTheme', selectedTheme);
        fetchBackgroundImage(selectedTheme, true);
    };

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-white tw-z-50 ${isExiting ? 'slide-out' : 'slide-in'}`}>
            <div className="tw-h-full tw-overflow-y-auto">
                <div className="tw-p-6">
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
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Change Background</h2>
                        </div>
                    </div>

                    {/* Theme Selection Container */}
                    <div className="tw-max-w-md tw-mx-auto tw-space-y-6">
                        {/* Theme Dropdown Group */}
                        <div className="tw-flex tw-flex-col tw-space-y-4">
                            <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">Background Theme</h3>
                            <select
                                value={selectedTheme}
                                onChange={handleThemeChange}
                                className="tw-w-full tw-px-4 tw-py-2 tw-bg-white tw-border 
                                         tw-border-gray-300 tw-rounded-md tw-shadow-sm 
                                         tw-appearance-none tw-text-gray-700
                                         focus:tw-outline-none focus:tw-ring-2 
                                         focus:tw-ring-blue-500 focus:tw-border-blue-500 
                                         tw-cursor-pointer"
                            >
                                <option value="nature">Nature</option>
                                <option value="ocean waves">Ocean</option>
                                <option value="winter">Winter</option>
                                <option value="japan">Japan</option>
                                <option value="beach">Beach</option>
                            </select>
                        </div>

                        {/* Apply Button */}
                        <button
                            onClick={handleApplyTheme}
                            className={`tw-w-full tw-px-4 tw-py-2 tw-rounded-lg 
                                      tw-font-medium tw-transition-colors
                                      ${selectedTheme !== theme 
                                        ? 'tw-bg-gray-800 tw-text-white hover:tw-bg-gray-700' 
                                        : 'tw-bg-gray-100 tw-text-gray-400 tw-cursor-not-allowed'}`}
                            disabled={selectedTheme === theme}
                        >
                            {selectedTheme === theme ? 'Current Theme' : 'Apply Theme'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangeBackground;
