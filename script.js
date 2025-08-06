// Motor Insurance Premium Generator
// Waumini Insurance Brokers
// Comprehensive Business Logic Implementation

class MotorInsuranceCalculator {
    constructor() {
        this.currentPage = 'quoteForm';
        this.formData = {};
        this.quotes = [];
        this.leads = [];
        
        // Insurance Rate Configuration
        this.insuranceRates = {
            BRITAM: {
                bracket1: 0.06, // 6.0% for KES 500,000 - 1,500,000
                bracket2: 0.045, // 4.5% for KES 1,500,000 - 3,000,000
                bracket3: 0.03, // 3.0% for KES 3,000,000+
                minPremium: 37500,
                excessProtector: 5000,
                addOns: {
                    carHire: 5000,
                    personalAccident: 3000,
                    aaTowing: 2500,
                    windscreenExtension: 1500,
                    radioExtension: 1000
                }
            },
            CANON: {
                bracket1: 0.035, // 3.5% uniform rate
                bracket2: 0.035,
                bracket3: 0.035,
                minPremium: 37500,
                excessProtector: 2500,
                addOns: {
                    carHire: 5000,
                    personalAccident: 3000,
                    aaTowing: 2500,
                    windscreenExtension: 1500,
                    radioExtension: 1000
                }
            },
            PACIS: {
                bracket1: 0.06, // 6.0% for KES 500,000 - 1,500,000
                bracket2: 0.035, // 3.5% for KES 1,500,000 - 3,000,000
                bracket3: 0.03, // 3.0% for KES 3,000,000+
                minPremium: 30000,
                excessProtector: 2500,
                addOns: {
                    carHire: 5000,
                    personalAccident: 3000,
                    aaTowing: 2500,
                    windscreenExtension: 1500,
                    radioExtension: 1000
                }
            }
        };

        // Regulatory Constants
        this.GOVERNMENT_LEVY = 0.0045; // 0.45%
        this.STAMP_DUTY = 40; // Fixed KES 40

        this.init();
    }

    init() {
        this.populateYearDropdown();
        this.bindEvents();
        this.loadStoredLeads();
    }

    // Populate year dropdown (current year to 1990)
    populateYearDropdown() {
        const yearSelect = document.getElementById('vehicleYear');
        const currentYear = new Date().getFullYear();
        
        for (let year = currentYear; year >= 1990; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    // Event binding
    bindEvents() {
        // Form submission
        document.getElementById('insuranceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        // Vehicle class change handler
        document.getElementById('vehicleClass').addEventListener('change', (e) => {
            this.handleVehicleClassChange(e.target.value);
        });

        // Coverage type change handler
        document.getElementById('coverType').addEventListener('change', (e) => {
            this.handleCoverageTypeChange(e.target.value);
        });

        // Results page buttons
        document.getElementById('newQuoteBtn').addEventListener('click', () => {
            this.showPage('quoteForm');
        });

        document.getElementById('downloadCSVBtn').addEventListener('click', () => {
            this.downloadLeadsCSV();
        });

        document.getElementById('contactBtn').addEventListener('click', () => {
            this.handleContactClick();
        });

        // Add-on checkboxes
        document.querySelectorAll('input[name="addOns"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateAddOnsDisplay();
            });
        });
    }

    // Handle form submission
    handleFormSubmission() {
        if (!this.validateForm()) {
            return;
        }

        this.collectFormData();
        this.showPage('loadingScreen');
        
        // Simulate processing time
        setTimeout(() => {
            this.generateQuotes();
            this.showPage('resultsPage');
            this.displayResults();
        }, 2000);
    }

