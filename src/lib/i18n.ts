import { AppSection, LanguageMode, RoleType } from '@/src/types/domain';

export const NAV_LABELS: Record<
  AppSection,
  Record<LanguageMode, { title: string; subtitle: string }>
> = {
  overview: {
    hinglish: { title: 'Overview', subtitle: 'मुख्य पृष्ठ' },
    english: { title: 'Overview', subtitle: 'Command Summary' },
    devanagari: { title: 'मुख्य पृष्ठ', subtitle: 'व्यवसाय सारांश' },
  },
  projects: {
    hinglish: { title: 'Projects', subtitle: 'प्रोजेक्ट' },
    english: { title: 'Projects', subtitle: 'Road Contracts' },
    devanagari: { title: 'प्रोजेक्ट', subtitle: 'रस्ते प्रकल्प' },
  },
  vehicles: {
    hinglish: { title: 'Vehicles', subtitle: 'गाड़ियां' },
    english: { title: 'Vehicles', subtitle: 'Fleet & Diesel' },
    devanagari: { title: 'गाड़ियां', subtitle: 'मशीनरी व डीज़ल' },
  },
  materials: {
    hinglish: { title: 'Materials', subtitle: 'माल / स्टॉक' },
    english: { title: 'Materials', subtitle: 'Stock & Yards' },
    devanagari: { title: 'माल / स्टॉक', subtitle: 'साहित्य साठा' },
  },
  finance: {
    hinglish: { title: 'Finance', subtitle: 'हिसाब-किताब' },
    english: { title: 'Finance', subtitle: 'Ledger & Bills' },
    devanagari: { title: 'हिसाब-किताब', subtitle: 'आर्थिक व्यवहार' },
  },
  documents: {
    hinglish: { title: 'Documents', subtitle: 'दस्तावेज़' },
    english: { title: 'Documents', subtitle: 'Tenders & Permits' },
    devanagari: { title: 'दस्तावेज़', subtitle: 'कागदपत्रे' },
  },
  reports: {
    hinglish: { title: 'Owner Reports', subtitle: 'रिपोर्ट्स' },
    english: { title: 'Owner Reports', subtitle: 'Control Center' },
    devanagari: { title: 'रिपोर्ट्स', subtitle: 'संपूर्ण अहवाल' },
  },
  notifications: {
    hinglish: { title: 'Approvals & Alerts', subtitle: 'सूचनाएं' },
    english: { title: 'Approvals & Alerts', subtitle: 'Action Queue' },
    devanagari: { title: 'मंजूरी व सूचना', subtitle: 'अप्रूवल कतार' },
  },
  activity: {
    hinglish: { title: 'Activity History', subtitle: 'कामकाज लॉग' },
    english: { title: 'Activity History', subtitle: 'Audit Trail' },
    devanagari: { title: 'कामकाज लॉग', subtitle: 'नोंदवही' },
  },
  settings: {
    hinglish: { title: 'Roles & Demo Setup', subtitle: 'सेटिंग्स' },
    english: { title: 'Roles & Settings', subtitle: 'Demo Controls' },
    devanagari: { title: 'भूमिका व सेटिंग्स', subtitle: 'डेमो नियंत्रण' },
  },
};

export const ROLE_META: Record<
  RoleType,
  {
    label: Record<LanguageMode, string>;
    description: Record<LanguageMode, string>;
  }
