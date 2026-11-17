import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Button,
  Card,
  FieldLabel,
  Input,
  SelectField,
  StatusText,
  TabsBar,
} from '@/src/components/ui/primitives';
import {
  daysUntil,
  downloadCsv,
  formatDateIN,
  formatDateTimeIN,
  formatINR,
  formatNumberIN,
} from '@/src/lib/formatters';
import { useDemoStore } from '@/src/store/demoStore';

const REPORT_META: Record<string, { title: string; meaning: string }> = {
  projects: {
    title: 'Project Expenditure Summary',
    meaning:
      'Compares Contract Value and Operational Budget against Verified vs Pending operational expenses and Material Issued to each site.',
  },
  fuel: {
    title: 'Vehicle Fuel Cost Report',
    meaning:
      'Tracks diesel litres purchased and expenditure per vehicle/machine, separating Office-verified entries from pending entries.',
  },
  utilization: {
    title: 'Vehicle Utilization Report',
    meaning:
      'Shows logged trips and km/engine-hour deltas within the selected period so idle machinery is immediately visible.',
  },
  stock: {
    title: 'Material Stock Valuation Summary',
    meaning:
      'Current closing yard inventory valued at latest purchase rate; transfers are excluded from consumption.',
  },
  suppliers: {
    title: 'Supplier Outstanding Report (Dena Baaki)',
    meaning:
      'Shows total supplier invoices billed vs paid and remaining payable balance per vendor.',
  },
  receivables: {
    title: 'Project Receivables Report (Payment Aana Baaki)',
    meaning:
      'Shows certified government RA bills net of retention minus actual payments received.',
  },
  monthly: {
    title: 'Monthly Expense Trend Report',
    meaning:
      'Aggregates verified and pending operational expenses by month (excluding material inward invoices to prevent double counting).',
  },
  approvals: {
    title: 'Pending Approvals & Review Queue',
    meaning:
      'All Draft/Recorded expenses and flagged diesel entries awaiting supervisor submission, office verification, or owner approval.',
  },
  missing: {
    title: 'Missing Operational Entries Check',
    meaning:
      'Highlights active/idle vehicles with no trip or diesel log recorded in over 48 hours (reference date 16 Nov 2026).',
  },
};

