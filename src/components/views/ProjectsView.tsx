import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Edit3,
  FileText,
  IndianRupee,
  Plus,
  Search,
  Truck,
} from 'lucide-react';
import {
  Button,
  Card,
  DialogModal,
  EmptyState,
  FieldError,
  FieldLabel,
  Input,
  SelectField,
  SlideDrawer,
  StatusText,
  TabsBar,
} from '@/src/components/ui/primitives';
import { formatDateIN, formatINR, formatINRCompact } from '@/src/lib/formatters';
import { useDemoStore } from '@/src/store/demoStore';
import { Project, ProjectStatus, RegionName } from '@/src/types/domain';

const REGIONS: RegionName[] = ['Bhiwandi', 'Thane', 'Palghar', 'Jawhar', 'Shahapur'];
const STATUSES: ProjectStatus[] = ['Active', 'Mobilizing', 'Near Completion', 'On Hold', 'Completed'];

const projectSchema = z.object({
  code: z.string().min(3, 'Enter project code'),
  name: z.string().min(4, 'Enter project name'),
  region: z.enum(['Bhiwandi', 'Thane', 'Palghar', 'Jawhar', 'Shahapur']),
  siteLocation: z.string().min(3, 'Enter site location'),
  department: z.string().min(2, 'Enter client/department'),
  workOrderNumber: z.string().min(3, 'Enter work order number'),
  contractValue: z.number({ message: 'Enter valid value' }).positive('Contract value must be > 0'),
  operationalBudget: z.number({ message: 'Enter valid budget' }).positive('Budget must be > 0'),
  startDate: z.string().min(1),
  expectedCompletionDate: z.string().min(1),
  managerName: z.string().min(2, 'Enter manager name'),
  status: z.enum(['Active', 'Mobilizing', 'Near Completion', 'On Hold', 'Completed']),
  physicalProgress: z.number().min(0).max(100),
  measurementBookRef: z.string().min(2, 'Enter MB reference'),
  retentionPercent: z.number().min(0).max(20),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const raBillSchema = z.object({
  billNumber: z.string().min(2, 'Enter RA Bill number'),
  mbReference: z.string().min(2, 'Enter MB reference'),
  billDate: z.string().min(1),
  billedAmount: z.number({ message: 'Enter valid amount' }).positive('Billed amount must be > 0'),
  certifiedAmount: z.number().min(0),
  notes: z.string().optional(),
});

const receiptSchema = z.object({
  date: z.string().min(1),
  amount: z.number({ message: 'Enter valid amount' }).positive('Amount must be > 0'),
  mode: z.enum(['Treasury EFT', 'RTGS', 'NEFT', 'Cheque']),
  referenceNumber: z.string().min(3, 'Enter UTR / Cheque reference'),
  notes: z.string().optional(),
});

export function ProjectsView({
  externalProjectId,
  onClearExternalProject,
}: {
  externalProjectId?: string | null;
  onClearExternalProject?: () => void;
}) {
  const {
    db,
    globalProjectFilter,
    getVisibleProjects,
    getProjectSummary,
    canPerformAction,
    createProject,
    updateProject,
    updateProjectProgress,
    assignVehicleToProject,
    createRABill,
    certifyRABill,
    recordRAPayment,
  } = useDemoStore();

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('summary');
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [progressDraft, setProgressDraft] = useState<number>(0);
  const [assignVehicleId, setAssignVehicleId] = useState<string>('');
  const [raModalOpen, setRaModalOpen] = useState(false);
  const [receiptBillId, setReceiptBillId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (externalProjectId) {
      setSelectedProjectId(externalProjectId);
      setDetailTab('summary');
      onClearExternalProject?.();
    }
  }, [externalProjectId, onClearExternalProject]);

  const visibleProjects = getVisibleProjects().filter((p) => {
    if (globalProjectFilter !== 'ALL' && p.id !== globalProjectFilter) return false;
    if (regionFilter !== 'ALL' && p.region !== regionFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.workOrderNumber.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedProject = db.projects.find((p) => p.id === selectedProjectId) ?? null;

  useEffect(() => {
    if (selectedProject) {
      setProgressDraft(selectedProject.physicalProgress);
      const unassignedOrOther = db.vehicles.find((v) => v.assignedProjectId !== selectedProject.id);
      setAssignVehicleId(unassignedOrOther?.id ?? '');
    }
  }, [selectedProject, db.vehicles]);

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      code: 'MC-THN-2609',
      name: '',
      region: 'Bhiwandi',
      siteLocation: '',
      department: 'PWD Thane Division',
      workOrderNumber: '',
      contractValue: 25000000,
      operationalBudget: 21250000,
      startDate: '2026-11-16',
      expectedCompletionDate: '2027-11-15',
      managerName: 'Suresh Kulkarni',
      status: 'Active',
      physicalProgress: 0,
      measurementBookRef: 'MB-NEW-001',
      retentionPercent: 5,
    },
  });

  const raForm = useForm<z.infer<typeof raBillSchema>>({
    resolver: zodResolver(raBillSchema),
    defaultValues: {
      billNumber: '',
      mbReference: '',
      billDate: '2026-11-16',
      billedAmount: 4500000,
      certifiedAmount: 4200000,
      notes: '',
    },
  });

  const receiptForm = useForm<z.infer<typeof receiptSchema>>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      date: '2026-11-16',
      amount: 1000000,
      mode: 'Treasury EFT',
      referenceNumber: '',
      notes: '',
    },
  });

  const openCreateModal = () => {
    setEditingProject(null);
    setFormError('');
    projectForm.reset({
      code: `MC-NEW-${Math.floor(100 + Math.random() * 899)}`,
      name: '',
      region: 'Bhiwandi',
      siteLocation: '',
      department: 'PWD Thane Division',
      workOrderNumber: `WO/PWD/2026/${Math.floor(100 + Math.random() * 899)}`,
      contractValue: 25000000,
      operationalBudget: 21250000,
      startDate: '2026-11-16',
      expectedCompletionDate: '2027-11-15',
      managerName: 'Suresh Kulkarni',
      status: 'Active',
      physicalProgress: 0,
      measurementBookRef: 'MB-THN-201 / Pg 01',
      retentionPercent: 5,
    });
    setProjectFormOpen(true);
  };

  const openEditModal = (prj: Project) => {
    setEditingProject(prj);
    setFormError('');
    projectForm.reset({
      code: prj.code,
      name: prj.name,
      region: prj.region,
      siteLocation: prj.siteLocation,
      department: prj.department,
      workOrderNumber: prj.workOrderNumber,
      contractValue: prj.contractValue,
      operationalBudget: prj.operationalBudget,
      startDate: prj.startDate,
      expectedCompletionDate: prj.expectedCompletionDate,
      managerName: prj.managerName,
      status: prj.status,
      physicalProgress: prj.physicalProgress,
      measurementBookRef: prj.measurementBookRef,
      retentionPercent: prj.retentionPercent,
    });
    setProjectFormOpen(true);
  };

  const handleProjectSubmit = (values: ProjectFormValues) => {
    setFormError('');
    if (editingProject) {
      const res = updateProject(editingProject.id, values);
      if (!res.ok) return setFormError(res.message);
      setProjectFormOpen(false);
    } else {
      const res = createProject(values);
      if (!res.ok) return setFormError(res.message);
      setProjectFormOpen(false);
    }
  };

  const selectedSummary = useMemo(
    () => (selectedProject ? getProjectSummary(selectedProject.id) : null),
    [selectedProject, getProjectSummary]
  );

  const selectedBills = useMemo(
    () => (selectedProject ? db.raBills.filter((b) => b.projectId === selectedProject.id) : []),
    [selectedProject, db.raBills]
  );

  const selectedVehicles = useMemo(
    () => (selectedProject ? db.vehicles.filter((v) => v.assignedProjectId === selectedProject.id) : []),
    [selectedProject, db.vehicles]
  );

  const selectedExpenses = useMemo(
    () =>
      selectedProject
        ? db.transactions.filter((t) => t.projectId === selectedProject.id && t.stage !== 'Rejected')
        : [],
    [selectedProject, db.transactions]
  );

  const selectedMaterialIssues = useMemo(
    () =>
      selectedProject
        ? db.stockMovements.filter((m) => m.projectId === selectedProject.id && m.type === 'issue')
        : [],
    [selectedProject, db.stockMovements]
  );

  const selectedDocs = useMemo(
    () => (selectedProject ? db.documents.filter((d) => d.projectId === selectedProject.id) : []),
    [selectedProject, db.documents]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">प्रोजेक्ट · Government Road Contracts</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
            Projects & RA Billing
          </h1>
        </div>
        {canPerformAction('edit_project') && (
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="h-4 w-4 text-[#73726C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project name, code, work order or department..."
              className="pl-10"
            />
          </div>
          <div className="md:col-span-3">
            <SelectField
              value={regionFilter}
              onValueChange={setRegionFilter}
              options={[
                { value: 'ALL', label: 'All 5 Regions' },
                ...REGIONS.map((r) => ({ value: r, label: r })),
              ]}
            />
          </div>
          <div className="md:col-span-3">
            <SelectField
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                ...STATUSES.map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Project List */}
      {visibleProjects.length === 0 ? (
        <EmptyState
          title="No matching projects found"
          description="Try clearing your search or region filter to see Mayur Constructions road contracts."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setRegionFilter('ALL');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleProjects.map((prj) => {
            const summary = getProjectSummary(prj.id);
            const assignedVehCount = db.vehicles.filter((v) => v.assignedProjectId === prj.id).length;
            return (
              <Card
                key={prj.id}
                className="p-5 hover:border-[#245BFF]/60 transition-colors cursor-pointer flex flex-col justify-between gap-4"
                onClick={() => {
                  setSelectedProjectId(prj.id);
                  setDetailTab('summary');
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#52524E]">
                        <span className="font-mono">{prj.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{prj.region}</span>
                        <span aria-hidden="true">·</span>
                        <span>{prj.department}</span>
                      </div>
                      <h2 className="mt-1 text-base font-semibold text-[#171717]">
                        {prj.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#52524E]">{prj.siteLocation}</p>
                    </div>
                    <StatusText
                      tone={
                        prj.status === 'Completed'
                          ? 'success'
                          : prj.status === 'On Hold'
                          ? 'danger'
                          : prj.status === 'Near Completion'
                          ? 'info'
                          : 'warning'
                      }
                      label={prj.status}
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#52524E]">Physical Progress · {prj.managerName}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#171717]">
                        {prj.physicalProgress}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F3F1EC] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#245BFF]"
                        style={{ width: `${prj.physicalProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E2DC] grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-[#52524E]">Contract</p>
                    <p className="mt-0.5 font-mono tabular-nums font-semibold text-[#171717]">
                      {formatINRCompact(prj.contractValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#52524E]">Aana Baaki</p>
                    <p className="mt-0.5 font-mono tabular-nums font-semibold text-[#15803D]">
                      {formatINRCompact(summary.pendingReceivables)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#52524E]">Expenses / Fleet</p>
                    <p className="mt-0.5 font-mono tabular-nums font-semibold text-[#171717]">
                      {formatINRCompact(summary.totalRecordedExpenses)} · {assignedVehCount}V
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Project Detail SlideDrawer */}
      <SlideDrawer
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProjectId(null)}
        title={selectedProject?.name ?? ''}
        subtitle={
          selectedProject
            ? `${selectedProject.code} · ${selectedProject.workOrderNumber} · ${selectedProject.department}`
            : ''
        }
      >
        {selectedProject && selectedSummary && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsBar
                value={detailTab}
                onValueChange={setDetailTab}
                tabs={[
                  { value: 'summary', label: 'Financials & Progress' },
                  { value: 'rabills', label: 'RA Bills', count: selectedBills.length },
                  { value: 'vehicles', label: 'Vehicles', count: selectedVehicles.length },
                  { value: 'materials', label: 'Materials', count: selectedMaterialIssues.length },
                  { value: 'expenses', label: 'Expenses', count: selectedExpenses.length },
                  { value: 'docs', label: 'Docs', count: selectedDocs.length },
                ]}
              />
              {canPerformAction('edit_project') && (
                <Button size="sm" variant="outline" onClick={() => openEditModal(selectedProject)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Project
                </Button>
              )}
            </div>

            {detailTab === 'summary' && (
              <div className="space-y-5">
                {/* Contract metadata */}
                <Card className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-[#52524E]">Region & Site</p>
                    <p className="mt-1 font-medium text-[#171717]">{selectedProject.region}</p>
                    <p className="text-[#73726C]">{selectedProject.siteLocation}</p>
                  </div>
                  <div>
                    <p className="text-[#52524E]">Measurement Book</p>
                    <p className="mt-1 font-mono font-medium text-[#171717]">
                      {selectedProject.measurementBookRef}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#52524E]">Timeline</p>
                    <p className="mt-1 font-mono text-[#171717]">
                      {formatDateIN(selectedProject.startDate)} → {formatDateIN(selectedProject.expectedCompletionDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#52524E]">Project Manager</p>
                    <p className="mt-1 font-medium text-[#171717]">{selectedProject.managerName}</p>
                  </div>
                </Card>

                {/* Honest Government Financial Breakdown */}
                <Card className="p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#171717]">
                      Government Contract Financial Summary
                    </h3>
                    <p className="text-xs text-[#52524E]">
                      Contract value, RA billing, certified amounts, retention, receipts, and operational expenses are tracked separately.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E5E2DC]">
                    <div>
                      <p className="text-xs text-[#52524E]">Contract Value</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums">
                        {formatINR(selectedSummary.contractValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Operational Budget</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums">
                        {formatINR(selectedSummary.operationalBudget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Total RA Billed</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums">
                        {formatINR(selectedSummary.billedValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Certified by Dept</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums">
                        {formatINR(selectedSummary.certifiedValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Retention Deducted ({selectedProject.retentionPercent}%)</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums text-[#B45309]">
                        {formatINR(selectedSummary.retentionDeducted)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Payments Received</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums text-[#15803D]">
                        {formatINR(selectedSummary.paymentsReceived)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Pending Receivables (Aana Baaki)</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums text-[#245BFF]">
                        {formatINR(selectedSummary.pendingReceivables)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Recorded Expenses (Verified / Pending)</p>
                      <p className="mt-1 text-sm font-semibold font-mono tabular-nums">
                        {formatINR(selectedSummary.verifiedExpenses)} /{' '}
                        <span className="text-[#B45309]">{formatINR(selectedSummary.pendingExpenses)}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#52524E]">Material Consumed (Issued)</p>
                      <p className="mt-1 text-base font-semibold font-mono tabular-nums">
                        {formatINR(selectedSummary.materialConsumedValue)}
                      </p>
                    </div>
                  </div>

                  {/* Honest Profit Guardrail */}
                  <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5 text-xs text-[#52524E]">
                    {selectedProject.accountingCompleteForProfit ? (
                      <p className="text-[#171717]">
                        <strong className="font-semibold">Final Reconciled Net Surplus:</strong>{' '}
                        <span className="font-mono font-semibold text-[#15803D]">
                          {formatINR(
                            selectedSummary.paymentsReceived -
                              selectedSummary.verifiedExpenses -
                              selectedSummary.materialConsumedValue
                          )}
                        </span>{' '}
                        (based on completed final RA bill & verified accounting closure).
                      </p>
                    ) : (
                      <p>
                        <strong className="text-[#171717]">Project Profit Not Calculated Yet:</strong>{' '}
                        Ongoing contract has uncertified BOQ work, pending retention releases, and unverified site entries. Displaying an estimated margin would be misleading.
                      </p>
                    )}
                  </div>
                </Card>

                {/* Update Physical Progress */}
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#171717]">
                        Update Physical Progress ({progressDraft}%)
                      </p>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progressDraft}
                        onChange={(e) => setProgressDraft(Number(e.target.value))}
                        className="mt-2 w-full accent-[#245BFF] cursor-pointer"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => updateProjectProgress(selectedProject.id, progressDraft)}
                    >
                      Save Progress
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {detailTab === 'rabills' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[#52524E]">
                    Track RA Billing, Department Certification, Retention & Payments Received separately.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      raForm.reset({
                        billNumber: `RA-0${selectedBills.length + 1} / ${selectedProject.code.slice(-4)}`,
                        mbReference: selectedProject.measurementBookRef,
                        billDate: '2026-11-16',
                        billedAmount: 3500000,
                        certifiedAmount: 0,
                        notes: '',
                      });
                      setRaModalOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add RA Bill
                  </Button>
                </div>

                {selectedBills.length === 0 ? (
                  <EmptyState
                    title="No RA Bills recorded yet"
                    description="Create the first Running Account (RA) bill linked to Measurement Book measurements."
                  />
                ) : (
                  <div className="space-y-3">
                    {selectedBills.map((bill) => {
                      const receivedForBill = db.paymentReceipts
                        .filter((r) => r.raBillId === bill.id)
                        .reduce((sum, r) => sum + r.amount, 0);
                      const pendingForBill = Math.max(0, bill.netReceivable - receivedForBill);

                      return (
                        <Card key={bill.id} className="p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#171717] font-mono">
                                {bill.billNumber}
                              </p>
                              <p className="text-xs text-[#52524E]">
                                {bill.mbReference} · {formatDateIN(bill.billDate)}
                              </p>
                            </div>
                            <StatusText
                              tone={
                                bill.status === 'Paid'
                                  ? 'success'
                                  : bill.status === 'Submitted'
                                  ? 'warning'
                                  : 'info'
                              }
                              label={bill.status}
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-[#E5E2DC]">
                            <div>
                              <p className="text-[#52524E]">Billed</p>
                              <p className="font-mono tabular-nums font-semibold">
                                {formatINR(bill.billedAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#52524E]">Certified (Net)</p>
                              <p className="font-mono tabular-nums font-semibold">
                                {bill.certifiedAmount > 0 ? formatINR(bill.netReceivable) : 'Pending'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#52524E]">Received</p>
                              <p className="font-mono tabular-nums font-semibold text-[#15803D]">
                                {formatINR(receivedForBill)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#52524E]">Balance Due</p>
                              <p className="font-mono tabular-nums font-semibold text-[#245BFF]">
                                {formatINR(pendingForBill)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {bill.certifiedAmount === 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  certifyRABill(bill.id, Math.round(bill.billedAmount * 0.95))
                                }
                              >
                                Certify at 95% ({formatINR(Math.round(bill.billedAmount * 0.95))})
                              </Button>
                            )}
                            {pendingForBill > 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  receiptForm.reset({
                                    date: '2026-11-16',
                                    amount: pendingForBill,
                                    mode: 'Treasury EFT',
                                    referenceNumber: `EFT-${Math.floor(10000 + Math.random() * 89999)}`,
                                    notes: `Payment against ${bill.billNumber}`,
                                  });
                                  setReceiptBillId(bill.id);
                                }}
                              >
                                <IndianRupee className="h-3.5 w-3.5" />
                                Record Payment Received
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'vehicles' && (
              <div className="space-y-4">
                <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <FieldLabel>Assign Another Fleet Unit to This Site</FieldLabel>
                    <SelectField
                      value={assignVehicleId}
                      onValueChange={setAssignVehicleId}
                      options={db.vehicles
                        .filter((v) => v.assignedProjectId !== selectedProject.id)
                        .map((v) => ({
                          value: v.id,
                          label: `${v.registrationNumber} · ${v.category} (${v.driverName})`,
                        }))}
                      placeholder="Select vehicle to assign"
                    />
                  </div>
                  <Button
                    className="sm:mt-5"
                    disabled={!assignVehicleId}
                    onClick={() => assignVehicleToProject(assignVehicleId, selectedProject.id)}
                  >
                    <Truck className="h-4 w-4" />
                    Assign Vehicle
                  </Button>
                </Card>

                <Card className="divide-y divide-[#E5E2DC]">
                  {selectedVehicles.map((v) => (
                    <div key={v.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold font-mono text-[#171717]">
                          {v.registrationNumber}
                        </p>
                        <p className="text-xs text-[#52524E]">
                          {v.category} · {v.makeModel} · Driver: {v.driverName}
                        </p>
                      </div>
                      <StatusText
                        tone={v.status === 'Working' ? 'success' : v.status === 'Maintenance' ? 'warning' : 'neutral'}
                        label={v.status}
                      />
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {detailTab === 'materials' && (
              <Card className="divide-y divide-[#E5E2DC]">
                {selectedMaterialIssues.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#52524E]">
                    No site material consumption issues logged yet.
                  </div>
                ) : (
                  selectedMaterialIssues.map((m) => {
                    const mat = db.materials.find((item) => item.id === m.materialId);
                    return (
                      <div key={m.id} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#171717]">
                            {mat?.name ?? m.materialId}
                          </p>
                          <p className="text-xs text-[#52524E]">
                            {formatDateIN(m.date)} · {m.referenceNote}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono tabular-nums font-semibold">
                            {m.quantity} {mat?.unit}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-[#52524E]">
                            {formatINR(m.totalValue)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>
            )}

            {detailTab === 'expenses' && (
              <Card className="divide-y divide-[#E5E2DC]">
                {selectedExpenses.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#171717] truncate">{t.description}</p>
                      <p className="text-xs text-[#52524E]">
                        {t.category} · {formatDateIN(t.date)} · {t.vendorOrPayee}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono tabular-nums font-semibold">
                        {formatINR(t.amount)}
                      </p>
                      <p className="text-[11px] text-[#52524E]">{t.stage}</p>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {detailTab === 'docs' && (
              <Card className="divide-y divide-[#E5E2DC]">
                {selectedDocs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#52524E]">
                    No project documents uploaded yet.
                  </div>
                ) : (
                  selectedDocs.map((d) => (
                    <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-[#245BFF] mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-[#171717]">{d.title}</p>
                          <p className="text-xs text-[#52524E]">
                            {d.category} · {d.version} · {d.fileName}
                          </p>
                        </div>
                      </div>
                      <StatusText
                        tone={d.status === 'Active' ? 'success' : d.status === 'Expired' ? 'danger' : 'warning'}
                        label={d.status}
                      />
                    </div>
                  ))
                )}
              </Card>
            )}
          </>
        )}
      </SlideDrawer>

      {/* Create / Edit Project Modal */}
      <DialogModal
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
        title={editingProject ? 'Edit Road Project' : 'Create Government Road Project'}
        description="All fields validate work order uniqueness and budget consistency."
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={projectForm.handleSubmit(handleProjectSubmit)} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] px-3.5 py-2 text-xs text-[#B91C1C]">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Project Code</FieldLabel>
              <Input {...projectForm.register('code')} className="font-mono" />
              <FieldError message={projectForm.formState.errors.code?.message} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Project Name</FieldLabel>
              <Input {...projectForm.register('name')} placeholder="e.g. Wada-Manor Highway Resurfacing" />
              <FieldError message={projectForm.formState.errors.name?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Region</FieldLabel>
              <SelectField
                value={projectForm.watch('region')}
                onValueChange={(v) => projectForm.setValue('region', v as RegionName)}
                options={REGIONS.map((r) => ({ value: r, label: r }))}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Site Location / Chainage</FieldLabel>
              <Input {...projectForm.register('siteLocation')} />
              <FieldError message={projectForm.formState.errors.siteLocation?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Government Department / Client</FieldLabel>
              <Input {...projectForm.register('department')} />
              <FieldError message={projectForm.formState.errors.department?.message} />
            </div>
            <div>
              <FieldLabel required>Work Order Number</FieldLabel>
              <Input {...projectForm.register('workOrderNumber')} className="font-mono" />
              <FieldError message={projectForm.formState.errors.workOrderNumber?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Contract Value (₹)</FieldLabel>
              <Input type="number" {...projectForm.register('contractValue', { valueAsNumber: true })} className="font-mono tabular-nums" />
              <FieldError message={projectForm.formState.errors.contractValue?.message} />
            </div>
            <div>
              <FieldLabel required>Operational Budget (₹)</FieldLabel>
              <Input type="number" {...projectForm.register('operationalBudget', { valueAsNumber: true })} className="font-mono tabular-nums" />
              <FieldError message={projectForm.formState.errors.operationalBudget?.message} />
            </div>
            <div>
              <FieldLabel required>Retention %</FieldLabel>
              <Input type="number" {...projectForm.register('retentionPercent', { valueAsNumber: true })} className="font-mono tabular-nums" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Start Date</FieldLabel>
              <Input type="date" {...projectForm.register('startDate')} />
            </div>
            <div>
              <FieldLabel required>Expected Completion</FieldLabel>
              <Input type="date" {...projectForm.register('expectedCompletionDate')} />
            </div>
            <div>
              <FieldLabel required>Status</FieldLabel>
              <SelectField
                value={projectForm.watch('status')}
                onValueChange={(v) => projectForm.setValue('status', v as ProjectStatus)}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Project Manager</FieldLabel>
              <Input {...projectForm.register('managerName')} />
            </div>
            <div>
              <FieldLabel required>Measurement Book (MB) Ref</FieldLabel>
              <Input {...projectForm.register('measurementBookRef')} className="font-mono" />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setProjectFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Building2 className="h-4 w-4" />
              {editingProject ? 'Update Project' : 'Save Project'}
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* Add RA Bill Modal */}
      <DialogModal
        open={raModalOpen}
        onOpenChange={setRaModalOpen}
        title="Add Government RA Bill"
        description="Links billed & certified amounts to Measurement Book and project receivables."
      >
        <form
          onSubmit={raForm.handleSubmit((vals) => {
            if (!selectedProject) return;
            const res = createRABill({
              projectId: selectedProject.id,
              billNumber: vals.billNumber,
              mbReference: vals.mbReference,
              billDate: vals.billDate,
              billedAmount: vals.billedAmount,
              certifiedAmount: vals.certifiedAmount,
              notes: vals.notes,
            });
            if (res.ok) setRaModalOpen(false);
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>RA Bill Number</FieldLabel>
              <Input {...raForm.register('billNumber')} className="font-mono" />
              <FieldError message={raForm.formState.errors.billNumber?.message} />
            </div>
            <div>
              <FieldLabel required>Bill Date</FieldLabel>
              <Input type="date" {...raForm.register('billDate')} />
            </div>
          </div>
          <div>
            <FieldLabel required>Measurement Book Reference</FieldLabel>
            <Input {...raForm.register('mbReference')} className="font-mono" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Gross Billed Amount (₹)</FieldLabel>
              <Input type="number" {...raForm.register('billedAmount', { valueAsNumber: true })} className="font-mono tabular-nums" />
            </div>
            <div>
              <FieldLabel hint="0 if awaiting EE certification">Certified Amount (₹)</FieldLabel>
              <Input type="number" {...raForm.register('certifiedAmount', { valueAsNumber: true })} className="font-mono tabular-nums" />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setRaModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save RA Bill</Button>
          </div>
        </form>
      </DialogModal>

      {/* Record RA Payment Modal */}
      <DialogModal
        open={!!receiptBillId}
        onOpenChange={(open) => !open && setReceiptBillId(null)}
        title="Record Department Payment Received"
        description="Updates project receivables (Payment Aana Baaki) across Owner Dashboard and Reports."
      >
        <form
          onSubmit={receiptForm.handleSubmit((vals) => {
            if (!receiptBillId) return;
            const res = recordRAPayment({
              raBillId: receiptBillId,
              date: vals.date,
              amount: vals.amount,
              mode: vals.mode,
              referenceNumber: vals.referenceNumber,
              notes: vals.notes,
            });
            if (res.ok) setReceiptBillId(null);
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Receipt Date</FieldLabel>
              <Input type="date" {...receiptForm.register('date')} />
            </div>
            <div>
              <FieldLabel required>Amount Received (₹)</FieldLabel>
              <Input type="number" {...receiptForm.register('amount', { valueAsNumber: true })} className="font-mono tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Payment Mode</FieldLabel>
              <SelectField
                value={receiptForm.watch('mode')}
                onValueChange={(v) => receiptForm.setValue('mode', v as 'Treasury EFT' | 'RTGS' | 'NEFT' | 'Cheque')}
                options={[
                  { value: 'Treasury EFT', label: 'Treasury EFT' },
                  { value: 'RTGS', label: 'RTGS' },
                  { value: 'NEFT', label: 'NEFT' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
              />
            </div>
            <div>
              <FieldLabel required>UTR / Reference No.</FieldLabel>
              <Input {...receiptForm.register('referenceNumber')} className="font-mono" />
              <FieldError message={receiptForm.formState.errors.referenceNumber?.message} />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setReceiptBillId(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Payment Receipt</Button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}
