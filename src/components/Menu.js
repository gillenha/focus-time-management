import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Menu({ isOpen, onClose, onProfileClick, onShowHistory, onBackgroundImage, onTrackList, onQuoteList, onProjects }) {
  const { logout } = useAuth();
  return (
    <div className={`menu ${isOpen ? 'open' : ''}`}>
      {/* Overlay */}
      <div 
        className={`tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-transition-opacity tw-z-50 ${
          isOpen ? 'tw-opacity-100' : 'tw-opacity-0 tw-pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer — left side on desktop, bottom sheet on mobile */}
      <div
        className={`tw-fixed tw-bg-white tw-shadow-lg tw-transform tw-transition-transform tw-z-50
          tw-left-0 tw-bottom-0 tw-w-full tw-max-h-[85vh] tw-rounded-t-2xl
          sm:tw-top-0 sm:tw-bottom-auto sm:tw-h-full sm:tw-w-64 sm:tw-rounded-t-none sm:tw-rounded-r-xl sm:tw-max-h-none
          ${isOpen
            ? 'tw-translate-y-0 sm:tw-translate-x-0'
            : 'tw-translate-y-full sm:tw-translate-y-0 sm:-tw-translate-x-full'}
        `}
      >
        <div className="tw-p-4 tw-h-full tw-flex tw-flex-col tw-overflow-y-auto">
          {/* Grabber handle (mobile only) */}
          <div className="tw-flex tw-justify-center tw-mb-2 sm:tw-hidden">
            <div className="tw-w-10 tw-h-1 tw-bg-gray-300 tw-rounded-full" />
          </div>

          <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
            <p className="tw-text-xl tw-font-bold tw-text-gray-800">Flow State Music</p>
            <button
              onClick={onClose}
              className="tw-text-gray-500
              hover:tw-text-gray-700
              tw-cursor-pointer
              tw-bg-transparent
              tw-border-0
              tw-outline-none
              tw-appearance-none
              tw-text-2xl
              tw-font-bold
              "
            >
              ✕
            </button>
          </div>

          {/* Account Section */}
          <div className="tw-mb-6">
            <p className="tw-text-xs tw-text-left tw-text-gray-500 tw-mb-2">ACCOUNT</p>
            <ul className="tw-list-none tw-p-0 tw-m-0 sm:tw-bg-transparent tw-bg-gray-50 tw-rounded-xl sm:tw-rounded-none tw-overflow-hidden">
              <li>
                <a
                  href="#"
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-4 sm:tw-py-3 tw-px-4 sm:tw-px-0 tw-text-base sm:tw-text-sm tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={(e) => {
                    e.preventDefault();
                    onProfileClick();
                  }}
                >
                  <span>Profile</span>
                  <span className="tw-text-gray-400"></span>
                </a>
              </li>
            </ul>
          </div>

          {/* Divider */}
          <hr className="tw-border-gray-200 tw-my-4 sm:tw-block tw-hidden" />

          {/* Personalize Section */}
          <div className="tw-mb-6">
            <p className="tw-text-xs tw-text-left tw-text-gray-500 tw-mb-2">PERSONALIZE</p>
            <ul className="tw-list-none tw-p-0 tw-m-0 sm:tw-bg-transparent tw-bg-gray-50 tw-rounded-xl sm:tw-rounded-none tw-overflow-hidden tw-divide-y sm:tw-divide-y-0 tw-divide-gray-200">
              <li>
                <a
                  href="#"
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-4 sm:tw-py-3 tw-px-4 sm:tw-px-0 tw-text-base sm:tw-text-sm tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={() => {
                    onShowHistory();
                    onClose();
                  }}
                >
                  <span>Session History</span>
                  <span className="tw-text-gray-400"></span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-4 sm:tw-py-3 tw-px-4 sm:tw-px-0 tw-text-base sm:tw-text-sm tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={() => {
                    onProjects();
                    onClose();
                  }}
                >
                  <span>Projects</span>
                  <span className="tw-text-gray-400"></span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-4 sm:tw-py-3 tw-px-4 sm:tw-px-0 tw-text-base sm:tw-text-sm tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={() => {
                    onBackgroundImage();
                    onClose();
                  }}
                >
                  <span>Background Image</span>
                  <span className="tw-text-gray-400"></span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-4 sm:tw-py-3 tw-px-4 sm:tw-px-0 tw-text-base sm:tw-text-sm tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={() => {
                    onTrackList();
                    onClose();
                  }}
                >
                  <span>Track List</span>
                  <span className="tw-text-gray-400"></span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="tw-flex tw-justify-between tw-items-center tw-w-full tw-text-gray-700 tw-py-4 sm:tw-py-3 tw-px-4 sm:tw-px-0 tw-text-base sm:tw-text-sm tw-hover:bg-gray-100 tw-no-underline tw-font-semibold"
                  onClick={() => {
                    onQuoteList();
                    onClose();
                  }}
                >
                  <span>Quote List</span>
                  <span className="tw-text-gray-400"></span>
                </a>
              </li>
            </ul>
          </div>

          {/* Sign Out */}
          <div className="tw-mt-auto tw-pt-4 tw-border-t tw-border-gray-200">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="tw-w-full tw-text-left tw-text-gray-500 tw-py-3 tw-text-sm tw-font-semibold tw-bg-transparent tw-border-0 tw-cursor-pointer hover:tw-text-gray-700 tw-transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Menu; 