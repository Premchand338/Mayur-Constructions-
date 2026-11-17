export type RoleType = 'owner' | 'supervisor' | 'office_admin' | 'accountant' | 'driver';

export type LanguageMode = 'hinglish' | 'english' | 'devanagari';

export type AppSection =
  | 'overview'
  | 'projects'
  | 'vehicles'
  | 'materials'
  | 'finance'
  | 'documents'
  | 'reports'
  | 'notifications'
  | 'activity'
  | 'settings';

export type RegionName = 'Bhiwandi' | 'Thane' | 'Palghar' | 'Jawhar' | 'Shahapur';

export interface UserProfile {
  id: string;
  name: string;
  role: RoleType;
  title: string;
  phone: string;
  assignedProjectIds: string[]; // empty means all for owner/admin/accountant
  assignedVehicleId?: string;
}

export type ProjectStatus = 'Active' | 'Mobilizing' | 'Near Completion' | 'On Hold' | 'Completed';

export interface Project {
  id: string;
  code: string;
  name: string;
  region: RegionName;
  siteLocation: string;
  department: string;
  workOrderNumber: string;
  contractValue: number;
  operationalBudget: number;
  startDate: string;
  expectedCompletionDate: string;
  managerName: string;
  status: ProjectStatus;
  physicalProgress: number; // 0-100
  measurementBookRef: string;
  retentionPercent: number;
  accountingCompleteForProfit: boolean;
}

export type RABillStatus = 'Draft' | 'Submitted' | 'Certified' | 'Partially Paid' | 'Paid';

export interface RABill {
  id: string;
  projectId: string;
  billNumber: string;
  mbReference: string;
  billDate: string;
  billedAmount: number;
  certifiedAmount: number;
  retentionDeducted: number;
  netReceivable: number;
  status: RABillStatus;
  notes?: string;
}

export interface PaymentReceipt {
  id: string;
  projectId: string;
  raBillId: string;
  date: string;
  amount: number;
  mode: 'NEFT' | 'RTGS' | 'Cheque' | 'Treasury EFT';
  referenceNumber: string;
  notes?: string;
  recordedBy: string;
}

export type VehicleCategory =
  | 'Hyva Tipper'
  | 'Dumper'
  | 'JCB Excavator'
  | 'Road Roller'
  | 'Water Tanker'
  | 'Tractor'
  | 'Bitumen Sprayer';

export type VehicleStatus = 'Working' | 'Idle' | 'Maintenance';
export type MeterType = 'km' | 'hours';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  category: VehicleCategory;
  makeModel: string;
  assignedProjectId: string;
  driverName: string;
  status: VehicleStatus;
  meterType: MeterType;
  currentMeterReading: number;
  expectedFuelNorm: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  serviceDueDate: string;
  lastLogDate: string;
}

export type VerificationStatus = 'Pending Verification' | 'Verified' | 'Rejected';

export interface DieselPurchase {
  id: string;
  vehicleId: string;
  projectId: string;
  date: string;
  litres: number;
  ratePerLitre: number;
  totalAmount: number;
  meterReading: number;
  pumpOrVendor: string;
  receiptRef: string;
  receiptFileName?: string;
  receiptDataUrl?: string;
  verificationStatus: VerificationStatus;
  anomalyFlag?: string;
  linkedExpenseId: string;
  createdBy: string;
}

export interface TripLog {
  id: string;
  vehicleId: string;
  projectId: string;
  date: string;
  materialCarried: string;
  fromLocation: string;
  toLocation: string;
  tripsCount: number;
  meterDelta: number;
  driverName: string;
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  projectId: string;
  date: string;
  serviceType: 'Scheduled Service' | 'Breakdown Repair' | 'Tyre & Hydraulic' | 'Inspection';
  description: string;
  cost: number;
  vendor: string;
  status: 'Completed' | 'In Workshop';
  nextServiceDate: string;
  linkedExpenseId: string;
}

export type MaterialCategory =
  | 'Cement'
  | 'Steel'
  | 'Sand'
  | 'Aggregate'
  | 'Bitumen'
  | 'Diesel'
  | 'Pipes & Precast'
  | 'Chemicals & Consumables';

export interface Material {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: 'Bags' | 'MT' | 'Brass' | 'Litres' | 'Units' | 'Drums';
  openingStock: number;
  receivedQty: number;
  issuedQty: number;
  transferredInQty: number;
  transferredOutQty: number;
  closingStock: number;
  purchaseRate: number;
  supplierId: string;
  storageLocation: string;
  assignedProjectId: string;
  minThreshold: number;
}

export type StockMovementType = 'inward' | 'issue' | 'transfer' | 'return' | 'adjustment';

export interface StockMovement {
  id: string;
  materialId: string;
  type: StockMovementType;
  quantity: number;
  rate: number;
  totalValue: number;
  projectId: string;
  fromLocation: string;
  toLocation: string;
  supplierId?: string;
  invoiceNumber?: string;
  linkedInvoiceId?: string;
  referenceNote: string;
  exceptionOverride?: boolean;
  date: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  city: string;
  gstin: string;
  phone: string;
  creditDays: number;
}

export type InvoiceStatus = 'Outstanding' | 'Partially Paid' | 'Paid';

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  projectId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  category: 'Material Purchase' | 'Diesel Bulk' | 'Subcontract / Equipment';
  linkedMovementId?: string;
  status: InvoiceStatus;
  reconciled: boolean;
}

export type ExpenseCategory =
  | 'Diesel'
  | 'Labour'
  | 'Maintenance'
  | 'Site Overhead'
  | 'Machinery Hire'
  | 'Material Direct';

export type FinancialStage =
  | 'Draft'
  | 'Recorded'
  | 'Verified'
  | 'Invoice Outstanding'
  | 'Payment Completed'
  | 'Reconciled'
  | 'Rejected';

export interface FinancialTransaction {
  id: string;
  projectId: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  stage: FinancialStage;
  sourceType: 'manual' | 'diesel' | 'maintenance' | 'tally_import';
  sourceId?: string;
  vendorOrPayee: string;
  billRef: string;
  billFileName?: string;
  billDataUrl?: string;
  createdBy: string;
  verifiedBy?: string;
  approvedBy?: string;
  paymentMode?: 'Cash' | 'UPI' | 'NEFT' | 'Cheque' | 'Petro Card';
  paymentRef?: string;
  paymentDate?: string;
  rejectionReason?: string;
}

export type DocumentCategory =
  | 'Government Tenders'
  | 'Work Orders'
  | 'RA Bills'
  | 'Supplier Invoices'
  | 'Material Challans'
  | 'Vehicle Documents'
  | 'Insurance'
  | 'Permits'
  | 'Contracts'
  | 'Site Reports';

export type DocumentStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Under Review';

export interface DocumentHistoryEntry {
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  note: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  projectId?: string;
  vehicleId?: string;
  expiryDate?: string;
  status: DocumentStatus;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  dataUrl?: string;
  description: string;
  uploadHistory: DocumentHistoryEntry[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: RoleType;
  module: AppSection | 'approvals';
  action: string;
  summary: string;
  entityId?: string;
  projectId?: string;
}

export interface DemoDatabase {
  version: number;
  lastUpdated: string;
  users: UserProfile[];
  projects: Project[];
  raBills: RABill[];
  paymentReceipts: PaymentReceipt[];
  vehicles: Vehicle[];
  dieselPurchases: DieselPurchase[];
  tripLogs: TripLog[];
  maintenanceRecords: MaintenanceRecord[];
  materials: Material[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  transactions: FinancialTransaction[];
  documents: DocumentItem[];
  activityLogs: ActivityLog[];
}