    // Form validation
    validateForm() {
        const requiredFields = [
            'clientName', 'clientPhone', 'vehicleMake', 
            'vehicleYear', 'vehicleClass', 'sumInsured', 'coverType'
        ];

        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const value = field.value.trim();
            
            if (!value) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        // Validate sum insured
        const sumInsured = parseInt(document.getElementById('sumInsured').value);
        if (sumInsured < 500000) {
            this.showFieldError(document.getElementById('sumInsured'), 'Minimum sum insured is KES 500,000');
            isValid = false;
        }

        // Validate phone number
        const phone = document.getElementById('clientPhone').value;
        if (!this.isValidPhoneNumber(phone)) {
            this.showFieldError(document.getElementById('clientPhone'), 'Please enter a valid phone number');
            isValid = false;
        }

        return isValid;
    }

    // Phone number validation
    isValidPhoneNumber(phone) {
        const phoneRegex = /^(\+254|0)?[17]\d{8}$/;
        return phoneRegex.test(phone);
    }

    // Show field error
    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    // Clear field error
    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Collect form data
    collectFormData() {
        this.formData = {
            clientName: document.getElementById('clientName').value.trim(),
            clientPhone: document.getElementById('clientPhone').value.trim(),
            clientEmail: document.getElementById('clientEmail').value.trim(),
            vehicleMake: document.getElementById('vehicleMake').value.trim(),
            vehicleYear: parseInt(document.getElementById('vehicleYear').value),
            vehicleClass: document.getElementById('vehicleClass').value,
            sumInsured: parseInt(document.getElementById('sumInsured').value),
            coverType: document.getElementById('coverType').value,
            addOns: this.getSelectedAddOns(),
            timestamp: new Date().toISOString()
        };

        // Calculate vehicle age
        this.formData.vehicleAge = new Date().getFullYear() - this.formData.vehicleYear;
    }

    // Get selected add-ons
    getSelectedAddOns() {
        const selectedAddOns = [];
        document.querySelectorAll('input[name="addOns"]:checked').forEach(checkbox => {
            selectedAddOns.push(checkbox.value);
        });
        return selectedAddOns;
    }

    // Handle vehicle class change
    handleVehicleClassChange(vehicleClass) {
        if (vehicleClass === 'Commercial' || vehicleClass === 'Motorcycle') {
            alert('Commercial and Motorcycle insurance quotes are coming soon. Please contact us directly for these products.');
            document.getElementById('vehicleClass').value = '';
        }
    }

    // Handle coverage type change
    handleCoverageTypeChange(coverType) {
        if (coverType === 'TPO') {
            alert('For Third Party Only (TPO) coverage, please contact us directly as rates are not standardized.');
            document.getElementById('coverType').value = '';
        }
    }

    // Generate quotes
    generateQuotes() {
        this.quotes = [];

        // Check if vehicle is eligible for comprehensive coverage
        if (this.formData.vehicleAge > 15) {
            alert('Vehicles older than 15 years are only eligible for Third Party Only (TPO) coverage. Please contact us directly.');
            this.showPage('quoteForm');
            return;
        }

        // Generate quotes for each insurer
        Object.keys(this.insuranceRates).forEach(insurer => {
            const quote = this.calculatePremium(insurer);
            this.quotes.push(quote);
        });

        // Sort quotes by total premium (lowest first)
        this.quotes.sort((a, b) => a.totalPremium - b.totalPremium);

        // Mark the best deal
        if (this.quotes.length > 0) {
            this.quotes[0].isBestDeal = true;
        }

        // Save lead data
        this.saveLead();
    }

    // Calculate premium for a specific insurer
    calculatePremium(insurer) {
        const rates = this.insuranceRates[insurer];
        const sumInsured = this.formData.sumInsured;
        
        // Determine rate based on sum insured bracket
        let rate;
        if (sumInsured <= 1500000) {
            rate = rates.bracket1;
        } else if (sumInsured <= 3000000) {
            rate = rates.bracket2;
        } else {
            rate = rates.bracket3;
        }

        // Calculate basic premium
        let basicPremium = sumInsured * rate;
        basicPremium = Math.max(basicPremium, rates.minPremium);

        // Calculate add-ons
        const addOnsTotal = this.calculateAddOnsTotal(rates);

        // Calculate government levy
        const govLevy = (basicPremium + addOnsTotal) * this.GOVERNMENT_LEVY;

        // Calculate total premium
        const totalPremium = basicPremium + addOnsTotal + govLevy + this.STAMP_DUTY;

        return {
            insurer: insurer,
            basicPremium: basicPremium,
            addOnsTotal: addOnsTotal,
            govLevy: govLevy,
            stampDuty: this.STAMP_DUTY,
            totalPremium: totalPremium,
            isBestDeal: false,
            rate: rate
        };
    }

