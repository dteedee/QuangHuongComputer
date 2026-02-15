import { useEffect, useState } from 'react';

declare global {
    interface Window {
        grecaptcha: any;
    }
}

export const useRecaptcha = (siteKey: string) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Check if reCAPTCHA script is already loaded
        if (window.grecaptcha) {
            setIsLoaded(true);
            return;
        }

        // Load reCAPTCHA script
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            setIsLoaded(true);
        };

        document.body.appendChild(script);

        return () => {
            // Cleanup
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        };
    }, [siteKey]);

    const executeRecaptcha = async (action: string): Promise<string | undefined> => {
        // If reCAPTCHA is not loaded (blocked by ad blocker, etc.), return undefined
        // Backend should handle missing token gracefully in development
        if (!isLoaded || !window.grecaptcha) {
            console.warn('reCAPTCHA not loaded - proceeding without token');
            return undefined;
        }

        try {
            return await new Promise((resolve, reject) => {
                window.grecaptcha.ready(() => {
                    window.grecaptcha
                        .execute(siteKey, { action })
                        .then((token: string) => resolve(token))
                        .catch((error: any) => reject(error));
                });
            });
        } catch (error) {
            console.warn('reCAPTCHA execution failed:', error);
            return undefined;
        }
    };

    return { isLoaded, executeRecaptcha };
};