> = {
  owner: {
    label: {
      hinglish: 'Owner (मालिक)',
      english: 'Owner',
      devanagari: 'मालिक (Owner)',
    },
    description: {
      hinglish: 'Full access: approvals, receivables, fleet, stock & reports',
      english: 'Full access across projects, approvals, finance and reports',
      devanagari: 'सर्व प्रोजेक्ट्स, मंजूरी, पेमेंट व अहवालांचे पूर्ण नियंत्रण',
    },
  },
  supervisor: {
    label: {
      hinglish: 'Site Supervisor (साइट सुपरवाइज़र)',
      english: 'Site Supervisor',
      devanagari: 'साइट सुपरवाइज़र',
    },
    description: {
      hinglish: 'Assigned sites: diesel entry, trips, material issue & progress',
      english: 'Records site diesel, trips, material issues & physical progress',
      devanagari: 'नेमलेल्या साइटवर डीज़ल, ट्रिप्स व माल नोंदी',
    },
  },
  office_admin: {
    label: {
      hinglish: 'Office Admin (ऑफिस एडमिन)',
      english: 'Office Administrator',
      devanagari: 'ऑफिस एडमिन',
    },
    description: {
      hinglish: 'Verifies site entries, flags fuel anomalies & tracks documents',
      english: 'Verifies operational entries, reviews anomalies & manages documents',
      devanagari: 'नोंदींची तपासणी, कागदपत्रे व कालबाह्यता व्यवस्थापन',
    },
  },
  accountant: {
    label: {
      hinglish: 'Accountant (अकाउंटेंट)',
      english: 'Accountant',
      devanagari: 'अकाउंटंट (हिशोब)',
    },
    description: {
      hinglish: 'Reconciles bills, supplier payments, RA receipts & Tally CSV',
      english: 'Reconciles ledger, records payments & runs Tally CSV demo',
      devanagari: 'बिले, पेमेंट्स, रिकन्सिलेशन व टॅली CSV कामकाज',
    },
  },
  driver: {
    label: {
      hinglish: 'Driver / Operator (ड्राइवर)',
      english: 'Driver / Operator',
      devanagari: 'ड्राइव्हर / ऑपरेटर',
    },
    description: {
      hinglish: 'Views assigned vehicle, compliance dates & logs trips/diesel',
      english: 'Views assigned machine and submits trip or diesel logs',
      devanagari: 'नेमलेली गाडी पाहणे व ट्रिप / डीज़ल नोंद करणे',
    },
  },
};

export const UI_COPY: Record<string, Record<LanguageMode, string>> = {
  qReceivable: {
    hinglish: 'Kitna paisa aana baaki hai?',
    english: 'How much payment is receivable?',
    devanagari: 'किती पैसे येणे बाकी आहेत?',
  },
  qPayable: {
    hinglish: 'Kitna paisa dena baaki hai?',
    english: 'How much payment is payable?',
    devanagari: 'किती पैसे देणे बाकी आहेत?',
  },
  qProjects: {
    hinglish: 'Kaunse projects chal rahe hain?',
    english: 'Which projects are active?',
    devanagari: 'कोणते प्रोजेक्ट सुरू आहेत?',
  },
  qVehicles: {
    hinglish: 'Kitni gaadiyan kaam kar rahi hain?',
    english: 'How many vehicles are working?',
    devanagari: 'किती गाड्या कामावर आहेत?',
  },
  qAttention: {
    hinglish: 'Aaj kis cheez par attention dena hai?',
    english: 'What needs attention today?',
    devanagari: 'आज कशावर लक्ष देणे आवश्यक आहे?',
  },
  addDiesel: {
    hinglish: 'Add Diesel',
    english: 'Add Diesel',
    devanagari: 'डीज़ल एंट्री जोडा',
  },
  saveEntry: {
    hinglish: 'Save Entry',
    english: 'Save Entry',
    devanagari: 'एंट्री सेव करा',
  },
  paymentAanaBaaki: {
    hinglish: 'Payment Aana Baaki',
    english: 'Pending Receivables',
    devanagari: 'येणे बाकी रक्कम',
  },
  denaBaaki: {
    hinglish: 'Dena Baaki',
    english: 'Pending Payables',
    devanagari: 'देणे बाकी रक्कम',
  },
  guidedTour: {
    hinglish: 'Guided Demo Tour',
    english: 'Guided Demo Tour',
    devanagari: 'डेमो टूर सुरू करा',
  },
  demoBanner: {
    hinglish: 'Fictional Demonstration Data — Mayur Constructions Prototype (Not Live Company Records)',
    english: 'Fictional Demonstration Data — Mayur Constructions Prototype (Not Live Company Records)',
    devanagari: 'काल्पनिक डेमो डेटा — मयूर कन्स्ट्रक्शन्स प्रोटोटाइप (प्रत्यक्ष कंपनी डेटा नाही)',
  },
};

export function t(key: keyof typeof UI_COPY, lang: LanguageMode): string {
  return UI_COPY[key]?.[lang] ?? UI_COPY[key]?.hinglish ?? key;
}