    // Calculate add-ons total
    calculateAddOnsTotal(rates) {
        let total = 0;

        this.formData.addOns.forEach(addOn => {
            switch (addOn) {
                case 'excessProtector':
                    total += rates.excessProtector;
                    break;
                case 'politicalViolence':
                    total += Math.max(this.formData.sumInsured * 0.0025, 2500);
                    break;
                case 'carHire':
                    total += rates.addOns.carHire;
                    break;
                case 'personalAccident':
                    total += rates.addOns.personalAccident;
                    break;
                case 'aaTowing':
                    total += rates.addOns.aaTowing;
                    break;
                case 'windscreenExtension':
                    total += rates.addOns.windscreenExtension;
                    break;
                case 'radioExtension':
                    total += rates.addOns.radioExtension;
                    break;
            }
        });

        return total;
    }

    // Display results
    displayResults() {
        this.displayClientSummary();
        this.displayQuotes();
    }

    // Display client summary
    displayClientSummary() {
        document.getElementById('summaryName').textContent = this.formData.clientName;
        document.getElementById('summaryPhone').textContent = this.formData.clientPhone;
        document.getElementById('summaryVehicle').textContent = `${this.formData.vehicleYear} ${this.formData.vehicleMake}`;
        document.getElementById('summarySumInsured').textContent = `KES ${this.formData.sumInsured.toLocaleString()}`;
    }

    // Display quotes
    displayQuotes() {
        const quotesContainer = document.getElementById('quotesList');
        quotesContainer.innerHTML = '';

        this.quotes.forEach(quote => {
            const quoteCard = this.createQuoteCard(quote);
            quotesContainer.appendChild(quoteCard);
        });
    }

    // Create quote card
    createQuoteCard(quote) {
        const card = document.createElement('div');
        card.className = `quote-card ${quote.isBestDeal ? 'best-deal' : ''}`;

        const badge = quote.isBestDeal ? 'Best Deal' : 
                     quote.insurer === 'BRITAM' ? 'Most Popular' :
                     quote.insurer === 'PACIS' ? 'Premium' : '';

        card.innerHTML = `
            <div class="quote-header">
                <h3>${quote.insurer} Insurance</h3>
                ${badge ? `<span class="quote-badge">${badge}</span>` : ''}
            </div>
            <div class="quote-price">KES ${quote.totalPremium.toLocaleString()}</div>
            <div class="quote-details">
                <div>
                    <span>Basic Premium:</span>
                    <span>KES ${quote.basicPremium.toLocaleString()}</span>
                </div>
                <div>
                    <span>Add-ons:</span>
                    <span>KES ${quote.addOnsTotal.toLocaleString()}</span>
                </div>
                <div>
                    <span>Government Levy:</span>
                    <span>KES ${quote.govLevy.toLocaleString()}</span>
                </div>
                <div>
                    <span>Stamp Duty:</span>
                    <span>KES ${quote.stampDuty.toLocaleString()}</span>
                </div>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 0.5rem; margin-top: 0.5rem;">
                    <span><strong>Rate:</strong></span>
                    <span><strong>${(quote.rate * 100).toFixed(1)}%</strong></span>
                </div>
            </div>
            <div class="quote-actions">
                <button class="btn-select" onclick="calculator.selectQuote('${quote.insurer}')">
                    Select Quote
                </button>
                <button class="btn-details" onclick="calculator.showQuoteDetails('${quote.insurer}')">
                    Details
                </button>
            </div>
        `;

        return card;
    }

