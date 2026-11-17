import React from 'react';
import { ChevronLeft, ChevronRight, Presentation, RotateCcw, X } from 'lucide-react';
import { Button } from '@/src/components/ui/primitives';
import { useDemoStore } from '@/src/store/demoStore';
import { AppSection, RoleType } from '@/src/types/domain';

interface TourStep {
  title: string;
  role: RoleType;
  section: AppSection;
  summary: string;
  ownerBenefit: string;
  tryAction: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '01. Owner 30-Second Financial Pulse',
    role: 'owner',
    section: 'overview',
    summary:
      'Opens directly with the 5 questions every contractor asks: Payment Aana Baaki, Dena Baaki, Active Projects, Working Vehicles, and Today’s Attention Items.',
    ownerBenefit: 'Understand business health on phone or desktop in under 30 seconds without spreadsheets.',
    tryAction: 'Inspect the 5 summary cards and click any alert row.',
  },
  {
    title: '02. Government RA Bills & Receivables',
    role: 'owner',
    section: 'projects',
    summary:
      'Each road contract separates Contract Value, Billed Value, Certified Amount, 5% Retention, Payments Received, and Pending Receivables with Measurement Book (MB) refs.',
    ownerBenefit: 'No confusion between contract value and cash actually collectible from PWD / MMRDA / ZP.',
    tryAction: 'Click "Bhiwandi-Wada SH-35" → open RA Bills tab → record a payment receipt.',
  },
  {
    title: '03. 60-Second Diesel Entry (Supervisor)',
    role: 'supervisor',
    section: 'vehicles',
    summary:
      'Supervisor logs diesel: Vehicle → Site → Date → Litres → Rate → Auto Total → Receipt. Unusual refill volumes are flagged for review without accusing theft.',
    ownerBenefit: 'Automatically creates a pending project expense and updates fleet fuel totals in 1 entry.',
    tryAction: 'Click "Add Diesel" on MH-04-HY-2145 and save.',
  },
  {
    title: '04. Office Admin Verification & Anomaly Check',
    role: 'office_admin',
    section: 'notifications',
    summary:
      'Office Admin reviews pending diesel slips, flagged fuel variations, and expiring vehicle insurance/fitness certificates in one clean queue.',
    ownerBenefit: 'Prevents unverified site bills from inflating project expenditure totals.',
    tryAction: 'Click "Verify" or "Clear & Verify" on a pending item.',
  },
  {
    title: '05. Material Purchase vs Issue vs Transfer',
    role: 'supervisor',
    section: 'materials',
    summary:
      'Purchases increase yard stock + create Supplier Invoices. Issues consume stock on site. Transfers move stock between yards without counting as consumption.',
    ownerBenefit: 'Eliminates double counting and prevents negative stock errors at site stores.',
    tryAction: 'Try "Site Transfer" or "Purchase / Inward" to watch stock & invoices update.',
  },
  {
    title: '06. Supplier Payables & Tally-Ready CSV Demo',
    role: 'accountant',
    section: 'finance',
    summary:
      'Accountant tracks Recorded → Verified → Approved → Paid → Reconciled stages, settles Supplier Invoices, and runs validated Tally CSV import/export.',
    ownerBenefit: 'Clean separation of operational records from reconciled accounting with duplicate protection.',
    tryAction: 'Open the "Tally-Ready CSV Import/Export Demo" tab and test Validate & Import.',
  },
  {
    title: '07. Unified Owner Reports & CSV Exports',
    role: 'owner',
    section: 'reports',
    summary:
      'All 9 reports (Project Spend, Receivables, Fuel Cost, Utilization, Stock, Suppliers, Approvals, Missing Logs) pull from one live database.',
    ownerBenefit: 'Every number explains what it means, which period it covers, and verified vs pending status.',
    tryAction: 'Switch report tabs and click "Export Report CSV".',
  },
  {
    title: '08. Role Governance & One-Click Reset',
    role: 'owner',
    section: 'settings',
    summary:
      'Switch between all 5 roles (Owner, Supervisor, Office Admin, Accountant, Driver) or reset the fictional demo dataset back to clean state anytime.',
    ownerBenefit: 'Run repeatable client presentations with zero developer assistance.',
    tryAction: 'Test switching roles or use "Reset Demo Data" when ready.',
  },
];

export function GuidedTourOverlay() {
  const {
    guidedTourOpen,
    guidedTourStep,
    setGuidedTourOpen,
    setGuidedTourStep,
    setActiveSection,
    switchRole,
    activeRole,
  } = useDemoStore();

  if (!guidedTourOpen) return null;

  const step = TOUR_STEPS[guidedTourStep] ?? TOUR_STEPS[0];

  const goToStep = (idx: number) => {
    const clamped = Math.max(0, Math.min(TOUR_STEPS.length - 1, idx));
    const target = TOUR_STEPS[clamped];
    setGuidedTourStep(clamped);
    setActiveSection(target.section);
    if (activeRole !== target.role) {
      switchRole(target.role);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-3xl rounded-2xl border border-[#171717] bg-white shadow-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#245BFF]">
          <Presentation className="h-4 w-4 shrink-0" />
          <span>
            Client Presentation Walkthrough · Step {guidedTourStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setGuidedTourOpen(false)}
          className="text-[#52524E] hover:text-[#171717] p-1 cursor-pointer"
          aria-label="Close Guided Tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="mt-1.5 text-base font-semibold text-[#171717]">{step.title}</h3>
      <p className="mt-1 text-xs text-[#52524E] leading-relaxed">{step.summary}</p>

      <div className="mt-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] px-3.5 py-2.5 text-xs space-y-1">
        <p className="text-[#171717]">
          <strong>Owner Benefit:</strong> {step.ownerBenefit}
        </p>
        <p className="text-[#245BFF]">
          <strong>Try Now:</strong> {step.tryAction}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => goToStep(guidedTourStep)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sync Screen & Role
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={guidedTourStep === 0}
            onClick={() => goToStep(guidedTourStep - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          {guidedTourStep < TOUR_STEPS.length - 1 ? (
            <Button size="sm" onClick={() => goToStep(guidedTourStep + 1)}>
              Next Step
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setGuidedTourOpen(false)}>
              Finish Tour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
