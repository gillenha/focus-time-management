import React, { useState, useEffect } from 'react';
import { fetchQuotes, addQuote, deleteQuote } from '../services/quotesService';
import { toast } from 'react-toastify';

const Profile = ({ onClose, isExiting }) => {
    const [newQuote, setNewQuote] = useState('');
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'custom'

    useEffect(() => {
        loadQuotes();
    }, []);

    const loadQuotes = async () => {
        try {
            setIsLoading(true);
            const fetchedQuotes = await fetchQuotes();
            setQuotes(fetchedQuotes || []);
        } catch (error) {
            toast.error('Failed to load quotes');
            console.error('Error loading quotes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddQuote = async (e) => {
        e.preventDefault();
        if (!newQuote.trim()) return;
        
        try {
            const updatedQuotes = await addQuote(newQuote.trim());
            setQuotes(updatedQuotes);
            setNewQuote('');
            toast.success('Quote added successfully');
        } catch (error) {
            toast.error('Failed to add quote');
            console.error('Error adding quote:', error);
        }
    };

    const handleRemoveQuote = async (index) => {
        try {
            const updatedQuotes = await deleteQuote(index);
            setQuotes(updatedQuotes);
            toast.success('Quote removed successfully');
        } catch (error) {
            toast.error('Failed to remove quote');
            console.error('Error removing quote:', error);
        }
    };

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-white tw-z-50 ${isExiting ? 'slide-out' : 'slide-in'}`}>
            <div className="tw-h-full tw-overflow-y-auto">
                <div className="tw-p-6">
                    {/* Header with close button */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <div className="tw-flex tw-items-center">
                            <button 
                                onClick={onClose}
                                className="tw-appearance-none tw-bg-transparent tw-border-none tw-p-0 tw-m-0 tw-mr-4 tw-text-gray-500 tw-cursor-pointer"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="24" 
                                    height="24" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className="tw-w-6 tw-h-6"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Profile</h2>
                        </div>
                    </div>

                    {/* Quote Management Section */}
                    <div className="tw-space-y-6">
                        <div>
                            <h3 className="tw-text-lg tw-font-semibold tw-mb-4">Focus Quotes</h3>
                            
                            {/* Add New Quote Form */}
                            <form onSubmit={handleAddQuote} className="tw-mb-6">
                                <div className="tw-flex tw-space-x-2">
                                    <input
                                        type="text"
                                        value={newQuote}
                                        onChange={(e) => setNewQuote(e.target.value)}
                                        placeholder="Enter a new focus quote..."
                                        className="tw-flex-1 tw-px-4 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-focus:outline-none tw-focus:ring-2 tw-focus:ring-blue-500"
                                    />
                                    <button
                                        type="submit"
                                        className="tw-px-4 tw-py-2 tw-bg-blue-500 tw-text-white tw-rounded-md hover:tw-bg-blue-600 tw-transition-colors"
                                    >
                                        Add Quote
                                    </button>
                                </div>
                            </form>

                            {/* Quote List */}
                            <div className="tw-space-y-4">
                                {isLoading ? (
                                    <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
                                        <div className="tw-animate-spin tw-rounded-full tw-h-8 tw-w-8 tw-border-b-2 tw-border-blue-500"></div>
                                    </div>
                                ) : quotes.length === 0 ? (
                                    <p className="tw-text-gray-500 tw-italic">No quotes available.</p>
                                ) : (
                                    quotes.map((quote, index) => (
                                        <div key={index} className="tw-flex tw-justify-between tw-items-start tw-p-4 tw-bg-gray-50 tw-rounded-md">
                                            <p className="tw-text-gray-700">{quote}</p>
                                            <button
                                                onClick={() => handleRemoveQuote(index)}
                                                className="tw-ml-4 tw-text-red-500 hover:tw-text-red-700"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
