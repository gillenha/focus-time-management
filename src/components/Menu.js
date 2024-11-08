import React from 'react';

function Menu({ isOpen, onClose, onShowHistory }) {
  return (
    <>
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
          isOpen ? 'tw-translate-x-0' : '-tw-translate-x-full'
        }`}
      >
        <div className="tw-p-4">
          <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
            <p className="tw-text-xl tw-font-bold tw-text-gray-800">Focus App</p>
            <button 
              onClick={onClose}
              className="tw-text-gray-500 hover:tw-text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Account Section */}
          <div className="tw-mb-6">
            <p className="tw-text-xs tw-text-left tw-text-gray-500 tw-mb-2">ACCOUNT</p>
            <ul className="tw-list-none tw-p-0 tw-m-0">
              <li>
                <a 
                  href="#" 
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-3 tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <span>Profile</span>
                  <span className="tw-text-gray-400">👤</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Divider */}
          <hr className="tw-border-gray-200 tw-my-4" />

          {/* Personalize Section */}
          <div className="tw-mb-6">
            <p className="tw-text-xs tw-text-left tw-text-gray-500 tw-mb-2">PERSONALIZE</p>
            <ul className="tw-list-none tw-p-0 tw-m-0">
              <li>
                <a 
                  href="#" 
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-3 tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowHistory();
                    onClose();
                  }}
                >
                  <span>Session History</span>
                  <span className="tw-text-gray-400">📊</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default Menu; 