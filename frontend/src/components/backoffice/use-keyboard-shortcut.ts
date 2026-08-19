import { useEffect } from 'react';

/** Registers a global keydown shortcut (optionally with Ctrl/Shift modifiers). */
export const useKeyboardShortcut = (key: string, callback: () => void, ctrl = false, shift = false) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === key.toLowerCase() && e.ctrlKey === ctrl && e.shiftKey === shift) {
                e.preventDefault();
                callback();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [key, callback, ctrl, shift]);
};
