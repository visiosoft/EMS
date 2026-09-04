import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  steps: string[];
  tips?: string[];
  relatedPages?: string[];
}

export const DEFAULT_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: 'kb_add_venue',
    title: 'How to Add a Venue & Configure Seating Capacity',
    category: 'Venues & Facilities',
    tags: ['venue', 'add venue', 'capacity', 'seating capacity', 'facilities', 'stage specs'],
    summary: 'Step-by-step guide to adding a new physical theatre or arena venue to the EMS directory.',
    steps: [
      'Navigate to **Venues** (or **Companies**) in the main sidebar navigation.',
      'Click the **+ Add Venue** (or **+ Add Company** with type "Venue") button in the top toolbar.',
      'Enter the **Venue Name** and fill in the **Physical Address** (Street Address, City, State/Province, Postal Code, and Country).',
      'Set the physical **Seating Capacity** (total number of physical fixed seats in the auditorium/hall).',
      'Select the **Venue Type** (e.g., Theatre, Arena, Performing Arts Center, Amphitheatre) and **Seating Type** (e.g., Reserved, General Admission, Tiered).',
      'Optionally specify **Stage Dimensions**, **Fly System Specs**, **Stage Type**, and **Sales Tax Rate**.',
      'Click **Save Venue**. The venue is now registered in `dbo.Venue` and `dbo.Company`, ready to be selected for Project routings and Engagement bookings.',
    ],
    tips: [
      'Venues are stored as organizations in `dbo.Company` (CompanyType = Venue) linked 1:1 with `dbo.Venue`.',
      'Physical seating capacity is stored in `SeatingCapacity`. For show-specific capacities minus production holds, use `SellableCapacity` in Engagements.',
      'You can upload seating charts and stage spec PDFs directly in the venue detail tabs.',
    ],
    relatedPages: ['/all-venues', '/companies'],
  },
  {
    id: 'kb_create_project',
    title: 'How to Create a Project & Route a Tour to Venues',
    category: 'Routing Pipeline & Projects',
    tags: ['project', 'create project', 'routing', 'offers', 'drafted offer', 'in consideration', 'confirmed offer'],
    summary: 'Guide for creating tour routing projects, pitching candidate venues, and generating offers.',
    steps: [
      'In the left navigation sidebar, click **Projects**.',
      'Click the **+ Create Project** button in the top action header.',
      'Select the **Tour / Attraction** from the dropdown roster and choose the **Project Year**.',
      'In the Project Wizard, browse and add candidate **Venues** for the tour routing cycle.',
      'For each venue, assign the initial **Venue Status** (e.g., "Drafted", "In Consideration", or "Confirmed").',
      'Add proposed **Performance Options** (dates, show times, ticket pricing scaling, and financial guarantees).',
      'Upload or generate the **Drafted / Confirmed Offer PDF** if required.',
      'Click **Finish & Create Project**. The project will appear in your project pipeline.',
    ],
    tips: [
      'Status flow: **Drafted Offer** (internal proposal) -> **In Consideration** (sent to promoter/venue) -> **Confirmed** (deal accepted & signed).',
      'Once a project venue is confirmed, you can convert it into an active Engagement with full box office tracking.',
    ],
    relatedPages: ['/projects'],
  },
  {
    id: 'kb_create_engagement',
    title: 'How to Create and Manage an Engagement Booking',
    category: 'Bookings & Engagements',
    tags: ['engagement', 'booking', 'show dates', 'performances', 'settlement', 'contracts'],
    summary: 'Instructions for setting up a confirmed tour engagement, adding show performances, and tracking financials.',
    steps: [
      'Navigate to **Engagements** in the left sidebar.',
      'Click **+ Add Engagement** (or convert an existing Confirmed Project Venue).',
      'Select the **Tour**, specify the **Engagement Status** (e.g., "Confirmed", "In Progress", "Contract Signed"), and choose the **Scaling** structure.',
      'Enter the **Sellable Capacity** (total tickets on sale after production holds) and estimated **Gross Potential** ($).',
      'In the **Venues Tab**, select the primary facility where the event takes place (`IsPrimary = 1`).',
      'In the **Performances Tab**, add each individual show/curtain time by specifying the **Performance Date**, **Time**, and **Ticketing Status** (e.g., "Public (On-Sale)").',
      'In the **Travel & Production Tabs**, schedule hotel accommodations, car services, buyout terms, and equipment rentals.',
      'Click **Save**. The engagement is now live on the calendar and daily sales dashboards.',
    ],
    tips: [
      'The earliest `PerformanceDate` in the performances list represents the opening night of the engagement.',
      'Use the **Finance** tab to set deposit milestones, withholding taxes (NRW), and box office split terms.',
    ],
    relatedPages: ['/engagements', '/calendar'],
  },
  {
    id: 'kb_daily_sales',
    title: 'How to Record and Monitor Daily Ticket Sales',
    category: 'Daily Sales & Box Office',
    tags: ['daily sales', 'ticket sales', 'box office', 'revenue', 'gross', 'tickets sold', 'velocity'],
    summary: 'How to input daily box office reports and analyze ticket sales velocity.',
    steps: [
      'Click **Daily Sales** (or **Sales Summary**) in the left sidebar.',
      'Select the **Engagement** and the specific **Performance Date / Time** you want to report on.',
      'In the daily entry row for the corresponding date, input the **Performance Sales Quantity** (cumulative or incremental tickets sold) and **Performance Sales Revenue** ($ gross revenue).',
      'Review the **Percentage Sold** and **Remaining Capacity** calculated against the engagement Sellable Capacity.',
      'Save the row. The updated figures will immediately reflect across the **Attraction Sales Summary**, **Engagement Dashboard**, and executive reports.',
    ],
    tips: [
      'Sales are tracked in `dbo.TicketingSales` joined to `dbo.Performance` and `dbo.Engagement`.',
      'You can also ask the AI assistant: "Show summary of recent daily ticket sales for [Show Name]" for instant velocity reporting.',
    ],
    relatedPages: ['/daily-sales', '/sales-summary'],
  },
  {
    id: 'kb_add_contact',
    title: 'How to Add Contacts and Assign Roles to Companies',
    category: 'Personnel & Contacts',
    tags: ['contact', 'add contact', 'promoter', 'agent', 'booker', 'assign contact', 'personnel'],
    summary: 'Adding agents, promoters, bookers, and personnel and assigning them to companies.',
    steps: [
      'Click **Contacts** in the main sidebar.',
      'Click **+ Add Contact** in the top toolbar.',
      'Enter the person\'s **First Name**, **Last Name**, **Email Address**, **Cell Phone**, and **Work Phone**.',
      'Under **Company Assignment**, choose the affiliated **Company** (e.g., Promoter agency, Venue, or Talent Agency).',
      'Select the person\'s **Role** (e.g., "Booker", "Agent", "Tour Manager", "Executive", "Production Manager") and **Department**.',
      'Click **Save Contact**. The contact is recorded in `dbo.ContactInfo` and linked via `dbo.ContactAssignment`.',
    ],
    tips: [
      'A single contact can be assigned to multiple companies or departments with different roles.',
      'Internal employees can also be synced automatically with Microsoft Entra ID in Settings.',
    ],
    relatedPages: ['/contacts', '/companies'],
  },
  {
    id: 'kb_entra_sync',
    title: 'How to Sync Directory Users with Microsoft Entra ID',
    category: 'Administration & Security',
    tags: ['entra', 'azure ad', 'sync users', 'microsoft graph', 'active directory', 'roles', 'permissions'],
    summary: 'Guide for syncing internal staff directory and contact profiles with Microsoft Entra ID (Azure AD).',
    steps: [
      'Ensure you are signed in with an Administrator account.',
      'Navigate to **Settings** in the left sidebar and select the **Users** tab.',
      'View the real-time employee directory loaded via Microsoft Graph.',
      'Click **Sync Preview** to compare discrepancies between Microsoft Entra and EMS internal contact records.',
      'Choose the sync direction: **Entra -> EMS** (import directory updates) or **EMS -> Entra** (push internal updates).',
      'Select which fields to synchronize (Job Title, Department, Phone, Email) and click **Apply Selected Changes**.',
      'The synchronization completes with an audit log entry in the system.',
    ],
    tips: [
      'Delegated Graph permission `User.Read.All` is required for tenant-wide directory access.',
      'Access levels (Admin, Booker, Management, Staff) are mapped from Entra security groups and directory roles.',
    ],
    relatedPages: ['/settings'],
  },
  {
    id: 'kb_contracts_seating_charts',
    title: 'How to Upload & Extract Contracts and Seating Charts',
    category: 'Document Library & Contracts',
    tags: ['contracts', 'upload pdf', 'ai extraction', 'seating chart', 'riders', 'docx'],
    summary: 'Uploading booking contracts, stage riders, and seating charts with automated AI extraction.',
    steps: [
      'Open the target **Engagement Detail** or **Project Detail** page.',
      'Navigate to the **Contracts** (or **Venues / Files**) tab.',
      'Click **Upload Contract** and select a PDF or DOCX contract file from your computer.',
      'The system stores the document securely in SharePoint / local storage and triggers the **Contract LLM Extraction Service**.',
      'Review the extracted parameters: Performance Dates, Financial Guarantees, Deposit Schedules, and Additionally Insured names.',
      'Click **Accept Extracted Fields** to populate the engagement record automatically.',
    ],
    tips: [
      'Supported formats: flattened PDFs, scanned PDF documents, and Microsoft Word (.docx).',
      'Seating charts can also be uploaded in the Venue Profile tab for visual seating review.',
    ],
    relatedPages: ['/engagements', '/projects'],
  },
  {
    id: 'kb_ask_ai_usage',
    title: 'How to Use the Ask AI Intelligence Assistant',
    category: 'AI Assistant & Automation',
    tags: ['ai', 'ask ai', 'settings', 'prompts', 'openai', 'claude', 'schema rules'],
    summary: 'How to query live EMS data, switch models, and train custom business rules.',
    steps: [
      'Click the floating gradient **Ask AI** button at the bottom-right of your screen, or press **Ctrl+Space** / **Ctrl+J** anywhere in the app.',
      'Type any question about events, venues, ticket sales, promoter contacts, or system workflows (e.g., "Find top 5 venues in New York by seating capacity", "How do I create an offer?").',
      'The AI queries the live API tools and database schema to provide fact-grounded answers.',
      'To switch AI models (OpenAI GPT-4o vs Anthropic Claude 3.5), open **⚙️ Settings** in the popup header.',
      'In **Schema & Table Rules**, you can write custom business rules in front of any database table to train the AI on internal conventions.',
    ],
    tips: [
      'The AI uses an Anti-Hallucination policy: if data does not exist in the database, it will explicitly inform you rather than guess.',
      'Use the model dropdown at the bottom of the chat to switch between OpenAI and Claude instantly.',
    ],
    relatedPages: ['/settings'],
  },
];

export function getFullKnowledgeBase(): KnowledgeArticle[] {
  const filePath = path.resolve(process.cwd(), 'backend', 'data', 'knowledge-base.json');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const custom: KnowledgeArticle[] = JSON.parse(raw);
      return custom;
    }
  } catch {
    // fallback
  }
  return DEFAULT_KNOWLEDGE_BASE;
}

export function saveKnowledgeBase(articles: KnowledgeArticle[]): void {
  const filePath = path.resolve(process.cwd(), 'backend', 'data', 'knowledge-base.json');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(articles, null, 2), 'utf-8');
}
