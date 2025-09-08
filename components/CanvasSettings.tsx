import React from 'react';

interface CanvasSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    backgroundColor: string;
    onBackgroundColorChange: (color: string) => void;
}

export const CanvasSettings: React.FC<CanvasSettingsProps> = ({ isOpen, onClose, backgroundColor, onBackgroundColorChange }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute top-20 right-4 z-10 p-4 bg-white rounded-lg shadow-lg flex flex-col space-y-3 w-60">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Canvas Settings</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div className="border-t border-gray-200 -mx-4"></div>
            <div className="flex items-center justify-between">
                <label htmlFor="bg-color" className="text-sm text-gray-600">Background Color</label>
                <input
                    id="bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-white"
                />
            </div>
        </div>
    );
};
