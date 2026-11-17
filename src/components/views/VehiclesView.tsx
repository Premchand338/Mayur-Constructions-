import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Fuel,
  Plus,
  Route,
  Search,
  Truck,
  Wrench,
} from 'lucide-react';
import { QuickDieselModal } from '@/src/components/forms/QuickDieselModal';
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
import { daysUntil, formatDateIN, formatINR, formatINRCompact, formatNumberIN } from '@/src/lib/formatters';
import { t } from '@/src/lib/i18n';
import { useDemoStore } from '@/src/store/demoStore';
import { MeterType, Vehicle, VehicleCategory, VehicleStatus } from '@/src/types/domain';

const CATEGORIES: VehicleCategory[] = [
  'Hyva Tipper',
  'Dumper',
  'JCB Excavator',
  'Road Roller',
  'Water Tanker',
  'Tractor',
  'Bitumen Sprayer',
];

const vehicleSchema = z.object({
  registrationNumber: z.string().min(4, 'Enter registration number'),
  category: z.enum([
    'Hyva Tipper',
    'Dumper',
    'JCB Excavator',
    'Road Roller',
    'Water Tanker',
    'Tractor',
    'Bitumen Sprayer',
  ]),
  makeModel: z.string().min(2, 'Enter make & model'),
  assignedProjectId: z.string().min(1),
  driverName: z.string().min(2, 'Enter driver/operator name'),
  status: z.enum(['Working', 'Idle', 'Maintenance']),
  meterType: z.enum(['km', 'hours']),
  currentMeterReading: z.number({ message: 'Enter valid reading' }).min(0),
  expectedFuelNorm: z.string().min(2),
  insuranceExpiry: z.string().min(1),
  fitnessExpiry: z.string().min(1),
  serviceDueDate: z.string().min(1),
});

const tripSchema = z.object({
  vehicleId: z.string().min(1),
  projectId: z.string().min(1),
  date: z.string().min(1),
  materialCarried: z.string().min(2, 'Enter material or task'),
  fromLocation: z.string().min(2),
  toLocation: z.string().min(2),
  tripsCount: z.number().int().positive(),
  meterDelta: z.number().positive(),
  driverName: z.string().min(2),
  notes: z.string().optional(),
});

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  projectId: z.string().min(1),
  date: z.string().min(1),
  serviceType: z.enum(['Scheduled Service', 'Breakdown Repair', 'Tyre & Hydraulic', 'Inspection']),
  description: z.string().min(4, 'Enter work description'),
  cost: z.number().min(0),
  vendor: z.string().min(2, 'Enter workshop/vendor'),
  status: z.enum(['Completed', 'In Workshop']),
  nextServiceDate: z.string().min(1),
});

