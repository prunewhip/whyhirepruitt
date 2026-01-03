/**
 * LeadFlow Pro - Leads Service
 * Manages leads and quotes in localStorage
 */

const LeadsService = {
    LEADS_KEY: 'leadflow_leads',
    QUOTES_KEY: 'leadflow_quotes',

    /**
     * Generate a unique lead ID
     * @returns {string}
     */
    generateLeadId() {
        return 'LEAD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    },

    /**
     * Generate a unique quote ID
     * @returns {string}
     */
    generateQuoteId() {
        return 'QUOTE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    },

    /**
     * Create a new lead
     * @param {Object} leadData 
     * @returns {Object} Created lead with ID
     */
    createLead(leadData) {
        const lead = {
            lead_id: this.generateLeadId(),
            customer_id: leadData.customer_id || null,
            customer_email: leadData.customer_email,
            customer_name: leadData.customer_name,
            customer_phone: leadData.customer_phone,
            category: leadData.category || 'plumbing',
            service_type: leadData.service_type,
            description: leadData.description,
            zip_code: leadData.zip_code,
            address: leadData.address || '',
            urgency: leadData.urgency,
            contact_preference: leadData.contact_preference || 'phone',
            status: 'pending', // pending | quote_received | accepted | completed
            quotes: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const leads = this.getAllLeads();
        leads.unshift(lead);
        localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));

        return lead;
    },

    /**
     * Get all leads
     * @returns {Array}
     */
    getAllLeads() {
        const data = localStorage.getItem(this.LEADS_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Get leads for a specific customer
     * @param {string} customerEmail 
     * @returns {Array}
     */
    getLeadsByCustomer(customerEmail) {
        return this.getAllLeads().filter(
            lead => lead.customer_email?.toLowerCase() === customerEmail?.toLowerCase()
        );
    },

    /**
     * Get a lead by ID
     * @param {string} leadId 
     * @returns {Object|null}
     */
    getLeadById(leadId) {
        return this.getAllLeads().find(lead => lead.lead_id === leadId) || null;
    },

    /**
     * Add a quote to a lead
     * @param {string} leadId 
     * @param {Object} quoteData 
     * @returns {Object} Created quote
     */
    addQuoteToLead(leadId, quoteData) {
        const leads = this.getAllLeads();
        const leadIndex = leads.findIndex(l => l.lead_id === leadId);

        if (leadIndex === -1) {
            throw new Error('Lead not found');
        }

        const quote = {
            quote_id: this.generateQuoteId(),
            lead_id: leadId,
            provider_id: quoteData.provider_id,
            provider_name: quoteData.provider_name,
            provider_email: quoteData.provider_email,
            amount: parseFloat(quoteData.amount),
            estimated_date: quoteData.estimated_date,
            message: quoteData.message,
            status: 'pending', // pending | accepted | declined
            created_at: new Date().toISOString()
        };

        // Add quote to lead
        leads[leadIndex].quotes.push(quote);
        leads[leadIndex].status = 'quote_received';
        leads[leadIndex].updated_at = new Date().toISOString();

        localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));

        // Also store in quotes collection
        const quotes = this.getAllQuotes();
        quotes.unshift(quote);
        localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));

        return quote;
    },

    /**
     * Get all quotes
     * @returns {Array}
     */
    getAllQuotes() {
        const data = localStorage.getItem(this.QUOTES_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Update lead status
     * @param {string} leadId 
     * @param {string} status 
     */
    updateLeadStatus(leadId, status) {
        const leads = this.getAllLeads();
        const lead = leads.find(l => l.lead_id === leadId);
        if (lead) {
            lead.status = status;
            lead.updated_at = new Date().toISOString();
            localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));
        }
    },

    /**
     * Accept a quote
     * @param {string} leadId 
     * @param {string} quoteId 
     */
    acceptQuote(leadId, quoteId) {
        const leads = this.getAllLeads();
        const lead = leads.find(l => l.lead_id === leadId);
        if (lead) {
            const quote = lead.quotes.find(q => q.quote_id === quoteId);
            if (quote) {
                quote.status = 'accepted';
                lead.status = 'accepted';
                lead.updated_at = new Date().toISOString();
                localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));
            }
        }
    },

    /**
     * Get status badge HTML
     * @param {string} status 
     * @returns {string} HTML string
     */
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-warning">Pending</span>',
            'quote_received': '<span class="badge badge-info">Quote Received</span>',
            'accepted': '<span class="badge badge-success">Accepted</span>',
            'completed': '<span class="badge badge-primary">Completed</span>',
            'declined': '<span class="badge badge-error">Declined</span>'
        };
        return badges[status] || badges['pending'];
    },

    /**
     * Format date for display
     * @param {string} isoDate 
     * @returns {string}
     */
    formatDate(isoDate) {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    /**
     * Format currency
     * @param {number} amount 
     * @returns {string}
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadsService;
}
