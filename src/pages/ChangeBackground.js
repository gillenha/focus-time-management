import React, { useState, useEffect } from 'react';
import {
    Tree,
    Waves,
    Snowflake,
    Island,
    Lightning,
    Building,
    Binoculars,
    Cactus,
    Mountains,
    Sailboat,
    Leaf,
    Star,
    Image,
    Heart
} from "@phosphor-icons/react"
import { fetchFavorites } from '../services/favoritesService';

const ChangeBackground = ({ onClose, theme, setTheme, isExiting, fetchBackgroundImage }) => {
    const [selectedTheme, setSelectedTheme] = useState(theme);
    const [favorites, setFavorites] = useState([]);
    const [showFavorites, setShowFavorites] = useState(false);

    // Fetch favorites from API
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const favoritesData = await fetchFavorites();
                console.log('Loaded favorites:', favoritesData);
                setFavorites(favoritesData);
            } catch (error) {
                console.error('Error fetching favorites:', error);
            }
        };

        loadFavorites();
    }, []);

    const handleThemeChange = (e) => {
        console.log('Theme changed to:', e.target.value);
        setSelectedTheme(e.target.value);

        // Handle special cases
        if (e.target.value === 'favorites') {
            console.log('Showing favorites, count:', favorites.length);
            setShowFavorites(true);
        } else {
            setShowFavorites(false);
        }
    };

    const handleFavoriteSelect = (favorite) => {
        console.log('Selected favorite:', favorite);
        // For now, we'll store the URL in localStorage and handle it in App.js
        localStorage.setItem('customBackgroundImage', favorite.imageUrl);
        setSelectedTheme('custom-background');
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
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Change Background</h2>
                        </div>
                    </div>

                    {/* Theme Selection Container */}
                    <div className="sm:tw-max-w-md tw-mx-auto tw-space-y-6">
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
                            <div className="tw-grid tw-grid-cols-2 tw-gap-2 sm:tw-gap-4 tw-cursor-pointer">
                                {[
                                    {
                                        value: "my-images",
                                        label: "My Images",
                                        icon: <Image size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    {
                                        value: "favorites",
                                        label: "Favorites",
                                        icon: <Heart size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    {
                                        value: "landscape?featured=true&order_by=popular",
                                        label: "Featured",
                                        icon: <Star size={32} weight="thin" className="tw-mb-2" />
                                    },
                                    {
                                        value: "tranquil zen garden meditation peaceful",
                                        label: "Tranquil",
                                        icon: <Leaf size={32} weight="thin" className="tw-mb-2" />
                                    },
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
                                            tw-p-3 sm:tw-p-4 tw-rounded-lg tw-text-center tw-transition-all
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

                            {/* Favorites Display */}
                            {showFavorites && (
                                <div className="tw-mt-6 tw-space-y-4">
                                    <h4 className="tw-text-md tw-font-semibold tw-text-gray-800">Favorite Images</h4>
                                    <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-max-h-64 tw-overflow-y-auto">
                                        {favorites.map((favorite) => (
                                            <div
                                                key={favorite._id}
                                                onClick={() => handleFavoriteSelect(favorite)}
                                                className="tw-relative tw-cursor-pointer tw-group tw-rounded-lg tw-overflow-hidden tw-border tw-border-gray-200 hover:tw-border-gray-400 tw-transition-all"
                                            >
                                                <img
                                                    src={favorite.imageUrl}
                                                    alt={favorite.title}
                                                    className="tw-w-full tw-h-24 tw-object-cover tw-group-hover:tw-scale-105 tw-transition-transform"
                                                    onError={(e) => {
                                                        console.warn('Failed to load favorite image:', favorite.imageUrl);
                                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2IiBzdHJva2U9IiNEREREREQiIHN0cm9rZS13aWR0aD0iMSIvPgo8dGV4dCB4PSIxMDAiIHk9IjQ1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkJyb2tlbiBJbWFnZTwvdGV4dD4KPHR5ZXh0IHg9IjEwMCIgeT0iNjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNDQ0NDQ0MiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCI+TGluayBOb3QgRm91bmQ8L3RleHQ+Cjwvc3ZnPgo=';
                                                        e.target.parentElement.classList.add('tw-opacity-50');
                                                    }}
                                                />
                                                <div className="tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-bg-black tw-bg-opacity-50 tw-text-white tw-text-xs tw-p-2">
                                                    <p className="tw-truncate">{favorite.title}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {favorites.length === 0 && (
                                        <p className="tw-text-gray-500 tw-text-center tw-py-8">No favorite images yet. Add images via command line!</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangeBackground;
