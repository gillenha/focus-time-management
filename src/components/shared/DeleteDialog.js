import React from 'react';
import PropTypes from 'prop-types';

const DeleteDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Delete Item",
    message = "Are you sure you want to delete this item?",
    confirmButtonText = "Delete",
    darkMode = false
}) => {
    if (!isOpen) return null;

    const baseClasses = darkMode ? {
        overlay: "tw-fixed tw-inset-0 tw-bg-black/90 tw-backdrop-blur-lg tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-gray-900 tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-white",
        message: "tw-text-white/80 tw-mb-6",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button tw-text-white tw-p-2 tw-w-24",
        confirmButton: "primary-button tw-p-2 tw-w-24 tw-text-sm"
    } : {
        overlay: "tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-white tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-gray-900",
        message: "tw-text-gray-600 tw-mb-6",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button",
        confirmButton: "primary-button"
    };

    return (
        <div className={baseClasses.overlay}>
            <div className={baseClasses.dialog}>
                <h2 className={baseClasses.title}>{title}</h2>
                <p className={baseClasses.message}>{message}</p>
                <div className={baseClasses.buttonContainer}>
                    <button
                        onClick={onClose}
                        className={baseClasses.cancelButton}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`${baseClasses.confirmButton} tw-w-24 tw-text-sm tw-p-2`}
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

DeleteDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string,
    message: PropTypes.string,
    confirmButtonText: PropTypes.string,
    darkMode: PropTypes.bool
};

export default DeleteDialog; 