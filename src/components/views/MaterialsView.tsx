import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Plus,
  Search,
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
import { formatDateIN, formatINR, formatINRCompact, formatNumberIN } from '@/src/lib/formatters';
import { useDemoStore } from '@/src/store/demoStore';
import { MaterialCategory, StockMovementType } from '@/src/types/domain';

const CATEGORIES: MaterialCategory[] = [
  'Cement',
  'Steel',
  'Sand',
  'Aggregate',
  'Bitumen',
  'Diesel',
  'Pipes & Precast',
  'Chemicals & Consumables',
];

const UNITS = ['Bags', 'MT', 'Brass', 'Litres', 'Units', 'Drums'] as const;

const YARDS = [
  'Bhiwandi Central Yard',
  'Thane Site Store',
  'Palghar Depot',
  'Jawhar Camp',
  'Shahapur Plant',
  'Bhiwandi Logistics Store',
];

const addMaterialSchema = z.object({
  code: z.string().min(3, 'Enter material code'),
  name: z.string().min(3, 'Enter material name'),
  category: z.enum([
    'Cement',
    'Steel',
    'Sand',
    'Aggregate',
    'Bitumen',
    'Diesel',
    'Pipes & Precast',
    'Chemicals & Consumables',
  ]),
  unit: z.enum(UNITS),
  openingStock: z.number({ message: 'Enter valid stock' }).min(0),
  purchaseRate: z.number({ message: 'Enter valid rate' }).positive(),
  supplierId: z.string().min(1),
  storageLocation: z.string().min(2),
  assignedProjectId: z.string().min(1),
  minThreshold: z.number({ message: 'Enter valid threshold' }).min(0),
});

