import type { ExtractedContractData } from './contract-extraction.service';

/**
 * SINGLE SOURCE OF TRUTH for the contract fields we extract.
 *
 * Everything the LLM path needs is generated from this one array:
 *  - the JSON schema handed to Claude (as a forced-tool input_schema),
 *  - the field-definition block injected into the extraction prompt,
 *  - the per-field normalization (amount/date/currency) and derivations.
 *
 * To add or rename a target field, edit this array only — the DTO/entity keys
 * (`ExtractedContractData`) and the frontend form stay in lockstep because the
 * `key`s here are exactly those keys. The LLM performs the semantic mapping
 * ("Venue" = "Engagement Venue" = "Location") from `description` + `examples`;
 * `aliases` are only priors/hints, never an exhaustive whitelist.
 */
export type ContractFieldType = 'text' | 'amount' | 'currency' | 'date' | 'section';

export interface ContractFieldDef {
  /** Must be a key of ExtractedContractData (kept in sync at compile time). */
  key: Exclude<keyof ExtractedContractData, 'oneDrivePdfUrl'>;
  /** Human label (also used in the prompt). */
  label: string;
  type: ContractFieldType;
  /** Plain-English definition written for the model — this is what drives semantic matching. */
  description: string;
  /** Example labels seen in the wild. Priors only; the model generalizes beyond these. */
  aliases: string[];
  /** Example values, to anchor format. */
  examples: string[];
  required: boolean;
  /** Optional post-process derivation when the value is absent in the document. */
  derivation?: 'balanceFromGuaranteeMinusDeposit';
}

