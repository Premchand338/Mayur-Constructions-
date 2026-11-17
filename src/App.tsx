import React, { useState } from 'react';
import { AppShell } from '@/src/components/AppShell';
import { GuidedTourOverlay } from '@/src/components/GuidedTourOverlay';
import { DocumentsView } from '@/src/components/views/DocumentsView';
import { FinanceView, QuickExpenseModal } from '@/src/components/views/FinanceView';
import { MaterialsView } from '@/src/components/views/MaterialsView';
import {
  ActivityHistoryView,
  NotificationsView,
  SettingsAndRolesView,
} from '@/src/components/views/OperationsSupportViews';
import { OverviewView } from '@/src/components/views/OverviewView';
import { ProjectsView } from '@/src/components/views/ProjectsView';
import { ReportsView } from '@/src/components/views/ReportsView';
import { VehiclesView } from '@/src/components/views/VehiclesView';
import { DemoStoreProvider, useDemoStore } from '@/src/store/demoStore';

function CommandCenterWorkspace() {
  const { activeSection, setActiveSection } = useDemoStore();
  const [externalProjectId, setExternalProjectId] = useState<string | null>(null);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);

  const openProjectDetail = (projectId: string) => {
    setExternalProjectId(projectId);
    setActiveSection('projects');
  };

  return (
    <AppShell>
      {activeSection === 'overview' && (
        <OverviewView
          onOpenProjectDetail={openProjectDetail}
          onOpenQuickExpense={() => setQuickExpenseOpen(true)}
        />
      )}
      {activeSection === 'projects' && (
        <ProjectsView
          externalProjectId={externalProjectId}
          onClearExternalProject={() => setExternalProjectId(null)}
        />
      )}
      {activeSection === 'vehicles' && <VehiclesView />}
      {activeSection === 'materials' && <MaterialsView />}
      {activeSection === 'finance' && <FinanceView />}
      {activeSection === 'documents' && <DocumentsView />}
      {activeSection === 'reports' && <ReportsView />}
      {activeSection === 'notifications' && <NotificationsView />}
      {activeSection === 'activity' && <ActivityHistoryView />}
      {activeSection === 'settings' && <SettingsAndRolesView />}

      <QuickExpenseModal open={quickExpenseOpen} onOpenChange={setQuickExpenseOpen} />
      <GuidedTourOverlay />
    </AppShell>
  );
}

export default function App() {
  return (
    <DemoStoreProvider>
      <CommandCenterWorkspace />
    </DemoStoreProvider>
  );
}
