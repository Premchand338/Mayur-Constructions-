import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  SelectField,
  StatusText,
} from '@/src/components/ui/primitives';
import { daysUntil, formatDateIN, formatDateTimeIN, formatINR } from '@/src/lib/formatters';
import { ROLE_META } from '@/src/lib/i18n';
import { useDemoStore } from '@/src/store/demoStore';
import { LanguageMode, RoleType } from '@/src/types/domain';

export function NotificationsView() {
  const {
    db,
    canPerformAction,
    verifyExpense,
    approveOrRejectExpense,
    setActiveSection,
  } = useDemoStore();

  const pendingVerificationTxns = db.transactions.filter(
    (t) => t.stage === 'Recorded' || t.stage === 'Draft'
  );
  const pendingApprovalTxns = db.transactions.filter((t) => t.stage === 'Verified');
  const flaggedDiesel = db.dieselPurchases.filter(
    (d) => d.anomalyFlag && d.verificationStatus === 'Pending Verification'
  );
  const lowStock = db.materials.filter((m) => m.closingStock <= m.minThreshold);
  const expiringDocs = db.documents.filter((d) => {
    const days = daysUntil(d.expiryDate);
    return days !== null && days <= 30;
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#52524E]">सूचनाएं · Action & Approval Queue</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
          Notifications, Reviews & Expiry Alerts
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
            <h2 className="text-base font-semibold text-[#171717]">
              Pending Verification ({pendingVerificationTxns.length})
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setActiveSection('finance')}>
              Open Finance →
            </Button>
          </div>
          {pendingVerificationTxns.length === 0 ? (
            <p className="text-sm text-[#52524E] py-4">No entries awaiting verification.</p>
          ) : (
            <div className="divide-y divide-[#E5E2DC]">
              {pendingVerificationTxns.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#171717] truncate">{t.description}</p>
                    <p className="text-xs text-[#52524E]">
                      {t.category} · {formatDateIN(t.date)} · {t.createdBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono font-semibold tabular-nums">
                      {formatINR(t.amount)}
                    </span>
                    {canPerformAction('verify_entry') && (
                      <Button size="sm" variant="outline" onClick={() => verifyExpense(t.id)}>
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
            <h2 className="text-base font-semibold text-[#171717]">
              Verified — Ready for Owner/Accountant Approval ({pendingApprovalTxns.length})
            </h2>
          </div>
          {pendingApprovalTxns.length === 0 ? (
            <p className="text-sm text-[#52524E] py-4">No verified bills waiting for approval.</p>
          ) : (
            <div className="divide-y divide-[#E5E2DC]">
              {pendingApprovalTxns.slice(0, 6).map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#171717] truncate">{t.description}</p>
                    <p className="text-xs text-[#52524E]">
                      Verified by {t.verifiedBy ?? 'Office Admin'} · {formatDateIN(t.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono font-semibold tabular-nums">
                      {formatINR(t.amount)}
                    </span>
                    {canPerformAction('approve_finance') && (
                      <Button size="sm" onClick={() => approveOrRejectExpense(t.id, 'approve')}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
            <h2 className="text-base font-semibold text-[#171717]">
              Flagged Diesel Entries ({flaggedDiesel.length})
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setActiveSection('vehicles')}>
              Open Fleet →
            </Button>
          </div>
          {flaggedDiesel.length === 0 ? (
            <p className="text-sm text-[#52524E] py-4">No flagged diesel variations.</p>
          ) : (
            <div className="space-y-3">
              {flaggedDiesel.map((d) => {
                const veh = db.vehicles.find((v) => v.id === d.vehicleId);
                return (
                  <div key={d.id} className="rounded-xl border border-[#D97706]/40 bg-[#FFFBEB] p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-[#171717]">
                        {veh?.registrationNumber} · {d.litres} L ({formatINR(d.totalAmount)})
                      </span>
                      {canPerformAction('verify_entry') && (
                        <Button size="sm" variant="outline" onClick={() => verifyExpense(d.linkedExpenseId)}>
                          Clear & Verify
                        </Button>
                      )}
                    </div>
                    <p className="text-[#92400E] flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {d.anomalyFlag}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
            <h2 className="text-base font-semibold text-[#171717]">
              Low Stock ({lowStock.length}) & Expiring Docs ({expiringDocs.length})
            </h2>
          </div>
          <div className="divide-y divide-[#E5E2DC] text-xs">
            {lowStock.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#D97706]" />
                  <div>
                    <p className="font-medium text-[#171717]">{m.name}</p>
                    <p className="text-[#52524E]">{m.storageLocation}</p>
                  </div>
                </div>
                <span className="font-mono font-semibold text-[#B45309]">
                  {m.closingStock} / min {m.minThreshold} {m.unit}
                </span>
              </div>
            ))}
            {expiringDocs.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-[#DC2626]" />
                  <div>
                    <p className="font-medium text-[#171717]">{d.title}</p>
                    <p className="text-[#52524E]">Expiry: {formatDateIN(d.expiryDate)}</p>
                  </div>
                </div>
                <StatusText tone={d.status === 'Expired' ? 'danger' : 'warning'} label={d.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ActivityHistoryView() {
  const { db } = useDemoStore();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const logs = useMemo(() => {
    return db.activityLogs.filter((log) => {
      if (moduleFilter !== 'ALL' && log.module !== moduleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.summary.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.activityLogs, moduleFilter, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#52524E]">कामकाज लॉग · Audit Trail</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
          Operational & Financial Activity History
        </h1>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="h-4 w-4 text-[#73726C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, vehicle, RA bill, stock movement..."
              className="pl-10"
            />
          </div>
          <div className="sm:col-span-4">
            <SelectField
              value={moduleFilter}
              onValueChange={setModuleFilter}
              options={[
                { value: 'ALL', label: 'All Modules' },
                { value: 'projects', label: 'Projects' },
                { value: 'vehicles', label: 'Vehicles & Diesel' },
                { value: 'materials', label: 'Materials & Stock' },
                { value: 'finance', label: 'Finance & Tally' },
                { value: 'documents', label: 'Documents' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-[#E5E2DC]">
        {logs.map((log) => (
          <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#52524E]">
                <span className="font-semibold text-[#171717]">{log.action}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{log.module}</span>
                <span aria-hidden="true">·</span>
                <span>{log.actorName}</span>
              </div>
              <p className="mt-0.5 text-sm text-[#171717]">{log.summary}</p>
            </div>
            <span className="text-xs font-mono text-[#73726C] shrink-0">
              {formatDateTimeIN(log.timestamp)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function SettingsAndRolesView() {
  const {
    db,
    activeRole,
    language,
    switchRole,
    setLanguage,
    resetDemoData,
    setGuidedTourOpen,
    setGuidedTourStep,
  } = useDemoStore();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const roles: RoleType[] = ['owner', 'supervisor', 'office_admin', 'accountant', 'driver'];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#52524E]">सेटिंग्स व भूमिका · Roles & Demo Controls</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
          User Role Switching, Language & Demo Reset
        </h1>
      </div>

      {/* Security & Fictional Data Transparency Banner */}
      <Card className="p-5 bg-[#FAF9F6] flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-[#245BFF] shrink-0 mt-0.5" />
        <div className="text-xs text-[#52524E] space-y-1">
          <p className="text-sm font-semibold text-[#171717]">
            Client Presentation Prototype Notice
          </p>
          <p>
            Role switching below simulates operational views and permissions for demonstration purposes. It is{' '}
            <strong>not</strong> production-grade authentication. All projects, vehicles, suppliers, and ₹ figures are fictional demonstration data stored locally in your browser.
          </p>
        </div>
      </Card>

      {/* Role Switcher */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[#171717]">Switch Active Demo Role</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((r) => {
            const user = db.users.find((u) => u.role === r);
            const active = activeRole === r;
            return (
              <Card
                key={r}
                className={`p-5 cursor-pointer transition-colors ${
                  active ? 'border-[#245BFF] ring-1 ring-[#245BFF]' : 'hover:border-[#245BFF]/50'
                }`}
                onClick={() => switchRole(r)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#171717]">
                      {ROLE_META[r].label[language]}
                    </p>
                    <p className="text-xs text-[#52524E] mt-0.5">
                      {user?.name} · {user?.title}
                    </p>
                  </div>
                  {active && <CheckCircle2 className="h-5 w-5 text-[#245BFF] shrink-0" />}
                </div>
                <p className="mt-3 text-xs text-[#52524E] leading-relaxed">
                  {ROLE_META[r].description[language]}
                </p>
                <div className="mt-4 pt-3 border-t border-[#E5E2DC] flex items-center justify-between text-xs">
                  <span className="font-mono text-[#73726C]">{user?.phone}</span>
                  <span className="font-medium text-[#245BFF] inline-flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    {active ? 'Active Role' : 'Switch Role'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Language & Guided Tour & Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#171717]">Language Display Mode</h2>
          <p className="text-xs text-[#52524E]">
            Supports English + Hinglish (default for site staff), English-only, or Marathi/Hindi Devanagari headings.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'hinglish', label: 'English + Hinglish' },
                { id: 'english', label: 'English' },
                { id: 'devanagari', label: 'हिंदी / मराठी' },
              ] as Array<{ id: LanguageMode; label: string }>
            ).map((opt) => (
              <Button
                key={opt.id}
                variant={language === opt.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setLanguage(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#171717]">Presentation & Reset Controls</h2>
          <p className="text-xs text-[#52524E]">
            Launch the step-by-step financial walkthrough or restore all fictional demo records back to clean initial state.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setGuidedTourStep(0);
                setGuidedTourOpen(true);
              }}
            >
              Launch Guided Demo Tour
            </Button>
            <Button variant="danger" onClick={() => setConfirmResetOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Reset Demo Data
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset All Demo Data?"
        description="This will restore all 8 projects, 22 vehicles, 26 materials, RA bills, diesel entries, and uploaded demo documents back to their clean initial seed state."
        confirmLabel="Reset Demo Data"
        onConfirm={resetDemoData}
      />
    </div>
  );
}
