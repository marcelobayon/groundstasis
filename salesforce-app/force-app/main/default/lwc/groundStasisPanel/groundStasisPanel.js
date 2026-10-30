import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getSitesByLoanNumber from '@salesforce/apex/GroundStasisService.getSitesByLoanNumber';

// Brand status colors (brand-guide §4.2). Data gap = missing evidence, not inactivity.
const STATUS_COLOR = {
    ACTIVE: '#00BFA5',
    WATCH: '#F59E0B',
    REVIEW: '#FB8C00',
    STASIS: '#EF4444',
    DATA_GAP: '#64748B'
};

export default class GroundStasisPanel extends LightningElement {
    @api recordId;
    @api objectApiName;
    // Configured in Lightning App Builder: the API name of the field on this
    // record that holds the loan number (e.g. "Loan_Number__c").
    @api loanNumberField;

    loanNumber;
    sites;
    error;
    loading = false;

    // Fully-qualified field (e.g. "Opportunity.Loan_Number__c"), or undefined
    // when nothing is configured yet — undefined params keep the wire dormant.
    get fieldApiName() {
        return this.objectApiName && this.loanNumberField
            ? `${this.objectApiName}.${this.loanNumberField}`
            : undefined;
    }

    get recordFields() {
        return this.fieldApiName ? [this.fieldApiName] : undefined;
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$recordFields' })
    wiredRecord({ data, error }) {
        if (data) {
            this.loanNumber = getFieldValue(data, this.fieldApiName);
            this.error = undefined;
            this.fetchSites();
        } else if (error) {
            this.error = 'Could not read the configured loan-number field. Check the field API name in the component settings.';
        }
    }

    fetchSites() {
        if (!this.loanNumber) {
            this.sites = [];
            return;
        }
        this.loading = true;
        getSitesByLoanNumber({ loanNumber: this.loanNumber })
            .then((result) => {
                this.sites = result.map((s) => ({
                    ...s,
                    key: s.id,
                    dotStyle: `background:${STATUS_COLOR[s.status] || '#64748B'}`
                }));
                this.error = undefined;
            })
            .catch((e) => {
                this.error =
                    (e && e.body && e.body.message) ||
                    'Could not load Ground Stasis data.';
            })
            .finally(() => {
                this.loading = false;
            });
    }

    get notConfigured() {
        return !this.loanNumberField;
    }

    get hasSites() {
        return this.sites && this.sites.length > 0;
    }

    get noMatch() {
        return !this.loading && !this.error && this.loanNumber && (!this.sites || this.sites.length === 0);
    }
}
