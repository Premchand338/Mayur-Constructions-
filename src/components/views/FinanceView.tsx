import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  DialogModal,
  EmptyState,
  FieldError,
  FieldLabel,
  Input,
  SelectField,
  StatusText,
  TabsBar,
} from '@/src/components/ui/primitives';
import { downloadCsv, formatDateIN, formatINR, formatINRCompact } from '@/src/lib/formatters';
import { t } from '@/src/lib/i18n';
import { useDemoStore } from '@/src/store/demoStore';
import { ExpenseCategory, FinancialStage, FinancialTransaction } from '@/src/types/domain';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Diesel',
  'Labour',
  'Maintenance',
  'Site Overhead',
  'Machinery Hire',
  'Material Direct',
];

const STAGES: FinancialStage[] = [
  'Draft',
  'Recorded',
  'Verified',
  'Invoice Outstanding',
  'Payment Completed',
  'Reconciled',
  'Rejected',
];

const expenseSchema = z.object({
  projectId: z.string().min(1),
  date: z.string().min(1),
  category: z.enum([
    'Diesel',
    'Labour',
    'Maintenance',
    'Site Overhead',
    'Machinery Hire',
    'Material Direct',
  ]),
  description: z.string().min(4, 'Enter clear description'),
  amount: z.number({ message: 'Enter valid amount' }).positive('Amount must be > 0'),
  vendorOrPayee: z.string().min(2, 'Enter payee or contractor'),
  billRef: z.string().min(2, 'Enter bill / muster reference'),
});

