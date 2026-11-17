import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import {
  Button,
  Card,
  DialogModal,
  EmptyState,
  FieldLabel,
  Input,
  SelectField,
  StatusText,
  Textarea,
} from '@/src/components/ui/primitives';
import { daysUntil, formatDateIN } from '@/src/lib/formatters';
import { useDemoStore } from '@/src/store/demoStore';
import { DocumentCategory, DocumentItem } from '@/src/types/domain';

const DOC_CATEGORIES: DocumentCategory[] = [
  'Government Tenders',
  'Work Orders',
  'RA Bills',
  'Supplier Invoices',
  'Material Challans',
  'Vehicle Documents',
  'Insurance',
  'Permits',
  'Contracts',
  'Site Reports',
];

export function DocumentsView() {
  const {
    db,
    globalProjectFilter,
    canPerformAction,
    uploadDocument,
    updateDocumentStatus,
  } = useDemoStore();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expiringOnly, setExpiringOnly] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Work Orders');
  const [projectId, setProjectId] = useState(db.projects[0]?.id ?? '');
  const [vehicleId, setVehicleId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');
  const [fileMeta, setFileMeta] = useState<{
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    dataUrl?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');

  const filteredDocs = useMemo(() => {
    return db.documents.filter((d) => {
      if (globalProjectFilter !== 'ALL' && d.projectId && d.projectId !== globalProjectFilter) {
        return false;
      }
      if (catFilter !== 'ALL' && d.category !== catFilter) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (expiringOnly && d.status !== 'Expiring Soon' && d.status !== 'Expired') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.fileName.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.documents, globalProjectFilter, catFilter, statusFilter, expiringOnly, search]);

  const expiryAlerts = useMemo(
    () => db.documents.filter((d) => d.status === 'Expiring Soon' || d.status === 'Expired').length,
    [db.documents]
  );

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF and image files (JPG, PNG, WEBP) are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File exceeds 2 MB browser demo limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileMeta({
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSizeBytes: file.size,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    if (!title.trim() || !description.trim()) {
      setUploadError('Please enter both document title and description.');
      return;
    }
    const chosenFile = fileMeta ?? {
      fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`,
      fileType: 'application/pdf',
      fileSizeBytes: 245000,
    };

    const res = uploadDocument({
      title: title.trim(),
      category,
      projectId: projectId || undefined,
      vehicleId: vehicleId || undefined,
      expiryDate: expiryDate || undefined,
      description: description.trim(),
      fileName: chosenFile.fileName,
      fileType: chosenFile.fileType,
      fileSizeBytes: chosenFile.fileSizeBytes,
      dataUrl: chosenFile.dataUrl,
    });
    if (res.ok) {
      setUploadOpen(false);
      setTitle('');
      setDescription('');
      setExpiryDate('');
      setFileMeta(null);
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    if (doc.dataUrl) {
      const link = document.createElement('a');
      link.href = doc.dataUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    // Honest demo summary file download for pre-seeded fictional records
    const summaryText = [
      `MAYUR CONSTRUCTIONS — DEMONSTRATION DOCUMENT RECORD`,
      `====================================================`,
      `Title: ${doc.title}`,
      `Category: ${doc.category}`,
      `Version: ${doc.version}`,
      `Status: ${doc.status}`,
      `Uploaded By: ${doc.uploadedBy} on ${doc.uploadedAt}`,
      `Expiry Date: ${doc.expiryDate ?? 'Not applicable'}`,
      `Description: ${doc.description}`,
      ``,
      `Note: Fictional demo metadata placeholder. Upload a real PDF/Image to store and download binary files locally.`,
    ].join('\n');
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.fileName.replace(/\.pdf$/i, '_demo_summary.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#52524E]">दस्तावेज़ · Document & Compliance Center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
            Tenders, Work Orders, Permits & Invoices
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant={expiringOnly ? 'primary' : 'outline'}
            onClick={() => setExpiringOnly((v) => !v)}
          >
            <AlertTriangle className="h-4 w-4" />
            Expiry Reminders ({expiryAlerts})
          </Button>
          {canPerformAction('upload_doc') && (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="h-4 w-4 text-[#73726C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tender, work order, vehicle RC, challan..."
              className="pl-10"
            />
          </div>
          <div className="md:col-span-4">
            <SelectField
              value={catFilter}
              onValueChange={setCatFilter}
              options={[
                { value: 'ALL', label: 'All 10 Categories' },
                ...DOC_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          <div className="md:col-span-3">
            <SelectField
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Expiring Soon', label: 'Expiring Soon' },
                { value: 'Expired', label: 'Expired' },
                { value: 'Under Review', label: 'Under Review' },
              ]}
            />
          </div>
        </div>
      </Card>

      {filteredDocs.length === 0 ? (
        <EmptyState
          title="No documents match your filters"
          description="Clear category or expiry filters to browse all tenders, bills, and permits."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const prj = db.projects.find((p) => p.id === doc.projectId);
            const veh = db.vehicles.find((v) => v.id === doc.vehicleId);
            const daysLeft = daysUntil(doc.expiryDate);

            return (
              <Card key={doc.id} className="p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-[#52524E]">
                      {doc.category} · {doc.version}
                    </span>
                    <StatusText
                      tone={
                        doc.status === 'Active'
                          ? 'success'
                          : doc.status === 'Expired'
                          ? 'danger'
                          : 'warning'
                      }
                      label={doc.status}
                    />
                  </div>

                  <h2 className="mt-1.5 text-base font-semibold text-[#171717]">{doc.title}</h2>
                  <p className="mt-1 text-xs text-[#52524E] line-clamp-2">{doc.description}</p>

                  <div className="mt-3 space-y-1 text-xs text-[#52524E]">
                    {prj && <p>Project: {prj.region} · {prj.code}</p>}
                    {veh && <p>Vehicle: <span className="font-mono">{veh.registrationNumber}</span></p>}
                    <p className="font-mono text-[11px] truncate">
                      {doc.fileName} ({Math.round(doc.fileSizeBytes / 1024)} KB)
                    </p>
                    {doc.expiryDate && (
                      <p className={daysLeft !== null && daysLeft <= 30 ? 'text-[#B45309] font-medium' : ''}>
                        Expiry: {formatDateIN(doc.expiryDate)}
                        {daysLeft !== null && ` (${daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`})`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E2DC] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#73726C]">
                    {doc.uploadedBy} · {formatDateIN(doc.uploadedAt)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setPreviewDoc(doc)}>
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <DialogModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Upload Document (Local Demo Storage)"
        description="Supports PDF & image files up to 2 MB with version and expiry tracking."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/30 px-3 py-2 text-xs text-[#B91C1C]">
              {uploadError}
            </div>
          )}

          <div>
            <FieldLabel required>Document Title</FieldLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PWD Shahapur Bitumen Quality Certificate"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Category</FieldLabel>
              <SelectField
                value={category}
                onValueChange={(v) => setCategory(v as DocumentCategory)}
                options={DOC_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <FieldLabel hint="Optional">Linked Project</FieldLabel>
              <SelectField
                value={projectId || 'NONE'}
                onValueChange={(v) => setProjectId(v === 'NONE' ? '' : v)}
                options={[
                  { value: 'NONE', label: 'General / Company-wide' },
                  ...db.projects.map((p) => ({ value: p.id, label: `${p.region} · ${p.name}` })),
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel hint="If vehicle document">Linked Vehicle</FieldLabel>
              <SelectField
                value={vehicleId || 'NONE'}
                onValueChange={(v) => setVehicleId(v === 'NONE' ? '' : v)}
                options={[
                  { value: 'NONE', label: 'Not vehicle-specific' },
                  ...db.vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.registrationNumber} · ${v.category}`,
                  })),
                ]}
              />
            </div>
            <div>
              <FieldLabel hint="Triggers expiry reminder">Expiry Date</FieldLabel>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div>
            <FieldLabel required>Description</FieldLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short context on approval, measurement reference, or renewal terms..."
            />
          </div>

          <div>
            <FieldLabel hint="PDF, JPG, PNG ≤ 2 MB">Select Local File</FieldLabel>
            <label className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-dashed border-[#D8D4CB] bg-[#FAF9F6] px-4 py-3 text-xs text-[#52524E] cursor-pointer hover:bg-[#F3F1EC]">
              <span className="truncate">
                {fileMeta
                  ? `${fileMeta.fileName} (${Math.round(fileMeta.fileSizeBytes / 1024)} KB)`
                  : 'Choose PDF or image file from device'}
              </span>
              <Upload className="h-4 w-4 text-[#245BFF] shrink-0" />
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFilePick}
                className="sr-only"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-[#E5E2DC]">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Document</Button>
          </div>
        </form>
      </DialogModal>

      {/* Preview Modal */}
      <DialogModal
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        title={previewDoc?.title ?? ''}
        description={previewDoc ? `${previewDoc.category} · ${previewDoc.version} · ${previewDoc.fileName}` : ''}
        maxWidthClass="max-w-2xl"
      >
        {previewDoc && (
          <div className="space-y-4">
            {previewDoc.dataUrl ? (
              previewDoc.fileType.startsWith('image/') ? (
                <div className="rounded-xl border border-[#E5E2DC] overflow-hidden bg-[#FAF9F6]">
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.title}
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.title}
                  className="h-[420px] w-full rounded-xl border border-[#E5E2DC]"
                />
              )
            ) : (
              <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-6 space-y-3 text-sm">
                <div className="flex items-center gap-2.5 text-[#171717] font-semibold">
                  <FileText className="h-5 w-5 text-[#245BFF]" />
                  <span>Seeded Demonstration Document Sheet</span>
                </div>
                <p className="text-xs text-[#52524E] leading-relaxed">{previewDoc.description}</p>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E5E2DC] text-xs">
                  <div>
                    <span className="text-[#52524E]">Uploaded By: </span>
                    <span className="font-medium">{previewDoc.uploadedBy}</span>
                  </div>
                  <div>
                    <span className="text-[#52524E]">Upload Date: </span>
                    <span className="font-mono">{formatDateIN(previewDoc.uploadedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[#E5E2DC] p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-[#171717]">Upload & Version History</p>
              {previewDoc.uploadHistory.map((h, i) => (
                <p key={i} className="text-[#52524E]">
                  <span className="font-mono text-[#171717]">{h.version}</span> · {formatDateIN(h.uploadedAt)} ·{' '}
                  {h.uploadedBy} — {h.note}
                </p>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E2DC]">
              {canPerformAction('verify_entry') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#52524E]">Status:</span>
                  <SelectField
                    value={previewDoc.status}
                    onValueChange={(v) =>
                      updateDocumentStatus(previewDoc.id, v as DocumentItem['status'])
                    }
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Expiring Soon', label: 'Expiring Soon' },
                      { value: 'Expired', label: 'Expired' },
                      { value: 'Under Review', label: 'Under Review' },
                    ]}
                    className="w-40"
                  />
                </div>
              )}
              <Button onClick={() => handleDownload(previewDoc)}>
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          </div>
        )}
      </DialogModal>
    </div>
  );
}
