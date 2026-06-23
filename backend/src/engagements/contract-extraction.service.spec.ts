import { ContractExtractionService } from './contract-extraction.service';

describe('ContractExtractionService', () => {
  let service: ContractExtractionService;

  beforeEach(() => {
    service = new ContractExtractionService();
  });

  // Access private methods for unit testing via bracket notation
  const callPrivate = (method: string, ...args: unknown[]) =>
    (service as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args);

  describe('extractFromTextContent (label-above-value blocks)', () => {
    it('should extract fields from a structured label/value layout', () => {
      const text = [
        'Talent Agency',
        'Creative Artists Agency',
        'Talent Agent',
        'John Smith',
        'Attraction',
        'The Rolling Stones',
        'Venue Name',
        'Madison Square Garden',
        'Venue Address',
        '4 Pennsylvania Plaza',
        'Venue City',
        'New York',
        'Venue State',
        'NY',
        'Venue Country',
        'USA',
        'Producer',
        'Live Nation Entertainment',
        'Producer Address',
        '9348 Civic Center Dr, Beverly Hills, CA 90210',
        'Producer Federal ID',
        '20-3402588',
        'Guarantee Amount',
        '$500,000.00',
        'Guarantee Currency',
        'USD',
        'Deposit Amount',
        '$100,000.00',
        'Deposit Due Date',
        'March 15, 2026',
        'Balance Amount',
        '$400,000.00',
        'Balance Due Date',
        '2026-04-01',
        'Royalty Description',
        'Artist receives 85% of merchandise net revenue after deductions.',
        'Overage Description',
        'Artist receives 90% of net box office receipts above $500,000.',
        'Payment Terms',
        'Deposit upon signing, balance 5 days prior to event.',
        'Payment Method Type',
        'Wire',
        'Payment Payable To',
        'RSG Artist Management LLC',
        'Payment Bank Name',
        'Chase Manhattan Bank',
        'Performances',
        'July 4, 2026 at 8:00 PM and July 5, 2026 at 8:00 PM',
        'Additionally Insured',
        'Live Nation Worldwide Inc and Madison Square Garden Entertainment Corp.',
        'OneDrive PDF URL',
        'https://onedrive.com/contracts/rolling-stones-msg.pdf',
      ].join('\n');

      const result = callPrivate('extractFromTextContent', text);

      expect(result).toMatchObject({
        agency: 'Creative Artists Agency',
        agent: 'John Smith',
        attraction: 'The Rolling Stones',
        venueName: 'Madison Square Garden',
        venueAddress: '4 Pennsylvania Plaza',
        venueCity: 'New York',
        venueState: 'NY',
        venueCountry: 'USA',
        producer: 'Live Nation Entertainment',
        producerAddress: '9348 Civic Center Dr, Beverly Hills, CA 90210',
        producerFedId: '20-3402588',
        guaranteeAmount: 500000,
        guaranteeCurrency: 'USD',
        depositAmount: 100000,
        depositDueDate: '2026-03-15',
        balanceAmount: 400000,
        balanceDueDate: '2026-04-01',
        paymentMethodType: 'Wire',
        paymentPayableTo: 'RSG Artist Management LLC',
        paymentBankName: 'Chase Manhattan Bank',
        oneDrivePdfUrl: 'https://onedrive.com/contracts/rolling-stones-msg.pdf',
      });
      expect(result.royaltyDescription).toContain('85%');
      expect(result.overageDescription).toContain('90%');
      expect(result.paymentTerms).toContain('Deposit upon signing');
      expect(result.performances).toContain('July 4, 2026');
      expect(result.additionallyInsured).toContain('Live Nation Worldwide');
    });

    it('should return empty result for empty text', () => {
      const result = callPrivate('extractFromTextContent', '');
      expect(result.agency).toBeNull();
      expect(result.guaranteeAmount).toBeNull();
    });

    it('should handle partial data gracefully', () => {
      const text = [
        'Talent Agency',
        'WME',
        'Attraction',
        'Beyoncé',
        'Guarantee Amount',
        '1,250,000.00',
      ].join('\n');

      const result = callPrivate('extractFromTextContent', text);
      expect(result.agency).toBe('WME');
      expect(result.attraction).toBe('Beyoncé');
      expect(result.guaranteeAmount).toBe(1250000);
      expect(result.venueName).toBeNull();
      expect(result.depositAmount).toBeNull();
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date', () => {
      expect(callPrivate('parseDate', '2026-03-15')).toBe('2026-03-15');
    });

    it('should parse named month date', () => {
      expect(callPrivate('parseDate', 'March 15, 2026')).toBe('2026-03-15');
    });

    it('should parse short month abbreviation', () => {
      expect(callPrivate('parseDate', 'Jan 5, 2026')).toBe('2026-01-05');
    });

    it('should parse slash date (MM/DD/YYYY)', () => {
      expect(callPrivate('parseDate', '12/25/2026')).toBe('2026-12-25');
    });

    it('should parse dash date (MM-DD-YYYY)', () => {
      expect(callPrivate('parseDate', '3-1-2026')).toBe('2026-03-01');
    });

    it('should return null for unparsable date', () => {
      expect(callPrivate('parseDate', 'sometime next week')).toBeNull();
    });
  });

  describe('parseAmount', () => {
    it('should parse amount with dollar sign and commas', () => {
      expect(callPrivate('parseAmount', '$1,500,000.00')).toBe(1500000);
    });

    it('should parse plain numeric amount', () => {
      expect(callPrivate('parseAmount', '75000')).toBe(75000);
    });

    it('should parse amount with decimals only', () => {
      expect(callPrivate('parseAmount', '250000.50')).toBe(250000.5);
    });

    it('should return null for non-numeric input', () => {
      expect(callPrivate('parseAmount', 'N/A')).toBeNull();
    });
  });

  describe('monthToNum', () => {
    it.each([
      ['January', '01'],
      ['feb', '02'],
      ['MARCH', '03'],
      ['December', '12'],
    ])('should convert %s to %s', (month, expected) => {
      expect(callPrivate('monthToNum', month)).toBe(expected);
    });

    it('should return null for invalid month', () => {
      expect(callPrivate('monthToNum', 'Nope')).toBeNull();
    });
  });

  describe('inline fallback extraction', () => {
    it('should extract from inline "Label: Value" format', () => {
      const text = [
        'Agency: William Morris Endeavor',
        'Agent: Tom Agent',
        'Artist: Adele',
        'Venue: Wembley Stadium',
        'Guarantee: $750,000.00',
        'Currency: GBP',
        'Payment method: Wire',
        'Make check payable to: Adele Music Ltd',
        'Bank name: Barclays',
      ].join('\n');

      const result = callPrivate('extractFromTextContent', text);
      expect(result.agency).toBe('William Morris Endeavor');
      expect(result.agent).toBe('Tom Agent');
    });
  });

  describe('emptyResult', () => {
    it('should return all fields as null', () => {
      const result = callPrivate('emptyResult');
      expect(Object.values(result).every((v) => v === null)).toBe(true);
    });
  });
});
