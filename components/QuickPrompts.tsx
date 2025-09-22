import React, { useState, useRef, useEffect } from 'react';
import type { UserEffect } from '../types';

interface QuickPromptsProps {
    t: (key: string, ...args: any[]) => any;
    setPrompt: (prompt: string) => void;
    disabled: boolean;
    userEffects: UserEffect[];
    onDeleteUserEffect: (id: string) => void;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ t, setPrompt, disabled, userEffects, onDeleteUserEffect }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleSelect = (value: string) => {
        if (value) {
            setPrompt(value);
        }
        setIsMenuOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);
    
    const builtInPrompts = t('quickPrompts');

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                disabled={disabled}
                aria-label={t('quickPromptsAriaLabel')}
                title={t('quickPromptsAriaLabel')}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all duration-200"
                style={{ backgroundColor: 'var(--button-bg-color)' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l.13.04a7.9 7.9 0 0 1 5.92 6.61 8.27 8.27 0 0 1-1.77 6.13A8.52 8.52 0 0 1 12 21.31a8.52 8.52 0 0 1-4.28-5.83 8.27 8.27 0 0 1-1.77-6.13A7.9 7.9 0 0 1 11.87 2.73L12 2.69zM12 22v-1.16"/><path d="M9 19h6"/></svg>
            </button>
            {isMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 w-80 max-h-96 overflow-y-auto bg-neutral-800/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1">
                    <h4 className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('myEffects.title')}</h4>
                    {userEffects.length > 0 ? (
                        userEffects.map((effect) => (
                            <div key={effect.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-white/10 text-white/90 text-sm transition-colors">
                                <button onClick={() => handleSelect(effect.value)} className="flex-grow text-left truncate">
                                    {effect.name}
                                </button>
                                <button
                                    onClick={() => onDeleteUserEffect(effect.id)}
                                    title={t('myEffects.deleteEffectTooltip')}
                                    className="ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/50 transition-opacity flex-shrink-0"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="px-2 pb-2 text-xs text-gray-500">{t('myEffects.noEffects')}</p>
                    )}
                    
                    <div className="border-t border-white/20 my-2 -mx-2"></div>
                    
                    {builtInPrompts.map((item: {name: string, value: string}, index: number) => (
                        <button 
                            key={index} 
                            onClick={() => handleSelect(item.value)}
                            className="block w-full text-left p-2 rounded-md hover:bg-white/10 text-white/90 text-sm transition-colors"
                        >
                            {item.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};