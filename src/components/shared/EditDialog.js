import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const EditDialog = ({ isOpen, onClose, onConfirm, session }) => {
    const [editText, setEditText] = useState(session?.text || '');

    // Reset text when session changes
    useEffect(() => {
        setEditText(session?.text || '');
    }, [session]);

    if (!isOpen) return null;

    return (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
            <div className="tw-bg-white tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4">
                <h2 className="tw-text-xl tw-font-bold tw-mb-4">Edit Session Notes</h2>
                <div className="tw-mb-6">
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                        Session from {new Date(session?.date).toLocaleDateString()}
                    </label>
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="tw-w-full tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-2 tw-min-h-[100px]"
                        placeholder="Enter session notes..."
                    />
                </div>
                
                <div className="tw-flex tw-justify-end tw-space-x-4">
                    <button
                        onClick={onClose}
                        className="secondary-button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(editText);
                            onClose();
                        }}
                        className="primary-button tw-p-2 tw-text-xs"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

EditDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    session: PropTypes.shape({
        _id: PropTypes.string,
        date: PropTypes.string,
        text: PropTypes.string,
    }),
};

export default EditDialog; 