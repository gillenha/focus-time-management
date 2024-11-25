import React from 'react';

function SessionInput({ inputValue, onInputChange, onBeginClick, fadeOut }) {
  return (
    <>
      <textarea
        value={inputValue}
        onChange={onInputChange}
        placeholder="What do you want to focus on?"
        className={`
          tw-absolute
          tw-bottom-44
          tw-left-1/2
          tw--translate-x-1/2
          tw-w-[83%]
          tw-h-32
          tw-bg-white
          tw-rounded-lg
          tw-p-4
          tw-font-sans
          tw-text-lg
          tw-text-gray-800
          tw-resize-none
          tw-outline-none
          tw-transition-all
          ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
        `}
      />

      <button
        onClick={onBeginClick}
        className={`
          tw-absolute
          tw-bottom-24
          tw-left-1/2
          tw--translate-x-1/2
          tw-w-[90%]
          tw-py-3
          tw-bg-gray-700
          tw-rounded-lg
          tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
          tw-font-sans
          tw-text-lg
          tw-text-white
          tw-cursor-pointer
          tw-border-0
          tw-transition-all
          ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
        `}
      >
        Begin Session
      </button>
    </>
  );
}

export default SessionInput; 