export function VehiclesView() {
  const {
    db,
    activeRole,
    currentUser,
    language,
    globalProjectFilter,
    addVehicle,
    editVehicle,
    changeVehicleStatus,
    recordTripLog,
    recordMaintenance,
    verifyExpense,
    canPerformAction,
  } = useDemoStore();

  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [dieselModalOpen, setDieselModalOpen] = useState(false);
  const [dieselDefaultVehicle, setDieselDefaultVehicle] = useState<string | undefined>(undefined);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('diesel');

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const filteredVehicles = useMemo(() => {
    return db.vehicles.filter((v) => {
      if (activeRole === 'driver' && currentUser.assignedVehicleId && v.id !== currentUser.assignedVehicleId) {
        return false;
      }
      if (globalProjectFilter !== 'ALL' && v.assignedProjectId !== globalProjectFilter) return false;
      if (siteFilter !== 'ALL' && v.assignedProjectId !== siteFilter) return false;
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && v.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          v.registrationNumber.toLowerCase().includes(q) ||
          v.driverName.toLowerCase().includes(q) ||
          v.makeModel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.vehicles, activeRole, currentUser.assignedVehicleId, globalProjectFilter, siteFilter, statusFilter, categoryFilter, search]);

  const fleetSummary = useMemo(() => {
    const ids = new Set(filteredVehicles.map((v) => v.id));
    const dieselList = db.dieselPurchases.filter((d) => ids.has(d.vehicleId));
    return {
      working: filteredVehicles.filter((v) => v.status === 'Working').length,
      maintenance: filteredVehicles.filter((v) => v.status === 'Maintenance').length,
      idle: filteredVehicles.filter((v) => v.status === 'Idle').length,
      totalDieselSpend: dieselList.reduce((s, d) => s + d.totalAmount, 0),
      totalDieselLitres: dieselList.reduce((s, d) => s + d.litres, 0),
      flaggedCount: dieselList.filter((d) => d.anomalyFlag && d.verificationStatus === 'Pending Verification').length,
    };
  }, [filteredVehicles, db.dieselPurchases]);

  const selectedVehicle = db.vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const vehicleForm = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registrationNumber: '',
      category: 'Hyva Tipper',
      makeModel: '',
      assignedProjectId: db.projects[0]?.id ?? '',
      driverName: '',
      status: 'Working',
      meterType: 'km',
      currentMeterReading: 0,
      expectedFuelNorm: '3.3 km/L',
      insuranceExpiry: '2027-06-30',
      fitnessExpiry: '2027-06-30',
      serviceDueDate: '2027-01-30',
    },
  });

  const tripForm = useForm<z.infer<typeof tripSchema>>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      vehicleId: db.vehicles[0]?.id ?? '',
      projectId: db.vehicles[0]?.assignedProjectId ?? '',
      date: '2026-11-16',
      materialCarried: '20mm Crushed Aggregate',
      fromLocation: 'Padgha Crusher',
      toLocation: 'Site Chainage',
      tripsCount: 4,
      meterDelta: 65,
      driverName: db.vehicles[0]?.driverName ?? '',
      notes: '',
    },
  });

  const maintForm = useForm<z.infer<typeof maintenanceSchema>>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicleId: db.vehicles[0]?.id ?? '',
      projectId: db.vehicles[0]?.assignedProjectId ?? '',
      date: '2026-11-16',
      serviceType: 'Scheduled Service',
      description: '',
      cost: 8500,
      vendor: 'Thane Heavy Garage',
      status: 'Completed',
      nextServiceDate: '2027-02-15',
    },
  });

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setFormError('');
    vehicleForm.reset({
      registrationNumber: 'MH-04-HY-',
      category: 'Hyva Tipper',
      makeModel: 'Tata Prima 2825.K',
      assignedProjectId: db.projects[0]?.id ?? '',
      driverName: '',
      status: 'Working',
      meterType: 'km',
      currentMeterReading: 12000,
      expectedFuelNorm: '3.3 km/L',
      insuranceExpiry: '2027-08-30',
      fitnessExpiry: '2027-08-30',
      serviceDueDate: '2027-01-30',
    });
    setVehicleModalOpen(true);
  };

  const openEditVehicle = (veh: Vehicle) => {
    setEditingVehicle(veh);
    setFormError('');
    vehicleForm.reset({
      registrationNumber: veh.registrationNumber,
      category: veh.category,
      makeModel: veh.makeModel,
      assignedProjectId: veh.assignedProjectId,
      driverName: veh.driverName,
      status: veh.status,
      meterType: veh.meterType,
      currentMeterReading: veh.currentMeterReading,
      expectedFuelNorm: veh.expectedFuelNorm,
      insuranceExpiry: veh.insuranceExpiry,
      fitnessExpiry: veh.fitnessExpiry,
      serviceDueDate: veh.serviceDueDate,
    });
    setVehicleModalOpen(true);
  };

  const openDieselFor = (vehId?: string) => {
    setDieselDefaultVehicle(vehId);
    setDieselModalOpen(true);
  };

  const openTripFor = (veh?: Vehicle) => {
    const target = veh ?? filteredVehicles[0] ?? db.vehicles[0];
    tripForm.reset({
      vehicleId: target.id,
      projectId: target.assignedProjectId,
      date: '2026-11-16',
      materialCarried: target.meterType === 'hours' ? 'Earthwork Excavation' : '20mm Aggregate',
      fromLocation: 'Batching Yard',
      toLocation: 'Road Site',
      tripsCount: target.meterType === 'hours' ? 1 : 5,
      meterDelta: target.meterType === 'hours' ? 8 : 85,
      driverName: target.driverName,
      notes: '',
    });
    setTripModalOpen(true);
  };

  const openMaintFor = (veh?: Vehicle) => {
    const target = veh ?? filteredVehicles[0] ?? db.vehicles[0];
    maintForm.reset({
      vehicleId: target.id,
      projectId: target.assignedProjectId,
      date: '2026-11-16',
      serviceType: 'Scheduled Service',
      description: '',
      cost: 12500,
      vendor: 'Sahyadri Heavy Hydraulics',
      status: 'Completed',
      nextServiceDate: '2027-02-16',
    });
    setMaintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">गाड़ियां · Fleet & Machinery Control</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
            Vehicles, Diesel & Maintenance ({filteredVehicles.length})
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={() => openTripFor()}>
            <Route className="h-4 w-4" />
            Log Trip
          </Button>
          {activeRole !== 'driver' && (
            <Button variant="outline" onClick={() => openMaintFor()}>
              <Wrench className="h-4 w-4" />
              Record Maintenance
            </Button>
          )}
          {canPerformAction('edit_project') && (
            <Button variant="outline" onClick={openAddVehicle}>
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          )}
          <Button onClick={() => openDieselFor()}>
            <Fuel className="h-4 w-4" />
            {t('addDiesel', language)}
          </Button>
        </div>
      </div>

      {/* Summary & Honest Diesel Note */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[#52524E]">Fleet Status</p>
          <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#171717]">
            {fleetSummary.working} Working
          </p>
          <p className="mt-1 text-xs text-[#52524E]">
            {fleetSummary.maintenance} Maintenance · {fleetSummary.idle} Idle
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#52524E]">Diesel Purchased (Total)</p>
          <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#171717]">
            {formatINRCompact(fleetSummary.totalDieselSpend)}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-[#52524E]">
            {formatNumberIN(fleetSummary.totalDieselLitres)} Litres billed
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#52524E]">Flagged Fuel Entries</p>
          <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#B45309]">
            {fleetSummary.flaggedCount} For Review
          </p>
          <p className="mt-1 text-xs text-[#52524E]">
            Unusual refill / rate variance awaiting check
          </p>
        </Card>
        <Card className="p-4 bg-[#FAF9F6]">
          <p className="text-xs font-medium text-[#171717]">Measurement Accuracy Rule</p>
          <p className="mt-1 text-[11px] text-[#52524E] leading-relaxed">
            Diesel <strong>purchased</strong> is tracked separately from actual consumption. Odometer vehicles (km) and earthmoving machines (hours) are measured separately.
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="h-4 w-4 text-[#73726C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reg no, driver, make..."
              className="pl-10"
            />
          </div>
          <div className="md:col-span-3">
            <SelectField
              value={siteFilter}
              onValueChange={setSiteFilter}
              options={[
                { value: 'ALL', label: 'All Sites' },
                ...db.projects.map((p) => ({ value: p.id, label: `${p.region} · ${p.code}` })),
              ]}
            />
          </div>
          <div className="md:col-span-3">
            <SelectField
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Vehicle Types' },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <SelectField
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'Working', label: 'Working' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Idle', label: 'Idle' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Fleet Table (Desktop) & Cards (Mobile) */}
      {filteredVehicles.length === 0 ? (
        <EmptyState
          title="No vehicles match your filters"
          description="Adjust the site, type, or status filter to view fleet equipment."
        />
      ) : (
        <>
          <Card className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                  <th className="py-3 px-4">Vehicle & Type</th>
                  <th className="py-3 px-4">Assigned Site</th>
                  <th className="py-3 px-4">Driver / Operator</th>
                  <th className="py-3 px-4 text-right">Meter Reading</th>
                  <th className="py-3 px-4 text-right">Diesel Spend</th>
                  <th className="py-3 px-4 text-right">Trips</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DC] text-sm">
                {filteredVehicles.map((v) => {
                  const prj = db.projects.find((p) => p.id === v.assignedProjectId);
                  const vehDiesel = db.dieselPurchases.filter((d) => d.vehicleId === v.id);
                  const dieselSum = vehDiesel.reduce((s, d) => s + d.totalAmount, 0);
                  const dieselLitres = vehDiesel.reduce((s, d) => s + d.litres, 0);
                  const hasFlag = vehDiesel.some((d) => d.anomalyFlag && d.verificationStatus === 'Pending Verification');
                  const tripTotal = db.tripLogs
                    .filter((tr) => tr.vehicleId === v.id)
                    .reduce((s, tr) => s + tr.tripsCount, 0);
                  const insDays = daysUntil(v.insuranceExpiry);
                  const fitDays = daysUntil(v.fitnessExpiry);
                  const docWarning = (insDays !== null && insDays <= 30) || (fitDays !== null && fitDays <= 30);

                  return (
                    <tr
                      key={v.id}
                      onClick={() => {
                        setSelectedVehicleId(v.id);
                        setDetailTab('diesel');
                      }}
                      className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#171717]">
                            {v.registrationNumber}
                          </span>
                          {hasFlag && (
                            <span title="Flagged diesel entry">
                              <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#52524E]">
                          {v.category} · {v.makeModel}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium text-[#171717]">{prj?.region ?? '—'}</p>
                        <p className="text-[11px] text-[#52524E] truncate max-w-[190px]">{prj?.name}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#171717]">
                        <p>{v.driverName}</p>
                        {docWarning && (
                          <p className="text-[11px] text-[#DC2626]">Insurance/Fitness due</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {formatNumberIN(v.currentMeterReading)} {v.meterType}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-mono tabular-nums text-xs font-semibold">
                          {formatINR(dieselSum)}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-[#52524E]">
                          {formatNumberIN(dieselLitres)} L
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {tripTotal}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText
                          tone={
                            v.status === 'Working'
                              ? 'success'
                              : v.status === 'Maintenance'
                              ? 'warning'
                              : 'neutral'
                          }
                          label={v.status}
                        />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => openDieselFor(v.id)}>
                          <Fuel className="h-3.5 w-3.5" />
                          Diesel
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile Fleet Cards */}
          <div className="lg:hidden space-y-3">
            {filteredVehicles.map((v) => {
              const prj = db.projects.find((p) => p.id === v.assignedProjectId);
              const dieselSum = db.dieselPurchases
                .filter((d) => d.vehicleId === v.id)
                .reduce((s, d) => s + d.totalAmount, 0);
              return (
                <Card
                  key={v.id}
                  className="p-4 space-y-3 cursor-pointer"
                  onClick={() => {
                    setSelectedVehicleId(v.id);
                    setDetailTab('diesel');
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold text-[#171717]">
                        {v.registrationNumber}
                      </p>
                      <p className="text-xs text-[#52524E]">
                        {v.category} · {v.driverName} · {prj?.region}
                      </p>
                    </div>
                    <StatusText
                      tone={
                        v.status === 'Working'
                          ? 'success'
                          : v.status === 'Maintenance'
                          ? 'warning'
                          : 'neutral'
                      }
                      label={v.status}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E2DC] text-xs">
                    <span className="font-mono tabular-nums">
                      {formatNumberIN(v.currentMeterReading)} {v.meterType} · {formatINR(dieselSum)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDieselFor(v.id);
                      }}
                    >
                      Add Diesel
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Vehicle Detail SlideDrawer */}
      <SlideDrawer
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicleId(null)}
        title={selectedVehicle?.registrationNumber ?? ''}
        subtitle={
          selectedVehicle
            ? `${selectedVehicle.category} · ${selectedVehicle.makeModel} · Driver: ${selectedVehicle.driverName}`
            : ''
        }
      >
        {selectedVehicle && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => openDieselFor(selectedVehicle.id)}>
                  <Fuel className="h-3.5 w-3.5" />
                  Add Diesel
                </Button>
                <Button size="sm" variant="outline" onClick={() => openTripFor(selectedVehicle)}>
                  <Route className="h-3.5 w-3.5" />
                  Log Trip
                </Button>
                {activeRole !== 'driver' && (
                  <Button size="sm" variant="outline" onClick={() => openMaintFor(selectedVehicle)}>
                    <Wrench className="h-3.5 w-3.5" />
                    Maintenance
                  </Button>
                )}
              </div>
              {canPerformAction('edit_project') && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEditVehicle(selectedVehicle)}>
                    Edit
                  </Button>
                  <SelectField
                    value={selectedVehicle.status}
                    onValueChange={(val) =>
                      changeVehicleStatus(selectedVehicle.id, val as VehicleStatus)
                    }
                    options={[
                      { value: 'Working', label: 'Working' },
                      { value: 'Idle', label: 'Idle' },
                      { value: 'Maintenance', label: 'Maintenance' },
                    ]}
                    className="w-36"
                  />
                </div>
              )}
            </div>

            <Card className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[#52524E]">
                  {selectedVehicle.meterType === 'hours' ? 'Engine Hours' : 'Odometer'}
                </p>
                <p className="mt-1 font-mono font-semibold text-sm tabular-nums">
                  {formatNumberIN(selectedVehicle.currentMeterReading)} {selectedVehicle.meterType}
                </p>
              </div>
              <div>
                <p className="text-[#52524E]">Expected Fuel Norm</p>
                <p className="mt-1 font-mono font-medium">{selectedVehicle.expectedFuelNorm}</p>
              </div>
              <div>
                <p className="text-[#52524E]">Insurance Expiry</p>
                <p className="mt-1 font-mono">{formatDateIN(selectedVehicle.insuranceExpiry)}</p>
              </div>
              <div>
                <p className="text-[#52524E]">Fitness / Service Due</p>
                <p className="mt-1 font-mono">
                  {formatDateIN(selectedVehicle.fitnessExpiry)} / {formatDateIN(selectedVehicle.serviceDueDate)}
                </p>
              </div>
            </Card>

            <TabsBar
              value={detailTab}
              onValueChange={setDetailTab}
              tabs={[
                {
                  value: 'diesel',
                  label: 'Diesel Purchases',
                  count: db.dieselPurchases.filter((d) => d.vehicleId === selectedVehicle.id).length,
                },
                {
                  value: 'trips',
                  label: 'Trip Logs',
                  count: db.tripLogs.filter((t) => t.vehicleId === selectedVehicle.id).length,
                },
                {
                  value: 'maint',
                  label: 'Maintenance',
                  count: db.maintenanceRecords.filter((m) => m.vehicleId === selectedVehicle.id).length,
                },
              ]}
            />

            {detailTab === 'diesel' && (
              <div className="space-y-3">
                {db.dieselPurchases
                  .filter((d) => d.vehicleId === selectedVehicle.id)
                  .map((d) => (
                    <Card key={d.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold font-mono tabular-nums text-[#171717]">
                            {d.litres} L @ ₹{d.ratePerLitre}/L = {formatINR(d.totalAmount)}
                          </p>
                          <p className="text-xs text-[#52524E]">
                            {formatDateIN(d.date)} · {d.pumpOrVendor} · Slip {d.receiptRef}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusText
                            tone={
                              d.verificationStatus === 'Verified'
                                ? 'success'
                                : d.verificationStatus === 'Rejected'
                                ? 'danger'
                                : 'warning'
                            }
                            label={d.verificationStatus}
                          />
                          {d.verificationStatus === 'Pending Verification' &&
                            canPerformAction('verify_entry') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => verifyExpense(d.linkedExpenseId)}
                              >
                                Verify
                              </Button>
                            )}
                        </div>
                      </div>
                      {d.anomalyFlag && (
                        <div className="rounded-lg bg-[#FFFBEB] border border-[#D97706]/40 px-3 py-2 text-xs text-[#92400E] flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#D97706]" />
                          <span>Review Flag: {d.anomalyFlag}</span>
                        </div>
                      )}
                      {d.receiptFileName && (
                        <p className="text-[11px] text-[#245BFF]">
                          Attached receipt: {d.receiptFileName}
                        </p>
                      )}
                    </Card>
                  ))}
              </div>
            )}

            {detailTab === 'trips' && (
              <Card className="divide-y divide-[#E5E2DC]">
                {db.tripLogs
                  .filter((tr) => tr.vehicleId === selectedVehicle.id)
                  .map((tr) => (
                    <div key={tr.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#171717]">{tr.materialCarried}</p>
                        <p className="text-xs text-[#52524E]">
                          {tr.fromLocation} → {tr.toLocation} · {formatDateIN(tr.date)}
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs tabular-nums">
                        <p className="font-semibold">{tr.tripsCount} trips</p>
                        <p className="text-[#52524E]">
                          +{tr.meterDelta} {selectedVehicle.meterType}
                        </p>
                      </div>
                    </div>
                  ))}
              </Card>
            )}

            {detailTab === 'maint' && (
              <Card className="divide-y divide-[#E5E2DC]">
                {db.maintenanceRecords
                  .filter((m) => m.vehicleId === selectedVehicle.id)
                  .map((m) => (
                    <div key={m.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#171717]">{m.serviceType}</p>
                        <p className="text-sm font-mono tabular-nums font-semibold">
                          {formatINR(m.cost)}
                        </p>
                      </div>
                      <p className="text-xs text-[#52524E]">{m.description}</p>
                      <p className="text-[11px] text-[#73726C]">
                        {formatDateIN(m.date)} · {m.vendor} · {m.status}
                      </p>
                    </div>
                  ))}
              </Card>
            )}
          </>
        )}
      </SlideDrawer>

      {/* Add / Edit Vehicle Modal */}
      <DialogModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        title={editingVehicle ? 'Edit Vehicle / Machine' : 'Add Fleet Vehicle / Machine'}
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={vehicleForm.handleSubmit((vals) => {
            setFormError('');
            if (editingVehicle) {
              editVehicle(editingVehicle.id, vals);
              setVehicleModalOpen(false);
            } else {
              const res = addVehicle(vals);
              if (!res.ok) return setFormError(res.message);
              setVehicleModalOpen(false);
            }
          })}
          className="space-y-4"
        >
          {formError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/30 px-3 py-2 text-xs text-[#B91C1C]">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Registration Number</FieldLabel>
              <Input {...vehicleForm.register('registrationNumber')} className="font-mono" />
              <FieldError message={vehicleForm.formState.errors.registrationNumber?.message} />
            </div>
            <div>
              <FieldLabel required>Vehicle Category</FieldLabel>
              <SelectField
                value={vehicleForm.watch('category')}
                onValueChange={(v) => {
                  const cat = v as VehicleCategory;
                  vehicleForm.setValue('category', cat);
                  const isHour = ['JCB Excavator', 'Road Roller', 'Bitumen Sprayer'].includes(cat);
                  vehicleForm.setValue('meterType', isHour ? 'hours' : 'km');
                }}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Make & Model</FieldLabel>
              <Input {...vehicleForm.register('makeModel')} />
            </div>
            <div>
              <FieldLabel required>Assigned Project</FieldLabel>
              <SelectField
                value={vehicleForm.watch('assignedProjectId')}
                onValueChange={(v) => vehicleForm.setValue('assignedProjectId', v)}
                options={db.projects.map((p) => ({ value: p.id, label: `${p.region} · ${p.name}` }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Driver / Operator</FieldLabel>
              <Input {...vehicleForm.register('driverName')} />
            </div>
            <div>
              <FieldLabel required>Meter Unit</FieldLabel>
              <SelectField
                value={vehicleForm.watch('meterType')}
                onValueChange={(v) => vehicleForm.setValue('meterType', v as MeterType)}
                options={[
                  { value: 'km', label: 'Odometer (km)' },
                  { value: 'hours', label: 'Engine Hours (hrs)' },
                ]}
              />
            </div>
            <div>
              <FieldLabel required>Current Reading</FieldLabel>
              <Input type="number" {...vehicleForm.register('currentMeterReading', { valueAsNumber: true })} className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Insurance Expiry</FieldLabel>
              <Input type="date" {...vehicleForm.register('insuranceExpiry')} />
            </div>
            <div>
              <FieldLabel required>Fitness Expiry</FieldLabel>
              <Input type="date" {...vehicleForm.register('fitnessExpiry')} />
            </div>
            <div>
              <FieldLabel required>Service Due</FieldLabel>
              <Input type="date" {...vehicleForm.register('serviceDueDate')} />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setVehicleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Truck className="h-4 w-4" />
              Save Vehicle
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* Log Trip Modal */}
      <DialogModal open={tripModalOpen} onOpenChange={setTripModalOpen} title="Record Vehicle Trip / Work Log">
        <form
          onSubmit={tripForm.handleSubmit((vals) => {
            recordTripLog(vals);
            setTripModalOpen(false);
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Vehicle</FieldLabel>
              <SelectField
                value={tripForm.watch('vehicleId')}
                onValueChange={(val) => {
                  tripForm.setValue('vehicleId', val);
                  const veh = db.vehicles.find((v) => v.id === val);
                  if (veh) {
                    tripForm.setValue('projectId', veh.assignedProjectId);
                    tripForm.setValue('driverName', veh.driverName);
                  }
                }}
                options={db.vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.registrationNumber} · ${v.category}`,
                }))}
              />
            </div>
            <div>
              <FieldLabel required>Date</FieldLabel>
              <Input type="date" {...tripForm.register('date')} />
            </div>
          </div>
          <div>
            <FieldLabel required>Material / Work Performed</FieldLabel>
            <Input {...tripForm.register('materialCarried')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>From Location</FieldLabel>
              <Input {...tripForm.register('fromLocation')} />
            </div>
            <div>
              <FieldLabel required>To Location</FieldLabel>
              <Input {...tripForm.register('toLocation')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Trip Count</FieldLabel>
              <Input type="number" {...tripForm.register('tripsCount', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div>
              <FieldLabel required>Distance (km) or Engine Hours</FieldLabel>
              <Input type="number" {...tripForm.register('meterDelta', { valueAsNumber: true })} className="font-mono" />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setTripModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Trip Log</Button>
          </div>
        </form>
      </DialogModal>

      {/* Record Maintenance Modal */}
      <DialogModal
        open={maintModalOpen}
        onOpenChange={setMaintModalOpen}
        title="Record Vehicle Maintenance"
        description="Automatically links maintenance cost to project expenses and updates vehicle status."
      >
        <form
          onSubmit={maintForm.handleSubmit((vals) => {
            recordMaintenance(vals);
            setMaintModalOpen(false);
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Vehicle</FieldLabel>
              <SelectField
                value={maintForm.watch('vehicleId')}
                onValueChange={(val) => {
                  maintForm.setValue('vehicleId', val);
                  const veh = db.vehicles.find((v) => v.id === val);
                  if (veh) maintForm.setValue('projectId', veh.assignedProjectId);
                }}
                options={db.vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.registrationNumber} · ${v.category}`,
                }))}
              />
            </div>
            <div>
              <FieldLabel required>Service Type</FieldLabel>
              <SelectField
                value={maintForm.watch('serviceType')}
                onValueChange={(v) =>
                  maintForm.setValue(
                    'serviceType',
                    v as 'Scheduled Service' | 'Breakdown Repair' | 'Tyre & Hydraulic' | 'Inspection'
                  )
                }
                options={[
                  { value: 'Scheduled Service', label: 'Scheduled Service' },
                  { value: 'Breakdown Repair', label: 'Breakdown Repair' },
                  { value: 'Tyre & Hydraulic', label: 'Tyre & Hydraulic' },
                  { value: 'Inspection', label: 'Inspection' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel required>Work Description</FieldLabel>
            <Input {...maintForm.register('description')} placeholder="e.g. Hydraulic hose & filter replacement" />
            <FieldError message={maintForm.formState.errors.description?.message} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Cost (₹)</FieldLabel>
              <Input type="number" {...maintForm.register('cost', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div>
              <FieldLabel required>Status</FieldLabel>
              <SelectField
                value={maintForm.watch('status')}
                onValueChange={(v) => maintForm.setValue('status', v as 'Completed' | 'In Workshop')}
                options={[
                  { value: 'Completed', label: 'Completed' },
                  { value: 'In Workshop', label: 'In Workshop' },
                ]}
              />
            </div>
            <div>
              <FieldLabel required>Next Service Due</FieldLabel>
              <Input type="date" {...maintForm.register('nextServiceDate')} />
            </div>
          </div>
          <div>
            <FieldLabel required>Workshop / Vendor</FieldLabel>
            <Input {...maintForm.register('vendor')} />
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setMaintModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Maintenance</Button>
          </div>
        </form>
      </DialogModal>

      <QuickDieselModal
        open={dieselModalOpen}
        onOpenChange={setDieselModalOpen}
        defaultVehicleId={dieselDefaultVehicle}
      />
    </div>
  );
}
