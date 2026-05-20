import { useEffect, type ReactNode } from "react";
import { Banknote, BookOpen, ClipboardCheck, Home, Lectern, Star, UserRoundCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { InternalPageHero } from "../components/InternalPageHero";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import type { EmployeeHandbookView } from "../routing/internalSessionRoute";

export type { EmployeeHandbookView };

type HandbookSectionId =
  | "introduction"
  | "employment-policies"
  | "company-policies"
  | "compensation-benefits"
  | "department-guides"
  | "work-performance"
  | "employee-acknowledgment";

type HandbookSection = {
  id: HandbookSectionId;
  title: string;
  heroTitle: string;
  hash: string;
  icon: LucideIcon;
};

type IntroductionSubsection = {
  id: string;
  title: string;
};

type HandbookContentBlock =
  | { kind: "paragraph"; text: string; italic?: boolean }
  | { kind: "heading"; text: string; italic?: boolean }
  | { kind: "list"; items: string[] };

type HandbookSubsection = {
  id: string;
  title: string;
  blocks: HandbookContentBlock[];
};

type HandbookDetailSection = {
  id: Exclude<HandbookSectionId, "introduction">;
  heroTitle: string;
  subsections: HandbookSubsection[];
};

const handbookStageImage = "/images/internal/bf7ddb8a-fab3-42ff-8fce-15c415b150c8";

const handbookSections: HandbookSection[] = [
  { id: "introduction", title: "Introduction", heroTitle: "1. Introduction", hash: "handbook-introduction", icon: Lectern },
  {
    id: "employment-policies",
    title: "Employment Policies and Practices",
    heroTitle: "2. Employment Policies and Practices",
    hash: "handbook-employment-policies",
    icon: UserRoundCog,
  },
  {
    id: "company-policies",
    title: "Company Policies and Practices",
    heroTitle: "3. Company Policies and Practices",
    hash: "handbook-company-policies",
    icon: Home,
  },
  {
    id: "compensation-benefits",
    title: "Compensation and Benefits",
    heroTitle: "4. Compensation and Benefits",
    hash: "handbook-compensation-benefits",
    icon: Banknote,
  },
  {
    id: "department-guides",
    title: "Department Guides and Procedures",
    heroTitle: "6. Procedures and Guidelines",
    hash: "handbook-department-guides",
    icon: BookOpen,
  },
  { id: "work-performance", title: "Work Performance", heroTitle: "5. Work Performance", hash: "handbook-work-performance", icon: Star },
  {
    id: "employee-acknowledgment",
    title: "Employee Acknowledgment Form",
    heroTitle: "7. Employee Acknowledgment",
    hash: "handbook-employee-acknowledgment",
    icon: ClipboardCheck,
  },
];

const introductionSubsections: IntroductionSubsection[] = [
  { id: "message-from-ceo", title: "1.1 A Message from the CEO" },
  { id: "the-company", title: "1.2 The Company" },
  { id: "change-in-policy", title: "1.3 Change in Policy" },
];

const departmentSummaries = [
  {
    title: "Executive & Programming",
    text: "The office of the CEO; management of attraction and venue relationships, booking of IAE engagements",
  },
  {
    title: "Art & Graphic Design",
    text: "Design and creation of marketing and promotion materials for IAE engagements",
  },
  {
    title: "Marketing",
    text: "Development and execution of marketing, promotion, and public relations strategies for IAE engagements.",
  },
  {
    title: "Production",
    text: "Procurement, preparation, and logistical organization of all vendors, venues, equipment, and labor necessary for successful execution of IAE engagements",
  },
  {
    title: "Event Business",
    text: "Management of financial settlements and business relationships related to IAE engagements.",
  },
  {
    title: "Ticketing & Sales",
    text: "Management and execution of ticket sales strategies for IAE engagements",
  },
  {
    title: "Operations",
    text: "Company, physical office, and employee support; human resources, financial accounting, and internal operations",
  },
];

function HandbookIntroCard() {
  const { navigateHandbook } = useInternalNavigation();

  return (
    <article
      className="relative h-[332px] overflow-hidden rounded-[5px] border border-neutral-800 bg-[#130606] bg-cover bg-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
      style={{ backgroundImage: `url('${handbookStageImage}')` }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-black/20" />

      <div className="relative flex h-full flex-col px-5 py-5">
        <span className="w-max bg-black/75 px-2 py-1 text-[8px] font-semibold uppercase leading-none text-white">
          Employee Handbook
        </span>
        <h2 className="mt-3 max-w-[310px] text-[30px] font-semibold leading-[1.28] text-white">
          A Message From the Chief Executive Officer
        </h2>
        <p className="mt-auto max-w-[390px] text-[14px] leading-[1.7] text-white/95">
          Introducing the Innovation Arts Entertainment Employee Handbook.
        </p>
        <button
          type="button"
          onClick={() => navigateHandbook("handbook-introduction")}
          className="mt-3 inline-flex h-[27px] w-[93px] items-center justify-center rounded-[3px] bg-white text-[13px] font-medium text-black transition duration-200 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          View Section
        </button>
      </div>
    </article>
  );
}

function scrollToHandbookElement(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function SectionNavButtons({ currentId, tone = "light" }: { currentId: HandbookSectionId; tone?: "light" | "dark" }) {
  const { navigateHandbook } = useInternalNavigation();
  const buttonClass =
    tone === "dark"
      ? "bg-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.28)] hover:bg-neutral-900 focus-visible:ring-black"
      : "border border-neutral-300 bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-neutral-100 focus-visible:ring-white";
  const currentIndex = handbookSections.findIndex((section) => section.id === currentId);
  const previousHash = currentIndex > 0 ? handbookSections[currentIndex - 1].hash : "handbook";
  const nextHash = currentIndex >= 0 && currentIndex < handbookSections.length - 1 ? handbookSections[currentIndex + 1].hash : "handbook";

  return (
    <nav className="mx-auto flex w-full max-w-[496px] flex-col gap-2 sm:flex-row" aria-label="Handbook section navigation">
      <button
        type="button"
        onClick={() => navigateHandbook(previousHash)}
        className={`${buttonClass} inline-flex h-[38px] flex-1 items-center justify-center rounded-[4px] px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      >
        &larr; Previous Section
      </button>
      <button
        type="button"
        onClick={() => navigateHandbook("handbook")}
        className={`${buttonClass} inline-flex h-[38px] flex-1 items-center justify-center rounded-[4px] px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      >
        Home
      </button>
      <button
        type="button"
        onClick={() => navigateHandbook(nextHash)}
        className={`${buttonClass} inline-flex h-[38px] flex-1 items-center justify-center rounded-[4px] px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      >
        Next Section &rarr;
      </button>
    </nav>
  );
}

function IntroductionHero() {
  return (
    <section
      id="handbook-introduction"
      className="relative isolate flex min-h-[274px] scroll-mt-16 flex-col items-center justify-center overflow-hidden bg-[#0b080c] px-5 py-10 text-center text-white"
      style={{
        backgroundImage: "url('/internal-hub-bg.svg')",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/8" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[760px] flex-col items-center">
        <h1 className="text-[clamp(2.45rem,6vw,3.35rem)] font-semibold leading-[1.05] text-white">
          1. Introduction
        </h1>
        <div className="mt-[54px] w-full">
          <SectionNavButtons currentId="introduction" />
        </div>
      </div>
    </section>
  );
}

function IntroductionSideNav() {
  return (
    <nav className="space-y-[10px]" aria-label="Introduction subsections">
      {introductionSubsections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => scrollToHandbookElement(section.id)}
          className="flex h-[43px] w-full items-center rounded-[4px] bg-black px-[17px] text-left text-[14px] font-normal text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}

function HandbookParagraph({ children, italic = false }: { children: ReactNode; italic?: boolean }) {
  return <p className={`text-left text-[16px] leading-[1.78] text-neutral-900 md:text-justify ${italic ? "italic" : ""}`}>{children}</p>;
}

function MessageFromCeoSection() {
  return (
    <section id="message-from-ceo" className="scroll-mt-20">
      <h2 className="text-[25px] font-semibold leading-tight text-neutral-900">1.1 A Message from the CEO</h2>
      <div className="mt-[17px] space-y-[15px]">
        <p className="text-[16px] leading-[1.78] text-neutral-900">Welcome!</p>
        <HandbookParagraph>
          You have just joined a dynamic and rapidly growing company. We hope that your employment with Innovation Arts &amp; Entertainment will be both challenging and rewarding. We are proud of the professional services we provide - and we are equally proud of our employees, who enable and enhance our ability to perform our work at a high level.
        </HandbookParagraph>
        <HandbookParagraph>
          Our employee handbook is intended to provide employees with important policy and procedure guidelines to learn and follow, as well as a reference source for many aspects of life at Innovation Arts &amp; Entertainment.
        </HandbookParagraph>
        <HandbookParagraph>
          Our people are energetic, and our office life is fast paced. Be prepared to learn, grow, and perform important work, daily - and your days here will fly by.
        </HandbookParagraph>
        <p className="text-[16px] leading-[1.78] text-neutral-900">We wish you remarkable success!</p>
        <p className="text-[16px] font-semibold leading-[1.78] text-neutral-900">Adam Epstein</p>
      </div>
    </section>
  );
}

function CompanySection() {
  return (
    <section id="the-company" className="scroll-mt-20 pt-[44px]">
      <h2 className="text-[25px] font-semibold leading-tight text-neutral-900">1.2 The Company</h2>
      <div className="mt-[17px] space-y-[15px]">
        <HandbookParagraph>
          The Innovation Arts &amp; Entertainment (IAE) was founded on March 27, 2000, the birthday of its Founder, Adam Epstein. To this day, IAE remains a fiercely independent boutique producer of unique live events featuring intelligent and entertaining artists and attractions. IAE presents engaging live experiences including concerts, touring Broadway, Spoken Word events, Symphonic spectacles, music festivals, and family and children's programming across the United States and Canada.
        </HandbookParagraph>
        <HandbookParagraph>
          Every IAE engagement is executed to the highest standard - a result of a team effort using strategic processes designed to ensure audiences receive tremendous entertainment value, our venues proudly host our events, our attractions receive expertly produced events, and our partners receive profitable outcomes.
        </HandbookParagraph>
        <HandbookParagraph>
          IAE is made up of seven departments, with an almost singular focus on IAE engagements:
        </HandbookParagraph>

        <div className="space-y-[28px] pt-1">
          {departmentSummaries.map((department) => (
            <section key={department.title} aria-label={department.title}>
              <h3 className="text-[16px] font-semibold leading-[1.7] text-neutral-900">{department.title}</h3>
              <ul className="mt-[15px] list-disc pl-[18px] text-[16px] leading-[1.78] text-neutral-900">
                <li className="pl-1 text-left md:text-justify">{department.text}</li>
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChangePolicySection() {
  return (
    <section id="change-in-policy" className="scroll-mt-20 pt-[44px]">
      <h2 className="text-[25px] font-semibold leading-tight text-neutral-900">1.3 Change in Policy</h2>
      <div className="mt-[17px] space-y-[15px]">
        <HandbookParagraph>
          At Innovation Arts &amp; Entertainment, we recognize and embrace that change is inevitable. Therefore, we reserve the right to interpret, change, suspend, cancel, or dispute, with or without notice, all or any part of our policies, procedures, and benefits at any time with or without prior notice.
        </HandbookParagraph>
        <HandbookParagraph>
          Changes will be effective on the dates determined by IAE, and after those dates, all superseded policies will be invalid.
        </HandbookParagraph>
        <HandbookParagraph>
          No individual supervisor or manager has the authority to alter the foregoing. Any employee who is unclear on any policy or procedure should consult with a supervisor or the Director of Operations.
        </HandbookParagraph>
      </div>
    </section>
  );
}

const paragraph = (text: string, italic = false): HandbookContentBlock => ({ kind: "paragraph", text, italic });
const heading = (text: string, italic = false): HandbookContentBlock => ({ kind: "heading", text, italic });
const list = (items: string[]): HandbookContentBlock => ({ kind: "list", items });

const handbookDetailSections: Record<Exclude<HandbookSectionId, "introduction">, HandbookDetailSection> = {
  "employment-policies": {
    id: "employment-policies",
    heroTitle: "2. Employment Policies and Practices",
    subsections: [
      {
        id: "equal-employment-opportunity",
        title: "2.1 Equal Employment Opportunity (Illinois)",
        blocks: [
          paragraph(
            "Innovation Arts & Entertainment is proud to be an equal opportunity employer and is committed to the principles of fair employment. IAE extends equal opportunity to all individuals, regardless of race, age, color, sex, religion, creed, national origin, marital status, disability, or any other status protected under law."
          ),
          paragraph(
            "This commitment applies to all employment terms and conditions, including recruitment, hiring, placement, compensation, performance reviews, disciplinary actions, and termination."
          ),
          paragraph(
            "The Company provides reasonable accommodation for qualified individuals with known limitations under the Pregnant Workers Fairness Act or disabilities whenever possible. Reasonable accommodation requests should be directed to the Director of Operations."
          ),
        ],
      },
      {
        id: "anti-discrimination-harassment",
        title: "2.2 Anti-Discrimination and Anti-Sexual Harassment Policies",
        blocks: [
          paragraph(
            "Innovation Arts & Entertainment strongly prohibits discrimination or harassment of any kind. Harassment includes unwelcome conduct based on protected status and behavior that creates a hostile or abusive environment or results in an adverse employment decision."
          ),
          paragraph(
            "Sexual harassment includes unwelcome sexual advances, requests for sexual favors, and other verbal or physical harassment of a sexual nature. The Company has zero tolerance for sexual harassment and will treat all incidents seriously, confidentially, and expeditiously."
          ),
          paragraph(
            "Employees who feel they have been harassed, discriminated against, or retaliated against should immediately report the matter to their supervisor or the Director of Operations."
          ),
        ],
      },
      {
        id: "at-will-employment",
        title: "2.3 At-Will Employment",
        blocks: [
          paragraph(
            'Employment with Innovation Arts & Entertainment is "at will." Employees are free to resign at any time, with or without cause, and IAE may terminate the employment relationship at any time, with or without cause or advance notice.'
          ),
          paragraph("With at-will employment there is no guarantee of employment for any set period."),
          paragraph(
            "The policies in this handbook are the policies in effect at publication and may be amended, modified, or terminated at any time by IAE, except for the policy on at-will employment, which may be modified only by a signed written agreement between the CEO and the employee at issue."
          ),
        ],
      },
      {
        id: "employee-classifications",
        title: "2.4 Employee Classifications",
        blocks: [
          heading("Employee Categories"),
          paragraph(
            "This policy summarizes the different categories of employment at Innovation Arts & Entertainment. An employee category determines benefit eligibility and the policies and laws that apply to an employee."
          ),
          paragraph("Employees are categorized as either exempt or nonexempt for purposes of federal and state wage and hour laws."),
          heading("Non-exempt Employees"),
          list(["Employees whose work is covered by the Fair Labor Standards Act (FLSA) for minimum wage and overtime."]),
          heading("Exempt Employees"),
          list(["Employees who do not receive overtime pay and receive the same weekly salary regardless of hours worked."]),
          heading("Additional Classifications"),
          list([
            "Full-time employees regularly work IAE's full-time schedule and are eligible for IAE benefits.",
            "Part-time employees regularly work fewer hours than IAE's full-time schedule and are not eligible for the benefits offered by IAE.",
            "Short-term or temporary employees are hired for a specific project, per diem, freelance, or temporary basis and are not eligible for IAE benefits.",
            "Independent contractors and consultants are self-employed and not employees as defined by the IRS.",
            "On-call employees work only when called and are not eligible for IAE benefits.",
          ]),
          heading("Probationary Period"),
          paragraph(
            "Probation is a status given to new employees for the first 90 days of employment. Upon satisfactory completion, the employee enters a standard employment classification and can access benefits such as Workers' Compensation Insurance and Social Security."
          ),
        ],
      },
      {
        id: "confidentiality-trade-secrets",
        title: "2.5 Confidentiality and Trade Secrets",
        blocks: [
          paragraph(
            "Innovation Arts & Entertainment handles the protection of trade secrets and confidential business information in a strict manner. Employees must maintain trade secrets and other confidential business information in confidence."
          ),
          heading("Customer Data"),
          paragraph(
            "Customer data is collected during sales and marketing activity. Employees are expected to restrict the dissemination, discussion, distribution, and sharing of any customer data."
          ),
          paragraph(
            "Failure to protect customer data is grounds for immediate termination and may expose the company and employee to civil and criminal liability."
          ),
          heading("Proprietary Operations"),
          paragraph(
            "Confidential operations include contracts, proposals, offer sheets, budgets, marketing strategies, production processes, technological data, business records, and specific product and service information."
          ),
          heading("Third Party Information"),
          paragraph(
            "IAE does not wish to receive confidential information from employees or third parties and takes precautions to ensure received information is not proprietary information of another entity."
          ),
        ],
      },
    ],
  },
  "company-policies": {
    id: "company-policies",
    heroTitle: "3. Company Policies and Practices",
    subsections: [
      {
        id: "workweek-work-schedules",
        title: "3.1 Workweek and Work Schedules",
        blocks: [
          paragraph("The Innovation Arts & Entertainment Employee Handbook is intended to provide employees with a clear understanding of company policies and procedures."),
          paragraph("Given the nature of the live entertainment business, IAE's workweek runs from 12:00 AM on Sundays through 11:59 PM on Saturdays."),
          paragraph("Standard office hours for full-time employees working in the Chicago office are Monday through Thursday 8:30am - 5:30pm Central and Friday 9:00am - 1:00pm Central."),
          paragraph(
            "Employees are given the option to work from home on Fridays unless business circumstances require in-office attendance. Remote employees outside the Central time zone are encouraged to adapt accordingly."
          ),
          paragraph(
            "IAE recognizes that business may require standard office hours to stretch in either direction or over weekends due to deadlines, travel, onsite engagements, or scheduling considerations."
          ),
        ],
      },
      {
        id: "access-key-card-policy",
        title: "3.2 Access Key Card Policy",
        blocks: [
          paragraph("Employees are responsible for maintaining security at Innovation Arts & Entertainment and may receive a key, key fob, or access card to enter the IAE office."),
          list([
            "Employees should never loan or duplicate a key, fob, or access card or unlock the building or office for another person unless the individual is authorized to enter.",
            "Employees should report lost, stolen, or misplaced keys or access cards immediately.",
            "Employees are responsible for replacement costs and all keys and access cards must be returned to IAE upon separation.",
          ]),
        ],
      },
      {
        id: "company-property",
        title: "3.3 Use of Company Property",
        blocks: [
          paragraph("All property owned by IAE must be maintained in good working order and in accordance with IAE rules and regulations."),
          list([
            "Employees must maintain proper vigilance and care while in possession of company property.",
            "Loss of or damage to company property requires immediate reporting to the Director of Operations.",
            "IAE may inspect company property to ensure compliance.",
            "Prior authorization must be obtained before IAE property is removed from the premises.",
            "Employees must return all IAE property immediately upon termination or upon request.",
          ]),
        ],
      },
      {
        id: "technology-systems-software",
        title: "3.4 Technology Systems and Software",
        blocks: [
          paragraph(
            "IAE provides employees with access to company computer networks, communication, software, and technology systems to assist in conducting IAE business. Everything created, received, sent, or stored in these systems is the sole property of IAE."
          ),
          paragraph(
            "All IAE policies apply to employee conduct on the internet and when using IAE communication, software, and technology systems. Misuse should be reported to a company director immediately."
          ),
        ],
      },
      {
        id: "technical-support",
        title: "3.5 Technical Support",
        blocks: [
          paragraph("IAE provides tech support for all employees, including remote employees, via the company's IT Services provider, Genuity."),
          list([
            "Shut all programs down and restart your computer. See if the problem continues.",
            "If the problem recurs, email the Director of Operations with a clear, concise description.",
            "IAE will attempt to resolve the problem internally and escalate more troublesome issues to the managed IT services company.",
          ]),
        ],
      },
      {
        id: "expectation-privacy",
        title: "3.6 Expectation of Privacy",
        blocks: [
          paragraph(
            "Employees should have no expectation of privacy regarding their use of company internet and technology systems and should not use IAE systems for information they wish to keep private. IAE reserves the right to monitor and access company property."
          ),
        ],
      },
      {
        id: "cell-phone-policy",
        title: "3.7 Cell Phone Policy",
        blocks: [
          paragraph(
            "IAE seeks to provide a working environment where employees can focus with limited distractions. Use of personal cell phones during work hours is discouraged, and employees are expected to use professional judgment."
          ),
          paragraph("IAE is not liable for loss or damage to personal cell phones brought into the workplace."),
          paragraph("Employees should never use cell phones to conduct business while driving and must use hands-free devices when permitted by law."),
        ],
      },
      {
        id: "social-media-policy",
        title: "3.8 Social Media Policy",
        blocks: [
          paragraph("Employees using social media are expected to maintain a professional tone and understand that they may represent IAE even in a personal capacity."),
          list([
            "Do not disclose confidential, proprietary, or sensitive information about IAE, clients, partners, or associates.",
            "Engage respectfully and avoid offensive, discriminatory, or defamatory language.",
            "Distinguish personal opinion from IAE's position when identifying as an employee.",
            "Do not register personal accounts with an @innovationae.com email address.",
            "Respect the privacy of colleagues, clients, and partners.",
            "Do not engage in harassment, bullying, or cyberbullying.",
            "Follow laws and regulations related to copyright, intellectual property, privacy, and defamation.",
          ]),
          paragraph(
            "Clear boundaries between personal and professional interactions help employees feel safe and comfortable. Employees should treat colleagues with respect, report unwanted advances, and keep workplace relationships professional."
          ),
        ],
      },
      {
        id: "office-voicemail-policy",
        title: "3.9 Office Voicemail Policy",
        blocks: [
          paragraph("Employees are required to use the Company voicemail system to receive incoming voice messages."),
          paragraph(
            'Outgoing messages are pre-programmed using text-to-speech technology. Employees may record their own messages following IAE\'s Voicemail Setup Procedure.'
          ),
          heading("Voicemail Setup Procedure"),
          list([
            'Press the "Message" button on the desk phone for voicemail.',
            "Enter personal pin number followed by #.",
            "Press 6 for greetings.",
            "Press 1 to record a new greeting.",
            "Press 2 to review recorded messages.",
            'Press 3 to select the "situational" greeting for use.',
            "Employees unaware of their pin number should contact the Director of Operations.",
          ]),
        ],
      },
      {
        id: "email-signature-policy",
        title: "3.10 Email Signature Policy",
        blocks: [
          paragraph(
            "Employees are required to employ IAE's company email signature format on all outgoing emails. IAE signatures are displayed on both initial email and replies on desktop and mobile devices using the Email Signature Format Procedure."
          ),
        ],
      },
      {
        id: "out-of-office-policy",
        title: "3.11 Out-of-Office Policy",
        blocks: [
          paragraph("When out of the office for an extended period, employees must set up notifications for people attempting to contact them."),
          heading("Email"),
          paragraph("Create an out-of-office email auto-response with the date of return and alternate contact information for time-sensitive matters."),
          heading("Voicemail"),
          paragraph("Record an outgoing voicemail message with the date of return and alternate contact information for time-sensitive matters."),
        ],
      },
      {
        id: "distribution-lists",
        title: "3.12 Distribution Lists, Groups, and Teams",
        blocks: [
          paragraph(
            "Employees are not permitted to add new Distribution Lists, Groups, or Teams in Microsoft Outlook and Teams. Requests should be submitted to IAE's Director of Operations with the proposed name and members."
          ),
        ],
      },
      {
        id: "labeling-coding-policy",
        title: "3.13 Labeling and Coding Policy",
        blocks: [
          paragraph(
            "To promote efficient workflow and accurate work product, employees are required to follow the conventions detailed in IAE's Labeling and Coding Procedure."
          ),
        ],
      },
      {
        id: "document-management-policy",
        title: "3.14 Document Management Policy",
        blocks: [
          paragraph("Document management is the process of managing creation, review, approval, distribution, and revision of documents in the IAE environment."),
          paragraph(
            "Employees should save documents to the correct location the first time, avoid personal documents on shared storage, avoid duplicates, and follow company naming conventions."
          ),
          paragraph(
            "Supervisors are responsible for reviewing and approving documents before publication and distribution, deciding when revisions are necessary, and ensuring files are stored in the appropriate folders."
          ),
          heading("External File Sharing"),
          paragraph(
            "External file sharing refers to distributing digital files outside IAE. No attachments may be added to emails for outside distribution; files should be shared using the Share function in OneDrive and SharePoint."
          ),
          paragraph(
            "Share only with specific people, avoid anonymous guest links, limit permissions to the least access needed, and discuss document distribution circumstances with a supervisor for guidance and approval."
          ),
          heading("Additional Precautions for External Sharing"),
          list([
            "Never share access to a folder.",
            "Never attach a Microsoft Excel file to any email.",
            "When sharing Excel files, limit access to only the sheet or sheets intended for the recipient.",
          ]),
        ],
      },
      {
        id: "expense-reporting-reimbursement",
        title: "3.15 Expense Reporting and Reimbursement Policy",
        blocks: [
          paragraph(
            "Every company expense must advance IAE goals and avoid waste. Legitimate business expenses are determined by IAE with reasonable, good-faith discretion."
          ),
          paragraph(
            "Employees must code expenses and financial transactions in Ramp accurately, with photo or PDF receipts attached within 48 hours of transactions."
          ),
          paragraph("When paying IAE business expenses, including travel expenses, employees are required to use their IAE corporate credit card issued by Ramp."),
        ],
      },
      {
        id: "work-from-home-policy",
        title: "3.16 Work From Home Policy",
        blocks: [
          paragraph(
            "To use work-from-home opportunities, employees must have a fully equipped workspace with a computer. IAE does not provide equipment for home offices."
          ),
          paragraph(
            "Employees working from home must be available for the full workday, perform required work, maintain communication with supervisors, and attend in-person meetings when required."
          ),
          paragraph("Traveling away from home for personal reasons during WFH periods is not permitted and may result in use of PTO."),
        ],
      },
      {
        id: "remote-worker-policy",
        title: "3.17 Remote Worker Policy",
        blocks: [
          paragraph("IAE's remote worker policy establishes guidelines for employees who work from home on a regular full-time basis."),
          heading("Basic Obligations"),
          list([
            "Be fully available by video conference and telephone during scheduled work hours.",
            "Respond to critical emails in a timely manner.",
            "Check in regularly with supervisors through Teams chat.",
            "Meet weekly with supervisors to discuss progress.",
            "Provide written summaries as requested.",
            "Request PTO when stepping away from work.",
            "Protect company data, proprietary information, and assets.",
          ]),
          heading("Travel Requirements"),
          paragraph("Remote employees may occasionally be required to attend company meetings in person. Travel must be approved before booking."),
          heading("Non-adherence"),
          paragraph("Failure to fulfill remote work requirements may result in disciplinary action, termination of remote work agreement, or termination of employment."),
        ],
      },
      {
        id: "credit-card-policy",
        title: "3.18 Credit Card Policy",
        blocks: [
          paragraph("These guidelines apply to employees authorized to use IAE corporate credit cards."),
          heading("Authorized Use"),
          paragraph("Company credit cards are for legitimate business expenses only. Personal use is prohibited."),
          heading("Cardholder Responsibilities"),
          paragraph(
            "Employees are responsible for securing company credit cards. Missing or stolen cards should be reported immediately to IAE's Director of Operations."
          ),
          paragraph("All purchases must be disclosed accurately in Ramp according to official coding requirements."),
        ],
      },
      {
        id: "travel-policy",
        title: "3.19 Travel Policy",
        blocks: [
          paragraph("Work-related travel includes booking for a group and booking for yourself."),
          heading("Booking Group Travel"),
          paragraph(
            "When booking ground transportation or hotels for non-company personnel, employees are required to use the company travel agent, Valise Travel."
          ),
          list([
            "For hotels, provide room type, check-in and check-out dates, and guest lists three weeks before reservation when possible.",
            "For ground transportation, provide date, time, vehicle type, pickup location, and drop-off location.",
          ]),
          heading("Booking Travel for Yourself"),
          paragraph("Employees are required to book air travel through Ramp and follow IAE travel booking parameters and spend limits."),
          list([
            "Book non-refundable flights only.",
            "Book flights at least 14 days in advance unless a supervisor approves an exception.",
            "Book economy class for flights less than six hours.",
            "Premium economy is allowed for flights greater than six hours.",
            "One checked bag and in-flight Wi-Fi are allowed.",
            "First-class airfare and airport lounge access are prohibited.",
          ]),
          heading("Hotels"),
          list([
            "Book hotels through Ramp unless an approved lower rate is available.",
            "Book the lowest safe, clean, and convenient lodging. Standard rooms should be at or below $250 per night.",
            "Room, tax, and self-parking are the only allowable company card hotel expenses.",
            "Paid valet parking is not permitted; self-parking is required.",
          ]),
          heading("Vehicle Rental"),
          list([
            "Create an Avis.com account and add the IAE Avis AWD code before requesting quotes.",
            "Use common sense when selecting approved vehicle type based on business need.",
            "Decline rental insurance and prepaid fuel options.",
            "Fines, penalties, traffic violations, parking violations, and towing are personal responsibility.",
          ]),
          heading("Ground Transportation"),
          paragraph("Rideshare services and taxis may be used only for work-related ground transportation needs. Premium tiers are not permitted."),
          heading("Per Diem and Client Meals"),
          list(["Onsite Days: $60/day.", "Travel Days: $45/day.", "Client meals should be capped at $90 per person and may not include alcohol.", "Tips are capped at 20% in the U.S. and 10-15% abroad."]),
        ],
      },
    ],
  },
  "compensation-benefits": {
    id: "compensation-benefits",
    heroTitle: "4. Compensation and Benefits",
    subsections: [
      {
        id: "salaries",
        title: "4.1 Salaries",
        blocks: [
          paragraph(
            "Subject to any exceptions provided by law, exempt employees will receive salary for any week in which they perform any work. IAE will comply with the Fair Labor Standards Act and applicable state law."
          ),
        ],
      },
      {
        id: "payroll-service-provider",
        title: "4.2 Payroll Service Provider",
        blocks: [
          paragraph("IAE partners with ADP for payroll and other services. Employees receive an online ADP account to download payroll records, W-2s, paystubs, and request paid time off."),
        ],
      },
      {
        id: "payroll-schedule",
        title: "4.3 Payroll Schedule",
        blocks: [paragraph("There are 26 bi-weekly payroll periods each year, with employees paid every other Friday for the full two-week period before payroll.")],
      },
      {
        id: "payroll-deductions",
        title: "4.4 Payroll Deductions",
        blocks: [
          paragraph("IAE withholds funds for legally mandatory reasons such as federal income tax, state income tax, FICA, Social Security, Medicare, and state disability insurance."),
          paragraph("Elected deductions may include IRA contributions or health insurance premiums. Employees can change exemptions or marital status through ADP."),
        ],
      },
      {
        id: "direct-deposit",
        title: "4.5 Direct Deposit",
        blocks: [
          paragraph("IAE requires employees to accept direct deposits for compensation and reimbursements. ADP handles payroll direct deposit and Ramp handles expense reimbursement deposit details."),
        ],
      },
      {
        id: "healthcare-plans",
        title: "4.6 Healthcare Plans",
        blocks: [
          paragraph("IAE health insurance benefits are intended to protect employees and families from monetary loss resulting from hospital, surgical, or other health-related expenses."),
          paragraph("Employees become eligible to opt for health insurance after completing the 90-day probationary period."),
          heading("Medical Insurance Coverage and Employee Benefit"),
          list([
            "For employees whose tenure is 91-365 days, the company pays 50% of the employee monthly premium for HMO coverage.",
            "For employees with IAE for over one year, the company pays 100% of the employee monthly premium for HMO coverage.",
            "Additional medical insurance plans are offered for enhanced coverage; premium differences are the employee's responsibility.",
            "Dependent premiums are the employee's responsibility.",
          ]),
          heading("Dental and Vision Insurance Plans"),
          list(["Optional dental and vision insurance is offered for employees and dependents.", "Premiums for these policies are the employees' responsibility."]),
          heading("Summary of Benefits"),
          list([
            "Standard Employee Health Plan.",
            "Blue Precision Gold HMO plan for employees employed more than 90 days.",
            "Enhanced Blue Choice Preferred Gold PPO and Blue PPO Platinum options.",
            "Principal Dental Plan and Principal Vision Plan summaries are available through Operations.",
          ]),
          paragraph("Plan documents are the source of truth if they conflict with handbook summaries."),
        ],
      },
      {
        id: "ira-retirement-plan",
        title: "4.7 IRA Retirement Plan",
        blocks: [
          paragraph(
            "Full-time employees become eligible to participate in the company retirement plan after 180 days of employment. IAE matches contributions up to federal percentage standards, approximately 4%, though rates may vary."
          ),
          paragraph("For details, contact IAE's Director of Operations."),
        ],
      },
      {
        id: "paid-time-off",
        title: "4.8 Paid Time Off",
        blocks: [
          paragraph(
            "Paid Time Off (PTO) is compensated time away from work for any reason, including vacation, personal, and sick days. New employees earn PTO beginning on the first day of employment and become eligible to use accrued PTO after the 90-day probation period."
          ),
          list([
            "PTO accrues pro rata each pay period.",
            "IAE does not ask for the reason associated with time off requests.",
            "Employees may request PTO in half-day increments.",
            "Employees may carry over a maximum of 40 hours of accrued PTO into a new calendar year.",
          ]),
        ],
      },
      {
        id: "paid-time-off-accrual",
        title: "4.9 Paid Time Off Accrual",
        blocks: [
          paragraph(
            "Accrual is a system where employees gradually earn time off based on hours worked. The rate is based on the employee's employment agreement and deposited each pay day."
          ),
        ],
      },
      {
        id: "requesting-paid-time-off",
        title: "4.10 Requesting Paid Time Off",
        blocks: [
          paragraph("Employees should first discuss PTO plans with their supervisor. Once agreed, requests should be entered into ADP so tracking and supervisor notice are accurate."),
          list([
            "Employees can request PTO in hourly increments.",
            "All regular workweek time away must be submitted in ADP.",
            "PTO requests cannot exceed accrued time in the PTO bank unless approved as unpaid time off or PTO advance.",
            "New employees become eligible to request PTO after completing the 90-day probation period, though PTO accrual begins on the first day of employment.",
          ]),
        ],
      },
      {
        id: "holidays",
        title: "4.11 Holidays",
        blocks: [
          paragraph("IAE provides employees with paid holidays listed in company materials. In-office days surrounding paid holidays are noted for vacation request guidance."),
          paragraph(
            "A flex period is a paid work period that does not count as PTO. Work may still need to be completed from almost anywhere on a casual schedule, including WFH."
          ),
          paragraph("Because IAE's business rarely stops, employees may occasionally be required to work during a holiday."),
        ],
      },
      {
        id: "pregnancy-accommodation",
        title: "4.12 Pregnancy Accommodation Policy",
        blocks: [
          paragraph("Employees limited in their ability to perform jobs because of pregnancy, childbirth, or related medical conditions may request reasonable accommodation as necessary."),
          list([
            "More frequent or longer breaks.",
            "Break time and appropriate facilities.",
            "Light duty assignments or temporary transfer.",
            "Accessible worksite.",
            "Suitable seating or equipment modification.",
            "Part-time or modified schedule.",
            "Reassignment to a vacant position.",
            "Leave of absence.",
          ]),
          paragraph(
            "IAE will not retaliate against an employee who requests or uses reasonable accommodation under this policy. Employees should speak with the Director of Operations."
          ),
        ],
      },
      {
        id: "unpaid-leave",
        title: "4.13 Unpaid Leave of Absence",
        blocks: [
          paragraph(
            "If paid time off is exhausted and an employee needs time off, they may request unpaid leave from their immediate supervisor. Requests must be in writing at least two weeks before the leave when practicable."
          ),
          paragraph("Employees may request unpaid leave only if all paid time off has been exhausted. Questions about benefit continuation should be directed to the Director of Operations."),
        ],
      },
    ],
  },
  "department-guides": {
    id: "department-guides",
    heroTitle: "6. Procedures and Guidelines",
    subsections: [
      {
        id: "email-signature-format",
        title: "6.1 Email Signature Format",
        blocks: [
          paragraph("Format IAE email signatures for initial email and replies on desktop and mobile devices using the templates below."),
          list(["Font: Aptos.", "Font size: 11.", "IAE graphic should match the width of the email address."]),
          heading("Desktop Format"),
          paragraph("Adam Troy Epstein - CEO | Innovation Arts & Entertainment - Phone: (312) 274-1800 x226 - Cell: (773) 580-8930 - The Garland Building - 111 N Wabash, Suite 919 | Chicago, IL | 60602 - Adam@InnovationAE.com - www.InnovationAE.com"),
          heading("Mobile Format"),
          paragraph("Adam Troy Epstein - CEO | Innovation Arts & Entertainment - Phone: (312) 274-1800 x226 - Cell: (773) 580-8930 - Adam@InnovationAE.com - www.InnovationAE.com"),
          paragraph("See what Innovation can bring to you!", true),
        ],
      },
      {
        id: "labeling-coding",
        title: "6.2 Labeling and Coding",
        blocks: [
          paragraph("Efficient management of electronic records begins with accurate and meaningful folder and file naming."),
          list([
            "Names should be interpretable by others in the department where the file resides.",
            "Names should be interpretable by future users of shared storage.",
            "Names should be distinguishable from similar files and different versions.",
            "Names should be consistent across the department or workgroup and comply with established conventions.",
          ]),
          paragraph("IAE employs mandatory labeling conventions for company work product on the IAE Cloud Server, online travel and accounting resources, and documents."),
        ],
      },
      {
        id: "digital-document-folders",
        title: "6.3 Digital Document Folders and Files",
        blocks: [
          heading("IAE Cloud Server - Main Folder Directory"),
          list(["Season Year", "Advance", "Event Business", "Marketing", "Operations", "Programming", "Ticketing"]),
          paragraph("No additional files or folders are to be added to the Main Folder Directory.", true),
          heading("Engagement Filing Method"),
          paragraph("All work product for a specific engagement must be filed in the folder designated for the engagement on the Cloud Server."),
          list(["Season Year", "City", "Attraction"]),
          heading("Attraction Folder Directory"),
          list(["Advance", "Booking", "Contracts", "Marketing", "Settlement", "Ticketing"]),
          paragraph("No additional folders are to be added to the Attraction Folder Directory.", true),
          heading("Document Filename Labeling"),
          list([
            '"What" / Attraction / Market / Season Year.',
            '"What" examples: Marketing Plan, Tour Settlement, Production Plan, Final Audit.',
            'Document example: "Marketing Plan Final Fantasy Sacramento 2025".',
          ]),
          heading("Ramp Payment Description and Memo Fields"),
          list([
            "Attraction / Market / Year of Engagement / Purpose.",
            "Bill payment description example: David Sedaris Des Moines 2025 Equipment Rental.",
            "Customer is the Market/City.",
            "Job is the Attraction plus year of engagement.",
          ]),
        ],
      },
      {
        id: "bill-payment-expense-reporting",
        title: "6.4 Bill Payment and Expense Reporting",
        blocks: [
          heading("Paying a Vendor with a check or via ACH/wire"),
          paragraph(
            "If paying with the Ramp Visa card, you do not need to create a vendor. The process below is only for mailed checks or electronic ACH/wire payment."
          ),
          list([
            'Select "Bill Pay" from the left menu.',
            'Click "New bill" and choose "Create bill without an invoice".',
            "Search carefully for the vendor and avoid creating duplicates.",
            "If a vendor is not present, select Create new vendor after checking alternate spellings.",
            "Enter contact information for the vendor representative.",
            "Do not check the vendor network invitation box unless directed.",
            "Payments cannot begin until vendor profile information is complete.",
          ]),
          heading("Complete the Bill Payment"),
          list([
            "Upload the invoice or document justifying the payment.",
            "Invoice number must not exceed 20 characters.",
            "Use the description format: Attraction, Market, Season Year, Purpose.",
            "Line items must be accurate because errors may reject payment requests.",
            "Every engagement expense must be tagged with a Customer: Job.",
            "ACH is IAE's preferred payment method when banking details are available.",
            "Use the memo field to explain to the vendor what the payment is for.",
          ]),
          heading("Expense Reimbursements"),
          paragraph("Team members receiving a per diem or using personal payment methods for pre-approved expenses can claim direct reimbursement."),
          list([
            'In the upper right corner, select "New" and then "Reimbursement".',
            "Attach receipts or enter No Receipt for a per diem.",
            "Enter merchant information and the required QuickBooks expense type.",
            "Enter personal bank information in your profile for ACH reimbursement.",
          ]),
          heading("Ramp Visa Card"),
          paragraph("All expenses must be entered promptly within 48 hours and accurately with photos or PDFs of receipts attached."),
          list([
            "Memo field: Attraction, City, Season Year, Purpose.",
            "Receipt field: attach a photo or PDF.",
            "Trip field: create a trip for travel to an engagement and link expenses.",
            "QuickBooks Desktop Account: choose the matching expense type.",
            "QuickBooks Desktop Vendor: choose or create the merchant vendor.",
            "QuickBooks Desktop Customer/Job: assign the expense to the correct engagement.",
          ]),
          heading("Ramp Support and Reference"),
          paragraph("For immediate help, email Ramp Support at support@ramp.com or call 855-206-7283. For IAE labeling and coding questions, contact the Director of Operations."),
        ],
      },
      {
        id: "travel-booking-expense-reporting",
        title: "6.5 Travel Booking and Expense Reporting",
        blocks: [
          paragraph(
            "In Ramp, enter your traveler profile and frequent flyer, hotel loyalty, TSA Pre, and other vital travel information. Always verify reservations connect to the appropriate travel vendor and loyalty number."
          ),
          heading("Booking Travel"),
          paragraph("There are two ways to book travel in Ramp. Both methods lead to the same result."),
          heading("Option 1: Book Travel First (Without Creating a Trip)"),
          list([
            "Go to the My Travel page.",
            "Choose Flight, Hotel, or Car.",
            "Fill out booking details directly or optionally click New Trip.",
          ]),
          heading("Booking Details"),
          list([
            "Flights: starting destination, destination, travel dates, and roundtrip or one-way trip type.",
            "Hotels: city of stay, check-in/check-out, and number of guests.",
            "Cars: pickup location, pickup date and time, drop-off date and time, and drop-off location.",
          ]),
          heading("Option 2: Create a Trip First (Recommended)"),
          list([
            "Click the New Trip button.",
            "Enter trip name, starting location, destination, departure and return dates, and reason for trip.",
            "Search flights, hotels, and cars filtered by trip dates.",
          ]),
          heading("Important Booking Notes"),
          list([
            "Book one travel type at a time.",
            "Complete flight booking first, then hotel, then car if applicable.",
            "Review details on the confirmation page.",
            "Enter loyalty numbers when applicable.",
            "Click Book when everything is correct.",
          ]),
          heading("Completing the Expense in Ramp"),
          list([
            "Locate the charge in Overview, My Expenses, or My Travel.",
            "Spent From: IAE General Events Fund.",
            "Memo: Attraction, City, Year, Purpose.",
            "Receipt: upload the Ramp confirmation email receipt.",
            "Trip: select the correct trip.",
            "QuickBooks Desktop Account: appropriate expense code.",
            "QuickBooks Desktop Vendor: vendor name.",
            "QuickBooks Desktop Class: type of show supported.",
            "QuickBooks Desktop Customer/Job: correct show name with city/state.",
          ]),
        ],
      },
    ],
  },
  "work-performance": {
    id: "work-performance",
    heroTitle: "5. Work Performance",
    subsections: [
      {
        id: "performance-reviews",
        title: "5.1 Performance Reviews",
        blocks: [
          paragraph("The annual performance review process is an important part of ongoing dialogue between supervisors and employees and continuous employee and company growth."),
          paragraph("Employees assess themselves and write a self-review. Supervisors assess performance based on responsibilities, goals, and objectives from the previous year."),
          paragraph("Supervisors and employees meet to review self-evaluation, acknowledge achievements, identify improvement areas, and set goals for the coming year."),
          heading("General Timeline"),
          list([
            "June 1 - June 15: employees complete performance self-review.",
            "June 16 - July 15: supervisors complete employee performance reviews.",
            "July 16 - July 31: supervisors and employees have review conversations.",
          ]),
          paragraph("Performance evaluations, self-evaluations, and development plans are maintained in the employee digital personnel file and treated as confidential."),
        ],
      },
      {
        id: "discipline-policy",
        title: "5.2 Discipline Policy",
        blocks: [
          paragraph(
            "Disciplinary actions are intended to fairly and impartially correct behavior and performance problems early. They may include verbal warning, written warning, suspension, or termination depending on severity and frequency."
          ),
          paragraph("IAE reserves the right to administer disciplinary action at its discretion and based on the circumstances."),
          paragraph("If the handbook conflicts with contract documents, the contract documents prevail."),
        ],
      },
      {
        id: "termination-employment",
        title: "5.3 Termination of Employment",
        blocks: [
          paragraph("Termination of employment is an inevitable part of personnel activity within any organization."),
          heading("Notice of Voluntary Separation"),
          paragraph("Employees intending to terminate employment are asked to provide at least two weeks' written notice to their supervisor."),
          paragraph("Employee work-product is the sole property of IAE and may not be deleted or taken into private possession."),
          heading("Return of Company Property"),
          paragraph("Employees terminating employment must return all files, records, keys, fobs, cards, and company materials immediately."),
          heading("Final Pay"),
          paragraph("IAE provides final pay in accordance with applicable federal, state, and local laws."),
          heading("Benefits Upon Termination"),
          paragraph("Accrued or vested benefits due at termination are paid according to applicable law. Certain benefits may continue at the employee's expense when elected."),
        ],
      },
      {
        id: "cobra-continuing-coverage",
        title: "5.4 COBRA Health Insurance Continuing Coverage",
        blocks: [
          paragraph(
            "COBRA is a federal law that requires most employers sponsoring group health plans to offer temporary continuation of group health coverage when coverage would otherwise be lost due to qualifying events."
          ),
          heading("Qualifying Events"),
          list([
            "Resignation or termination of the employee.",
            "Death of the covered employee.",
            "Reduction in employee hours.",
            "Employee entitlement to Medicare for spouses and eligible dependents.",
            "Divorce or legal separation.",
            "A dependent child no longer meets group health plan eligibility requirements.",
          ]),
          paragraph("Under COBRA, the employee or beneficiary pays the full cost of coverage plus any administration fee."),
          heading("Notification Requirements"),
          paragraph("Employees or family members have responsibility to inform the CEO of certain qualifying events, generally within 60 days unless a longer period is permitted."),
          heading("Period of Coverage"),
          paragraph("Continuation coverage generally extends for 18 to 36 months depending on the qualifying event."),
          list([
            "Coverage may end if IAE no longer provides group health coverage.",
            "Coverage may end if premiums are not paid in full on time.",
            "Coverage may end if the employee becomes covered under another qualifying group health plan.",
            "Coverage may end if the employee becomes entitled to Medicare.",
          ]),
          paragraph("Plan documents control in the event of conflict. For more details, contact the CEO."),
        ],
      },
    ],
  },
  "employee-acknowledgment": {
    id: "employee-acknowledgment",
    heroTitle: "7. Employee Acknowledgment",
    subsections: [
      {
        id: "iae-employee-acknowledgement",
        title: "7.1 IAE Employee Acknowledgement",
        blocks: [
          paragraph(
            "After fully reading the IAE Employee Handbook, all employees are asked to execute the IAE employee acknowledgement on the following page. Please review, type your full name in the e-signature field, and submit the document."
          ),
          paragraph("If you have any questions, please contact IAE's Director of Operations."),
          paragraph("Thank you."),
        ],
      },
    ],
  },
};

const detailSectionHashes = new Map<string, Exclude<HandbookSectionId, "introduction">>();

for (const section of Object.values(handbookDetailSections)) {
  const handbookSection = handbookSections.find((item) => item.id === section.id);
  if (handbookSection) {
    detailSectionHashes.set(handbookSection.hash, section.id);
  }

  for (const subsection of section.subsections) {
    detailSectionHashes.set(subsection.id, section.id);
  }
}

function normalizeHash(hash: string) {
  return hash.replace(/^#/, "");
}

function getDetailSectionForHash(hash: string) {
  const sectionId = detailSectionHashes.get(normalizeHash(hash));
  return sectionId ? handbookDetailSections[sectionId] : null;
}

const introductionHashIds = new Set([
  "handbook-introduction",
  ...introductionSubsections.map((subsection) => subsection.id),
]);

/** Routes Employee Services hash URLs to the correct handbook screen. */
export function resolveEmployeeHandbookView(hash: string): EmployeeHandbookView {
  const normalized = normalizeHash(hash);
  if (!normalized) return "services";
  if (normalized === "handbook") return "index";
  if (introductionHashIds.has(normalized)) return "introduction";
  if (detailSectionHashes.has(normalized)) return "section";
  return "services";
}

function renderContentBlock(block: HandbookContentBlock, index: number) {
  if (block.kind === "heading") {
    return (
      <h3 key={`${block.text}-${index}`} className={`text-[16px] font-semibold leading-[1.7] text-neutral-900 ${block.italic ? "italic" : ""}`}>
        {block.text}
      </h3>
    );
  }

  if (block.kind === "list") {
    return (
      <ul key={`list-${index}`} className="list-disc space-y-[15px] pl-[18px] text-[16px] leading-[1.78] text-neutral-900">
        {block.items.map((item) => (
          <li key={item} className="pl-1 text-left md:text-justify">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <HandbookParagraph key={`${block.text}-${index}`} italic={block.italic}>
      {block.text}
    </HandbookParagraph>
  );
}

function HandbookSectionHero({ section }: { section: HandbookDetailSection }) {
  const sectionMeta = handbookSections.find((item) => item.id === section.id);

  return (
    <section
      id={sectionMeta?.hash}
      className="relative isolate flex min-h-[274px] scroll-mt-16 flex-col items-center justify-center overflow-hidden bg-[#0b080c] px-5 py-10 text-center text-white"
      style={{
        backgroundImage: "url('/internal-hub-bg.svg')",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/8" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[920px] flex-col items-center">
        <h1 className="text-[clamp(2.35rem,5.8vw,3.35rem)] font-semibold leading-[1.05] text-white">
          {section.heroTitle}
        </h1>
        <div className="mt-[54px] w-full">
          <SectionNavButtons currentId={section.id} />
        </div>
      </div>
    </section>
  );
}

function HandbookSectionSideNav({ section }: { section: HandbookDetailSection }) {
  return (
    <nav className="space-y-[10px]" aria-label={`${section.heroTitle} subsections`}>
      {section.subsections.map((subsection) => (
        <button
          key={subsection.id}
          type="button"
          onClick={() => scrollToHandbookElement(subsection.id)}
          className="flex min-h-[43px] w-full items-center rounded-[4px] bg-black px-[17px] py-3 text-left text-[13px] font-normal leading-tight text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          {subsection.title}
        </button>
      ))}
    </nav>
  );
}

function HandbookSubsectionContent({ subsection }: { subsection: HandbookSubsection }) {
  return (
    <section id={subsection.id} className="scroll-mt-20 pt-[44px] first:pt-0">
      <h2 className="text-[25px] font-semibold leading-tight text-neutral-900">{subsection.title}</h2>
      <div className="mt-[17px] space-y-[15px]">{subsection.blocks.map(renderContentBlock)}</div>
    </section>
  );
}

export function EmployeeHandbookPage() {
  const { navigateHandbook } = useInternalNavigation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="bg-white text-black">
      <InternalPageHero
        title="iAE Employee Handbook"
        subtitle="This page is designed to help you familiarize yourself with essential information and provide a quick reference for when you need assistance."
      />

      <main className="mx-auto grid w-full max-w-[970px] gap-12 px-5 pb-20 pt-[52px] sm:px-8 lg:grid-cols-[584px_280px] lg:gap-16 lg:px-0">
        <section id="introduction" aria-labelledby="handbook-introduction-title">
          <h2 id="handbook-introduction-title" className="mb-[37px] text-2xl font-semibold leading-tight text-neutral-900">
            Introduction
          </h2>
          <HandbookIntroCard />
        </section>

        <aside aria-labelledby="handbook-toc-title" className="lg:pt-0">
          <h2 id="handbook-toc-title" className="mb-[29px] text-base font-semibold leading-tight text-neutral-900">
            Table of Contents
          </h2>
          <nav className="space-y-[6px]" aria-label="Employee handbook table of contents">
            {handbookSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => navigateHandbook(section.hash)}
                  className="group flex h-[53px] w-full items-center gap-[14px] rounded-[4px] bg-black px-[14px] text-left text-[12px] font-normal text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#111] hover:shadow-[0_10px_22px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  <Icon className="h-[22px] w-[22px] shrink-0 text-white/95 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} aria-hidden />
                  <span className="leading-tight">{section.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      </main>
    </div>
  );
}

export function EmployeeHandbookSectionPage({ handbookHash }: { handbookHash?: string }) {
  const { navigateHandbook } = useInternalNavigation();
  const hash = handbookHash ? `#${normalizeHash(handbookHash)}` : "";
  const section = getDetailSectionForHash(hash) ?? handbookDetailSections["employment-policies"];
  const sectionMeta = handbookSections.find((item) => item.id === section.id);

  useEffect(() => {
    const targetId = normalizeHash(hash);

    window.requestAnimationFrame(() => {
      if (!targetId || targetId === sectionMeta?.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }
    });
  }, [hash, sectionMeta?.hash]);

  return (
    <div className="min-h-screen bg-white text-black">
      <HandbookSectionHero section={section} />

      <main className="mx-auto grid w-full max-w-[966px] gap-9 px-5 pb-[38px] pt-[35px] sm:px-8 lg:grid-cols-[290px_minmax(0,620px)] lg:gap-10 lg:px-0">
        <aside className="lg:pt-0">
          <HandbookSectionSideNav section={section} />
        </aside>

        <article className="min-w-0 pb-[54px]">
          {section.subsections.map((subsection) => (
            <HandbookSubsectionContent key={subsection.id} subsection={subsection} />
          ))}

          <div className="mx-auto mt-[84px] max-w-[498px]">
            <SectionNavButtons currentId={section.id} tone="dark" />
          </div>
        </article>
      </main>

      <button
        type="button"
        onClick={() => navigateHandbook(sectionMeta?.hash ?? "handbook")}
        className="fixed bottom-6 right-6 z-40 hidden h-[42px] min-w-[64px] items-center justify-center rounded-full bg-black px-4 text-[12px] font-semibold text-white shadow-[0_3px_14px_rgba(0,0,0,0.35)] transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:inline-flex"
      >
        &uarr; Top
      </button>
    </div>
  );
}

export function EmployeeHandbookIntroductionPage({ handbookHash }: { handbookHash?: string }) {
  const { navigateHandbook } = useInternalNavigation();

  useEffect(() => {
    const targetId = handbookHash?.replace(/^#/, "") ?? "";

    window.requestAnimationFrame(() => {
      if (!targetId || targetId === "handbook-introduction") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }
    });
  }, [handbookHash]);

  return (
    <div className="min-h-screen bg-white text-black">
      <IntroductionHero />

      <main className="mx-auto grid w-full max-w-[966px] gap-9 px-5 pb-[38px] pt-[35px] sm:px-8 lg:grid-cols-[290px_minmax(0,620px)] lg:gap-10 lg:px-0">
        <aside className="lg:pt-0">
          <IntroductionSideNav />
        </aside>

        <article className="min-w-0 pb-[54px]">
          <MessageFromCeoSection />
          <CompanySection />
          <ChangePolicySection />

          <div className="mx-auto mt-[84px] max-w-[498px]">
            <SectionNavButtons currentId="introduction" tone="dark" />
          </div>
        </article>
      </main>

      <button
        type="button"
        onClick={() => navigateHandbook("handbook-introduction")}
        className="fixed bottom-6 right-6 z-40 hidden h-[42px] min-w-[64px] items-center justify-center rounded-full bg-black px-4 text-[12px] font-semibold text-white shadow-[0_3px_14px_rgba(0,0,0,0.35)] transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:inline-flex"
      >
        &uarr; Top
      </button>
    </div>
  );
}
