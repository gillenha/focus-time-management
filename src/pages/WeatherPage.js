import React, { useState, useEffect, useRef } from 'react';
import { fetchWeather, searchLocations, getWeatherIconKey } from '../services/weatherService';
import { PencilSimple, Plus } from '@phosphor-icons/react';

const MAX_LOCATIONS = 3;

const WeatherPage = ({
  onClose,
  isExiting,
  locations,
  unit,
  onAddLocation,
  onRemoveLocation,
  onEditLocation,
  onSetUnit,
}) => {
  // activeMode: null | 'add' | number (index being edited)
  const [activeMode, setActiveMode] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openMode = (mode) => {
    setActiveMode(mode);
    setSearchInput('');
    setSuggestions([]);
    setError('');
  };

  const closeMode = () => {
    setActiveMode(null);
    setSearchInput('');
    setSuggestions([]);
    setError('');
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setError('');
    clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSuggestions(await searchLocations(value));
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = async (suggestion) => {
    setSuggestions([]);
    setError('');
    setIsLoading(true);
    try {
      const data = await fetchWeather(suggestion.lat, suggestion.lon, unit);
      const weatherData = { city: data.name, temp: data.main.temp, iconKey: getWeatherIconKey(data.weather[0].id) };
      if (activeMode === 'add') {
        onAddLocation(suggestion, weatherData);
      } else {
        onEditLocation(activeMode, suggestion, weatherData);
      }
      closeMode();
    } catch (err) {
      setError(err.message || 'Could not fetch weather for that location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitToggle = (newUnit) => {
    if (newUnit !== unit) onSetUnit(newUnit);
  };

  const SearchInput = ({ autoFocus = false }) => (
    <div className="tw-relative" ref={dropdownRef}>
      <div className="tw-flex tw-gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search city..."
          autoFocus={autoFocus}
          className="tw-flex-1 tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-text-gray-800 tw-outline-none focus:tw-border-gray-500"
        />
        <button
          onClick={closeMode}
          className="tw-px-3 tw-py-2 tw-bg-transparent tw-text-gray-500 tw-text-sm tw-rounded-lg tw-border tw-border-gray-300 tw-cursor-pointer hover:tw-bg-gray-100"
        >
          Cancel
        </button>
      </div>
      {(suggestions.length > 0 || isSearching) && (
        <div className="tw-absolute tw-left-0 tw-right-0 tw-top-full tw-mt-1 tw-bg-white tw-border tw-border-gray-200 tw-rounded-lg tw-shadow-lg tw-z-10 tw-overflow-hidden">
          {isSearching ? (
            <div className="tw-px-3 tw-py-2 tw-text-sm tw-text-gray-400">Searching...</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={() => handleSelect(s)}
                className="tw-w-full tw-text-left tw-px-3 tw-py-2 tw-text-sm tw-text-gray-800 hover:tw-bg-gray-50 tw-border-0 tw-bg-transparent tw-cursor-pointer tw-border-b tw-border-gray-100 last:tw-border-b-0"
              >
                {s.display}
              </button>
            ))
          )}
        </div>
      )}
    </div>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Weather</h2>
            </div>
          </div>

          <div className="sm:tw-max-w-md tw-mx-auto tw-space-y-6">
            {/* Temperature unit toggle */}
            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-4 tw-bg-gray-50 tw-rounded-lg">
              <p className="tw-text-sm tw-font-semibold tw-text-gray-800">Temperature Unit</p>
              <div className="tw-flex tw-rounded-lg tw-overflow-hidden tw-border tw-border-gray-200">
                <button
                  onClick={() => handleUnitToggle('F')}
                  className={`tw-px-4 tw-py-1.5 tw-text-sm tw-font-medium tw-border-0 tw-cursor-pointer tw-transition-colors ${unit === 'F' ? 'tw-bg-gray-800 tw-text-white' : 'tw-bg-white tw-text-gray-600 hover:tw-bg-gray-50'}`}
                >
                  °F
                </button>
                <button
                  onClick={() => handleUnitToggle('C')}
                  className={`tw-px-4 tw-py-1.5 tw-text-sm tw-font-medium tw-border-0 tw-cursor-pointer tw-transition-colors tw-border-l tw-border-gray-200 ${unit === 'C' ? 'tw-bg-gray-800 tw-text-white' : 'tw-bg-white tw-text-gray-600 hover:tw-bg-gray-50'}`}
                >
                  °C
                </button>
              </div>
            </div>

            {/* Locations section */}
            <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-space-y-3">
              <div className="tw-flex tw-items-center tw-justify-between">
                <h3 className="tw-text-sm tw-font-semibold tw-text-gray-700">
                  Locations <span className="tw-font-normal tw-text-gray-400">({locations.length}/{MAX_LOCATIONS})</span>
                </h3>
              </div>

              {/* Saved location rows */}
              {locations.map((loc, i) => (
                <div key={i}>
                  {activeMode === i ? (
                    <SearchInput autoFocus />
                  ) : (
                    <div className="tw-flex tw-items-center tw-justify-between tw-py-2 tw-px-3 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200">
                      <span className="tw-text-sm tw-text-gray-800 tw-font-medium">{loc.display}</span>
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <button
                          onClick={() => openMode(i)}
                          className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-text-gray-400 hover:tw-text-gray-600 tw-p-1"
                          title="Edit location"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          onClick={() => onRemoveLocation(i)}
                          className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-text-gray-400 hover:tw-text-red-500 tw-p-1 tw-text-base"
                          title="Remove location"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add location */}
              {activeMode === 'add' ? (
                <SearchInput autoFocus />
              ) : locations.length < MAX_LOCATIONS && activeMode === null && (
                <button
                  onClick={() => openMode('add')}
                  className="tw-w-full tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-bg-white tw-border tw-border-dashed tw-border-gray-300 tw-rounded-lg tw-text-sm tw-text-gray-500 hover:tw-text-gray-700 hover:tw-border-gray-400 tw-cursor-pointer tw-transition-colors"
                >
                  <Plus size={14} />
                  Add location
                </button>
              )}

              {isLoading && (
                <p className="tw-text-gray-400 tw-text-xs">Fetching weather...</p>
              )}
              {error && (
                <p className="tw-text-red-500 tw-text-xs">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherPage;