export function QuickExpenseModal({
  open,
  onOpenChange,
  editingTxn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTxn?: FinancialTransaction | null;
}) {
  const { db, getVisibleProjects, addExpense, editDraftExpense } = useDemoStore();
  const visibleProjects = getVisibleProjects();
  const [billFileName, setBillFileName] = useState('');
  const [billDataUrl, setBillDataUrl] = useState('');
  const [submitError, setSubmitError] = useState('');

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    values: editingTxn
      ? {
          projectId: editingTxn.projectId,
          date: editingTxn.date,
          category: editingTxn.category,
          description: editingTxn.description,
          amount: editingTxn.amount,
          vendorOrPayee: editingTxn.vendorOrPayee,
          billRef: editingTxn.billRef,
        }
      : {
          projectId: visibleProjects[0]?.id ?? db.projects[0]?.id ?? '',
          date: '2026-11-16',
          category: 'Labour',
          description: '',
          amount: 45000,
          vendorOrPayee: '',
          billRef: `EXP-${Math.floor(1000 + Math.random() * 8999)}`,
        },
  });

  const handleBillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSubmitError('Attachment must be under 2 MB for local demo storage.');
      return;
    }
    setBillFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setBillDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (asDraft: boolean) =>
    form.handleSubmit((vals) => {
      setSubmitError('');
      if (editingTxn) {
        const res = editDraftExpense(editingTxn.id, vals);
        if (!res.ok) return setSubmitError(res.message);
        onOpenChange(false);
        return;
      }
      const res = addExpense({
        ...vals,
        asDraft,
        billFileName: billFileName || undefined,
        billDataUrl: billDataUrl || undefined,
      });
      if (!res.ok) return setSubmitError(res.message);
      onOpenChange(false);
    })();

  return (
    <DialogModal
      open={open}
      onOpenChange={onOpenChange}
      title={editingTxn ? 'Edit Draft / Unverified Expense' : 'Add Operational Expense'}
      description="Expenses follow: Recorded → Verified → Approved → Paid → Reconciled."
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {submitError && (
          <div className="rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
            {submitError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Project</FieldLabel>
            <SelectField
              value={form.watch('projectId')}
              onValueChange={(v) => form.setValue('projectId', v)}
              options={visibleProjects.map((p) => ({ value: p.id, label: `${p.region} · ${p.name}` }))}
            />
          </div>
          <div>
            <FieldLabel required>Category</FieldLabel>
            <SelectField
              value={form.watch('category')}
              onValueChange={(v) => form.setValue('category', v as ExpenseCategory)}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </div>
        <div>
          <FieldLabel required>Description</FieldLabel>
          <Input {...form.register('description')} placeholder="e.g. Culvert shuttering labour muster 18 workers" />
          <FieldError message={form.formState.errors.description?.message} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel required>Amount (₹)</FieldLabel>
            <Input type="number" {...form.register('amount', { valueAsNumber: true })} className="font-mono tabular-nums" />
            <FieldError message={form.formState.errors.amount?.message} />
          </div>
          <div>
            <FieldLabel required>Date</FieldLabel>
            <Input type="date" {...form.register('date')} />
          </div>
          <div>
            <FieldLabel required>Bill / Muster Ref</FieldLabel>
            <Input {...form.register('billRef')} className="font-mono" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Contractor / Payee</FieldLabel>
            <Input {...form.register('vendorOrPayee')} placeholder="e.g. Patil Labour Contractor" />
            <FieldError message={form.formState.errors.vendorOrPayee?.message} />
          </div>
          <div>
            <FieldLabel hint="Optional PDF/Image ≤ 2MB">Attach Bill / Voucher</FieldLabel>
            <label className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-dashed border-[#D8D4CB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#52524E] cursor-pointer hover:bg-[#F3F1EC]">
              <span className="truncate">{billFileName || 'Upload voucher photo/PDF'}</span>
              <Upload className="h-4 w-4 text-[#245BFF]" />
              <input type="file" accept="image/*,.pdf" onChange={handleBillFile} className="sr-only" />
            </label>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap justify-end gap-3 border-t border-[#E5E2DC]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!editingTxn && (
            <Button variant="secondary" onClick={() => handleSave(true)}>
              Save as Draft
            </Button>
          )}
          <Button onClick={() => handleSave(false)}>Submit for Verification</Button>
        </div>
      </form>
    </DialogModal>
  );
}

export function FinanceView() {
  const {
    db,
    language,
    globalProjectFilter,
    getVisibleProjects,
    getBusinessTotals,
    canPerformAction,
    submitExpenseForVerification,
    verifyExpense,
    approveOrRejectExpense,
    recordExpensePayment,
    reconcileTransaction,
    recordSupplierInvoicePayment,
    recordRAPayment,
    importTallyCsvRows,
  } = useDemoStore();

  const [tab, setTab] = useState('expenses');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-12-31');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<FinancialTransaction | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FinancialTransaction | null>(null);
  const [payTxnTarget, setPayTxnTarget] = useState<FinancialTransaction | null>(null);
  const [payMode, setPayMode] = useState<'NEFT' | 'UPI' | 'Cheque' | 'Cash'>('NEFT');
  const [payRef, setPayRef] = useState('');

  const [supplierPayId, setSupplierPayId] = useState<string | null>(null);
  const [supplierPayAmt, setSupplierPayAmt] = useState<number>(0);
  const [supplierPayRef, setSupplierPayRef] = useState('');

  const [raPayId, setRaPayId] = useState<string | null>(null);
  const [raPayAmt, setRaPayAmt] = useState<number>(0);
  const [raPayRef, setRaPayRef] = useState('');

  // Tally CSV Import Demo State
  const [csvRaw, setCsvRaw] = useState(
    'Date,ProjectCode,Category,Description,Amount,Vendor,BillRef,Reconciled\n2026-11-15,MC-BWD-2601,Labour,Bitumen crew overtime shift,28500,Patil Labour Contractor,TLY-BWD-901,true\n2026-11-14,MC-THN-2602,Site Overhead,Barrier reflector tape batch,14200,Thane Road Safety Equip,TLY-THN-902,false\n2026-11-15,MC-BWD-2601,Labour,Duplicate test row,284000,Patil Labour Contractor,MUST-BWD-11A,true'
  );
  const [tallyResult, setTallyResult] = useState<{
    imported: number;
    skippedDuplicates: number;
    errors: string[];
  } | null>(null);

  const visibleProjects = getVisibleProjects();
  const visibleIds = new Set(visibleProjects.map((p) => p.id));
  const totals = getBusinessTotals(globalProjectFilter);

  const filteredTxns = useMemo(() => {
    return db.transactions.filter((txn) => {
      if (!visibleIds.has(txn.projectId)) return false;
      if (globalProjectFilter !== 'ALL' && txn.projectId !== globalProjectFilter) return false;
      if (projectFilter !== 'ALL' && txn.projectId !== projectFilter) return false;
      if (categoryFilter !== 'ALL' && txn.category !== categoryFilter) return false;
      if (stageFilter !== 'ALL' && txn.stage !== stageFilter) return false;
      if (fromDate && txn.date < fromDate) return false;
      if (toDate && txn.date > toDate) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          txn.description.toLowerCase().includes(q) ||
          txn.vendorOrPayee.toLowerCase().includes(q) ||
          txn.billRef.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.transactions, visibleIds, globalProjectFilter, projectFilter, categoryFilter, stageFilter, fromDate, toDate, search]);

  const parsedCsvPreview = useMemo(() => {
    const lines = csvRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return {
        date: cols[0] ?? '',
        projectCode: cols[1] ?? '',
        category: (EXPENSE_CATEGORIES.includes(cols[2] as ExpenseCategory)
          ? cols[2]
          : 'Site Overhead') as ExpenseCategory,
        description: cols[3] ?? '',
        amount: Number(cols[4] ?? 0),
        vendor: cols[5] ?? '',
        billRef: cols[6] ?? '',
        reconciled: (cols[7] ?? '').toLowerCase() === 'true',
      };
    });
  }, [csvRaw]);

  const handleExportExpensesCsv = () => {
    downloadCsv(
      'mayur_operational_expenses.csv',
      ['Txn ID', 'Date', 'Project', 'Category', 'Description', 'Vendor/Payee', 'Bill Ref', 'Amount (INR)', 'Stage'],
      filteredTxns.map((txn) => {
        const prj = db.projects.find((p) => p.id === txn.projectId);
        return [
          txn.id,
          txn.date,
          prj?.code ?? txn.projectId,
          txn.category,
          txn.description,
          txn.vendorOrPayee,
          txn.billRef,
          txn.amount,
          txn.stage,
        ];
      })
    );
  };

  const handleExportTallyLedgerCsv = () => {
    downloadCsv(
      'mayur_tally_ready_vouchers.csv',
      ['VoucherDate', 'VoucherType', 'PartyLedger', 'CostCentre', 'CategoryLedger', 'BillRef', 'AmountINR', 'ReconciliationStage'],
      filteredTxns.map((txn) => {
        const prj = db.projects.find((p) => p.id === txn.projectId);
        return [
          txn.date,
          'Journal/Payment',
          txn.vendorOrPayee,
          prj?.code ?? txn.projectId,
          txn.category,
          txn.billRef,
          txn.amount,
          txn.stage,
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">हिसाब-किताब · Simple Business Finance</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
            Finance, Approvals, Payables & Receivables
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={handleExportExpensesCsv}>
            <Download className="h-4 w-4" />
            Export Filtered CSV
          </Button>
          <Button
            onClick={() => {
              setEditingTxn(null);
              setExpenseModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* 4 Owner Financial Numbers + Zero Double Counting Note */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <p className="text-xs text-[#52524E]">Money Received (RA Bills)</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-semibold font-mono tabular-nums text-[#15803D]">
            {formatINRCompact(totals.totalPaymentsReceived)}
          </p>
          <p className="mt-1 text-xs font-mono text-[#52524E]">
            {formatINR(totals.totalPaymentsReceived)} collected
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs text-[#52524E]">{t('paymentAanaBaaki', language)}</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-semibold font-mono tabular-nums text-[#245BFF]">
            {formatINRCompact(totals.totalReceivablesPending)}
          </p>
          <p className="mt-1 text-xs text-[#52524E]">Certified bills awaiting govt release</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs text-[#52524E]">Money Paid (Expenses + Suppliers)</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-semibold font-mono tabular-nums text-[#171717]">
            {formatINRCompact(totals.totalPaymentsDisbursed)}
          </p>
          <p className="mt-1 text-xs font-mono text-[#52524E]">
            {formatINR(totals.totalPaymentsDisbursed)} disbursed
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs text-[#52524E]">{t('denaBaaki', language)}</p>
          <p className="mt-1.5 text-xl sm:text-2xl font-semibold font-mono tabular-nums text-[#B45309]">
            {formatINRCompact(totals.totalPayablesPending)}
          </p>
          <p className="mt-1 text-xs text-[#52524E]">Supplier invoices + verified unpaid bills</p>
        </Card>
      </div>

      <TabsBar
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'expenses', label: 'Project Expenses & Approvals', count: filteredTxns.length },
          { value: 'payables', label: 'Supplier Invoices', count: db.supplierInvoices.length },
          { value: 'receivables', label: 'RA Bills & Receipts', count: db.raBills.length },
          { value: 'tally', label: 'Tally-Ready CSV Import/Export Demo' },
        ]}
      />

      {tab === 'expenses' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 relative">
                <Search className="h-4 w-4 text-[#73726C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payee, bill ref, description..."
                  className="pl-10"
                />
              </div>
              <div className="lg:col-span-2">
                <SelectField
                  value={projectFilter}
                  onValueChange={setProjectFilter}
                  options={[
                    { value: 'ALL', label: 'All Projects' },
                    ...visibleProjects.map((p) => ({ value: p.id, label: p.region + ' · ' + p.code })),
                  ]}
                />
              </div>
              <div className="lg:col-span-2">
                <SelectField
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
              <div className="lg:col-span-2">
                <SelectField
                  value={stageFilter}
                  onValueChange={setStageFilter}
                  options={[
                    { value: 'ALL', label: 'All Stages' },
                    ...STAGES.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </div>
              <div className="lg:col-span-2 grid grid-cols-2 gap-1.5">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 text-xs" />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 text-xs" />
              </div>
            </div>
          </Card>

          {filteredTxns.length === 0 ? (
            <EmptyState
              title="No expenses match these filters"
              description="Try expanding the date range or resetting the stage filter."
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                    <th className="py-3 px-4">Date & Ref</th>
                    <th className="py-3 px-4">Project & Category</th>
                    <th className="py-3 px-4">Description & Payee</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Accounting Stage</th>
                    <th className="py-3 px-4 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC] text-sm">
                  {filteredTxns.map((txn) => {
                    const prj = db.projects.find((p) => p.id === txn.projectId);
                    const stageTone =
                      txn.stage === 'Reconciled' || txn.stage === 'Payment Completed'
                        ? 'success'
                        : txn.stage === 'Rejected'
                        ? 'danger'
                        : txn.stage === 'Verified'
                        ? 'info'
                        : 'warning';

                    return (
                      <tr key={txn.id} className="hover:bg-[#FAF9F6]">
                        <td className="py-3 px-4 text-xs">
                          <p className="font-mono text-[#171717]">{formatDateIN(txn.date)}</p>
                          <p className="font-mono text-[11px] text-[#52524E]">{txn.billRef}</p>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <p className="font-medium text-[#171717]">{prj?.region ?? txn.projectId}</p>
                          <p className="text-[#52524E]">{txn.category}</p>
                        </td>
                        <td className="py-3 px-4 text-xs max-w-[300px]">
                          <p className="font-medium text-[#171717]">{txn.description}</p>
                          <p className="text-[#52524E]">
                            {txn.vendorOrPayee} · By {txn.createdBy}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {formatINR(txn.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusText tone={stageTone} label={txn.stage} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            {txn.stage === 'Draft' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingTxn(txn);
                                    setExpenseModalOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button size="sm" onClick={() => submitExpenseForVerification(txn.id)}>
                                  Submit
                                </Button>
                              </>
                            )}
                            {txn.stage === 'Recorded' && canPerformAction('verify_entry') && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => verifyExpense(txn.id)}>
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRejectTarget(txn)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {txn.stage === 'Verified' && canPerformAction('approve_finance') && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveOrRejectExpense(txn.id, 'approve')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRejectTarget(txn)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {txn.stage === 'Invoice Outstanding' && canPerformAction('approve_finance') && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPayTxnTarget(txn);
                                  setPayRef(`NEFT-${Math.floor(100000 + Math.random() * 899999)}`);
                                }}
                              >
                                Record Payment
                              </Button>
                            )}
                            {txn.stage === 'Payment Completed' && canPerformAction('reconcile_tally') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reconcileTransaction(txn.id)}
                              >
                                Reconcile
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'payables' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Invoice & Date</th>
                <th className="py-3 px-4">Supplier & Project</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Dena Baaki</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {db.supplierInvoices.map((inv) => {
                const sup = db.suppliers.find((s) => s.id === inv.supplierId);
                const prj = db.projects.find((p) => p.id === inv.projectId);
                const balance = Math.max(0, inv.amount - inv.paidAmount);
                return (
                  <tr key={inv.id} className="hover:bg-[#FAF9F6]">
                    <td className="py-3 px-4 text-xs">
                      <p className="font-mono font-semibold text-[#171717]">{inv.invoiceNumber}</p>
                      <p className="text-[#52524E]">
                        {formatDateIN(inv.date)} · Due {formatDateIN(inv.dueDate)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <p className="font-medium text-[#171717]">{sup?.name ?? inv.supplierId}</p>
                      <p className="text-[#52524E]">{prj?.name ?? inv.projectId}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {formatINR(inv.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#15803D]">
                      {formatINR(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-[#B45309]">
                      {formatINR(balance)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText
                        tone={
                          inv.status === 'Paid'
                            ? 'success'
                            : inv.status === 'Partially Paid'
                            ? 'info'
                            : 'warning'
                        }
                        label={inv.status}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {balance > 0 && canPerformAction('approve_finance') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSupplierPayId(inv.id);
                            setSupplierPayAmt(balance);
                            setSupplierPayRef(`NEFT-${Math.floor(10000 + Math.random() * 89999)}`);
                          }}
                        >
                          Pay Supplier
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'receivables' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">RA Bill & MB Ref</th>
                <th className="py-3 px-4">Project & Client</th>
                <th className="py-3 px-4 text-right">Certified (Net)</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Aana Baaki</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {db.raBills.map((bill) => {
                const prj = db.projects.find((p) => p.id === bill.projectId);
                const received = db.paymentReceipts
                  .filter((r) => r.raBillId === bill.id)
                  .reduce((s, r) => s + r.amount, 0);
                const pending = Math.max(0, bill.netReceivable - received);
                return (
                  <tr key={bill.id} className="hover:bg-[#FAF9F6]">
                    <td className="py-3 px-4 text-xs">
                      <p className="font-mono font-semibold text-[#171717]">{bill.billNumber}</p>
                      <p className="text-[#52524E]">
                        {bill.mbReference} · {formatDateIN(bill.billDate)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <p className="font-medium text-[#171717]">{prj?.name}</p>
                      <p className="text-[#52524E]">{prj?.department}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {bill.netReceivable > 0 ? formatINR(bill.netReceivable) : 'Awaiting Cert.'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#15803D]">
                      {formatINR(received)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-[#245BFF]">
                      {formatINR(pending)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText
                        tone={bill.status === 'Paid' ? 'success' : bill.status === 'Submitted' ? 'warning' : 'info'}
                        label={bill.status}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pending > 0 && canPerformAction('approve_finance') && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setRaPayId(bill.id);
                            setRaPayAmt(pending);
                            setRaPayRef(`MHTRS-${Math.floor(10000 + Math.random() * 89999)}`);
                          }}
                        >
                          <IndianRupee className="h-3.5 w-3.5" />
                          Record Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'tally' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E5E2DC]">
              <div>
                <h2 className="text-base font-semibold text-[#171717]">
                  Tally-Ready Import / Export Demo
                </h2>
                <p className="text-xs text-[#52524E] mt-0.5">
                  Honest local CSV simulation — does not connect to a live Tally Prime server.
                  Includes field mapping, duplicate bill detection, and row validation.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportTallyLedgerCsv}>
                <Download className="h-3.5 w-3.5" />
                Export Tally CSV
              </Button>
            </div>

            <div>
              <FieldLabel hint="Edit or paste CSV rows below">
                CSV Input (Date, ProjectCode, Category, Description, Amount, Vendor, BillRef, Reconciled)
              </FieldLabel>
              <textarea
                rows={6}
                value={csvRaw}
                onChange={(e) => setCsvRaw(e.target.value)}
                className="w-full rounded-xl border border-[#D8D4CB] bg-[#FAF9F6] p-3 font-mono text-xs text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245BFF]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#245BFF] cursor-pointer hover:underline">
                <Upload className="h-3.5 w-3.5" />
                Load local .csv file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    file.text().then((text) => setCsvRaw(text));
                  }}
                />
              </label>

              <Button
                disabled={!canPerformAction('reconcile_tally') || parsedCsvPreview.length === 0}
                onClick={() => {
                  const res = importTallyCsvRows(parsedCsvPreview);
                  setTallyResult(res);
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Validate & Import {parsedCsvPreview.length} Rows
              </Button>
            </div>

            {tallyResult && (
              <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#171717]">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  Import Complete: {tallyResult.imported} imported · {tallyResult.skippedDuplicates}{' '}
                  duplicates skipped · {tallyResult.errors.length} validation errors
                </div>
                {tallyResult.errors.map((err, i) => (
                  <p key={i} className="text-[#DC2626]">
                    • {err}
                  </p>
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-5 p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#171717]">Field Mapping & Validation Preview</h3>
            <div className="divide-y divide-[#E5E2DC] text-xs">
              {parsedCsvPreview.map((row, idx) => {
                const isDup = db.transactions.some(
                  (t) => t.billRef.toLowerCase() === row.billRef.toLowerCase()
                );
                const projectExists = db.projects.some(
                  (p) => p.code.toLowerCase() === row.projectCode.toLowerCase()
                );
                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#171717] truncate">
                        {row.billRef} · {row.description}
                      </p>
                      <p className="text-[#52524E]">
                        {row.projectCode} → {row.category} · {row.vendor}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold">{formatINR(row.amount)}</p>
                      {isDup ? (
                        <span className="text-[11px] text-[#B45309]">Duplicate Ref</span>
                      ) : !projectExists ? (
                        <span className="text-[11px] text-[#DC2626]">Bad Project Code</span>
                      ) : (
                        <span className="text-[11px] text-[#15803D]">Ready</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <QuickExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        editingTxn={editingTxn}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject Operational Expense?"
        description={`Rejecting ${rejectTarget?.billRef} (${formatINR(rejectTarget?.amount ?? 0)}) will exclude it from verified project totals.`}
        confirmLabel="Reject Entry"
        onConfirm={() => {
          if (rejectTarget) approveOrRejectExpense(rejectTarget.id, 'reject', 'Returned by reviewer');
        }}
      />

      {/* Record Expense Payment Modal */}
      <DialogModal
        open={!!payTxnTarget}
        onOpenChange={(open) => !open && setPayTxnTarget(null)}
        title="Record Expense Payment"
      >
        {payTxnTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#52524E]">
              Paying <strong className="text-[#171717]">{payTxnTarget.vendorOrPayee}</strong> ·{' '}
              <span className="font-mono font-semibold text-[#171717]">
                {formatINR(payTxnTarget.amount)}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Payment Mode</FieldLabel>
                <SelectField
                  value={payMode}
                  onValueChange={(v) => setPayMode(v as 'NEFT' | 'UPI' | 'Cheque' | 'Cash')}
                  options={[
                    { value: 'NEFT', label: 'NEFT / RTGS' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Cash', label: 'Cash' },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>UTR / Reference</FieldLabel>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
              <Button variant="outline" onClick={() => setPayTxnTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  recordExpensePayment(payTxnTarget.id, payMode, payRef, '2026-11-16');
                  setPayTxnTarget(null);
                }}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </DialogModal>

      {/* Supplier Invoice Payment Modal */}
      <DialogModal
        open={!!supplierPayId}
        onOpenChange={(open) => !open && setSupplierPayId(null)}
        title="Record Supplier Invoice Payment"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Amount to Pay (₹)</FieldLabel>
            <Input
              type="number"
              value={supplierPayAmt}
              onChange={(e) => setSupplierPayAmt(Number(e.target.value))}
              className="font-mono tabular-nums"
            />
          </div>
          <div>
            <FieldLabel>Bank / Cheque Reference</FieldLabel>
            <Input
              value={supplierPayRef}
              onChange={(e) => setSupplierPayRef(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setSupplierPayId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (supplierPayId) {
                  const res = recordSupplierInvoicePayment(supplierPayId, supplierPayAmt, supplierPayRef);
                  if (res.ok) setSupplierPayId(null);
                }
              }}
            >
              Save Supplier Payment
            </Button>
          </div>
        </div>
      </DialogModal>

      {/* RA Bill Payment Receipt Modal */}
      <DialogModal
        open={!!raPayId}
        onOpenChange={(open) => !open && setRaPayId(null)}
        title="Record RA Bill Payment Receipt"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Amount Credited (₹)</FieldLabel>
            <Input
              type="number"
              value={raPayAmt}
              onChange={(e) => setRaPayAmt(Number(e.target.value))}
              className="font-mono tabular-nums"
            />
          </div>
          <div>
            <FieldLabel>Treasury EFT / RTGS Reference</FieldLabel>
            <Input value={raPayRef} onChange={(e) => setRaPayRef(e.target.value)} className="font-mono" />
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setRaPayId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (raPayId) {
                  const res = recordRAPayment({
                    raBillId: raPayId,
                    date: '2026-11-16',
                    amount: raPayAmt,
                    mode: 'Treasury EFT',
                    referenceNumber: raPayRef,
                  });
                  if (res.ok) setRaPayId(null);
                }
              }}
            >
              Save Payment Receipt
            </Button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
