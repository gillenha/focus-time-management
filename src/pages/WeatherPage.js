import React, { useState } from 'react';
import { fetchWeatherByZip, getWeatherIconKey } from '../services/weatherService';
import { PencilSimple } from '@phosphor-icons/react';

const WeatherPage = ({
  onClose,
  isExiting,
  zipCode,
  unit,
  onSetZip,
  onClearZip,
  onSetUnit,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateAndFetch = async (zip) => {
    if (!/^\d{5}$/.test(zip)) {
      setError('Please enter a valid 5-digit US zip code.');
      return false;
    }
    setError('');
    setIsLoading(true);
    try {
      const data = await fetchWeatherByZip(zip, unit);
      const iconKey = getWeatherIconKey(data.weather[0].id);
      onSetZip(zip, { city: data.name, temp: data.main.temp, iconKey });
      return true;
    } catch (err) {
      setError(err.message || 'Could not fetch weather for that zip code.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    const ok = await validateAndFetch(inputValue.trim());
    if (ok) setInputValue('');
  };

  const handleEditSave = async () => {
    const ok = await validateAndFetch(editValue.trim());
    if (ok) setIsEditing(false);
  };

  const handleUnitToggle = (newUnit) => {
    if (newUnit !== unit) onSetUnit(newUnit);
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
                >
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
                  className={`tw-px-4 tw-py-1.5 tw-text-sm tw-font-medium tw-border-0 tw-cursor-pointer tw-transition-colors ${
                    unit === 'F'
                      ? 'tw-bg-gray-800 tw-text-white'
                      : 'tw-bg-white tw-text-gray-600 hover:tw-bg-gray-50'
                  }`}
                >
                  °F
                </button>
                <button
                  onClick={() => handleUnitToggle('C')}
                  className={`tw-px-4 tw-py-1.5 tw-text-sm tw-font-medium tw-border-0 tw-cursor-pointer tw-transition-colors tw-border-l tw-border-gray-200 ${
                    unit === 'C'
                      ? 'tw-bg-gray-800 tw-text-white'
                      : 'tw-bg-white tw-text-gray-600 hover:tw-bg-gray-50'
                  }`}
                >
                  °C
                </button>
              </div>
            </div>

            {/* Zip code section */}
            <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-space-y-3">
              <h3 className="tw-text-sm tw-font-semibold tw-text-gray-700">Location (US Zip Code)</h3>

              {!zipCode ? (
                <div className="tw-flex tw-gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g. 10001"
                    maxLength={5}
                    className="tw-flex-1 tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-text-gray-800 tw-outline-none focus:tw-border-gray-500"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={isLoading || !inputValue.trim()}
                    className="tw-px-4 tw-py-2 tw-bg-gray-800 tw-text-white tw-text-sm tw-font-semibold tw-rounded-lg tw-border-0 tw-cursor-pointer hover:tw-bg-gray-700 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                  >
                    {isLoading ? '...' : 'Add'}
                  </button>
                </div>
              ) : (
                <>
                  {isEditing ? (
                    <div className="tw-flex tw-gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                        maxLength={5}
                        autoFocus
                        className="tw-flex-1 tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-text-gray-800 tw-outline-none focus:tw-border-gray-500"
                      />
                      <button
                        onClick={handleEditSave}
                        disabled={isLoading || !editValue.trim()}
                        className="tw-px-4 tw-py-2 tw-bg-gray-800 tw-text-white tw-text-sm tw-font-semibold tw-rounded-lg tw-border-0 tw-cursor-pointer hover:tw-bg-gray-700 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                      >
                        {isLoading ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setIsEditing(false); setError(''); }}
                        className="tw-px-3 tw-py-2 tw-bg-transparent tw-text-gray-500 tw-text-sm tw-rounded-lg tw-border tw-border-gray-300 tw-cursor-pointer hover:tw-bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="tw-flex tw-items-center tw-justify-between tw-py-2 tw-px-3 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200">
                      <span className="tw-text-sm tw-text-gray-800 tw-font-medium">{zipCode}</span>
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <button
                          onClick={() => { setEditValue(zipCode); setIsEditing(true); }}
                          className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-text-gray-400 hover:tw-text-gray-600 tw-p-1"
                          title="Edit zip code"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          onClick={onClearZip}
                          className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-text-gray-400 hover:tw-text-red-500 tw-p-1 tw-text-base"
                          title="Remove zip code"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
