import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const DurationInput = ({ value, onChange, error }) => {
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);

    // Parse incoming value into hours, minutes, seconds
    useEffect(() => {
        if (value) {
            const parts = value.split(':').map(Number);
            let h = 0, m = 0, s = 0;
            if (parts.length === 3) {
                h = parts[0];
                m = parts[1];
                s = parts[2];
            } else if (parts.length === 2) {
                m = parts[0];
                s = parts[1];
            }
            // Normalize overflow: e.g. "264:43" → 4h 24m 43s
            if (s >= 60) {
                m += Math.floor(s / 60);
                s = s % 60;
            }
            if (m >= 60) {
                h += Math.floor(m / 60);
                m = m % 60;
            }
            setHours(h);
            setMinutes(m);
            setSeconds(s);
        }
    }, [value]);

    const handleChange = (unit, newValue) => {
        let h = hours;
        let m = minutes;
        let s = seconds;

        // Ensure value is a number and non-negative
        newValue = Math.max(0, parseInt(newValue) || 0);

        switch (unit) {
            case 'hours':
                h = newValue;
                break;
            case 'minutes':
                if (newValue >= 60) {
                    h += Math.floor(newValue / 60);
                    m = newValue % 60;
                } else {
                    m = newValue;
                }
                break;
            case 'seconds':
                if (newValue >= 60) {
                    m += Math.floor(newValue / 60);
                    s = newValue % 60;
                    if (m >= 60) {
                        h += Math.floor(m / 60);
                        m = m % 60;
                    }
                } else {
                    s = newValue;
                }
                break;
        }

        setHours(h);
        setMinutes(m);
        setSeconds(s);

        // Always format output as HH:MM:SS
        const formattedValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        onChange(formattedValue);
    };

    return (
        <div className="tw-flex tw-items-center tw-gap-2">
            <div className="tw-flex tw-flex-col">
                <input
                    type="number"
                    min="0"
                    value={hours}
                    onChange={(e) => handleChange('hours', e.target.value)}
                    className="tw-w-16 tw-p-2 tw-border tw-border-gray-300 tw-rounded"
                    placeholder="HH"
                />
                <label className="tw-text-xs tw-text-gray-500 tw-mt-1">Hours</label>
            </div>
            <span className="tw-text-xl tw-text-gray-400">:</span>
            <div className="tw-flex tw-flex-col">
                <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => handleChange('minutes', e.target.value)}
                    className="tw-w-16 tw-p-2 tw-border tw-border-gray-300 tw-rounded"
                    placeholder="MM"
                />
                <label className="tw-text-xs tw-text-gray-500 tw-mt-1">Minutes</label>
            </div>
            <span className="tw-text-xl tw-text-gray-400">:</span>
            <div className="tw-flex tw-flex-col">
                <input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => handleChange('seconds', e.target.value)}
                    className="tw-w-16 tw-p-2 tw-border tw-border-gray-300 tw-rounded"
                    placeholder="SS"
                />
                <label className="tw-text-xs tw-text-gray-500 tw-mt-1">Seconds</label>
            </div>
            {error && (
                <span className="tw-text-red-500 tw-text-sm">{error}</span>
            )}
        </div>
    );
};

DurationInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    error: PropTypes.string
};

export default DurationInput; 