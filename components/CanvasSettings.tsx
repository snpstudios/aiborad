

import React from 'react';
import type { WheelAction } from '../types';
import { API_BASE_URL } from '../services/geminiService';

interface CanvasSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    canvasBackgroundColor: string;
    onCanvasBackgroundColorChange: (color: string) => void;
    language: 'en' | 'zho';
    setLanguage: (lang: 'en' | 'zho') => void;
    uiTheme: { color: string; opacity: number };
    setUiTheme: (theme: { color: string; opacity: number }) => void;
    buttonTheme: { color: string; opacity: number };
    setButtonTheme: (theme: { color: string; opacity: number }) => void;
    wheelAction: WheelAction;
    setWheelAction: (action: WheelAction) => void;
    t: (key: string) => string;
    useCustomGeminiKey: boolean;
    setUseCustomGeminiKey: (use: boolean) => void;
    customGeminiKey: string;
    setCustomGeminiKey: (key: string) => void;
}

export const CanvasSettings: React.FC<CanvasSettingsProps> = ({
    isOpen,
    onClose,
    canvasBackgroundColor,
    onCanvasBackgroundColorChange,
    language,
    setLanguage,
    uiTheme,
    setUiTheme,
    buttonTheme,
    setButtonTheme,
    wheelAction,
    setWheelAction,
    t,
    useCustomGeminiKey,
    setUseCustomGeminiKey,
    customGeminiKey,
    setCustomGeminiKey
}) => {
    // 添加加载状态，用于API密钥验证过程
    const [isSavingKey, setIsSavingKey] = React.useState(false);
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="relative p-6 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white w-full max-w-2xl"
                style={{ backgroundColor: 'var(--ui-bg-color)', minWidth: '500px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{t('settings.title')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className="border-t border-white/10 -mx-6 mb-4"></div>

                <div className="grid grid-cols-2 gap-6">
                    {/* 左侧列 */}
                    <div className="space-y-6">
                        {/* Language Settings */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">{t('settings.language')}</label>
                            <div className="flex items-center gap-2 p-1 bg-black/20 rounded-md">
                                <button 
                                    onClick={() => setLanguage('en')}
                                    className={`flex-1 py-1.5 text-sm rounded ${language === 'en' ? 'bg-blue-500 text-white' : 'hover:bg-white/10'}`}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => setLanguage('zho')}
                                    className={`flex-1 py-1.5 text-sm rounded ${language === 'zho' ? 'bg-blue-500 text-white' : 'hover:bg-white/10'}`}
                                >
                                    中文
                                </button>
                            </div>
                        </div>

                        {/* UI Theme Settings */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-300">{t('settings.uiTheme')}</h4>
                            <div className="flex items-center justify-between">
                                <label htmlFor="ui-color" className="text-sm text-gray-300">{t('settings.color')}</label>
                                <input
                                    id="ui-color"
                                    type="color"
                                    value={uiTheme.color}
                                    onChange={(e) => setUiTheme({ ...uiTheme, color: e.target.value })}
                                    className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-3">
                                <label htmlFor="ui-opacity" className="text-sm text-gray-300">{t('settings.opacity')}</label>
                                <input
                                    id="ui-opacity"
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={uiTheme.opacity}
                                    onChange={(e) => setUiTheme({ ...uiTheme, opacity: parseFloat(e.target.value) })}
                                    className="w-32"
                                />
                                 <span className="text-xs text-gray-400 w-8 text-right">{Math.round(uiTheme.opacity * 100)}%</span>
                            </div>
                        </div>

                        {/* Mouse Wheel Settings */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">{t('settings.mouseWheel')}</label>
                            <div className="flex items-center gap-2 p-1 bg-black/20 rounded-md">
                                <button 
                                    onClick={() => setWheelAction('zoom')}
                                    className={`flex-1 py-1.5 text-sm rounded ${wheelAction === 'zoom' ? 'bg-blue-500 text-white' : 'hover:bg-white/10'}`}
                                >
                                    {t('settings.zoom')}
                                </button>
                                <button 
                                    onClick={() => setWheelAction('pan')}
                                    className={`flex-1 py-1.5 text-sm rounded ${wheelAction === 'pan' ? 'bg-blue-500 text-white' : 'hover:bg-white/10'}`}
                                >
                                    {t('settings.scroll')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 右侧列 */}
                    <div className="space-y-6">
                        {/* Button Theme Settings */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-300">{t('settings.actionButtonsTheme')}</h4>
                            <div className="flex items-center justify-between">
                                <label htmlFor="button-color" className="text-sm text-gray-300">{t('settings.color')}</label>
                                <input
                                    id="button-color"
                                    type="color"
                                    value={buttonTheme.color}
                                    onChange={(e) => setButtonTheme({ ...buttonTheme, color: e.target.value })}
                                    className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-3">
                                <label htmlFor="button-opacity" className="text-sm text-gray-300">{t('settings.opacity')}</label>
                                <input
                                    id="button-opacity"
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={buttonTheme.opacity}
                                    onChange={(e) => setButtonTheme({ ...buttonTheme, opacity: parseFloat(e.target.value) })}
                                    className="w-32"
                                />
                                 <span className="text-xs text-gray-400 w-8 text-right">{Math.round(buttonTheme.opacity * 100)}%</span>
                            </div>
                        </div>

                        {/* Gemini API Key Settings */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-300">{t('settings.geminiApiKey')}</h4>
                            <div className="flex items-center space-x-2">
                                <input
                                    id="use-custom-key"
                                    type="checkbox"
                                    checked={useCustomGeminiKey}
                                    onChange={(e) => setUseCustomGeminiKey(e.target.checked)}
                                    className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                <label htmlFor="use-custom-key" className="text-sm text-gray-300">{t('settings.useCustomKey')}</label>
                            </div>
                            
                            {useCustomGeminiKey && (
                                <div className="space-y-2">
                                    <input
                                        id="gemini-api-key"
                                        type="text"
                                        value={customGeminiKey}
                                        onChange={(e) => setCustomGeminiKey(e.target.value)}
                                        placeholder="Enter your Gemini API key"
                                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-white placeholder-gray-500 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                            if (customGeminiKey && !isSavingKey) {
                                                setIsSavingKey(true);
                                                try {
                                                    // 在保存前先验证API密钥
                                                    const response = await fetch(`${API_BASE_URL}/gemini/validate-key`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({ apiKey: customGeminiKey }),
                                                        // 添加cache: 'no-store'以确保请求不会被缓存
                                                        cache: 'no-store'
                                                    });
                                                    
                                                    // 使用空的catch来阻止浏览器在控制台显示网络错误
                                                    // 我们会手动处理所有错误情况
                                                    
                                                    // 检查响应状态码
                                                    if (!response.ok) {
                                                        // 即使状态码不是200，也要尝试解析JSON响应以获取详细错误信息
                                                        let errorData;
                                                        try {
                                                            errorData = await response.json();
                                                            alert(`验证失败: ${errorData.error || 'API密钥无效'}`);
                                                        } catch (jsonError) {
                                                            alert('API密钥验证失败，请检查密钥是否正确');
                                                        }
                                                        return;
                                                    }
                                                    
                                                    // 解析响应数据，添加错误处理以防止非JSON响应
                                                    let data;
                                                    try {
                                                        data = await response.json();
                                                    } catch (jsonError) {
                                                        // 处理非JSON响应（如HTML错误页面）
                                                        alert('服务器返回了无效的响应格式，请检查后端服务是否正常运行');
                                                        return;
                                                    }
                                                    
                                                    if (!data.success) {
                                                        alert(`验证失败: ${data.error}`);
                                                        return;
                                                    }
                                                    
                                                    // 验证成功后保存到localStorage
                                                    localStorage.setItem('geminiApiKey', customGeminiKey);
                                                    localStorage.setItem('useCustomGeminiKey', 'true');
                                                    alert(t('settings.keySaved'));
                                                    // 保存成功后自动关闭设置面板
                                                    onClose();
                                                } catch (error) {
                                                    // 尝试从错误对象中提取更具体的错误信息
                                                    let errorMessage = '密钥验证过程中出现错误，请稍后再试';
                                                    if (error instanceof Error) {
                                                        errorMessage = error.message || errorMessage;
                                                    }
                                                    alert(errorMessage);
                                                } finally {
                                                    // 确保loading状态总是会被重置
                                                    setIsSavingKey(false);
                                                }
                                            }
                                        }}
                                            disabled={isSavingKey}
                                            className={`flex-1 px-3 py-1.5 text-white rounded-md text-sm ${isSavingKey ? 'bg-blue-700 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                        >
                                            {isSavingKey ? t('settings.validatingKey') : t('settings.saveKey')}
                                        </button>
                                        <button
                                            onClick={() => {
                                            setCustomGeminiKey('');
                                            setUseCustomGeminiKey(false);
                                            localStorage.removeItem('geminiApiKey');
                                            localStorage.removeItem('useCustomGeminiKey');
                                        }}
                                            className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
                                        >
                                            {t('settings.resetKey')}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        提示：使用自定义API密钥可以避免服务器密钥流量限制问题。
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Canvas Settings */}
                        <div className="space-y-3">
                             <h4 className="text-sm font-medium text-gray-300">{t('settings.canvas')}</h4>
                            <div className="flex items-center justify-between">
                                <label htmlFor="bg-color" className="text-sm text-gray-300">{t('settings.backgroundColor')}</label>
                                <input
                                    id="bg-color"
                                    type="color"
                                    value={canvasBackgroundColor}
                                    onChange={(e) => onCanvasBackgroundColorChange(e.target.value)}
                                    className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};