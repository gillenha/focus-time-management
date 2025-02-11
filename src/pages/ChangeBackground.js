import React, { useState } from 'react';
import { 
    Tree,
    Waves,
    Snowflake,
    Circle,
    Island,
    Lightning,
    Building,
    Binoculars,
    Cactus,
    Mountains,
    Sailboat
} from "@phosphor-icons/react"

const ChangeBackground = ({ onClose, theme, setTheme, isExiting, fetchBackgroundImage }) => {
    const [selectedTheme, setSelectedTheme] = useState(theme);

    const handleThemeChange = (e) => {
        setSelectedTheme(e.target.value);
    };

    const handleApplyTheme = () => {
        setTheme(selectedTheme);
        localStorage.setItem('unsplashTheme', selectedTheme);
        fetchBackgroundImage(selectedTheme, true);
        onClose();
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
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
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
                            {/* Apply Button */}
                            <button
                                onClick={handleApplyTheme}
                                className={`primary-button tw-w-full tw-mx-auto tw-mb-4 ${selectedTheme === theme ? 'disabled' : ''}`}
                                disabled={selectedTheme === theme}
                            >
                                {selectedTheme === theme ? 'Current Theme' : 'Apply Theme'}
                            </button>
                            {/* Replace select with grid */}
                            <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-cursor-pointer">
                                {[
                                    { 
                                        value: "scenic landscape nature", 
                                        label: "Nature",
                                        icon: <Tree size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "dramatic ocean waves", 
                                        label: "Ocean",
                                        icon: <Waves size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "snowy mountain landscape", 
                                        label: "Winter",
                                        icon: <Snowflake size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "traditional japanese temple", 
                                        label: "Japan",
                                        icon: <Circle size={32} weight="thin" className="tw-mb-2" />    
                                    },
                                    { 
                                        value: "tropical paradise beach", 
                                        label: "Beach",
                                        icon: <Island size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "northern lights", 
                                        label: "Aurora",
                                        icon: <Lightning size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "ancient forest sunrise", 
                                        label: "Forest",
                                        icon: <Tree size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "cityscape at night", 
                                        label: "City",
                                        icon: <Building size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "volcano eruption landscape", 
                                        label: "Volcano",
                                        icon: <Binoculars size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "desert landscape", 
                                        label: "Desert",
                                        icon: <Cactus size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "majestic mountain landscape", 
                                        label: "Mountains",
                                        icon: <Mountains size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    { 
                                        value: "serene lake reflection", 
                                        label: "Lakes",
                                        icon: <Sailboat size={32} weight="thin" className="tw-mb-2" />
                                    }
                                ].map((theme) => (
                                    <button
                                        key={theme.value}
                                        onClick={() => handleThemeChange({ target: { value: theme.value }})}
                                        className={`
                                            tw-p-4 tw-rounded-lg tw-text-center tw-transition-all
                                            tw-border tw-border-gray-200
                                            hover:tw-border-gray-300 hover:tw-shadow-md
                                            tw-flex tw-flex-col tw-items-center tw-justify-center
                                            tw-cursor-pointer
                                            ${selectedTheme === theme.value 
                                                ? 'tw-bg-gray-800 tw-text-white' 
                                                : 'tw-bg-white tw-text-gray-700 hover:tw-bg-gray-50'}
                                        `}
                                    >
                                        {theme.icon}
                                        {theme.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangeBackground;
