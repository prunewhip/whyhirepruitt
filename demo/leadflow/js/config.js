/**
 * LeadFlow Pro - Application Configuration
 * 
 * IMPORTANT: In a real production environment, secrets should never be 
 * exposed in client-side code. This file simulates environment variables
 * injection during a build process.
 */

const APP_CONFIG = {
    // Web3Forms Access Key (Injected from secrets)
    // IMPORTANT: Replace this with your actual key in production or use local config
    WEB3FORMS_ACCESS_KEY: 'YOUR_ACCESS_KEY_HERE',

    // Central Hub Email
    EMAIL_TO: 'RaveGodAutomation@outlook.com',

    // Base URL for the application
    // If running as local file, default to localhost:8080. Otherwise use current origin.
    BASE_URL: window.location.protocol === 'file:' ? 'http://localhost:8080' : (window.location.origin || 'http://localhost:8080')
};

// Freeze to prevent modification
Object.freeze(APP_CONFIG);
