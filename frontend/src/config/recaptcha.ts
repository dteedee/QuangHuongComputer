// Google reCAPTCHA v3 Site Key
// To get your site key, register at: https://www.google.com/recaptcha/admin/create
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key (always passes)

// Actions for reCAPTCHA
export const RECAPTCHA_ACTIONS = {
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    RESET_PASSWORD: 'reset_password',
};
