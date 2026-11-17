import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Fuel, Upload } from 'lucide-react';
import {
  Button,
  DialogModal,
  FieldError,
  FieldLabel,
  Input,
  SelectField,
} from '@/src/components/ui/primitives';
import { formatINR, formatNumberIN } from '@/src/lib/formatters';
import { t } from '@/src/lib/i18n';
import { useDemoStore } from '@/src/store/demoStore';

const dieselSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  projectId: z.string().min(1, 'Select a project site'),
  date: z.string().min(1, 'Enter date'),
  litres: z.number({ message: 'Enter valid litres' }).positive('Litres must be > 0').max(1500, 'Max 1,500L per single entry'),
  ratePerLitre: z.number({ message: 'Enter valid diesel rate' }).min(70, 'Enter valid diesel rate').max(130, 'Check diesel rate'),
  meterReading: z.number({ message: 'Enter valid meter reading' }).min(0, 'Enter valid meter reading'),
  pumpOrVendor: z.string().min(2, 'Enter pump or vendor name'),
  receiptRef: z.string().min(2, 'Enter receipt or slip number'),
});

type DieselFormValues = z.infer<typeof dieselSchema>;

export function QuickDieselModal({
  open,
  onOpenChange,
  defaultVehicleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVehicleId?: string;
}) {
  const { db, language, currentUser, recordDieselPurchase, getVisibleProjects } = useDemoStore();
  const visibleProjects = getVisibleProjects();
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  const availableVehicles =
    currentUser.assignedVehicleId
      ? db.vehicles.filter((v) => v.id === currentUser.assignedVehicleId)
      : db.vehicles;

  const initialVehicle =
    availableVehicles.find((v) => v.id === defaultVehicleId) ?? availableVehicles[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DieselFormValues>({
    resolver: zodResolver(dieselSchema),
    defaultValues: {
      vehicleId: initialVehicle?.id ?? '',
      projectId: initialVehicle?.assignedProjectId ?? visibleProjects[0]?.id ?? '',
      date: '2026-11-16',
      litres: 150,
      ratePerLitre: 94.2,
      meterReading: initialVehicle?.currentMeterReading ?? 0,
      pumpOrVendor: 'Bhiwandi Highway BPCL',
      receiptRef: `BPCL-${Math.floor(1000 + Math.random() * 8999)}`,
    },
  });

  useEffect(() => {
    if (open) {
      const veh =
        availableVehicles.find((v) => v.id === defaultVehicleId) ?? availableVehicles[0];
      reset({
        vehicleId: veh?.id ?? '',
        projectId: veh?.assignedProjectId ?? visibleProjects[0]?.id ?? '',
        date: '2026-11-16',
        litres: 150,
        ratePerLitre: 94.2,
        meterReading: veh?.currentMeterReading ?? 0,
        pumpOrVendor: 'Bhiwandi Highway BPCL',
        receiptRef: `BPCL-${Math.floor(1000 + Math.random() * 8999)}`,
      });
      setReceiptFileName('');
      setReceiptDataUrl('');
      setSubmitError('');
    }
  }, [open, defaultVehicleId]);

  const selectedVehicleId = watch('vehicleId');
  const selectedProjectId = watch('projectId');
  const litres = Number(watch('litres')) || 0;
  const rate = Number(watch('ratePerLitre')) || 0;
  const totalAmount = Math.round(litres * rate);
  const selectedVehicle = db.vehicles.find((v) => v.id === selectedVehicleId);

  const handleVehicleChange = (vehId: string) => {
    setValue('vehicleId', vehId);
    const veh = db.vehicles.find((v) => v.id === vehId);
    if (veh) {
      setValue('projectId', veh.assignedProjectId);
      setValue('meterReading', veh.currentMeterReading);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSubmitError('Receipt file must be under 2 MB for browser demo storage.');
      return;
    }
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: DieselFormValues) => {
    setSubmitError('');
    const res = recordDieselPurchase({
      vehicleId: values.vehicleId,
      projectId: values.projectId,
      date: values.date,
      litres: values.litres,
      ratePerLitre: values.ratePerLitre,
      meterReading: values.meterReading,
      pumpOrVendor: values.pumpOrVendor,
      receiptRef: values.receiptRef,
      receiptFileName: receiptFileName || undefined,
      receiptDataUrl: receiptDataUrl || undefined,
    });
    if (!res.ok) {
      setSubmitError(res.message);
      return;
    }
    onOpenChange(false);
  };

  return (
    <DialogModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('addDiesel', language)}
      description="Vehicle → Site → Date → Litres → Rate → Auto Total → Receipt. Creates a pending verification expense linked to the project."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
          <div className="rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#B91C1C]">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Vehicle / Machine</FieldLabel>
            <SelectField
              value={selectedVehicleId}
              onValueChange={handleVehicleChange}
              options={availableVehicles.map((v) => ({
                value: v.id,
                label: `${v.registrationNumber} · ${v.category}`,
              }))}
            />
            <FieldError message={errors.vehicleId?.message} />
          </div>

          <div>
            <FieldLabel required>Assigned Project / Site</FieldLabel>
            <SelectField
              value={selectedProjectId}
              onValueChange={(val) => setValue('projectId', val)}
              options={db.projects.map((p) => ({
                value: p.id,
                label: `${p.region} · ${p.name}`,
              }))}
            />
            <FieldError message={errors.projectId?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel htmlFor="diesel-date" required>
              Date
            </FieldLabel>
            <Input id="diesel-date" type="date" {...register('date')} />
            <FieldError message={errors.date?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="diesel-litres" required>
              Litres
            </FieldLabel>
            <Input
              id="diesel-litres"
              type="number"
              step="0.5"
              {...register('litres', { valueAsNumber: true })}
              className="font-mono tabular-nums"
            />
            <FieldError message={errors.litres?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="diesel-rate" required>
              Rate (₹/L)
            </FieldLabel>
            <Input
              id="diesel-rate"
              type="number"
              step="0.1"
              {...register('ratePerLitre', { valueAsNumber: true })}
              className="font-mono tabular-nums"
            />
            <FieldError message={errors.ratePerLitre?.message} />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Fuel className="h-4 w-4 text-[#245BFF]" />
            <div>
              <p className="text-xs font-medium text-[#171717]">Calculated Total Amount</p>
              <p className="text-[11px] text-[#52524E]">
                Recorded as diesel purchased (separate from actual consumption)
              </p>
            </div>
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-[#171717]">
            {formatINR(totalAmount)}
          </p>
        </div>

        {litres > 230 && (
          <div className="rounded-xl border border-[#D97706]/40 bg-[#FFFBEB] p-3 flex items-start gap-2.5 text-xs text-[#92400E]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#D97706]" />
            <span>
              Notice: {litres}L exceeds typical 180L–220L tank refill range. Entry will be saved and
              flagged for Office Admin verification.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel
              htmlFor="diesel-meter"
              required
              hint={
                selectedVehicle
                  ? `Last: ${formatNumberIN(selectedVehicle.currentMeterReading)} ${selectedVehicle.meterType}`
                  : undefined
              }
            >
              {selectedVehicle?.meterType === 'hours' ? 'Engine Hours Reading' : 'Odometer (km)'}
            </FieldLabel>
            <Input
              id="diesel-meter"
              type="number"
              {...register('meterReading', { valueAsNumber: true })}
              className="font-mono tabular-nums"
            />
            <FieldError message={errors.meterReading?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="diesel-ref" required>
              Pump Slip / Receipt No.
            </FieldLabel>
            <Input id="diesel-ref" {...register('receiptRef')} className="font-mono" />
            <FieldError message={errors.receiptRef?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="diesel-pump" required>
              Fuel Station / Vendor
            </FieldLabel>
            <Input id="diesel-pump" {...register('pumpOrVendor')} />
            <FieldError message={errors.pumpOrVendor?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="diesel-file" hint="Optional PDF/Image ≤ 2MB">
              Upload Pump Receipt
            </FieldLabel>
            <label
              htmlFor="diesel-file"
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-dashed border-[#D8D4CB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#52524E] cursor-pointer hover:bg-[#F3F1EC]"
            >
              <span className="truncate">{receiptFileName || 'Attach slip photo or PDF'}</span>
              <Upload className="h-4 w-4 shrink-0 text-[#245BFF]" />
            </label>
            <input
              id="diesel-file"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E2DC]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('saveEntry', language)}
          </Button>
        </div>
      </form>
    </DialogModal>
  );
}
