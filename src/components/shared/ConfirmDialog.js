import React from 'react';
import PropTypes from 'prop-types';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'danger-button';
      case 'primary':
        return 'primary-button';
      case 'secondary':
        return 'secondary-button';
      default:
        return 'primary-button';
    }
  };

  return (
    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
      <div className="tw-bg-white tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4">
        <h2 className="tw-text-xl tw-font-bold tw-mb-4">{title}</h2>
        <p className="tw-text-gray-600 tw-mb-6">{message}</p>
        
        <div className="tw-flex tw-justify-end tw-space-x-4">
          <button
            onClick={onClose}
            className="secondary-button"
          >
            {cancelLabel}
          </button>
          
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={getButtonClass()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  variant: PropTypes.oneOf(['danger', 'primary', 'secondary'])
};

export default ConfirmDialog; 