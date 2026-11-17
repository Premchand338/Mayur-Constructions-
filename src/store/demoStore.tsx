import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createSeedDatabase } from '@/src/data/seedData';
import { formatINR } from '@/src/lib/formatters';
import { generateId } from '@/src/lib/utils';
import {
  ActivityLog,
  AppSection,
  DemoDatabase,
  DieselPurchase,
  DocumentCategory,
  DocumentItem,
  ExpenseCategory,
  FinancialStage,
  FinancialTransaction,
  LanguageMode,
  MaintenanceRecord,
  Material,
  PaymentReceipt,
  Project,
  RABill,
  RoleType,
  StockMovement,
  StockMovementType,
  SupplierInvoice,
  TripLog,
  UserProfile,
  Vehicle,
  VehicleStatus,
} from '@/src/types/domain';

const STORAGE_KEY = 'mayur_command_center_demo_v1';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

export interface ProjectFinancialSummary {
  contractValue: number;
  operationalBudget: number;
  billedValue: number;
  certifiedValue: number;
  retentionDeducted: number;
  netReceivableAfterRetention: number;
  paymentsReceived: number;
  pendingReceivables: number;
  verifiedExpenses: number;
  pendingExpenses: number;
  totalRecordedExpenses: number;
  materialConsumedValue: number;
  supplierPayablesOutstanding: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

interface DemoContextValue {
  db: DemoDatabase;
  activeRole: RoleType;
  currentUser: UserProfile;
  language: LanguageMode;
  activeSection: AppSection;
  globalProjectFilter: string; // 'ALL' or projectId
  guidedTourOpen: boolean;
  guidedTourStep: number;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  setActiveSection: (section: AppSection) => void;
  setGlobalProjectFilter: (projectId: string) => void;
  switchRole: (role: RoleType) => void;
  setLanguage: (lang: LanguageMode) => void;
  setGuidedTourOpen: (open: boolean) => void;
  setGuidedTourStep: (step: number) => void;
  resetDemoData: () => void;

  // Derived Selectors
  getVisibleProjects: () => Project[];
  getProjectSummary: (projectId: string) => ProjectFinancialSummary;
  getBusinessTotals: (projectFilter?: string) => {
    totalReceivablesPending: number;
    totalPayablesPending: number;
    totalPaymentsReceived: number;
    totalPaymentsDisbursed: number;
    verifiedProjectExpenses: number;
    pendingProjectExpenses: number;
    activeProjectCount: number;
    workingVehicleCount: number;
    maintenanceVehicleCount: number;
    idleVehicleCount: number;
    pendingApprovalCount: number;
    lowStockCount: number;
    expiringDocCount: number;
  };
  canPerformAction: (action: 'approve_finance' | 'verify_entry' | 'reconcile_tally' | 'edit_project' | 'manage_materials' | 'log_diesel' | 'upload_doc') => boolean;

  // Connected Mutations
  createProject: (input: Omit<Project, 'id' | 'accountingCompleteForProfit'>) => ActionResult;
  updateProject: (projectId: string, patch: Partial<Project>) => ActionResult;
  updateProjectProgress: (projectId: string, progress: number) => ActionResult;
  assignVehicleToProject: (vehicleId: string, projectId: string) => ActionResult;

  createRABill: (input: {
    projectId: string;
    billNumber: string;
    mbReference: string;
    billDate: string;
    billedAmount: number;
    certifiedAmount: number;
    notes?: string;
  }) => ActionResult;
  certifyRABill: (raBillId: string, certifiedAmount: number) => ActionResult;
  recordRAPayment: (input: {
    raBillId: string;
    date: string;
    amount: number;
    mode: PaymentReceipt['mode'];
    referenceNumber: string;
    notes?: string;
  }) => ActionResult;

  addVehicle: (input: Omit<Vehicle, 'id' | 'lastLogDate'>) => ActionResult;
  editVehicle: (vehicleId: string, patch: Partial<Vehicle>) => ActionResult;
  changeVehicleStatus: (vehicleId: string, status: VehicleStatus) => ActionResult;
  recordDieselPurchase: (input: {
    vehicleId: string;
    projectId: string;
    date: string;
    litres: number;
    ratePerLitre: number;
    meterReading: number;
    pumpOrVendor: string;
    receiptRef: string;
    receiptFileName?: string;
    receiptDataUrl?: string;
  }) => ActionResult;
  recordTripLog: (input: Omit<TripLog, 'id'>) => ActionResult;
  recordMaintenance: (input: Omit<MaintenanceRecord, 'id' | 'linkedExpenseId'>) => ActionResult;

  addMaterial: (input: Omit<Material, 'id' | 'receivedQty' | 'issuedQty' | 'transferredInQty' | 'transferredOutQty' | 'closingStock'>) => ActionResult;
  recordStockMovement: (input: {
    materialId: string;
    type: StockMovementType;
    quantity: number;
    rate: number;
    projectId: string;
    fromLocation: string;
    toLocation: string;
    supplierId?: string;
    invoiceNumber?: string;
    referenceNote: string;
    date: string;
    exceptionOverride?: boolean;
  }) => ActionResult;

  addExpense: (input: {
    projectId: string;
    date: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    vendorOrPayee: string;
    billRef: string;
    asDraft?: boolean;
    billFileName?: string;
    billDataUrl?: string;
  }) => ActionResult;
  editDraftExpense: (txnId: string, patch: Partial<FinancialTransaction>) => ActionResult;
  submitExpenseForVerification: (txnId: string) => ActionResult;
  verifyExpense: (txnId: string) => ActionResult;
  approveOrRejectExpense: (txnId: string, decision: 'approve' | 'reject', reason?: string) => ActionResult;
  recordExpensePayment: (txnId: string, mode: FinancialTransaction['paymentMode'], paymentRef: string, paymentDate: string) => ActionResult;
  reconcileTransaction: (txnId: string) => ActionResult;
  recordSupplierInvoicePayment: (invoiceId: string, amount: number, reference: string) => ActionResult;
  importTallyCsvRows: (rows: Array<{
    date: string;
    projectCode: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    vendor: string;
    billRef: string;
    reconciled: boolean;
  }>) => { imported: number; skippedDuplicates: number; errors: string[] };