export function ReportsView() {
  const { db, globalProjectFilter, getVisibleProjects, getProjectSummary } = useDemoStore();
  const [reportTab, setReportTab] = useState('projects');
  const [projectFilter, setProjectFilter] = useState(globalProjectFilter);
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-11-30');

  const visibleProjects = getVisibleProjects().filter(
    (p) => projectFilter === 'ALL' || p.id === projectFilter
  );
  const visibleProjectIds = new Set(visibleProjects.map((p) => p.id));

  const projectRows = useMemo(
    () =>
      visibleProjects.map((p) => ({
        project: p,
        summary: getProjectSummary(p.id),
      })),
    [visibleProjects, getProjectSummary]
  );

  const fuelRows = useMemo(() => {
    return db.vehicles
      .filter((v) => visibleProjectIds.has(v.assignedProjectId))
      .map((v) => {
        const purchases = db.dieselPurchases.filter(
          (d) => d.vehicleId === v.id && d.date >= fromDate && d.date <= toDate
        );
        const verifiedAmt = purchases
          .filter((d) => d.verificationStatus === 'Verified')
          .reduce((s, d) => s + d.totalAmount, 0);
        const pendingAmt = purchases
          .filter((d) => d.verificationStatus === 'Pending Verification')
          .reduce((s, d) => s + d.totalAmount, 0);
        const litres = purchases.reduce((s, d) => s + d.litres, 0);
        return { vehicle: v, litres, verifiedAmt, pendingAmt, totalAmt: verifiedAmt + pendingAmt };
      })
      .sort((a, b) => b.totalAmt - a.totalAmt);
  }, [db.vehicles, db.dieselPurchases, visibleProjectIds, fromDate, toDate]);

  const utilizationRows = useMemo(() => {
    return db.vehicles
      .filter((v) => visibleProjectIds.has(v.assignedProjectId))
      .map((v) => {
        const trips = db.tripLogs.filter(
          (tr) => tr.vehicleId === v.id && tr.date >= fromDate && tr.date <= toDate
        );
        return {
          vehicle: v,
          tripCount: trips.reduce((s, t) => s + t.tripsCount, 0),
          meterDelta: trips.reduce((s, t) => s + t.meterDelta, 0),
        };
      });
  }, [db.vehicles, db.tripLogs, visibleProjectIds, fromDate, toDate]);

  const stockRows = useMemo(() => {
    return db.materials.filter((m) => visibleProjectIds.has(m.assignedProjectId));
  }, [db.materials, visibleProjectIds]);

  const supplierRows = useMemo(() => {
    return db.suppliers.map((sup) => {
      const invs = db.supplierInvoices.filter(
        (i) =>
          i.supplierId === sup.id &&
          visibleProjectIds.has(i.projectId) &&
          i.date >= fromDate &&
          i.date <= toDate
      );
      const billed = invs.reduce((s, i) => s + i.amount, 0);
      const paid = invs.reduce((s, i) => s + i.paidAmount, 0);
      return { supplier: sup, invoiceCount: invs.length, billed, paid, outstanding: billed - paid };
    });
  }, [db.suppliers, db.supplierInvoices, visibleProjectIds, fromDate, toDate]);

  const monthlyChartData = useMemo(() => {
    const map = new Map<string, { month: string; Verified: number; Pending: number }>();
    db.transactions
      .filter(
        (t) =>
          visibleProjectIds.has(t.projectId) &&
          t.stage !== 'Rejected' &&
          t.date >= fromDate &&
          t.date <= toDate
      )
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        const entry = map.get(ym) ?? { month: ym, Verified: 0, Pending: 0 };
        if (t.stage === 'Recorded' || t.stage === 'Draft') {
          entry.Pending += t.amount;
        } else {
          entry.Verified += t.amount;
        }
        map.set(ym, entry);
      });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [db.transactions, visibleProjectIds, fromDate, toDate]);

  const pendingApprovals = useMemo(() => {
    return db.transactions.filter(
      (t) => visibleProjectIds.has(t.projectId) && (t.stage === 'Recorded' || t.stage === 'Draft')
    );
  }, [db.transactions, visibleProjectIds]);

  const missingEntries = useMemo(() => {
    return db.vehicles.filter((v) => {
      if (!visibleProjectIds.has(v.assignedProjectId)) return false;
      const days = daysUntil(v.lastLogDate, '2026-11-16');
      return days !== null && Math.abs(days) >= 3;
    });
  }, [db.vehicles, visibleProjectIds]);

  const handleExportActiveReport = () => {
    if (reportTab === 'projects') {
      downloadCsv(
        'report_project_expenditure.csv',
        ['Code', 'Project', 'Contract Value', 'Verified Expenses', 'Pending Expenses', 'Material Issued', 'Pending Receivables'],
        projectRows.map(({ project, summary }) => [
          project.code,
          project.name,
          project.contractValue,
          summary.verifiedExpenses,
          summary.pendingExpenses,
          summary.materialConsumedValue,
          summary.pendingReceivables,
        ])
      );
    } else if (reportTab === 'fuel') {
      downloadCsv(
        'report_vehicle_fuel_cost.csv',
        ['Reg No', 'Category', 'Litres', 'Verified Spend', 'Pending Spend', 'Total Diesel Spend'],
        fuelRows.map((r) => [
          r.vehicle.registrationNumber,
          r.vehicle.category,
          r.litres,
          r.verifiedAmt,
          r.pendingAmt,
          r.totalAmt,
        ])
      );
    } else if (reportTab === 'utilization') {
      downloadCsv(
        'report_vehicle_utilization.csv',
        ['Reg No', 'Category', 'Trips Logged', 'Delta', 'Unit', 'Status'],
        utilizationRows.map((r) => [
          r.vehicle.registrationNumber,
          r.vehicle.category,
          r.tripCount,
          r.meterDelta,
          r.vehicle.meterType,
          r.vehicle.status,
        ])
      );
    } else if (reportTab === 'stock') {
      downloadCsv(
        'report_material_stock.csv',
        ['Code', 'Material', 'Yard', 'Closing Stock', 'Unit', 'Rate', 'Valuation'],
        stockRows.map((m) => [
          m.code,
          m.name,
          m.storageLocation,
          m.closingStock,
          m.unit,
          m.purchaseRate,
          m.closingStock * m.purchaseRate,
        ])
      );
    } else if (reportTab === 'suppliers') {
      downloadCsv(
        'report_supplier_outstanding.csv',
        ['Supplier', 'City', 'Invoices', 'Billed', 'Paid', 'Outstanding'],
        supplierRows.map((s) => [s.supplier.name, s.supplier.city, s.invoiceCount, s.billed, s.paid, s.outstanding])
      );
    } else if (reportTab === 'receivables') {
      downloadCsv(
        'report_project_receivables.csv',
        ['Code', 'Project', 'Billed', 'Certified Net', 'Received', 'Aana Baaki'],
        projectRows.map(({ project, summary }) => [
          project.code,
          project.name,
          summary.billedValue,
          summary.netReceivableAfterRetention,
          summary.paymentsReceived,
          summary.pendingReceivables,
        ])
      );
    } else if (reportTab === 'monthly') {
      downloadCsv(
        'report_monthly_expenses.csv',
        ['Month', 'Verified Expenses', 'Pending Verification', 'Total'],
        monthlyChartData.map((m) => [m.month, m.Verified, m.Pending, m.Verified + m.Pending])
      );
    } else if (reportTab === 'approvals') {
      downloadCsv(
        'report_pending_approvals.csv',
        ['ID', 'Date', 'Category', 'Description', 'Amount', 'Stage'],
        pendingApprovals.map((t) => [t.id, t.date, t.category, t.description, t.amount, t.stage])
      );
    } else {
      downloadCsv(
        'report_missing_vehicle_entries.csv',
        ['Reg No', 'Category', 'Driver', 'Status', 'Last Log Date'],
        missingEntries.map((v) => [v.registrationNumber, v.category, v.driverName, v.status, v.lastLogDate])
      );
    }
  };

  const meta = REPORT_META[reportTab];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">रिपोर्ट्स · Owner Control Center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
            Verified Business Reports & Exports
          </h1>
        </div>
        <Button onClick={handleExportActiveReport}>
          <Download className="h-4 w-4" />
          Export Report CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <FieldLabel>Project Filter</FieldLabel>
            <SelectField
              value={projectFilter}
              onValueChange={setProjectFilter}
              options={[
                { value: 'ALL', label: 'All Visible Projects' },
                ...db.projects.map((p) => ({ value: p.id, label: `${p.region} · ${p.name}` })),
              ]}
            />
          </div>
          <div className="md:col-span-3">
            <FieldLabel>From Date</FieldLabel>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <FieldLabel>To Date</FieldLabel>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <TabsBar
        value={reportTab}
        onValueChange={setReportTab}
        tabs={[
          { value: 'projects', label: 'Project Spend' },
          { value: 'receivables', label: 'Receivables' },
          { value: 'suppliers', label: 'Supplier Outstanding' },
          { value: 'fuel', label: 'Fuel Cost' },
          { value: 'utilization', label: 'Fleet Utilization' },
          { value: 'stock', label: 'Material Stock' },
          { value: 'monthly', label: 'Monthly Expense' },
          { value: 'approvals', label: 'Pending Approvals', count: pendingApprovals.length },
          { value: 'missing', label: 'Missing Entries', count: missingEntries.length },
        ]}
      />

      {/* Explicit Transparency Banner Required by Spec */}
      <Card className="p-4 bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#171717]">{meta.title}</p>
          <p className="text-xs text-[#52524E] mt-0.5">{meta.meaning}</p>
        </div>
        <div className="text-xs text-[#52524E] shrink-0 sm:text-right">
          <p>
            Period: <span className="font-mono text-[#171717]">{formatDateIN(fromDate)} – {formatDateIN(toDate)}</span>
          </p>
          <p>Last Updated: <span className="font-mono">{formatDateTimeIN(db.lastUpdated)}</span></p>
        </div>
      </Card>

      {/* Active Report Views */}
      {reportTab === 'projects' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-right">Verified Expenses</th>
                <th className="py-3 px-4 text-right">Pending Verification</th>
                <th className="py-3 px-4 text-right">Material Consumed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {projectRows.map(({ project, summary }) => (
                <tr key={project.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4 text-xs">
                    <p className="font-semibold text-[#171717]">{project.name}</p>
                    <p className="text-[#52524E]">{project.code} · {project.region}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatINR(summary.contractValue)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#15803D] font-semibold">{formatINR(summary.verifiedExpenses)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#B45309]">{formatINR(summary.pendingExpenses)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatINR(summary.materialConsumedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reportTab === 'receivables' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Project & Client</th>
                <th className="py-3 px-4 text-right">Gross Billed</th>
                <th className="py-3 px-4 text-right">Certified (Net of Retention)</th>
                <th className="py-3 px-4 text-right">Payments Received</th>
                <th className="py-3 px-4 text-right">Payment Aana Baaki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {projectRows.map(({ project, summary }) => (
                <tr key={project.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4 text-xs">
                    <p className="font-semibold text-[#171717]">{project.name}</p>
                    <p className="text-[#52524E]">{project.department}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatINR(summary.billedValue)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatINR(summary.netReceivableAfterRetention)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#15803D]">{formatINR(summary.paymentsReceived)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-[#245BFF]">{formatINR(summary.pendingReceivables)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reportTab === 'suppliers' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Invoices</th>
                <th className="py-3 px-4 text-right">Total Billed</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Dena Baaki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {supplierRows.map((s) => (
                <tr key={s.supplier.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4 text-xs">
                    <p className="font-semibold text-[#171717]">{s.supplier.name}</p>
                    <p className="text-[#52524E]">{s.supplier.category} · {s.supplier.city}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{s.invoiceCount}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatINR(s.billed)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#15803D]">{formatINR(s.paid)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-[#B45309]">{formatINR(s.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reportTab === 'fuel' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4 text-right">Litres Purchased</th>
                <th className="py-3 px-4 text-right">Verified Spend</th>
                <th className="py-3 px-4 text-right">Pending Review</th>
                <th className="py-3 px-4 text-right">Total Diesel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {fuelRows.map((r) => (
                <tr key={r.vehicle.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4 text-xs">
                    <p className="font-mono font-semibold text-[#171717]">{r.vehicle.registrationNumber}</p>
                    <p className="text-[#52524E]">{r.vehicle.category} · {r.vehicle.driverName}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatNumberIN(r.litres)} L</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#15803D]">{formatINR(r.verifiedAmt)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#B45309]">{formatINR(r.pendingAmt)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold">{formatINR(r.totalAmt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reportTab === 'utilization' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Vehicle / Machine</th>
                <th className="py-3 px-4 text-right">Logged Trips</th>
                <th className="py-3 px-4 text-right">Logged Output (km / hrs)</th>
                <th className="py-3 px-4">Last Log Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {utilizationRows.map((r) => (
                <tr key={r.vehicle.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4 text-xs">
                    <p className="font-mono font-semibold text-[#171717]">{r.vehicle.registrationNumber}</p>
                    <p className="text-[#52524E]">{r.vehicle.category}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{r.tripCount}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{formatNumberIN(r.meterDelta)} {r.vehicle.meterType}</td>
                  <td className="py-3 px-4 text-xs font-mono">{formatDateIN(r.vehicle.lastLogDate)}</td>
                  <td className="py-3 px-4">
                    <StatusText
                      tone={r.vehicle.status === 'Working' ? 'success' : r.vehicle.status === 'Maintenance' ? 'warning' : 'neutral'}
                      label={r.vehicle.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reportTab === 'stock' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Yard</th>
                <th className="py-3 px-4 text-right">Closing Balance</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4">Threshold Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {stockRows.map((m) => (
                <tr key={m.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4 text-xs font-medium text-[#171717]">{m.name}</td>
                  <td className="py-3 px-4 text-xs text-[#52524E]">{m.storageLocation}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold">
                    {formatNumberIN(m.closingStock)} {m.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                    {formatINR(m.closingStock * m.purchaseRate)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText
                      tone={m.closingStock <= m.minThreshold ? 'warning' : 'success'}
                      label={m.closingStock <= m.minThreshold ? 'Low Stock' : 'Adequate'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {reportTab === 'monthly' && (
        <Card className="p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[#171717]">Monthly Operational Expenses (₹)</h3>
          <div className="mt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DC" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#52524E', fontSize: 12 }} />
                <YAxis tick={{ fill: '#52524E', fontSize: 11 }} />
                <Tooltip formatter={(val) => formatINR(Number(val ?? 0))} />
                <Bar dataKey="Verified" stackId="a" fill="#245BFF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill="#F5CB54" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {reportTab === 'approvals' && (
        <Card className="divide-y divide-[#E5E2DC]">
          {pendingApprovals.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-semibold text-[#171717]">{t.description}</p>
                <p className="text-[#52524E]">
                  {t.category} · {formatDateIN(t.date)} · {t.vendorOrPayee} · Submitted by {t.createdBy}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-[#171717]">{formatINR(t.amount)}</p>
                <StatusText tone="warning" label={t.stage} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {reportTab === 'missing' && (
        <Card className="divide-y divide-[#E5E2DC]">
          {missingEntries.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#52524E]">
              All active vehicles have logs recorded within the past 48 hours.
            </div>
          ) : (
            missingEntries.map((v) => (
              <div key={v.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-mono font-semibold text-[#171717]">{v.registrationNumber}</p>
                  <p className="text-[#52524E]">
                    {v.category} · Driver: {v.driverName} · Status: {v.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#B45309] font-medium">Last log: {formatDateIN(v.lastLogDate)}</p>
                  <p className="text-[#52524E]">Verify idle/workshop status</p>
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
