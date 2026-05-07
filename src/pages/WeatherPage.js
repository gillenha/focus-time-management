import React, { useState, useEffect, useRef } from 'react';
import { fetchWeather, searchLocations, getWeatherIconKey } from '../services/weatherService';
import { PencilSimple } from '@phosphor-icons/react';

const WeatherPage = ({
  onClose,
  isExiting,
  location,
  unit,
  onSetLocation,
  onClearLocation,
  onSetUnit,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editSuggestions, setEditSuggestions] = useState([]);
  const [isEditSearching, setIsEditSearching] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  const editDebounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const editDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSuggestions([]);
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target)) setEditSuggestions([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runSearch = (value, setSuggs, setSearching, debounceRefLocal) => {
    clearTimeout(debounceRefLocal.current);
    if (!value.trim()) { setSuggs([]); return; }
    debounceRefLocal.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchLocations(value);
        setSuggs(results);
      } catch {
        setSuggs([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setError('');
    runSearch(e.target.value, setSuggestions, setIsSearching, debounceRef);
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
    setError('');
    runSearch(e.target.value, setEditSuggestions, setIsEditSearching, editDebounceRef);
  };

  const selectSuggestion = async (suggestion) => {
    setSuggestions([]);
    setInputValue('');
    setError('');
    setIsLoading(true);
    try {
      const data = await fetchWeather(suggestion.lat, suggestion.lon, unit);
      const iconKey = getWeatherIconKey(data.weather[0].id);
      onSetLocation(suggestion, { city: data.name, temp: data.main.temp, iconKey });
    } catch (err) {
      setError(err.message || 'Could not fetch weather for that location.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectEditSuggestion = async (suggestion) => {
    setEditSuggestions([]);
    setEditValue('');
    setError('');
    setIsLoading(true);
    try {
      const data = await fetchWeather(suggestion.lat, suggestion.lon, unit);
      const iconKey = getWeatherIconKey(data.weather[0].id);
      onSetLocation(suggestion, { city: data.name, temp: data.main.temp, iconKey });
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Could not fetch weather for that location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitToggle = (newUnit) => {
    if (newUnit !== unit) onSetUnit(newUnit);
  };

  const SuggestionDropdown = ({ items, onSelect, isSearching: searching, dropRef }) => {
    if (!items.length && !searching) return null;
    return (
      <div
        ref={dropRef}
        className="tw-absolute tw-left-0 tw-right-0 tw-top-full tw-mt-1 tw-bg-white tw-border tw-border-gray-200 tw-rounded-lg tw-shadow-lg tw-z-10 tw-overflow-hidden"
      >
        {searching ? (
          <div className="tw-px-3 tw-py-2 tw-text-sm tw-text-gray-400">Searching...</div>
        ) : (
          items.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => onSelect(s)}
              className="tw-w-full tw-text-left tw-px-3 tw-py-2 tw-text-sm tw-text-gray-800 hover:tw-bg-gray-50 tw-border-0 tw-bg-transparent tw-cursor-pointer tw-border-b tw-border-gray-100 last:tw-border-b-0"
            >
              {s.display}
            </button>
          ))
        )}
      </div>
    );
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

            {/* Location section */}
            <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-space-y-3">
              <h3 className="tw-text-sm tw-font-semibold tw-text-gray-700">Location</h3>

              {!location ? (
                <div className="tw-relative" ref={dropdownRef}>
                  <div className="tw-flex tw-gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      placeholder="Search city..."
                      className="tw-flex-1 tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-text-gray-800 tw-outline-none focus:tw-border-gray-500"
                    />
                    {isLoading && (
                      <div className="tw-flex tw-items-center tw-px-3 tw-text-gray-400 tw-text-sm">...</div>
                    )}
                  </div>
                  <SuggestionDropdown
                    items={suggestions}
                    onSelect={selectSuggestion}
                    isSearching={isSearching}
                    dropRef={null}
                  />
                </div>
              ) : (
                <>
                  {isEditing ? (
                    <div className="tw-relative" ref={editDropdownRef}>
                      <div className="tw-flex tw-gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleEditChange}
                          placeholder="Search city..."
                          autoFocus
                          className="tw-flex-1 tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-text-gray-800 tw-outline-none focus:tw-border-gray-500"
                        />
                        <button
                          onClick={() => { setIsEditing(false); setEditSuggestions([]); setError(''); }}
                          className="tw-px-3 tw-py-2 tw-bg-transparent tw-text-gray-500 tw-text-sm tw-rounded-lg tw-border tw-border-gray-300 tw-cursor-pointer hover:tw-bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                      <SuggestionDropdown
                        items={editSuggestions}
                        onSelect={selectEditSuggestion}
                        isSearching={isEditSearching}
                        dropRef={null}
                      />
                    </div>
                  ) : (
                    <div className="tw-flex tw-items-center tw-justify-between tw-py-2 tw-px-3 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200">
                      <span className="tw-text-sm tw-text-gray-800 tw-font-medium">{location.display}</span>
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <button
                          onClick={() => { setEditValue(''); setIsEditing(true); }}
                          className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-text-gray-400 hover:tw-text-gray-600 tw-p-1"
                          title="Edit location"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          onClick={onClearLocation}
                          className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-text-gray-400 hover:tw-text-red-500 tw-p-1 tw-text-base"
                          title="Remove location"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && <p className="tw-text-red-500 tw-text-xs">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherPage;