export const CONTRACT_FIELD_DEFS: ContractFieldDef[] = [
  {
    key: 'agency',
    label: 'Talent Agency',
    type: 'text',
    description:
      'The booking agency / talent agency that represents the attraction and brokered the engagement (NOT the presenter/purchaser and NOT the venue).',
    aliases: ['Booking Agent', 'Agency', 'Agent', 'Booking Group', 'Represented by'],
    examples: ['The Booking Group', 'The Brad Simon Organization, Inc.', 'Bond Theatrical Group'],
    required: false,
  },
  {
    key: 'agent',
    label: 'Talent Agent',
    type: 'text',
    description: 'The individual agent / booking contact at the agency.',
    aliases: ['Agent', 'Booking Agent', 'Contact'],
    examples: ['Brian Brooks', 'Brad Simon'],
    required: false,
  },
  {
    key: 'attraction',
    label: 'Attraction',
    type: 'text',
    description: 'The show, musical, artist, or production being presented.',
    aliases: ['Play/Musical', 'Production', 'Artist', 'Performer', 'Act', 'Engagement of'],
    examples: ['CHICAGO THE MUSICAL', 'WILD KRATTS LIVE 2.0', 'JESUS CHRIST SUPERSTAR'],
    required: false,
  },
  {
    key: 'venueName',
    label: 'Venue Name',
    type: 'text',
    description: 'The name of the theatre / hall / arena where the engagement is performed.',
    aliases: ['Theatre', 'Venue', 'Location', 'Place of Engagement', 'Engagement Venue', 'Facility'],
    examples: ['Brick Breeden Fieldhouse', 'EJ Thomas Hall', 'Weidner Center for the Performing Arts'],
    required: false,
  },
  {
    key: 'venueAddress',
    label: 'Venue Address',
    type: 'text',
    description: 'The street address of the venue (street line only; city/state/country are separate fields).',
    aliases: ['Address', 'Located at', 'Venue Address'],
    examples: ['1 Bobcat Circle', '198 Hill Street', '2420 Nicolet Drive'],
    required: false,
  },
  {
    key: 'venueCity',
    label: 'Venue City',
    type: 'text',
    description: 'The city of the venue.',
    aliases: ['City'],
    examples: ['Bozeman', 'Akron', 'Green Bay', 'London'],
    required: false,
  },
  {
    key: 'venueState',
    label: 'Venue State',
    type: 'text',
    description: 'The state or province of the venue.',
    aliases: ['State', 'Province'],
    examples: ['MT', 'OH', 'WI', 'ON'],
    required: false,
  },
  {
    key: 'venueCountry',
    label: 'Venue Country',
    type: 'text',
    description:
      'The country of the venue. Often implicit — infer it from the state/province, currency, or tax references (e.g. a province like ON with Canadian withholding implies Canada). Report lower confidence when inferred rather than stated.',
    aliases: ['Country'],
    examples: ['USA', 'Canada'],
    required: false,
  },
  {
    key: 'producer',
    label: 'Producer',
    type: 'text',
    description:
      'The producing / touring entity that provides the production and RECEIVES payment (the payee). This is NOT the presenter/purchaser/buyer, who is the party paying (usually Innovation Arts & Entertainment).',
    aliases: ['Producer', 'Loanout', 'Payee Entity', 'Company', 'Attraction Producer'],
    examples: ['Chicago Razzle Dazzle II, LLC', 'Kratt Brothers Company', 'Pilate Tour, LLC'],
    required: false,
  },
  {
    key: 'producerAddress',
    label: 'Producer Address',
    type: 'text',
    description: 'The mailing address of the producer/payee entity.',
    aliases: ['Producer Address', 'located at', 'c/o'],
    examples: ['c/o Apex Touring, LLC, 1380 Colonial Boulevard, Fort Myers, FL 33907'],
    required: false,
  },
  {
    key: 'producerFedId',
    label: 'Producer Federal ID',
    type: 'text',
    description:
      "The producer's US federal tax identification number (EIN), typically formatted NN-NNNNNNN. Do not confuse with SSN or account numbers.",
    aliases: ['Federal ID Number', 'Fed ID', 'EIN', 'Tax ID', 'Producer Federal ID Number'],
    examples: ['99-3649963', '22-3218704', '13-3136260'],
    required: false,
  },
  {
    key: 'guaranteeAmount',
    label: 'Guarantee Amount',
    type: 'amount',
    description:
      'The guaranteed / flat fee paid to the producer, as a number. If a range like "guarantee vs percentage" is given, use the guaranteed (flat) figure. Return digits only in the value (the currency goes in guaranteeCurrency).',
    aliases: ['Guarantee', 'Flat Fee', 'Guaranteed Fee', 'Compensation', 'Fee', 'Inclusive Guarantee'],
    examples: ['35000', '25000', '70000'],
    required: false,
  },
  {
    key: 'guaranteeCurrency',
    label: 'Guarantee Currency',
    type: 'currency',
    description:
      'The 3-letter ISO currency code of the guarantee (e.g. USD, CAD, GBP). Infer from explicit markers like "U.S. Dollars", "Canadian Dollars", or a Canadian venue/tax context.',
    aliases: ['Currency', 'U.S. Dollars', 'Canadian Dollars'],
    examples: ['USD', 'CAD'],
    required: false,
  },
  {
    key: 'depositAmount',
    label: 'Deposit Amount',
    type: 'amount',
    description: 'The advance/deposit amount due before the engagement, as digits only.',
    aliases: ['Deposit', 'Advance', 'Deposit Payment'],
    examples: ['2500', '5000'],
    required: false,
  },
  {
    key: 'depositDueDate',
    label: 'Deposit Due Date',
    type: 'date',
    description: 'The date the deposit/advance is due.',
    aliases: ['Deposit due', 'Advance due', 'payable by'],
    examples: ['March 1, 2025', '2025-03-01'],
    required: false,
  },
  {
    key: 'balanceAmount',
    label: 'Balance Amount',
    type: 'amount',
    description:
      'The balance due (typically at/prior to the performance), as digits only. If not stated explicitly, leave empty — it may be derived as guarantee minus deposit.',
    aliases: ['Balance', 'Remaining Balance', 'Balance due'],
    examples: ['22500', '32500'],
    required: false,
    derivation: 'balanceFromGuaranteeMinusDeposit',
  },
  {
    key: 'balanceDueDate',
    label: 'Balance Due Date',
    type: 'date',
    description: 'The date the balance is due (often the day of / prior to the first performance).',
    aliases: ['Balance due', 'prior to the first performance', 'payable by'],
    examples: ['prior to the first performance', '2025-02-26'],
    required: false,
  },
  {
    key: 'royaltyDescription',
    label: 'Royalty Description',
    type: 'section',
    description:
      'The royalty / variable fee / merchandise-royalty terms, quoted or summarized (e.g. a percentage of NAGBOR/NAGWBOR). Include the definition where helpful.',
    aliases: ['Royalty', 'Variable Fee', 'Royalty on NAGBOR', 'Merchandise Royalty', 'Percentage of NAGBOR'],
    examples: ['10% of NAGBOR', '10% of NAGWBOR variable fee'],
    required: false,
  },
  {
    key: 'overageDescription',
    label: 'Overage Description',
    type: 'section',
    description:
      'The overage / backend / profit-split terms after guarantee and expenses (e.g. producer/presenter split percentages, "next monies").',
    aliases: ['Overage', 'Producer Overages', 'Presenter Overages', 'Split', 'Backend', 'Next Monies'],
    examples: ['65% to the Producer / 35% to the Presenter', '70% Producer / 30% Presenter; $2,500 next monies'],
    required: false,
  },
  {
    key: 'paymentTerms',
    label: 'Payment Terms',
    type: 'section',
    description: 'When and how payments are made (deposit timing, balance timing, settlement, wire vs check).',
    aliases: ['Payment', 'Terms of Payment', 'Compensation', 'Purchaser will make payments'],
    examples: ['Deposit on signing; balance before first performance; settlement within 2 business days.'],
    required: false,
  },
  {
    key: 'paymentMethodType',
    label: 'Payment Method Type',
    type: 'text',
    description: 'The method of payment (e.g. Wire, ACH, Check/Cheque, Bank Transfer).',
    aliases: ['Payment method', 'method of payment', 'wire transfer', 'company check', 'ACH'],
    examples: ['Wire', 'ACH', 'Check'],
    required: false,
  },
  {
    key: 'paymentPayableTo',
    label: 'Payment Payable To',
    type: 'text',
    description: 'The entity to which payment/checks are made payable.',
    aliases: ['payable to', 'made payable to', 'in the name of', 'payee'],
    examples: ['Kratt Brothers Company', 'Pilate Tour, LLC', 'The Brad Simon Organization, Inc.'],
    required: false,
  },
  {
    key: 'paymentBankName',
    label: 'Payment Bank Name',
    type: 'text',
    description: "The producer's bank name for wire/ACH payment.",
    aliases: ['Bank', 'Financial institution', 'Bank name'],
    examples: ['Citibank, N.A.', 'Community Bank, N.A.'],
    required: false,
  },
  {
    key: 'performances',
    label: 'Performances',
    type: 'section',
    description: 'The performance schedule — dates, times, and number of performances.',
    aliases: ['Performance Schedule', 'Date', 'Show Time', '# of Performances', 'Engagement'],
    examples: ['February 26, 2025 at 7:30 PM (1 performance)', 'April 3, 2025 at 6:30 PM'],
    required: false,
  },
  {
    key: 'additionallyInsured',
    label: 'Additionally Insured',
    type: 'section',
    description: 'The parties that must be named as additional insured on insurance certificates.',
    aliases: ['Additional Insured', 'Additionally Insured', 'named as additional insureds'],
    examples: ['Innovation Arts & Entertainment and its subsidiaries and affiliated entities'],
    required: false,
  },
];