export function MaterialsView() {
  const {
    db,
    globalProjectFilter,
    canPerformAction,
    addMaterial,
    recordStockMovement,
  } = useDemoStore();

  const [tab, setTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [yardFilter, setYardFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);

  // Movement form state (controlled for crisp cross-field UX)
  const [movMaterialId, setMovMaterialId] = useState(db.materials[0]?.id ?? '');
  const [movType, setMovType] = useState<StockMovementType>('inward');
  const [movQty, setMovQty] = useState<number>(50);
  const [movRate, setMovRate] = useState<number>(db.materials[0]?.purchaseRate ?? 0);
  const [movProjectId, setMovProjectId] = useState(db.projects[0]?.id ?? '');
  const [movFromLoc, setMovFromLoc] = useState(YARDS[0]);
  const [movToLoc, setMovToLoc] = useState(YARDS[1]);
  const [movSupplierId, setMovSupplierId] = useState(db.suppliers[0]?.id ?? '');
  const [movInvoiceNo, setMovInvoiceNo] = useState('');
  const [movDate, setMovDate] = useState('2026-11-16');
  const [movNote, setMovNote] = useState('');
  const [movException, setMovException] = useState(false);
  const [movError, setMovError] = useState('');

  const addForm = useForm<z.infer<typeof addMaterialSchema>>({
    resolver: zodResolver(addMaterialSchema),
    defaultValues: {
      code: `MAT-${Math.floor(100 + Math.random() * 899)}`,
      name: '',
      category: 'Cement',
      unit: 'Bags',
      openingStock: 100,
      purchaseRate: 390,
      supplierId: db.suppliers[0]?.id ?? '',
      storageLocation: YARDS[0],
      assignedProjectId: db.projects[0]?.id ?? '',
      minThreshold: 50,
    },
  });

  const filteredMaterials = useMemo(() => {
    return db.materials.filter((m) => {
      if (globalProjectFilter !== 'ALL' && m.assignedProjectId !== globalProjectFilter) return false;
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;
      if (yardFilter !== 'ALL' && m.storageLocation !== yardFilter) return false;
      if (lowStockOnly && m.closingStock > m.minThreshold) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.storageLocation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.materials, globalProjectFilter, categoryFilter, yardFilter, lowStockOnly, search]);

  const stats = useMemo(() => {
    const totalValuation = filteredMaterials.reduce(
      (sum, m) => sum + Math.max(0, m.closingStock) * m.purchaseRate,
      0
    );
    const lowCount = filteredMaterials.filter((m) => m.closingStock <= m.minThreshold).length;
    return {
      totalValuation,
      lowCount,
      itemCount: filteredMaterials.length,
      movementCount: db.stockMovements.length,
    };
  }, [filteredMaterials, db.stockMovements.length]);

  const selectedMaterial = db.materials.find((m) => m.id === selectedMaterialId) ?? null;

  const openMovementModal = (type: StockMovementType, materialId?: string) => {
    const targetMat = db.materials.find((m) => m.id === materialId) ?? filteredMaterials[0] ?? db.materials[0];
    setMovMaterialId(targetMat.id);
    setMovType(type);
    setMovQty(type === 'inward' ? 100 : 25);
    setMovRate(targetMat.purchaseRate);
    setMovProjectId(targetMat.assignedProjectId);
    setMovFromLoc(
      type === 'inward'
        ? db.suppliers.find((s) => s.id === targetMat.supplierId)?.name ?? 'Supplier'
        : targetMat.storageLocation
    );
    setMovToLoc(
      type === 'transfer'
        ? YARDS.find((y) => y !== targetMat.storageLocation) ?? YARDS[1]
        : type === 'issue'
        ? 'Site Chainage Work'
        : targetMat.storageLocation
    );
    setMovSupplierId(targetMat.supplierId);
    setMovInvoiceNo(type === 'inward' ? `CH-${Math.floor(1000 + Math.random() * 8999)}` : '');
    setMovDate('2026-11-16');
    setMovNote('');
    setMovException(false);
    setMovError('');
    setMovementOpen(true);
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMovError('');
    if (!movNote.trim()) {
      setMovError('Please enter a short reference note for the audit log.');
      return;
    }
    const res = recordStockMovement({
      materialId: movMaterialId,
      type: movType,
      quantity: movQty,
      rate: movRate,
      projectId: movProjectId,
      fromLocation: movFromLoc,
      toLocation: movToLoc,
      supplierId: movType === 'inward' ? movSupplierId : undefined,
      invoiceNumber: movType === 'inward' ? movInvoiceNo : undefined,
      referenceNote: movNote,
      date: movDate,
      exceptionOverride: movException,
    });
    if (!res.ok) {
      setMovError(res.message);
      return;
    }
    setMovementOpen(false);
  };

  const activeMovMaterial = db.materials.find((m) => m.id === movMaterialId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">माल / स्टॉक · Raw Material Inventory</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
            Materials, Yards & Stock Movements
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canPerformAction('manage_materials') && (
            <>
              <Button variant="outline" onClick={() => openMovementModal('transfer')}>
                <ArrowLeftRight className="h-4 w-4" />
                Site Transfer
              </Button>
              <Button variant="outline" onClick={() => openMovementModal('issue')}>
                <ArrowUpFromLine className="h-4 w-4" />
                Issue to Site
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Material
              </Button>
              <Button onClick={() => openMovementModal('inward')}>
                <ArrowDownToLine className="h-4 w-4" />
                Purchase / Inward
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[#52524E]">Closing Stock Valuation</p>
          <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#171717]">
            {formatINRCompact(stats.totalValuation)}
          </p>
          <p className="mt-1 text-xs text-[#52524E]">Across {stats.itemCount} tracked materials</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#52524E]">Low Stock Alerts</p>
          <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#B45309]">
            {stats.lowCount} Items Low
          </p>
          <p className="mt-1 text-xs text-[#52524E]">At or below minimum yard threshold</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#52524E]">Logged Movements</p>
          <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#171717]">
            {stats.movementCount} Entries
          </p>
          <p className="mt-1 text-xs text-[#52524E]">Every inward, issue & transfer audited</p>
        </Card>
        <Card className="p-4 bg-[#FAF9F6]">
          <p className="text-xs font-medium text-[#171717]">No Double Counting Rule</p>
          <p className="mt-1 text-[11px] text-[#52524E] leading-relaxed">
            Purchases create inward stock + supplier payable. Transfers move stock between sites without counting as consumption.
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsBar
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'stock', label: 'Current Stock Ledger', count: filteredMaterials.length },
            { value: 'history', label: 'Movement Audit History', count: db.stockMovements.length },
          ]}
        />
      </div>

      {tab === 'stock' && (
        <>
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 relative">
                <Search className="h-4 w-4 text-[#73726C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cement, bitumen, steel, yard..."
                  className="pl-10"
                />
              </div>
              <div className="md:col-span-3">
                <SelectField
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
              <div className="md:col-span-3">
                <SelectField
                  value={yardFilter}
                  onValueChange={setYardFilter}
                  options={[
                    { value: 'ALL', label: 'All Storage Yards' },
                    ...YARDS.map((y) => ({ value: y, label: y })),
                  ]}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Button
                  variant={lowStockOnly ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => setLowStockOnly((v) => !v)}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Low Stock ({stats.lowCount})
                </Button>
              </div>
            </div>
          </Card>

          {filteredMaterials.length === 0 ? (
            <EmptyState
              title="No materials match your filter"
              description="Reset filters or add a new road construction material."
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                    <th className="py-3 px-4">Material & Yard</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Opening / Inward</th>
                    <th className="py-3 px-4 text-right">Issued / Transferred</th>
                    <th className="py-3 px-4 text-right">Closing Stock</th>
                    <th className="py-3 px-4 text-right">Valuation</th>
                    <th className="py-3 px-4">Stock Health</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC] text-sm">
                  {filteredMaterials.map((m) => {
                    const isLow = m.closingStock <= m.minThreshold;
                    const valuation = Math.max(0, m.closingStock) * m.purchaseRate;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMaterialId(m.id)}
                        className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#171717]">{m.name}</p>
                          <p className="text-xs text-[#52524E]">
                            <span className="font-mono">{m.code}</span> · {m.storageLocation}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#52524E]">{m.category}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#52524E]">
                          {formatNumberIN(m.openingStock)} / +{formatNumberIN(m.receivedQty)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#52524E]">
                          -{formatNumberIN(m.issuedQty)} / {formatNumberIN(m.transferredOutQty)}T
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#171717]">
                          {formatNumberIN(m.closingStock)} {m.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                          <p className="font-semibold text-[#171717]">{formatINR(valuation)}</p>
                          <p className="text-[#73726C]">@ {formatINR(m.purchaseRate)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <StatusText
                            tone={isLow ? 'warning' : 'success'}
                            label={isLow ? `Low (Min ${m.minThreshold})` : 'Healthy'}
                          />
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {canPerformAction('manage_materials') && (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMovementModal('inward', m.id)}
                              >
                                Inward
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMovementModal('issue', m.id)}
                              >
                                Issue
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {tab === 'history' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[11px] font-semibold text-[#52524E]">
                <th className="py-3 px-4">Date & Type</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Route (From → To)</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Value</th>
                <th className="py-3 px-4">Audit Note & Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] text-sm">
              {db.stockMovements.map((mov) => {
                const mat = db.materials.find((m) => m.id === mov.materialId);
                return (
                  <tr key={mov.id} className="hover:bg-[#FAF9F6]">
                    <td className="py-3 px-4 text-xs">
                      <p className="font-mono text-[#171717]">{formatDateIN(mov.date)}</p>
                      <StatusText
                        tone={
                          mov.type === 'inward'
                            ? 'success'
                            : mov.type === 'transfer'
                            ? 'info'
                            : mov.type === 'issue'
                            ? 'warning'
                            : 'neutral'
                        }
                        label={mov.type.toUpperCase()}
                      />
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-[#171717]">
                      {mat?.name ?? mov.materialId}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#52524E]">
                      {mov.fromLocation} → {mov.toLocation}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold">
                      {formatNumberIN(mov.quantity)} {mat?.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {formatINR(mov.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#52524E]">
                      <p className="text-[#171717]">{mov.referenceNote}</p>
                      <p className="text-[11px]">By {mov.createdBy}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Material Detail Drawer */}
      <SlideDrawer
        open={!!selectedMaterial}
        onOpenChange={(open) => !open && setSelectedMaterialId(null)}
        title={selectedMaterial?.name ?? ''}
        subtitle={
          selectedMaterial
            ? `${selectedMaterial.code} · ${selectedMaterial.storageLocation} · Threshold: ${selectedMaterial.minThreshold} ${selectedMaterial.unit}`
            : ''
        }
      >
        {selectedMaterial && (
          <div className="space-y-5">
            <Card className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[#52524E]">Closing Balance</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums">
                  {formatNumberIN(selectedMaterial.closingStock)} {selectedMaterial.unit}
                </p>
              </div>
              <div>
                <p className="text-[#52524E]">Valuation</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums">
                  {formatINR(selectedMaterial.closingStock * selectedMaterial.purchaseRate)}
                </p>
              </div>
              <div>
                <p className="text-[#52524E]">Issued (Consumption)</p>
                <p className="mt-1 text-base font-mono tabular-nums">
                  {formatNumberIN(selectedMaterial.issuedQty)} {selectedMaterial.unit}
                </p>
              </div>
              <div>
                <p className="text-[#52524E]">Transferred Out</p>
                <p className="mt-1 text-base font-mono tabular-nums">
                  {formatNumberIN(selectedMaterial.transferredOutQty)} {selectedMaterial.unit}
                </p>
              </div>
            </Card>

            {canPerformAction('manage_materials') && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openMovementModal('inward', selectedMaterial.id)}>
                  Purchase / Inward
                </Button>
                <Button size="sm" variant="outline" onClick={() => openMovementModal('issue', selectedMaterial.id)}>
                  Issue to Site
                </Button>
                <Button size="sm" variant="outline" onClick={() => openMovementModal('transfer', selectedMaterial.id)}>
                  Transfer Site
                </Button>
                <Button size="sm" variant="outline" onClick={() => openMovementModal('return', selectedMaterial.id)}>
                  Material Return
                </Button>
              </div>
            )}

            <Card className="divide-y divide-[#E5E2DC]">
              <div className="px-4 py-3 bg-[#FAF9F6] text-xs font-semibold text-[#52524E]">
                Audit Trail for This Material
              </div>
              {db.stockMovements
                .filter((mov) => mov.materialId === selectedMaterial.id)
                .map((mov) => (
                  <div key={mov.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-[#171717]">
                        {mov.type.toUpperCase()} · {mov.fromLocation} → {mov.toLocation}
                      </p>
                      <p className="text-[#52524E] mt-0.5">
                        {formatDateIN(mov.date)} · {mov.referenceNote} · By {mov.createdBy}
                      </p>
                    </div>
                    <p className="font-mono tabular-nums font-semibold">
                      {mov.quantity} {selectedMaterial.unit}
                    </p>
                  </div>
                ))}
            </Card>
          </div>
        )}
      </SlideDrawer>

      {/* Stock Movement Modal */}
      <DialogModal
        open={movementOpen}
        onOpenChange={setMovementOpen}
        title={
          movType === 'inward'
            ? 'Record Material Purchase / Inward'
            : movType === 'issue'
            ? 'Issue Material to Project Site'
            : movType === 'transfer'
            ? 'Transfer Stock Between Yards / Sites'
            : movType === 'return'
            ? 'Record Material Return to Yard'
            : 'Authorized Stock Adjustment'
        }
        description={
          movType === 'inward'
            ? 'Increases closing stock and links a Supplier Invoice payable (no double counting).'
            : movType === 'transfer'
            ? 'Transfers do NOT count as site consumption.'
            : 'All stock movements generate an immutable audit entry.'
        }
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleMovementSubmit} className="space-y-4">
          {movError && (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#B91C1C]">
              {movError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Movement Type</FieldLabel>
              <SelectField
                value={movType}
                onValueChange={(v) => setMovType(v as StockMovementType)}
                options={[
                  { value: 'inward', label: 'Purchase / Inward' },
                  { value: 'issue', label: 'Issue to Site (Consumption)' },
                  { value: 'transfer', label: 'Transfer Between Sites' },
                  { value: 'return', label: 'Site Return to Yard' },
                  { value: 'adjustment', label: 'Authorized Stock Adjustment' },
                ]}
              />
            </div>

            <div>
              <FieldLabel required>Material</FieldLabel>
              <SelectField
                value={movMaterialId}
                onValueChange={(val) => {
                  setMovMaterialId(val);
                  const mat = db.materials.find((m) => m.id === val);
                  if (mat) {
                    setMovRate(mat.purchaseRate);
                    setMovProjectId(mat.assignedProjectId);
                  }
                }}
                options={db.materials.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.closingStock} ${m.unit})`,
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel
                required
                hint={
                  activeMovMaterial
                    ? `Avail: ${activeMovMaterial.closingStock} ${activeMovMaterial.unit}`
                    : undefined
                }
              >
                Quantity ({activeMovMaterial?.unit})
              </FieldLabel>
              <Input
                type="number"
                step="0.5"
                value={movQty}
                onChange={(e) => setMovQty(Number(e.target.value))}
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <FieldLabel required>Rate (₹ / {activeMovMaterial?.unit})</FieldLabel>
              <Input
                type="number"
                value={movRate}
                onChange={(e) => setMovRate(Number(e.target.value))}
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <FieldLabel required>Date</FieldLabel>
              <Input type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Project / Site</FieldLabel>
              <SelectField
                value={movProjectId}
                onValueChange={setMovProjectId}
                options={db.projects.map((p) => ({ value: p.id, label: `${p.region} · ${p.name}` }))}
              />
            </div>
            <div>
              <FieldLabel>Calculated Value</FieldLabel>
              <div className="min-h-[44px] flex items-center px-3.5 rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] font-mono font-semibold tabular-nums text-sm">
                {formatINR(movQty * movRate)}
              </div>
            </div>
          </div>

          {movType === 'inward' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Supplier</FieldLabel>
                <SelectField
                  value={movSupplierId}
                  onValueChange={setMovSupplierId}
                  options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
              <div>
                <FieldLabel required>Supplier Invoice / Challan No.</FieldLabel>
                <Input
                  value={movInvoiceNo}
                  onChange={(e) => setMovInvoiceNo(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>From Location</FieldLabel>
              <Input value={movFromLoc} onChange={(e) => setMovFromLoc(e.target.value)} />
            </div>
            <div>
              <FieldLabel required>To Location</FieldLabel>
              <Input value={movToLoc} onChange={(e) => setMovToLoc(e.target.value)} />
            </div>
          </div>

          <div>
            <FieldLabel required>Reference / Audit Note</FieldLabel>
            <Input
              value={movNote}
              onChange={(e) => setMovNote(e.target.value)}
              placeholder="e.g. Issued for Box Culvert slab concrete Chainage 18+500"
            />
          </div>

          {(movType === 'issue' || movType === 'transfer') &&
            activeMovMaterial &&
            activeMovMaterial.closingStock - movQty < 0 && (
              <label className="flex items-start gap-2.5 rounded-xl border border-[#D97706]/40 bg-[#FFFBEB] p-3 text-xs text-[#92400E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={movException}
                  onChange={(e) => setMovException(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Stock is short by {Math.abs(activeMovMaterial.closingStock - movQty)}{' '}
                  {activeMovMaterial.unit}. Check to confirm an explicit supervisor exception override
                  (pending physical yard reconciliation).
                </span>
              </label>
            )}

          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Stock Movement</Button>
          </div>
        </form>
      </DialogModal>

      {/* Add Material Modal */}
      <DialogModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add New Construction Material"
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={addForm.handleSubmit((vals) => {
            const res = addMaterial(vals);
            if (res.ok) {
              setAddOpen(false);
              addForm.reset();
            }
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Code</FieldLabel>
              <Input {...addForm.register('code')} className="font-mono" />
              <FieldError message={addForm.formState.errors.code?.message} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Material Name</FieldLabel>
              <Input {...addForm.register('name')} placeholder="e.g. Polymer Modified Bitumen PMB-40" />
              <FieldError message={addForm.formState.errors.name?.message} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Category</FieldLabel>
              <SelectField
                value={addForm.watch('category')}
                onValueChange={(v) => addForm.setValue('category', v as MaterialCategory)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <FieldLabel required>Unit</FieldLabel>
              <SelectField
                value={addForm.watch('unit')}
                onValueChange={(v) => addForm.setValue('unit', v as (typeof UNITS)[number])}
                options={UNITS.map((u) => ({ value: u, label: u }))}
              />
            </div>
            <div>
              <FieldLabel required>Opening Stock</FieldLabel>
              <Input type="number" {...addForm.register('openingStock', { valueAsNumber: true })} className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Purchase Rate (₹)</FieldLabel>
              <Input type="number" {...addForm.register('purchaseRate', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div>
              <FieldLabel required>Min Threshold</FieldLabel>
              <Input type="number" {...addForm.register('minThreshold', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div>
              <FieldLabel required>Storage Yard</FieldLabel>
              <SelectField
                value={addForm.watch('storageLocation')}
                onValueChange={(v) => addForm.setValue('storageLocation', v)}
                options={YARDS.map((y) => ({ value: y, label: y }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Primary Supplier</FieldLabel>
              <SelectField
                value={addForm.watch('supplierId')}
                onValueChange={(v) => addForm.setValue('supplierId', v)}
                options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div>
              <FieldLabel required>Assigned Project</FieldLabel>
              <SelectField
                value={addForm.watch('assignedProjectId')}
                onValueChange={(v) => addForm.setValue('assignedProjectId', v)}
                options={db.projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Package className="h-4 w-4" />
              Save Material
            </Button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}
