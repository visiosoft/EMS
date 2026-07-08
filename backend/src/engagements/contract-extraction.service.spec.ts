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
      expect(result.performances).toHaveLength(1);
      expect(result.performances[0].formatted).toContain('July 4, 2026');
      expect(result.additionallyInsured).toEqual(['Live Nation Worldwide Inc', 'Madison Square Garden Entertainment Corp.']);
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
      const result = callPrivate('emptyResult') as Record<string, unknown>;
      expect(Object.values(result).every((v) => v === null)).toBe(true);
    });
  });

  // ─── LLM post-processing (buildResultFromRaw) ──────────────────────────────
  describe('buildResultFromRaw (LLM path post-process)', () => {
    type RawField = { value: string; confidence: number; sourceQuote: string; sourcePage: number };
    const field = (value: string, confidence: number, sourceQuote = value, sourcePage = 1): RawField => ({
      value,
      confidence,
      sourceQuote,
      sourcePage,
    });
    type Result = {
      data: Record<string, unknown>;
      fieldMeta: Record<string, { confidence: number; status: string; sourceQuote: string | null; sourcePage: number | null; verified: boolean }>;
    };
    const build = (raw: Record<string, RawField>, docText: string | null, isOcr = false) =>
      callPrivate('buildResultFromRaw', raw, docText, isOcr) as Result;

    it('parses amounts/currency and marks a verified high-confidence field as high', () => {
      const doc = 'Guarantee/Flat Fee $35,000  Royalty 10% of NAGBOR  Producer Federal ID Number 99-3649963';
      const res = build(
        {
          guaranteeAmount: field('$35,000', 0.95, '$35,000'),
          guaranteeCurrency: field('USD', 0.9, 'Flat Fee'),
          producerFedId: field('99-3649963', 0.97, '99-3649963'),
        },
        doc,
      );
      expect(res.data.guaranteeAmount).toBe(35000);
      expect(res.data.guaranteeCurrency).toBe('USD');
      expect(res.data.producerFedId).toBe('99-3649963');
      expect(res.fieldMeta.guaranteeAmount.status).toBe('high');
      expect(res.fieldMeta.guaranteeAmount.verified).toBe(true);
    });

    it('caps confidence and flags review when the source quote is not found in the document (hallucination guard)', () => {
      const res = build({ producer: field('Phantom LLC', 0.99, 'this text is not in the document') }, 'A real contract body.');
      expect(res.data.producer).toBe('Phantom LLC'); // value kept, but demoted for review
      expect(res.fieldMeta.producer.verified).toBe(false);
      expect(res.fieldMeta.producer.status).toBe('review');
      expect(res.fieldMeta.producer.confidence).toBeLessThanOrEqual(0.4);
    });

    it('derives balanceAmount from guarantee - deposit only when absent, tagged derived', () => {
      const doc = 'Fee $50,000 Deposit $5,000';
      const res = build(
        {
          guaranteeAmount: field('50000', 0.95, '$50,000'),
          depositAmount: field('5000', 0.95, '$5,000'),
          balanceAmount: field('', 0),
        },
        doc,
      );
      expect(res.data.balanceAmount).toBe(45000);
      expect(res.fieldMeta.balanceAmount.status).toBe('derived');
    });

    it('does not overwrite a stated balanceAmount with a derived one', () => {
      const doc = 'Fee $50,000 Deposit $5,000 Balance $40,000';
      const res = build(
        {
          guaranteeAmount: field('50000', 0.95, '$50,000'),
          depositAmount: field('5000', 0.95, '$5,000'),
          balanceAmount: field('40000', 0.9, '$40,000'),
        },
        doc,
      );
      expect(res.data.balanceAmount).toBe(40000);
      expect(res.fieldMeta.balanceAmount.status).not.toBe('derived');
    });

    it('OCR path (no text layer) defaults fields to review even at high model confidence', () => {
      const res = build({ guaranteeAmount: field('25000', 0.98, '$25,000') }, null, true);
      expect(res.data.guaranteeAmount).toBe(25000);
      expect(res.fieldMeta.guaranteeAmount.status).toBe('review');
      expect(res.fieldMeta.guaranteeAmount.verified).toBe(false);
    });

    it('marks empty values as not_found and leaves the data field null', () => {
      const res = build({ attraction: field('', 0) }, 'Some contract text');
      expect(res.data.attraction).toBeNull();
      expect(res.fieldMeta.attraction.status).toBe('not_found');
    });

    it('handles a realistic CAD deal — currency and amount normalization (JCS London)', () => {
      const doc = 'A Flat Fee of Seventy Thousand U.S. Dollars ($70,000) ... 13% included ... 15% Canadian Withholding ... LONDON, ON';
      const res = build(
        {
          guaranteeAmount: field('70000', 0.94, '$70,000'),
          guaranteeCurrency: field('USD', 0.9, 'U.S. Dollars'),
          venueState: field('ON', 0.9, 'LONDON, ON'),
          venueCountry: field('Canada', 0.6, '15% Canadian Withholding'),
        },
        doc,
      );
      expect(res.data.guaranteeAmount).toBe(70000);
      expect(res.data.guaranteeCurrency).toBe('USD');
      expect(res.data.venueCountry).toBe('Canada');
      // inferred country reported at lower confidence -> review, not high
      expect(res.fieldMeta.venueCountry.status).toBe('review');
    });

    const listField = (value: unknown[], confidence: number, sourceQuote = '', sourcePage = 1) => ({
      value,
      confidence,
      sourceQuote,
      sourcePage,
    });

    it('normalizes a structured performances array (date/time)', () => {
      const res = build({
        performances: listField(
          [
            { date: 'May 7, 2025', time: '7:30 PM', formatted: 'Wednesday, May 7, 2025 at 7:30 PM' },
            { date: '2025-05-08', time: '19:30', formatted: '' },
          ],
          0.9,
        ),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.performances).toEqual([
        { date: '2025-05-07', time: '19:30', formatted: 'Wednesday, May 7, 2025 at 7:30 PM' },
        { date: '2025-05-08', time: '19:30', formatted: '2025-05-08 19:30' },
      ]);
      expect(res.fieldMeta.performances.status).toBe('high');
    });

    it('marks performances as not_found when the array is empty', () => {
      const res = build({ performances: listField([], 0) } as unknown as Record<string, RawField>, null);
      expect(res.data.performances).toBeNull();
      expect(res.fieldMeta.performances.status).toBe('not_found');
    });

    it('normalizes additionallyInsured to a string array', () => {
      const res = build({
        additionallyInsured: listField(['Live Nation Worldwide Inc', 'Madison Square Garden Entertainment Corp'], 0.9),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual(['Live Nation Worldwide Inc', 'Madison Square Garden Entertainment Corp']);
    });

    it('always puts the Agency first among additionally-insured parties, inserting it if missing', () => {
      const res = build({
        agency: field('The Booking Group', 0.9),
        additionallyInsured: listField(['CFA Touring, LLC'], 0.9),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual(['The Booking Group', 'CFA Touring, LLC']);
    });

    it('moves the Agency to the front when it was extracted out of order', () => {
      const res = build({
        agency: field('The Booking Group', 0.9),
        additionallyInsured: listField(['CFA Touring, LLC', 'The Booking Group'], 0.9),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual(['The Booking Group', 'CFA Touring, LLC']);
    });

    it('derives additionallyInsured from agency + producer + presenter when the clause is absent', () => {
      const res = build({
        agency: field('The Booking Group', 0.9),
        producer: field('Chicago Razzle Dazzle II, LLC', 0.9),
        presenter: field('Innovation Arts & Entertainment', 0.9),
        additionallyInsured: listField([], 0),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual([
        'The Booking Group',
        'Chicago Razzle Dazzle II, LLC',
        'Innovation Arts & Entertainment',
      ]);
      expect(res.fieldMeta.additionallyInsured.status).toBe('derived');
    });

    it('derives from agency + producer only when no presenter is found', () => {
      const res = build({
        agency: field('The Booking Group', 0.9),
        producer: field('CFA Touring, LLC', 0.9),
        additionallyInsured: listField([], 0),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual(['The Booking Group', 'CFA Touring, LLC']);
    });

    it('does not derive additionallyInsured when the contract explicitly lists parties (LLM wins)', () => {
      const res = build({
        agency: field('The Booking Group', 0.9),
        producer: field('Some Producer, LLC', 0.9),
        presenter: field('Innovation Arts & Entertainment', 0.9),
        additionallyInsured: listField(['The Booking Group', 'Grand Theatre Foundation'], 0.9),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual(['The Booking Group', 'Grand Theatre Foundation']);
      expect(res.fieldMeta.additionallyInsured.status).not.toBe('derived');
    });

    it('de-duplicates when a party appears in more than one role', () => {
      const res = build({
        agency: field('The Booking Group', 0.9),
        producer: field('The Booking Group', 0.9),
        additionallyInsured: listField([], 0),
      } as unknown as Record<string, RawField>, null);
      expect(res.data.additionallyInsured).toEqual(['The Booking Group']);
    });
  });
});