  uploadDocument: (input: {
    title: string;
    category: DocumentCategory;
    projectId?: string;
    vehicleId?: string;
    expiryDate?: string;
    description: string;
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    dataUrl?: string;
  }) => ActionResult;
  updateDocumentStatus: (docId: string, status: DocumentItem['status']) => ActionResult;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function loadInitialDb(): DemoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDatabase;
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to clean seed
  }
  return createSeedDatabase();
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DemoDatabase>(() => loadInitialDb());
  const [activeRole, setActiveRole] = useState<RoleType>('owner');
  const [language, setLanguage] = useState<LanguageMode>('hinglish');
  const [activeSection, setActiveSection] = useState<AppSection>('overview');
  const [globalProjectFilter, setGlobalProjectFilter] = useState<string>('ALL');
  const [guidedTourOpen, setGuidedTourOpen] = useState<boolean>(false);
  const [guidedTourStep, setGuidedTourStep] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore quota exceeded gracefully
    }
  }, [db]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId('TST');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const currentUser = useMemo(() => {
    return db.users.find((u) => u.role === activeRole) ?? db.users[0];
  }, [db.users, activeRole]);

  const appendLog = useCallback(
    (
      logs: ActivityLog[],
      module: ActivityLog['module'],
      action: string,
      summary: string,
      entityId?: string,
      projectId?: string
    ): ActivityLog[] => {
      const entry: ActivityLog = {
        id: generateId('ACT'),
        timestamp: new Date().toISOString(),
        actorName: currentUser.name,
        actorRole: currentUser.role,
        module,
        action,
        summary,
        entityId,
        projectId,
      };
      return [entry, ...logs].slice(0, 200);
    },
    [currentUser]
  );

  const switchRole = useCallback(
    (role: RoleType) => {
      setActiveRole(role);
      const user = db.users.find((u) => u.role === role);
      if (role === 'driver') {
        setActiveSection('overview');
      }
      pushToast({
        title: `Switched role to ${user?.name ?? role}`,
        description: `Demo view updated for ${role.replace('_', ' ')}`,
        tone: 'info',
      });
    },
    [db.users, pushToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createSeedDatabase();
    setDb(fresh);
    setGlobalProjectFilter('ALL');
    setActiveRole('owner');
    setActiveSection('overview');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    pushToast({
      title: 'Demo Data Reset Complete',
      description: 'All 8 projects, 22 vehicles, 26 materials, and financial ledgers restored.',
      tone: 'success',
    });
  }, [pushToast]);

  const getVisibleProjects = useCallback(() => {
    if (currentUser.assignedProjectIds.length === 0) return db.projects;
    return db.projects.filter((p) => currentUser.assignedProjectIds.includes(p.id));
  }, [db.projects, currentUser]);

  const canPerformAction = useCallback(
    (
      action:
        | 'approve_finance'
        | 'verify_entry'
        | 'reconcile_tally'
        | 'edit_project'
        | 'manage_materials'
        | 'log_diesel'
        | 'upload_doc'
    ) => {
      switch (action) {
        case 'approve_finance':
          return activeRole === 'owner' || activeRole === 'accountant';
        case 'verify_entry':
          return activeRole === 'owner' || activeRole === 'office_admin' || activeRole === 'accountant';
        case 'reconcile_tally':
          return activeRole === 'owner' || activeRole === 'accountant';
        case 'edit_project':
          return activeRole === 'owner' || activeRole === 'office_admin';
        case 'manage_materials':
          return activeRole === 'owner' || activeRole === 'supervisor' || activeRole === 'office_admin';
        case 'log_diesel':
          return true;
        case 'upload_doc':
          return activeRole !== 'driver';
      }
    },
    [activeRole]
  );

  const getProjectSummary = useCallback(
    (projectId: string): ProjectFinancialSummary => {
      const project = db.projects.find((p) => p.id === projectId);
      const bills = db.raBills.filter((b) => b.projectId === projectId);
      const receipts = db.paymentReceipts.filter((r) => r.projectId === projectId);
      const txns = db.transactions.filter((t) => t.projectId === projectId && t.stage !== 'Rejected');
      const issues = db.stockMovements.filter((m) => m.projectId === projectId && m.type === 'issue');
      const invoices = db.supplierInvoices.filter((i) => i.projectId === projectId);

      const billedValue = bills.reduce((sum, b) => sum + b.billedAmount, 0);
      const certifiedValue = bills.reduce((sum, b) => sum + b.certifiedAmount, 0);
      const retentionDeducted = bills.reduce((sum, b) => sum + b.retentionDeducted, 0);
      const netReceivableAfterRetention = bills.reduce((sum, b) => sum + b.netReceivable, 0);
      const paymentsReceived = receipts.reduce((sum, r) => sum + r.amount, 0);
      const pendingReceivables = Math.max(0, netReceivableAfterRetention - paymentsReceived);

      const verifiedStages: FinancialStage[] = ['Verified', 'Invoice Outstanding', 'Payment Completed', 'Reconciled'];
      const verifiedExpenses = txns
        .filter((t) => verifiedStages.includes(t.stage))
        .reduce((sum, t) => sum + t.amount, 0);
      const pendingExpenses = txns
        .filter((t) => t.stage === 'Recorded' || t.stage === 'Draft')
        .reduce((sum, t) => sum + t.amount, 0);

      const materialConsumedValue = issues.reduce((sum, m) => sum + m.totalValue, 0);
      const supplierPayablesOutstanding = invoices.reduce(
        (sum, inv) => sum + Math.max(0, inv.amount - inv.paidAmount),
        0
      );

      return {
        contractValue: project?.contractValue ?? 0,
        operationalBudget: project?.operationalBudget ?? 0,
        billedValue,
        certifiedValue,
        retentionDeducted,
        netReceivableAfterRetention,
        paymentsReceived,
        pendingReceivables,
        verifiedExpenses,
        pendingExpenses,
        totalRecordedExpenses: verifiedExpenses + pendingExpenses,
        materialConsumedValue,
        supplierPayablesOutstanding,
      };
    },
    [db]
  );

  const getBusinessTotals = useCallback(
    (projectFilter = 'ALL') => {
      const visibleProjects = getVisibleProjects().filter(
        (p) => projectFilter === 'ALL' || p.id === projectFilter
      );
      const visibleIds = new Set(visibleProjects.map((p) => p.id));

      let totalReceivablesPending = 0;
      let totalPaymentsReceived = 0;
      let verifiedProjectExpenses = 0;
      let pendingProjectExpenses = 0;

      for (const p of visibleProjects) {
        const s = getProjectSummary(p.id);
        totalReceivablesPending += s.pendingReceivables;
        totalPaymentsReceived += s.paymentsReceived;
        verifiedProjectExpenses += s.verifiedExpenses;
        pendingProjectExpenses += s.pendingExpenses;
      }

      const relevantInvoices = db.supplierInvoices.filter((i) => visibleIds.has(i.projectId));
      const supplierPayables = relevantInvoices.reduce(
        (sum, i) => sum + Math.max(0, i.amount - i.paidAmount),
        0
      );
      const supplierPaid = relevantInvoices.reduce((sum, i) => sum + i.paidAmount, 0);

      const relevantTxns = db.transactions.filter(
        (t) => visibleIds.has(t.projectId) && t.stage !== 'Rejected'
      );
      const outstandingTxnPayables = relevantTxns
        .filter((t) => t.stage === 'Invoice Outstanding' || t.stage === 'Verified')
        .reduce((sum, t) => sum + t.amount, 0);
      const paidTxns = relevantTxns
        .filter((t) => t.stage === 'Payment Completed' || t.stage === 'Reconciled')
        .reduce((sum, t) => sum + t.amount, 0);

      const relevantVehicles = db.vehicles.filter((v) => visibleIds.has(v.assignedProjectId));
      const workingVehicleCount = relevantVehicles.filter((v) => v.status === 'Working').length;
      const maintenanceVehicleCount = relevantVehicles.filter((v) => v.status === 'Maintenance').length;
      const idleVehicleCount = relevantVehicles.filter((v) => v.status === 'Idle').length;

      const pendingDieselCount = db.dieselPurchases.filter(
        (d) => visibleIds.has(d.projectId) && d.verificationStatus === 'Pending Verification'
      ).length;
      const pendingManualTxnCount = relevantTxns.filter(
        (t) => t.sourceType !== 'diesel' && (t.stage === 'Recorded' || t.stage === 'Draft')
      ).length;

      const lowStockCount = db.materials.filter(
        (m) => visibleIds.has(m.assignedProjectId) && m.closingStock <= m.minThreshold
      ).length;

      const expiringDocCount = db.documents.filter(
        (d) =>
          (!d.projectId || visibleIds.has(d.projectId)) &&
          (d.status === 'Expiring Soon' || d.status === 'Expired')
      ).length;

      return {
        totalReceivablesPending,
        totalPayablesPending: supplierPayables + outstandingTxnPayables,
        totalPaymentsReceived,
        totalPaymentsDisbursed: supplierPaid + paidTxns,
        verifiedProjectExpenses,
        pendingProjectExpenses,
        activeProjectCount: visibleProjects.filter((p) => p.status !== 'Completed').length,
        workingVehicleCount,
        maintenanceVehicleCount,
        idleVehicleCount,
        pendingApprovalCount: pendingDieselCount + pendingManualTxnCount,
        lowStockCount,
        expiringDocCount,
      };
    },
    [db, getProjectSummary, getVisibleProjects]
  );

  // ---------------- MUTATIONS ----------------

  const createProject: DemoContextValue['createProject'] = useCallback(
    (input) => {
      if (db.projects.some((p) => p.workOrderNumber.toLowerCase() === input.workOrderNumber.toLowerCase())) {
        return { ok: false, message: 'A project with this Work Order number already exists.' };
      }
      const newProject: Project = {
        ...input,
        id: generateId('PRJ'),
        accountingCompleteForProfit: false,
      };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        projects: [newProject, ...prev.projects],
        activityLogs: appendLog(
          prev.activityLogs,
          'projects',
          'Project Created',
          `Created contract ${newProject.name} (${formatINR(newProject.contractValue)})`,
          newProject.id,
          newProject.id
        ),
      }));
      pushToast({ title: 'Project Created', description: newProject.name, tone: 'success' });
      return { ok: true, message: 'Project saved successfully.', id: newProject.id };
    },
    [appendLog, db.projects, pushToast]
  );

  const updateProject: DemoContextValue['updateProject'] = useCallback(
    (projectId, patch) => {
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
        activityLogs: appendLog(
          prev.activityLogs,
          'projects',
          'Project Updated',
          `Updated details for ${patch.name ?? projectId}`,
          projectId,
          projectId
        ),
      }));
      pushToast({ title: 'Project Updated', tone: 'success' });
      return { ok: true, message: 'Project updated.' };
    },
    [appendLog, pushToast]
  );

  const updateProjectProgress: DemoContextValue['updateProjectProgress'] = useCallback(
    (projectId, progress) => {
      const clamped = Math.max(0, Math.min(100, Math.round(progress)));
      const target = db.projects.find((p) => p.id === projectId);
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                physicalProgress: clamped,
                status: clamped === 100 ? 'Completed' : clamped >= 85 ? 'Near Completion' : p.status,
              }
            : p
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'projects',
          'Progress Updated',
          `Updated physical progress of ${target?.name ?? projectId} to ${clamped}%`,
          projectId,
          projectId
        ),
      }));
      pushToast({ title: `Progress set to ${clamped}%`, description: target?.name, tone: 'success' });
      return { ok: true, message: 'Progress updated.' };
    },
    [appendLog, db.projects, pushToast]
  );

  const assignVehicleToProject: DemoContextValue['assignVehicleToProject'] = useCallback(
    (vehicleId, projectId) => {
      const veh = db.vehicles.find((v) => v.id === vehicleId);
      const prj = db.projects.find((p) => p.id === projectId);
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId ? { ...v, assignedProjectId: projectId } : v
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          'Vehicle Assigned',
          `Assigned ${veh?.registrationNumber ?? vehicleId} to ${prj?.name ?? projectId}`,
          vehicleId,
          projectId
        ),
      }));
      pushToast({
        title: `${veh?.registrationNumber ?? 'Vehicle'} Assigned`,
        description: prj?.name,
        tone: 'success',
      });
      return { ok: true, message: 'Vehicle assigned to project.' };
    },
    [appendLog, db.projects, db.vehicles, pushToast]
  );

  const createRABill: DemoContextValue['createRABill'] = useCallback(
    (input) => {
      const project = db.projects.find((p) => p.id === input.projectId);
      if (!project) return { ok: false, message: 'Project not found.' };
      if (db.raBills.some((b) => b.billNumber.toLowerCase() === input.billNumber.toLowerCase())) {
        return { ok: false, message: 'Duplicate RA Bill number detected.' };
      }
      const retention = Math.round((input.certifiedAmount * project.retentionPercent) / 100);
      const netReceivable = Math.max(0, input.certifiedAmount - retention);
      const bill: RABill = {
        id: generateId('RA'),
        projectId: input.projectId,
        billNumber: input.billNumber,
        mbReference: input.mbReference,
        billDate: input.billDate,
        billedAmount: input.billedAmount,
        certifiedAmount: input.certifiedAmount,
        retentionDeducted: retention,
        netReceivable,
        status: input.certifiedAmount > 0 ? 'Certified' : 'Submitted',
        notes: input.notes,
      };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        raBills: [bill, ...prev.raBills],
        activityLogs: appendLog(
          prev.activityLogs,
          'projects',
          'RA Bill Entered',
          `Entered ${bill.billNumber} (${formatINR(bill.billedAmount)}) for ${project.name}`,
          bill.id,
          project.id
        ),
      }));
      pushToast({ title: 'RA Bill Saved', description: `${bill.billNumber} · ${formatINR(bill.billedAmount)}`, tone: 'success' });
      return { ok: true, message: 'RA Bill recorded.', id: bill.id };
    },
    [appendLog, db.projects, db.raBills, pushToast]
  );

  const certifyRABill: DemoContextValue['certifyRABill'] = useCallback(
    (raBillId, certifiedAmount) => {
      const bill = db.raBills.find((b) => b.id === raBillId);
      const project = db.projects.find((p) => p.id === bill?.projectId);
      if (!bill || !project) return { ok: false, message: 'RA Bill not found.' };
      const retention = Math.round((certifiedAmount * project.retentionPercent) / 100);
      const netReceivable = Math.max(0, certifiedAmount - retention);
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        raBills: prev.raBills.map((b) =>
          b.id === raBillId
            ? {
                ...b,
                certifiedAmount,
                retentionDeducted: retention,
                netReceivable,
                status: 'Certified',
              }
            : b
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'projects',
          'RA Bill Certified',
          `Certified ${bill.billNumber} at ${formatINR(certifiedAmount)} (Net receivable ${formatINR(netReceivable)})`,
          raBillId,
          project.id
        ),
      }));
      pushToast({ title: 'RA Bill Certified', description: `${bill.billNumber} updated receivables.`, tone: 'success' });
      return { ok: true, message: 'RA Bill certified.' };
    },
    [appendLog, db.projects, db.raBills, pushToast]
  );

  const recordRAPayment: DemoContextValue['recordRAPayment'] = useCallback(
    (input) => {
      const bill = db.raBills.find((b) => b.id === input.raBillId);
      if (!bill) return { ok: false, message: 'RA Bill not found.' };
      if (bill.netReceivable <= 0) {
        return { ok: false, message: 'Certify the RA bill before recording a payment receipt.' };
      }
      const alreadyReceived = db.paymentReceipts
        .filter((r) => r.raBillId === bill.id)
        .reduce((sum, r) => sum + r.amount, 0);
      const remaining = Math.max(0, bill.netReceivable - alreadyReceived);
      if (input.amount <= 0 || input.amount > remaining) {
        return {
          ok: false,
          message: `Amount must be between ₹1 and remaining receivable (${formatINR(remaining)}).`,
        };
      }
      const receipt: PaymentReceipt = {
        id: generateId('RCP'),
        projectId: bill.projectId,
        raBillId: bill.id,
        date: input.date,
        amount: input.amount,
        mode: input.mode,
        referenceNumber: input.referenceNumber,
        notes: input.notes,
        recordedBy: currentUser.name,
      };
      const newTotal = alreadyReceived + input.amount;
      const newStatus = newTotal >= bill.netReceivable ? 'Paid' : 'Partially Paid';

      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        paymentReceipts: [receipt, ...prev.paymentReceipts],
        raBills: prev.raBills.map((b) => (b.id === bill.id ? { ...b, status: newStatus } : b)),
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Payment Receipt Recorded',
          `Received ${formatINR(input.amount)} against ${bill.billNumber} via ${input.mode} (${input.referenceNumber})`,
          receipt.id,
          bill.projectId
        ),
      }));
      pushToast({
        title: 'Payment Receipt Recorded',
        description: `${formatINR(input.amount)} credited to receivables.`,
        tone: 'success',
      });
      return { ok: true, message: 'Payment receipt saved.', id: receipt.id };
    },
    [appendLog, currentUser.name, db.paymentReceipts, db.raBills, pushToast]
  );

  const addVehicle: DemoContextValue['addVehicle'] = useCallback(
    (input) => {
      if (db.vehicles.some((v) => v.registrationNumber.toLowerCase() === input.registrationNumber.toLowerCase())) {
        return { ok: false, message: 'Registration number already exists in fleet.' };
      }
      const vehicle: Vehicle = {
        ...input,
        id: generateId('VEH'),
        lastLogDate: '2026-11-16',
      };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        vehicles: [vehicle, ...prev.vehicles],
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          'Vehicle Added',
          `Added ${vehicle.registrationNumber} (${vehicle.category})`,
          vehicle.id,
          vehicle.assignedProjectId
        ),
      }));
      pushToast({ title: 'Vehicle Added', description: vehicle.registrationNumber, tone: 'success' });
      return { ok: true, message: 'Vehicle added.', id: vehicle.id };
    },
    [appendLog, db.vehicles, pushToast]
  );

  const editVehicle: DemoContextValue['editVehicle'] = useCallback(
    (vehicleId, patch) => {
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        vehicles: prev.vehicles.map((v) => (v.id === vehicleId ? { ...v, ...patch } : v)),
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          'Vehicle Edited',
          `Updated details for ${patch.registrationNumber ?? vehicleId}`,
          vehicleId,
          patch.assignedProjectId
        ),
      }));
      pushToast({ title: 'Vehicle Updated', tone: 'success' });
      return { ok: true, message: 'Vehicle updated.' };
    },
    [appendLog, pushToast]
  );

  const changeVehicleStatus: DemoContextValue['changeVehicleStatus'] = useCallback(
    (vehicleId, status) => {
      const veh = db.vehicles.find((v) => v.id === vehicleId);
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        vehicles: prev.vehicles.map((v) => (v.id === vehicleId ? { ...v, status } : v)),
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          'Vehicle Status Changed',
          `${veh?.registrationNumber ?? vehicleId} marked ${status}`,
          vehicleId,
          veh?.assignedProjectId
        ),
      }));
      pushToast({ title: `${veh?.registrationNumber ?? 'Vehicle'} → ${status}`, tone: 'info' });
      return { ok: true, message: 'Status updated.' };
    },
    [appendLog, db.vehicles, pushToast]
  );

  const recordDieselPurchase: DemoContextValue['recordDieselPurchase'] = useCallback(
    (input) => {
      const vehicle = db.vehicles.find((v) => v.id === input.vehicleId);
      const project = db.projects.find((p) => p.id === input.projectId);
      if (!vehicle || !project) return { ok: false, message: 'Invalid vehicle or project.' };

      if (
        input.receiptRef.trim() &&
        db.dieselPurchases.some(
          (d) =>
            d.receiptRef.toLowerCase() === input.receiptRef.trim().toLowerCase() &&
            d.date === input.date
        )
      ) {
        return { ok: false, message: 'Duplicate diesel receipt reference for this date.' };
      }

      const totalAmount = Math.round(input.litres * input.ratePerLitre);
      const anomalyNotes: string[] = [];
      if (input.litres > 230) {
        anomalyNotes.push(`High refill volume (${input.litres}L) exceeds typical tank pattern — review receipt`);
      }
      if (input.ratePerLitre > 96 || input.ratePerLitre < 88) {
        anomalyNotes.push(`Rate ₹${input.ratePerLitre}/L differs from regional pump benchmark (₹93–95/L)`);
      }
      if (input.meterReading < vehicle.currentMeterReading) {
        anomalyNotes.push(
          `Entered ${vehicle.meterType} (${input.meterReading}) is lower than last reading (${vehicle.currentMeterReading})`
        );
      }

      const dieselId = generateId('DSL');
      const expenseId = generateId('TXN');
      const anomalyFlag = anomalyNotes.length > 0 ? anomalyNotes.join('; ') : undefined;

      const newDiesel: DieselPurchase = {
        id: dieselId,
        vehicleId: vehicle.id,
        projectId: project.id,
        date: input.date,
        litres: input.litres,
        ratePerLitre: input.ratePerLitre,
        totalAmount,
        meterReading: input.meterReading,
        pumpOrVendor: input.pumpOrVendor,
        receiptRef: input.receiptRef,
        receiptFileName: input.receiptFileName,
        receiptDataUrl: input.receiptDataUrl,
        verificationStatus: 'Pending Verification',
        anomalyFlag,
        linkedExpenseId: expenseId,
        createdBy: currentUser.name,
      };

      const linkedExpense: FinancialTransaction = {
        id: expenseId,
        projectId: project.id,
        date: input.date,
        category: 'Diesel',
        description: `Diesel ${input.litres}L @ ₹${input.ratePerLitre}/L for ${vehicle.registrationNumber}`,
        amount: totalAmount,
        stage: 'Recorded',
        sourceType: 'diesel',
        sourceId: dieselId,
        vendorOrPayee: input.pumpOrVendor,
        billRef: input.receiptRef,
        billFileName: input.receiptFileName,
        billDataUrl: input.receiptDataUrl,
        createdBy: currentUser.name,
      };

      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        dieselPurchases: [newDiesel, ...prev.dieselPurchases],
        transactions: [linkedExpense, ...prev.transactions],
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicle.id
            ? {
                ...v,
                currentMeterReading: Math.max(v.currentMeterReading, input.meterReading),
                lastLogDate: input.date,
              }
            : v
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          anomalyFlag ? 'Diesel Recorded (Review Flagged)' : 'Diesel Entry Recorded',
          `${vehicle.registrationNumber}: ${input.litres}L (${formatINR(totalAmount)}) linked to ${project.name} — Pending Office Verification`,
          dieselId,
          project.id
        ),
      }));

      pushToast({
        title: anomalyFlag ? 'Diesel Saved & Flagged for Review' : 'Diesel Entry Saved',
        description: `${vehicle.registrationNumber} · ${formatINR(totalAmount)} sent to Office Admin queue`,
        tone: anomalyFlag ? 'warning' : 'success',
      });
      return { ok: true, message: 'Diesel entry saved.', id: dieselId };
    },
    [appendLog, currentUser.name, db.dieselPurchases, db.projects, db.vehicles, pushToast]
  );

  const recordTripLog: DemoContextValue['recordTripLog'] = useCallback(
    (input) => {
      const vehicle = db.vehicles.find((v) => v.id === input.vehicleId);
      const trip: TripLog = { ...input, id: generateId('TRP') };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        tripLogs: [trip, ...prev.tripLogs],
        vehicles: prev.vehicles.map((v) =>
          v.id === input.vehicleId
            ? {
                ...v,
                currentMeterReading: v.currentMeterReading + input.meterDelta,
                lastLogDate: input.date,
              }
            : v
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          'Trip Logged',
          `${vehicle?.registrationNumber ?? input.vehicleId}: ${input.tripsCount} trips (${input.materialCarried})`,
          trip.id,
          input.projectId
        ),
      }));
      pushToast({ title: 'Trip Log Saved', description: `${input.tripsCount} trips recorded`, tone: 'success' });
      return { ok: true, message: 'Trip saved.', id: trip.id };
    },
    [appendLog, db.vehicles, pushToast]
  );

  const recordMaintenance: DemoContextValue['recordMaintenance'] = useCallback(
    (input) => {
      const vehicle = db.vehicles.find((v) => v.id === input.vehicleId);
      const mntId = generateId('MNT');
      const expId = generateId('TXN');
      const record: MaintenanceRecord = { ...input, id: mntId, linkedExpenseId: expId };
      const expense: FinancialTransaction = {
        id: expId,
        projectId: input.projectId,
        date: input.date,
        category: 'Maintenance',
        description: `${input.serviceType}: ${vehicle?.registrationNumber ?? input.vehicleId} — ${input.description}`,
        amount: input.cost,
        stage: 'Recorded',
        sourceType: 'maintenance',
        sourceId: mntId,
        vendorOrPayee: input.vendor,
        billRef: `MNT-${mntId}`,
        createdBy: currentUser.name,
      };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        maintenanceRecords: [record, ...prev.maintenanceRecords],
        transactions: [expense, ...prev.transactions],
        vehicles: prev.vehicles.map((v) =>
          v.id === input.vehicleId
            ? {
                ...v,
                status: input.status === 'In Workshop' ? 'Maintenance' : 'Working',
                serviceDueDate: input.nextServiceDate,
                lastLogDate: input.date,
              }
            : v
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'vehicles',
          'Maintenance Recorded',
          `${vehicle?.registrationNumber ?? input.vehicleId}: ${input.serviceType} (${formatINR(input.cost)})`,
          mntId,
          input.projectId
        ),
      }));
      pushToast({ title: 'Maintenance Saved', description: `Linked ${formatINR(input.cost)} expense`, tone: 'success' });
      return { ok: true, message: 'Maintenance saved.', id: mntId };
    },
    [appendLog, currentUser.name, db.vehicles, pushToast]
  );

  const addMaterial: DemoContextValue['addMaterial'] = useCallback(
    (input) => {
      if (db.materials.some((m) => m.code.toLowerCase() === input.code.toLowerCase())) {
        return { ok: false, message: 'Material code already exists.' };
      }
      const material: Material = {
        ...input,
        id: generateId('MAT'),
        receivedQty: 0,
        issuedQty: 0,
        transferredInQty: 0,
        transferredOutQty: 0,
        closingStock: input.openingStock,
      };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        materials: [material, ...prev.materials],
        activityLogs: appendLog(
          prev.activityLogs,
          'materials',
          'Material Added',
          `Added ${material.name} (${material.openingStock} ${material.unit}) at ${material.storageLocation}`,
          material.id,
          material.assignedProjectId
        ),
      }));
      pushToast({ title: 'Material Added', description: material.name, tone: 'success' });
      return { ok: true, message: 'Material added.', id: material.id };
    },
    [appendLog, db.materials, pushToast]
  );

  const recordStockMovement: DemoContextValue['recordStockMovement'] = useCallback(
    (input) => {
      const material = db.materials.find((m) => m.id === input.materialId);
      if (!material) return { ok: false, message: 'Material not found.' };
      if (input.quantity <= 0) return { ok: false, message: 'Quantity must be greater than zero.' };

      const isOutflow = input.type === 'issue' || input.type === 'transfer';
      if (isOutflow && material.closingStock - input.quantity < 0 && !input.exceptionOverride) {
        return {
          ok: false,
          message: `Insufficient stock (${material.closingStock} ${material.unit} available). Enable explicit exception override if physical yard variance exists.`,
        };
      }

      const movId = generateId('MOV');
      const totalValue = Math.round(input.quantity * input.rate);
      let linkedInvoice: SupplierInvoice | null = null;

      if (input.type === 'inward' && input.supplierId) {
        const invNum = input.invoiceNumber?.trim() || `INV-${movId}`;
        if (
          db.supplierInvoices.some(
            (i) => i.invoiceNumber.toLowerCase() === invNum.toLowerCase() && i.supplierId === input.supplierId
          )
        ) {
          return { ok: false, message: `Duplicate supplier invoice number (${invNum}) detected.` };
        }
        const supplier = db.suppliers.find((s) => s.id === input.supplierId);
        const due = new Date(input.date);
        due.setDate(due.getDate() + (supplier?.creditDays ?? 30));

        linkedInvoice = {
          id: generateId('INV'),
          supplierId: input.supplierId,
          projectId: input.projectId,
          invoiceNumber: invNum,
          date: input.date,
          dueDate: due.toISOString().slice(0, 10),
          amount: totalValue,
          paidAmount: 0,
          category: 'Material Purchase',
          linkedMovementId: movId,
          status: 'Outstanding',
          reconciled: false,
        };
      }

      const movement: StockMovement = {
        id: movId,
        materialId: material.id,
        type: input.type,
        quantity: input.quantity,
        rate: input.rate,
        totalValue,
        projectId: input.projectId,
        fromLocation: input.fromLocation,
        toLocation: input.toLocation,
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber,
        linkedInvoiceId: linkedInvoice?.id,
        referenceNote: input.referenceNote,
        exceptionOverride: input.exceptionOverride,
        date: input.date,
        createdBy: currentUser.name,
      };

      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        materials: prev.materials.map((m) => {
          if (m.id !== material.id) return m;
          if (input.type === 'inward') {
            return {
              ...m,
              receivedQty: m.receivedQty + input.quantity,
              closingStock: m.closingStock + input.quantity,
              purchaseRate: input.rate,
            };
          }
          if (input.type === 'issue') {
            return {
              ...m,
              issuedQty: m.issuedQty + input.quantity,
              closingStock: m.closingStock - input.quantity,
            };
          }
          if (input.type === 'transfer') {
            return {
              ...m,
              transferredOutQty: m.transferredOutQty + input.quantity,
              closingStock: m.closingStock - input.quantity,
            };
          }
          if (input.type === 'return') {
            return {
              ...m,
              receivedQty: m.receivedQty + input.quantity,
              closingStock: m.closingStock + input.quantity,
            };
          }
          // adjustment (can reduce or add; treat positive note vs stock check)
          return {
            ...m,
            receivedQty: m.receivedQty + input.quantity,
            closingStock: m.closingStock + input.quantity,
          };
        }),
        stockMovements: [movement, ...prev.stockMovements],
        supplierInvoices: linkedInvoice
          ? [linkedInvoice, ...prev.supplierInvoices]
          : prev.supplierInvoices,
        activityLogs: appendLog(
          prev.activityLogs,
          'materials',
          `Stock ${input.type.toUpperCase()}`,
          input.type === 'inward'
            ? `Inward ${input.quantity} ${material.unit} ${material.name} (${formatINR(totalValue)}) + linked Supplier Invoice`
            : input.type === 'transfer'
            ? `Transferred ${input.quantity} ${material.unit} ${material.name} from ${input.fromLocation} to ${input.toLocation} (non-consumption)`
            : `${input.type === 'issue' ? 'Issued' : 'Updated'} ${input.quantity} ${material.unit} ${material.name} at ${input.toLocation}`,
          movId,
          input.projectId
        ),
      }));

      pushToast({
        title: `Stock ${input.type === 'transfer' ? 'Transferred' : input.type === 'inward' ? 'Received' : 'Updated'}`,
        description: `${material.name}: ${input.quantity} ${material.unit}`,
        tone: 'success',
      });
      return { ok: true, message: 'Stock movement recorded.', id: movId };
    },
    [appendLog, currentUser.name, db.materials, db.supplierInvoices, db.suppliers, pushToast]
  );

  const addExpense: DemoContextValue['addExpense'] = useCallback(
    (input) => {
      if (
        input.billRef.trim() &&
        db.transactions.some(
          (t) => t.billRef.toLowerCase() === input.billRef.trim().toLowerCase() && t.projectId === input.projectId
        )
      ) {
        return { ok: false, message: 'Duplicate bill reference exists for this project.' };
      }
      const txn: FinancialTransaction = {
        id: generateId('TXN'),
        projectId: input.projectId,
        date: input.date,
        category: input.category,
        description: input.description,
        amount: input.amount,
        stage: input.asDraft ? 'Draft' : 'Recorded',
        sourceType: 'manual',
        vendorOrPayee: input.vendorOrPayee,
        billRef: input.billRef,
        billFileName: input.billFileName,
        billDataUrl: input.billDataUrl,
        createdBy: currentUser.name,
      };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: [txn, ...prev.transactions],
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          input.asDraft ? 'Draft Expense Saved' : 'Expense Recorded',
          `${input.category}: ${formatINR(input.amount)} (${input.vendorOrPayee})`,
          txn.id,
          input.projectId
        ),
      }));
      pushToast({
        title: input.asDraft ? 'Draft Expense Saved' : 'Expense Submitted for Verification',
        description: `${formatINR(input.amount)} · ${input.vendorOrPayee}`,
        tone: 'success',
      });
      return { ok: true, message: 'Expense saved.', id: txn.id };
    },
    [appendLog, currentUser.name, db.transactions, pushToast]
  );

  const editDraftExpense: DemoContextValue['editDraftExpense'] = useCallback(
    (txnId, patch) => {
      const target = db.transactions.find((t) => t.id === txnId);
      if (!target || (target.stage !== 'Draft' && target.stage !== 'Recorded')) {
        return { ok: false, message: 'Only Draft or unverified Recorded entries can be edited.' };
      }
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: prev.transactions.map((t) => (t.id === txnId ? { ...t, ...patch } : t)),
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Expense Edited',
          `Edited entry ${target.billRef}`,
          txnId,
          target.projectId
        ),
      }));
      pushToast({ title: 'Expense Updated', tone: 'success' });
      return { ok: true, message: 'Updated.' };
    },
    [appendLog, db.transactions, pushToast]
  );

  const submitExpenseForVerification: DemoContextValue['submitExpenseForVerification'] = useCallback(
    (txnId) => {
      const target = db.transactions.find((t) => t.id === txnId);
      if (!target) return { ok: false, message: 'Transaction not found.' };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: prev.transactions.map((t) => (t.id === txnId ? { ...t, stage: 'Recorded' } : t)),
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Submitted for Verification',
          `Submitted ${target.billRef} (${formatINR(target.amount)}) for verification`,
          txnId,
          target.projectId
        ),
      }));
      pushToast({ title: 'Submitted for Verification', tone: 'info' });
      return { ok: true, message: 'Submitted.' };
    },
    [appendLog, db.transactions, pushToast]
  );

  const verifyExpense: DemoContextValue['verifyExpense'] = useCallback(
    (txnId) => {
      const target = db.transactions.find((t) => t.id === txnId);
      if (!target) return { ok: false, message: 'Transaction not found.' };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: prev.transactions.map((t) =>
          t.id === txnId ? { ...t, stage: 'Verified', verifiedBy: currentUser.name } : t
        ),
        dieselPurchases:
          target.sourceType === 'diesel' && target.sourceId
            ? prev.dieselPurchases.map((d) =>
                d.id === target.sourceId
                  ? { ...d, verificationStatus: 'Verified', anomalyFlag: undefined }
                  : d
              )
            : prev.dieselPurchases,
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Entry Verified',
          `Verified ${target.category} entry ${target.billRef} (${formatINR(target.amount)})`,
          txnId,
          target.projectId
        ),
      }));
      pushToast({ title: 'Entry Verified', description: `${target.billRef} marked Verified`, tone: 'success' });
      return { ok: true, message: 'Entry verified.' };
    },
    [appendLog, currentUser.name, db.transactions, pushToast]
  );

  const approveOrRejectExpense: DemoContextValue['approveOrRejectExpense'] = useCallback(
    (txnId, decision, reason) => {
      const target = db.transactions.find((t) => t.id === txnId);
      if (!target) return { ok: false, message: 'Transaction not found.' };
      const nextStage: FinancialStage =
        decision === 'approve' ? 'Invoice Outstanding' : 'Rejected';
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: prev.transactions.map((t) =>
          t.id === txnId
            ? {
                ...t,
                stage: nextStage,
                approvedBy: decision === 'approve' ? currentUser.name : undefined,
                rejectionReason: decision === 'reject' ? reason || 'Returned for clarification' : undefined,
              }
            : t
        ),
        dieselPurchases:
          target.sourceType === 'diesel' && target.sourceId
            ? prev.dieselPurchases.map((d) =>
                d.id === target.sourceId
                  ? {
                      ...d,
                      verificationStatus: decision === 'approve' ? 'Verified' : 'Rejected',
                    }
                  : d
              )
            : prev.dieselPurchases,
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          decision === 'approve' ? 'Expense Approved' : 'Expense Rejected',
          `${decision === 'approve' ? 'Approved' : 'Rejected'} ${target.billRef} (${formatINR(target.amount)})`,
          txnId,
          target.projectId
        ),
      }));
      pushToast({
        title: decision === 'approve' ? 'Expense Approved for Payment' : 'Expense Rejected',
        description: target.billRef,
        tone: decision === 'approve' ? 'success' : 'warning',
      });
      return { ok: true, message: 'Updated.' };
    },
    [appendLog, currentUser.name, db.transactions, pushToast]
  );

  const recordExpensePayment: DemoContextValue['recordExpensePayment'] = useCallback(
    (txnId, mode, paymentRef, paymentDate) => {
      const target = db.transactions.find((t) => t.id === txnId);
      if (!target) return { ok: false, message: 'Transaction not found.' };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: prev.transactions.map((t) =>
          t.id === txnId
            ? {
                ...t,
                stage: 'Payment Completed',
                paymentMode: mode,
                paymentRef,
                paymentDate,
                approvedBy: t.approvedBy ?? currentUser.name,
              }
            : t
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Expense Payment Completed',
          `Paid ${formatINR(target.amount)} for ${target.billRef} via ${mode} (${paymentRef})`,
          txnId,
          target.projectId
        ),
      }));
      pushToast({ title: 'Payment Recorded', description: `${formatINR(target.amount)} · ${mode}`, tone: 'success' });
      return { ok: true, message: 'Payment recorded.' };
    },
    [appendLog, currentUser.name, db.transactions, pushToast]
  );

  const reconcileTransaction: DemoContextValue['reconcileTransaction'] = useCallback(
    (txnId) => {
      const target = db.transactions.find((t) => t.id === txnId);
      if (!target) return { ok: false, message: 'Transaction not found.' };
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        transactions: prev.transactions.map((t) =>
          t.id === txnId ? { ...t, stage: 'Reconciled' } : t
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Accounting Reconciled',
          `Reconciled ${target.billRef} (${formatINR(target.amount)})`,
          txnId,
          target.projectId
        ),
      }));
      pushToast({ title: 'Marked Reconciled', description: target.billRef, tone: 'success' });
      return { ok: true, message: 'Reconciled.' };
    },
    [appendLog, db.transactions, pushToast]
  );

  const recordSupplierInvoicePayment: DemoContextValue['recordSupplierInvoicePayment'] = useCallback(
    (invoiceId, amount, reference) => {
      const inv = db.supplierInvoices.find((i) => i.id === invoiceId);
      if (!inv) return { ok: false, message: 'Invoice not found.' };
      const outstanding = Math.max(0, inv.amount - inv.paidAmount);
      if (amount <= 0 || amount > outstanding) {
        return { ok: false, message: `Payment must be between ₹1 and ${formatINR(outstanding)}.` };
      }
      const nextPaid = inv.paidAmount + amount;
      const nextStatus: SupplierInvoice['status'] = nextPaid >= inv.amount ? 'Paid' : 'Partially Paid';
      const supplier = db.suppliers.find((s) => s.id === inv.supplierId);

      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        supplierInvoices: prev.supplierInvoices.map((i) =>
          i.id === invoiceId ? { ...i, paidAmount: nextPaid, status: nextStatus, reconciled: true } : i
        ),
        activityLogs: appendLog(
          prev.activityLogs,
          'finance',
          'Supplier Payment Recorded',
          `Paid ${formatINR(amount)} to ${supplier?.name ?? inv.supplierId} against ${inv.invoiceNumber} (Ref: ${reference})`,
          invoiceId,
          inv.projectId
        ),
      }));
      pushToast({
        title: 'Supplier Payment Saved',
        description: `${inv.invoiceNumber} · ${nextStatus}`,
        tone: 'success',
      });
      return { ok: true, message: 'Supplier payment recorded.' };
    },
    [appendLog, db.supplierInvoices, db.suppliers, pushToast]
  );

  const importTallyCsvRows: DemoContextValue['importTallyCsvRows'] = useCallback(
    (rows) => {
      let imported = 0;
      let skippedDuplicates = 0;
      const errors: string[] = [];
      const newTxns: FinancialTransaction[] = [];

      rows.forEach((row, index) => {
        const project = db.projects.find(
          (p) =>
            p.code.toLowerCase() === row.projectCode.toLowerCase() ||
            p.id.toLowerCase() === row.projectCode.toLowerCase()
        );
        if (!project) {
          errors.push(`Row ${index + 1}: Unknown project code "${row.projectCode}".`);
          return;
        }
        if (!Number.isFinite(row.amount) || row.amount <= 0) {
          errors.push(`Row ${index + 1}: Invalid amount.`);
          return;
        }
        const duplicate =
          db.transactions.some((t) => t.billRef.toLowerCase() === row.billRef.toLowerCase()) ||
          newTxns.some((t) => t.billRef.toLowerCase() === row.billRef.toLowerCase());
        if (duplicate) {
          skippedDuplicates += 1;
          return;
        }
        newTxns.push({
          id: generateId('TXN'),
          projectId: project.id,
          date: row.date,
          category: row.category,
          description: row.description,
          amount: row.amount,
          stage: row.reconciled ? 'Reconciled' : 'Verified',
          sourceType: 'tally_import',
          vendorOrPayee: row.vendor,
          billRef: row.billRef,
          createdBy: currentUser.name,
          verifiedBy: currentUser.name,
        });
        imported += 1;
      });

      if (newTxns.length > 0) {
        setDb((prev) => ({
          ...prev,
          lastUpdated: new Date().toISOString(),
          transactions: [...newTxns, ...prev.transactions],
          activityLogs: appendLog(
            prev.activityLogs,
            'finance',
            'Tally CSV Demo Import',
            `Imported ${imported} entries (${skippedDuplicates} duplicates skipped, ${errors.length} errors)`
          ),
        }));
      }

      pushToast({
        title: `CSV Import: ${imported} Imported`,
        description: `${skippedDuplicates} duplicates skipped · ${errors.length} validation errors`,
        tone: errors.length > 0 ? 'warning' : 'success',
      });
      return { imported, skippedDuplicates, errors };
    },
    [appendLog, currentUser.name, db.projects, db.transactions, pushToast]
  );

  const uploadDocument: DemoContextValue['uploadDocument'] = useCallback(
    (input) => {
      const today = '2026-11-16';
      let status: DocumentItem['status'] = 'Active';
      if (input.expiryDate) {
        if (input.expiryDate < today) status = 'Expired';
        else {
          const diffMs = new Date(input.expiryDate).getTime() - new Date(today).getTime();
          if (diffMs / (1000 * 60 * 60 * 24) <= 30) status = 'Expiring Soon';
        }
      }
      const doc: DocumentItem = {
        id: generateId('DOC'),
        title: input.title,
        category: input.category,
        projectId: input.projectId || undefined,
        vehicleId: input.vehicleId || undefined,
        expiryDate: input.expiryDate || undefined,
        status,
        version: 'v1.0',
        uploadedBy: currentUser.name,
        uploadedAt: today,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSizeBytes: input.fileSizeBytes,
        dataUrl: input.dataUrl,
        description: input.description,
        uploadHistory: [
          {
            version: 'v1.0',
            uploadedAt: today,
            uploadedBy: currentUser.name,
            note: 'Uploaded via Document Center',
          },
        ],
      };

      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        documents: [doc, ...prev.documents],
        activityLogs: appendLog(
          prev.activityLogs,
          'documents',
          'Document Uploaded',
          `Uploaded ${doc.title} (${doc.category})`,
          doc.id,
          doc.projectId
        ),
      }));
      pushToast({ title: 'Document Uploaded', description: doc.title, tone: 'success' });
      return { ok: true, message: 'Document saved.', id: doc.id };
    },
    [appendLog, currentUser.name, pushToast]
  );

  const updateDocumentStatus: DemoContextValue['updateDocumentStatus'] = useCallback(
    (docId, status) => {
      setDb((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        documents: prev.documents.map((d) => (d.id === docId ? { ...d, status } : d)),
        activityLogs: appendLog(
          prev.activityLogs,
          'documents',
          'Document Status Updated',
          `Document ${docId} marked ${status}`,
          docId
        ),
      }));
      pushToast({ title: `Document marked ${status}`, tone: 'info' });
      return { ok: true, message: 'Updated.' };
    },
    [appendLog, pushToast]
  );

  const value: DemoContextValue = {
    db,
    activeRole,
    currentUser,
    language,
    activeSection,
    globalProjectFilter,
    guidedTourOpen,
    guidedTourStep,
    toasts,
    dismissToast,
    pushToast,
    setActiveSection,
    setGlobalProjectFilter,
    switchRole,
    setLanguage,
    setGuidedTourOpen,
    setGuidedTourStep,
    resetDemoData,
    getVisibleProjects,
    getProjectSummary,
    getBusinessTotals,
    canPerformAction,
    createProject,
    updateProject,
    updateProjectProgress,
    assignVehicleToProject,
    createRABill,
    certifyRABill,
    recordRAPayment,
    addVehicle,
    editVehicle,
    changeVehicleStatus,
    recordDieselPurchase,
    recordTripLog,
    recordMaintenance,
    addMaterial,
    recordStockMovement,
    addExpense,
    editDraftExpense,
    submitExpenseForVerification,
    verifyExpense,
    approveOrRejectExpense,
    recordExpensePayment,
    reconcileTransaction,
    recordSupplierInvoicePayment,
    importTallyCsvRows,
    uploadDocument,
    updateDocumentStatus,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoStore(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoStore must be used inside DemoStoreProvider');
  return ctx;
}