    // Select quote
    selectQuote(insurer) {
        const selectedQuote = this.quotes.find(q => q.insurer === insurer);
        if (selectedQuote) {
            alert(`You have selected ${insurer} Insurance. Our team will contact you shortly to proceed with the policy.`);
            this.handleContactClick();
        }
    }

    // Show quote details
    showQuoteDetails(insurer) {
        const quote = this.quotes.find(q => q.insurer === insurer);
        if (quote) {
            const details = `
${insurer} Insurance Quote Details:

Basic Premium: KES ${quote.basicPremium.toLocaleString()}
Add-ons Total: KES ${quote.addOnsTotal.toLocaleString()}
Government Levy: KES ${quote.govLevy.toLocaleString()}
Stamp Duty: KES ${quote.stampDuty.toLocaleString()}
Total Premium: KES ${quote.totalPremium.toLocaleString()}
Rate Applied: ${(quote.rate * 100).toFixed(1)}%

Coverage: ${this.formData.coverType}
Sum Insured: KES ${this.formData.sumInsured.toLocaleString()}
Vehicle: ${this.formData.vehicleYear} ${this.formData.vehicleMake}

Quote valid for 30 days.
            `;
            alert(details);
        }
    }

    // Show page
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        document.getElementById(pageId).classList.add('active');
        this.currentPage = pageId;
    }

    // Save lead data
    saveLead() {
        const lead = {
            ...this.formData,
            quotes: this.quotes,
            selectedQuote: this.quotes.length > 0 ? this.quotes[0] : null
        };

        this.leads.push(lead);
        localStorage.setItem('wauminiLeads', JSON.stringify(this.leads));
    }

    // Load stored leads
    loadStoredLeads() {
        const stored = localStorage.getItem('wauminiLeads');
        if (stored) {
            this.leads = JSON.parse(stored);
        }
    }

    // Download leads as CSV
    downloadLeadsCSV() {
        if (this.leads.length === 0) {
            alert('No lead data available for download.');
            return;
        }

        const headers = [
            'Timestamp', 'Client Name', 'Phone', 'Email', 'Vehicle Make', 
            'Vehicle Year', 'Vehicle Age', 'Vehicle Class', 'Sum Insured', 
            'Coverage Type', 'Add-ons', 'Selected Insurer', 'Total Premium'
        ];

        const csvContent = [
            headers.join(','),
            ...this.leads.map(lead => [
                lead.timestamp,
                `"${lead.clientName}"`,
                lead.clientPhone,
                lead.clientEmail || '',
                `"${lead.vehicleMake}"`,
                lead.vehicleYear,
                lead.vehicleAge,
                lead.vehicleClass,
                lead.sumInsured,
                lead.coverType,
                lead.addOns.join(';'),
                lead.selectedQuote ? lead.selectedQuote.insurer : '',
                lead.selectedQuote ? lead.selectedQuote.totalPremium : ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waumini_leads_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Handle contact click
    handleContactClick() {
        const message = `Hi, I'm interested in motor insurance. My details:\nName: ${this.formData.clientName}\nPhone: ${this.formData.clientPhone}\nVehicle: ${this.formData.vehicleYear} ${this.formData.vehicleMake}`;
        
        // Try to open WhatsApp
        const whatsappUrl = `https://wa.me/254700000000?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Update add-ons display
    updateAddOnsDisplay() {
        // This can be used to show real-time add-on costs if needed
        const selectedAddOns = this.getSelectedAddOns();
        console.log('Selected add-ons:', selectedAddOns);
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(amount);
    }

    // Get quote statistics
    getQuoteStats() {
        if (this.quotes.length === 0) return null;

        const premiums = this.quotes.map(q => q.totalPremium);
        return {
            lowest: Math.min(...premiums),
            highest: Math.max(...premiums),
            average: premiums.reduce((a, b) => a + b, 0) / premiums.length,
            savings: Math.max(...premiums) - Math.min(...premiums)
        };
    }
}

// Initialize the calculator when DOM is loaded
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new MotorInsuranceCalculator();
});

// Export for global access
window.calculator = calculator;