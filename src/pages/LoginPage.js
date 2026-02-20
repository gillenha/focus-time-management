import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const { authError, setAuthError } = useAuth();
    const buttonRef = useRef(null);

    useEffect(() => {
        if (window.google && buttonRef.current) {
            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'outline',
                size: 'large',
                width: 280,
            });
        }
    }, []);

    return (
        <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gray-900">
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-8 tw-w-80 tw-text-center">
                <h1 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-2">
                    Flow State
                </h1>
                <p className="tw-text-sm tw-text-gray-500 tw-mb-6">
                    Sign in to continue
                </p>

                <div className="tw-flex tw-justify-center tw-mb-4" ref={buttonRef} />

                {authError && (
                    <div className="tw-mt-4 tw-p-3 tw-bg-red-50 tw-rounded-lg">
                        <p className="tw-text-sm tw-text-red-600">{authError}</p>
                        {authError.includes('Not authorized') && (
                            <button
                                onClick={() => setAuthError(null)}
                                className="tw-mt-2 tw-text-xs tw-text-gray-500 tw-underline tw-cursor-pointer tw-bg-transparent tw-border-0"
                            >
                                Try a different account
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
