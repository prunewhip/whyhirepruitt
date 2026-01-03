/**
 * LeadFlow Pro - Auth Service
 * Mock authentication for demo purposes
 */

const AuthService = {
    STORAGE_KEY: 'leadflow_user',
    USERS_KEY: 'leadflow_users',

    /**
     * Get current logged-in user
     * @returns {Object|null} User object or null
     */
    getCurrentUser() {
        const userData = localStorage.getItem(this.STORAGE_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    /**
     * Register a new user
     * @param {Object} userData - { name, email, password }
     * @returns {Object} Result with success boolean and message
     */
    register(userData) {
        const { name, email, password } = userData;

        // Validate
        if (!name || !email || !password) {
            return { success: false, message: 'All fields are required' };
        }

        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        // Get existing users
        const users = this.getAllUsers();

        // Check if email exists
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'Email already registered' };
        }

        // Create user
        const newUser = {
            id: 'user_' + Date.now(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // In real app, this would be hashed
            created_at: new Date().toISOString()
        };

        // Save user
        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

        // Auto-login
        const sessionUser = { ...newUser };
        delete sessionUser.password;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionUser));

        return { success: true, user: sessionUser };
    },

    /**
     * Login user
     * @param {string} email 
     * @param {string} password 
     * @returns {Object} Result with success boolean and message
     */
    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => 
            u.email.toLowerCase() === email.toLowerCase() && 
            u.password === password
        );

        if (!user) {
            return { success: false, message: 'Invalid email or password' };
        }

        // Create session (without password)
        const sessionUser = { ...user };
        delete sessionUser.password;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionUser));

        return { success: true, user: sessionUser };
    },

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Get all registered users
     * @returns {Array}
     */
    getAllUsers() {
        const usersData = localStorage.getItem(this.USERS_KEY);
        return usersData ? JSON.parse(usersData) : [];
    },

    /**
     * Require authentication - redirect to login if not logged in
     * @param {string} redirectUrl - URL to redirect to after login
     */
    requireAuth(redirectUrl = null) {
        if (!this.isLoggedIn()) {
            const redirect = redirectUrl || window.location.href;
            window.location.href = `login.html?redirect=${encodeURIComponent(redirect)}`;
            return false;
        }
        return true;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}
