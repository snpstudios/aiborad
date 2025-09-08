import React from 'react';
import { QuickPrompts } from './QuickPrompts';

interface PromptBarProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    onGenerate: () => void;
    isLoading: boolean;
    isImageSelectionActive: boolean;
    selectedImageCount: number;
}

export const PromptBar: React.FC<PromptBarProps> = ({
    prompt,
    setPrompt,
    onGenerate,
    isLoading,
    isImageSelectionActive,
    selectedImageCount,
}) => {
    const getPlaceholderText = () => {
        if (!isImageSelectionActive) {
            return "Select one or more images to start editing...";
        }
        if (selectedImageCount === 1) {
            return "Describe the changes or select a quick effect above...";
        }
        return `Using ${selectedImageCount} images as context. Describe the result or select an effect...`;
    };

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
            <div className="p-2 bg-white rounded-lg shadow-lg flex flex-col space-y-2">
                <QuickPrompts 
                    setPrompt={setPrompt}
                    disabled={!isImageSelectionActive || isLoading}
                />
                <div className="flex items-center space-x-2">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={getPlaceholderText()}
                        rows={1}
                        className="flex-grow p-2 bg-gray-100 text-gray-800 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
                        disabled={!isImageSelectionActive || isLoading}
                    />
                    <button
                        onClick={onGenerate}
                        disabled={isLoading || !isImageSelectionActive || !prompt.trim()}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200 flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </>
                        ) : (
                           'Generate'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};