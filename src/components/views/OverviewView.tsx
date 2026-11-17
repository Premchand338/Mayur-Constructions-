import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Fuel,
  Package,
  Plus,
  Truck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { QuickDieselModal } from '@/src/components/forms/QuickDieselModal';
import { Button, Card, StatusText } from '@/src/components/ui/primitives';
import { daysUntil, formatDateIN, formatDateTimeIN, formatINR, formatINRCompact, formatNumberIN } from '@/src/lib/formatters';
import { t } from '@/src/lib/i18n';
import { useDemoStore } from '@/src/store/demoStore';

export function OverviewView({
  onOpenProjectDetail,
  onOpenQuickExpense,
}: {
  onOpenProjectDetail: (projectId: string) => void;
  onOpenQuickExpense: () => void;
}) {
  const {
    db,
    activeRole,
    currentUser,
    language,
    globalProjectFilter,
    getVisibleProjects,
    getProjectSummary,
    getBusinessTotals,
    setActiveSection,
    verifyExpense,
  } = useDemoStore();

  const [dieselModalOpen, setDieselModalOpen] = useState(false);

  const totals = getBusinessTotals(globalProjectFilter);
  const visibleProjects = getVisibleProjects().filter(
    (p) => globalProjectFilter === 'ALL' || p.id === globalProjectFilter
  );

  const pendingApprovals = useMemo(() => {
    const visibleIds = new Set(visibleProjects.map((p) => p.id));
    return db.transactions
      .filter((txn) => visibleIds.has(txn.projectId) && (txn.stage === 'Recorded' || txn.stage === 'Draft'))
      .slice(0, 6);
  }, [db.transactions, visibleProjects]);

  const flaggedDiesel = useMemo(() => {
    const visibleIds = new Set(visibleProjects.map((p) => p.id));
    return db.dieselPurchases.filter(
      (d) => visibleIds.has(d.projectId) && d.verificationStatus === 'Pending Verification' && d.anomalyFlag
    );
  }, [db.dieselPurchases, visibleProjects]);

  const lowStockMaterials = useMemo(() => {
    const visibleIds = new Set(visibleProjects.map((p) => p.id));
    return db.materials.filter(
      (m) => visibleIds.has(m.assignedProjectId) && m.closingStock <= m.minThreshold
    );
  }, [db.materials, visibleProjects]);

  const expiringDocs = useMemo(() => {
    return db.documents.filter((d) => {
      const days = daysUntil(d.expiryDate);
      return days !== null && days <= 30;
    });
  }, [db.documents]);

  const chartData = useMemo(() => {
    return visibleProjects.slice(0, 6).map((p) => {
      const s = getProjectSummary(p.id);
      return {
        name: p.region + ' · ' + p.code.split('-').slice(-1)[0],
        Certified: Math.round(s.certifiedValue / 100000),
        Received: Math.round(s.paymentsReceived / 100000),
        Expenses: Math.round(s.totalRecordedExpenses / 100000),
      };
    });
  }, [getProjectSummary, visibleProjects]);

  // DRIVER / OPERATOR HOMEPAGE
  if (activeRole === 'driver') {
    const myVehicle =
      db.vehicles.find((v) => v.id === currentUser.assignedVehicleId) ?? db.vehicles[0];
    const myProject = db.projects.find((p) => p.id === myVehicle?.assignedProjectId);
    const myTrips = db.tripLogs.filter((tr) => tr.vehicleId === myVehicle?.id).slice(0, 5);
    const myDiesel = db.dieselPurchases.filter((d) => d.vehicleId === myVehicle?.id).slice(0, 5);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
              Namaste, {currentUser.name}
            </h1>
            <p className="mt-1 text-sm text-[#52524E]">
              Assigned Vehicle & Daily Duty Summary · {myProject?.name ?? 'Active Site'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setDieselModalOpen(true)}>
              <Fuel className="h-4 w-4" />
              {t('addDiesel', language)}
            </Button>
            <Button variant="outline" onClick={() => setActiveSection('vehicles')}>
              <Truck className="h-4 w-4" />
              Open Vehicle Log
            </Button>
          </div>
        </div>

        {myVehicle && (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2DC]">
              <div>
                <p className="text-xs text-[#52524E]">{myVehicle.category} · {myVehicle.makeModel}</p>
                <h2 className="mt-1 text-2xl font-semibold font-mono text-[#171717]">
                  {myVehicle.registrationNumber}
                </h2>
              </div>
              <StatusText
                tone={myVehicle.status === 'Working' ? 'success' : myVehicle.status === 'Maintenance' ? 'warning' : 'neutral'}
                label={myVehicle.status}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-xs text-[#52524E]">Current Reading</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums">
                  {formatNumberIN(myVehicle.currentMeterReading)} {myVehicle.meterType}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#52524E]">Assigned Site</p>
                <p className="mt-1 text-sm font-medium text-[#171717]">{myProject?.region} Site</p>
              </div>
              <div>
                <p className="text-xs text-[#52524E]">Insurance Valid Till</p>
                <p className="mt-1 text-sm font-mono tabular-nums">{formatDateIN(myVehicle.insuranceExpiry)}</p>
              </div>
              <div>
                <p className="text-xs text-[#52524E]">Next Service Due</p>
                <p className="mt-1 text-sm font-mono tabular-nums">{formatDateIN(myVehicle.serviceDueDate)}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-[#171717]">Recent Trips Logged</h3>
            <div className="mt-4 divide-y divide-[#E5E2DC]">
              {myTrips.map((tr) => (
                <div key={tr.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#171717]">{tr.materialCarried}</p>
                    <p className="text-xs text-[#52524E]">
                      {tr.fromLocation} → {tr.toLocation} · {formatDateIN(tr.date)}
                    </p>
                  </div>
                  <p className="text-sm font-mono tabular-nums font-medium">{tr.tripsCount} trips</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold text-[#171717]">Recent Diesel Entries</h3>
            <div className="mt-4 divide-y divide-[#E5E2DC]">
              {myDiesel.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium font-mono tabular-nums text-[#171717]">
                      {d.litres} L · {formatINR(d.totalAmount)}
                    </p>
                    <p className="text-xs text-[#52524E]">
                      {d.pumpOrVendor} · {formatDateIN(d.date)}
                    </p>
                  </div>
                  <StatusText
                    tone={d.verificationStatus === 'Verified' ? 'success' : 'warning'}
                    label={d.verificationStatus}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <QuickDieselModal
          open={dieselModalOpen}
          onOpenChange={setDieselModalOpen}
          defaultVehicleId={myVehicle?.id}
        />
      </div>
    );
  }

  // OWNER, SUPERVISOR, OFFICE ADMIN, ACCOUNTANT COMMAND OVERVIEW
  return (
    <div className="space-y-6">
      {/* Header & Single Primary Contextual Action */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">
            {activeRole === 'owner'
              ? 'Owner 30-Second Business Summary · मालिक डैशबोर्ड'
              : activeRole === 'supervisor'
              ? 'Site Supervisor Daily Operations · साइट कामकाज'
              : activeRole === 'office_admin'
              ? 'Office Verification & Compliance Desk · ऑफिस एडमिन'
              : 'Accountant Receivables & Reconciliation · अकाउंट्स डेस्क'}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#171717]">
            Mayur Constructions — Operations & Hisab
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={onOpenQuickExpense}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
          <Button onClick={() => setDieselModalOpen(true)}>
            <Fuel className="h-4 w-4" />
            {t('addDiesel', language)}
          </Button>
        </div>
      </div>

      {/* 5 Core Questions Strip (Owner clarity in 30 seconds) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card
          className="p-5 hover:border-[#245BFF]/50 transition-colors cursor-pointer"
          onClick={() => setActiveSection('finance')}
        >
          <p className="text-xs font-medium text-[#52524E]">{t('qReceivable', language)}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#171717]">
            {formatINRCompact(totals.totalReceivablesPending)}
          </p>
          <p className="mt-2 text-xs text-[#15803D] font-medium">
            {formatINR(totals.totalReceivablesPending)} payment aana baaki hai
          </p>
          <p className="mt-1 text-[11px] text-[#73726C]">
            Certified RA bills net of retention minus received payments.
          </p>
        </Card>

        <Card
          className="p-5 hover:border-[#245BFF]/50 transition-colors cursor-pointer"
          onClick={() => setActiveSection('finance')}
        >
          <p className="text-xs font-medium text-[#52524E]">{t('qPayable', language)}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#171717]">
            {formatINRCompact(totals.totalPayablesPending)}
          </p>
          <p className="mt-2 text-xs text-[#B45309] font-medium">
            {formatINR(totals.totalPayablesPending)} dena baaki hai
          </p>
          <p className="mt-1 text-[11px] text-[#73726C]">
            Unpaid supplier material invoices + approved site bills.
          </p>
        </Card>

        <Card
          className="p-5 hover:border-[#245BFF]/50 transition-colors cursor-pointer"
          onClick={() => setActiveSection('projects')}
        >
          <p className="text-xs font-medium text-[#52524E]">{t('qProjects', language)}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#171717]">
            {totals.activeProjectCount} Active
          </p>
          <p className="mt-2 text-xs text-[#171717] font-medium">
            Bhiwandi · Thane · Palghar · Jawhar · Shahapur
          </p>
          <p className="mt-1 text-[11px] text-[#73726C]">
            {formatINRCompact(totals.verifiedProjectExpenses)} verified expenses · {formatINRCompact(totals.pendingProjectExpenses)} pending
          </p>
        </Card>

        <Card
          className="p-5 hover:border-[#245BFF]/50 transition-colors cursor-pointer"
          onClick={() => setActiveSection('vehicles')}
        >
          <p className="text-xs font-medium text-[#52524E]">{t('qVehicles', language)}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#171717]">
            {totals.workingVehicleCount} Working
          </p>
          <p className="mt-2 text-xs text-[#B45309] font-medium">
            {totals.maintenanceVehicleCount} vehicles maintenance mein hain · {totals.idleVehicleCount} idle
          </p>
          <p className="mt-1 text-[11px] text-[#73726C]">
            Out of {totals.workingVehicleCount + totals.maintenanceVehicleCount + totals.idleVehicleCount} fleet units on site.
          </p>
        </Card>
      </div>

      {/* Question 5: Aaj kis cheez par attention dena hai? + Active Projects */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E2DC]">
              <div>
                <h2 className="text-base font-semibold text-[#171717]">
                  {t('qAttention', language)}
                </h2>
                <p className="text-xs text-[#52524E]">Plain-language action summary for today</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('notifications')}
                className="text-xs font-medium text-[#245BFF] hover:underline cursor-pointer whitespace-nowrap"
              >
                Open Queue →
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setActiveSection('finance')}
                className="w-full text-left rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5 hover:border-[#245BFF]/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="h-4 w-4 text-[#245BFF] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#171717]">
                      {totals.pendingApprovalCount} operational entries verification ke liye pending hain.
                    </p>
                    <p className="text-xs text-[#52524E]">
                      Includes diesel slips & site labour/overhead bills awaiting Office review.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#73726C] shrink-0" />
              </button>

              {flaggedDiesel.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSection('vehicles')}
                  className="w-full text-left rounded-xl border border-[#D97706]/40 bg-[#FFFBEB] p-3.5 hover:border-[#D97706] transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#171717]">
                        {flaggedDiesel.length} diesel entries unusual variation ke liye flagged hain.
                      </p>
                      <p className="text-xs text-[#52524E]">
                        Review pump slip & meter reading before approving payment.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#92400E] shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSection('materials')}
                className="w-full text-left rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5 hover:border-[#245BFF]/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 text-[#B45309] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#171717]">
                      {lowStockMaterials.length} materials minimum threshold se kam hain.
                    </p>
                    <p className="text-xs text-[#52524E]">
                      {lowStockMaterials.slice(0, 2).map((m) => m.name.split('(')[0].trim()).join(', ')}
                      {lowStockMaterials.length > 2 ? ` +${lowStockMaterials.length - 2} more` : ''}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#73726C] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('documents')}
                className="w-full text-left rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5 hover:border-[#245BFF]/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <FileWarning className="h-4 w-4 text-[#DC2626] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#171717]">
                      {expiringDocs.length} vehicle documents / insurance expire ya due hain.
                    </p>
                    <p className="text-xs text-[#52524E]">
                      Check RTO fitness & insurance renewals to prevent site stoppages.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#73726C] shrink-0" />
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E5E2DC] flex items-center justify-between text-xs text-[#52524E]">
            <span>Updated: {formatDateTimeIN(db.lastUpdated)}</span>
            <button
              type="button"
              onClick={() => setActiveSection('reports')}
              className="font-medium text-[#245BFF] hover:underline cursor-pointer"
            >
              View Owner Reports →
            </button>
          </div>
        </Card>

        {/* Chart: Certified vs Received vs Recorded Expenses (in Lakhs) */}
        <Card className="xl:col-span-7 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E5E2DC]">
            <div>
              <h2 className="text-base font-semibold text-[#171717]">
                Project Cashflow Comparison (₹ Lakhs)
              </h2>
              <p className="text-xs text-[#52524E]">
                Certified RA Bills vs Money Received vs Recorded Operational Expenses
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#52524E]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#171717]" /> Certified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#245BFF]" /> Received
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#F5CB54]" /> Expenses
              </span>
            </div>
          </div>

          <div className="mt-4 h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DC" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#52524E', fontSize: 11 }}
                  axisLine={{ stroke: '#E5E2DC' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#52524E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="L"
                />
                <Tooltip
                  formatter={(value) => [`₹${Number(value ?? 0)} Lakhs`, '']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E2DC',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Certified" fill="#171717" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Received" fill="#245BFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#F5CB54" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Active Projects Summary + Pending Verification Quick Action List + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E5E2DC]">
            <div>
              <h2 className="text-base font-semibold text-[#171717]">
                Active Road Contracts ({visibleProjects.length})
              </h2>
              <p className="text-xs text-[#52524E]">
                Click any project to inspect RA bills, vehicles, material consumption & receivables
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('projects')}
              className="text-xs font-medium text-[#245BFF] hover:underline cursor-pointer whitespace-nowrap"
            >
              All Projects →
            </button>
          </div>

          <div className="mt-3 divide-y divide-[#E5E2DC]">
            {visibleProjects.slice(0, 6).map((prj) => {
              const s = getProjectSummary(prj.id);
              return (
                <button
                  key={prj.id}
                  type="button"
                  onClick={() => onOpenProjectDetail(prj.id)}
                  className="w-full py-3.5 text-left hover:bg-[#FAF9F6] px-2 -mx-2 rounded-xl transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#52524E]">
                      <span className="font-mono">{prj.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{prj.region}</span>
                      <span aria-hidden="true">·</span>
                      <span>{prj.department}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-[#171717] truncate">
                      {prj.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-[#52524E]">Aana Baaki</p>
                      <p className="text-sm font-semibold font-mono tabular-nums text-[#171717]">
                        {formatINRCompact(s.pendingReceivables)}
                      </p>
                    </div>
                    <div className="text-right min-w-[58px]">
                      <p className="text-[11px] text-[#52524E]">Progress</p>
                      <p className="text-sm font-semibold font-mono tabular-nums text-[#245BFF]">
                        {prj.physicalProgress}%
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E5E2DC]">
            <div>
              <h2 className="text-base font-semibold text-[#171717]">
                Pending Verification & Recent Logs
              </h2>
              <p className="text-xs text-[#52524E]">
                Quick verification updates project totals & reports live
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('activity')}
              className="text-xs font-medium text-[#245BFF] hover:underline cursor-pointer whitespace-nowrap"
            >
              Activity Log →
            </button>
          </div>

          <div className="mt-3 divide-y divide-[#E5E2DC]">
            {pendingApprovals.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#52524E]">
                <CheckCircle2 className="h-5 w-5 text-[#16A34A] mx-auto mb-1.5" />
                All site entries are verified.
              </div>
            ) : (
              pendingApprovals.map((txn) => (
                <div key={txn.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#171717] truncate">
                      {txn.description}
                    </p>
                    <p className="text-xs text-[#52524E]">
                      {txn.category} · {formatDateIN(txn.date)} · {txn.createdBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono tabular-nums font-semibold text-[#171717]">
                      {formatINR(txn.amount)}
                    </span>
                    {(activeRole === 'owner' || activeRole === 'office_admin' || activeRole === 'accountant') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyExpense(txn.id)}
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <QuickDieselModal open={dieselModalOpen} onOpenChange={setDieselModalOpen} />
    </div>
  );
}
