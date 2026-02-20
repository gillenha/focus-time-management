import React, { useState } from 'react';

const CustomDropdown = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(o => o.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          tw-w-full tw-bg-gray-300 tw-rounded-lg tw-p-3 sm:tw-p-2
          tw-font-sans tw-text-base sm:tw-text-xs tw-text-gray-800
          tw-border tw-border-gray-300 tw-outline-none
          tw-text-left tw-cursor-pointer
          tw-flex tw-items-center tw-justify-between
        "
      >
        <span className={!value ? 'tw-text-gray-500' : ''}>{displayText}</span>
        <svg className="tw-w-4 tw-h-4 tw-text-gray-500 tw-flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-items-end sm:tw-items-center tw-justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div className="tw-absolute tw-inset-0 tw-bg-black/30" />
          <div
            className="tw-relative tw-w-full sm:tw-max-w-sm tw-bg-white tw-rounded-t-2xl sm:tw-rounded-xl tw-shadow-xl tw-max-h-[60vh] tw-overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-p-4 tw-border-b tw-border-gray-100">
              <p className="tw-text-sm tw-font-semibold tw-text-gray-800 tw-m-0">{placeholder}</p>
            </div>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                disabled={option.disabled}
                className={`
                  tw-w-full tw-text-left tw-px-4 tw-py-3
                  tw-border-0 tw-border-b tw-border-gray-50
                  tw-bg-transparent tw-font-sans tw-text-base tw-cursor-pointer
                  hover:tw-bg-gray-50
                  ${value === option.value ? 'tw-font-semibold tw-text-gray-900 tw-bg-gray-50' : 'tw-text-gray-700'}
                  ${option.disabled ? 'tw-text-gray-400 tw-cursor-not-allowed' : ''}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default CustomDropdown;
