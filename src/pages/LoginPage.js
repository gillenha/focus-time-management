import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import packageJson from '../../package.json';

const LoginPage = () => {
    const { authError, setAuthError } = useAuth();
    const buttonRef = useRef(null);
    const buildSha = process.env.REACT_APP_BUILD_SHA;

    useEffect(() => {
        if (window.google && buttonRef.current) {
            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'filled_black',
                size: 'large',
                shape: 'pill',
                width: 260,
            });
        }
    }, []);

    return (
        <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gray-900">
            <div className="tw-bg-white/5 tw-backdrop-blur-sm tw-rounded-2xl tw-shadow-2xl tw-p-10 tw-w-80 tw-text-center tw-border tw-border-white/10">
                <h1 className="tw-text-3xl tw-font-bold tw-text-white tw-mb-1 tw-tracking-tight">
                    Flow State
                </h1>
                <p className="tw-text-sm tw-text-white/50 tw-mb-6">
                    A focused music player for getting into flow state
                </p>

                <div className="tw-flex tw-justify-center tw-mb-6" ref={buttonRef} />

                {authError && (
                    <div className="tw-mt-2 tw-p-3 tw-bg-red-500/10 tw-rounded-lg tw-border tw-border-red-500/20">
                        <p className="tw-text-sm tw-text-red-400">{authError}</p>
                        {authError.includes('Not authorized') && (
                            <button
                                onClick={() => setAuthError(null)}
                                className="tw-mt-2 tw-text-xs tw-text-white/40 tw-underline tw-cursor-pointer tw-bg-transparent tw-border-0"
                            >
                                Try a different account
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="tw-mt-8 tw-text-center">
                <p className="tw-text-xs tw-text-white/30">
                    By Harry Gillen
                </p>
                <p className="tw-text-xs tw-text-white/20 tw-mt-1">
                    &copy; 2026 &middot; v{packageJson.version}{buildSha ? `+${buildSha}` : ''}
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
