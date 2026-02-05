import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Kits() {
  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="kits-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kits</h1>
          <p className="text-slate-600 mt-1">Gerencie os kits de EPIs e ferramentas</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
          <p className="text-slate-600">Página em construção</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
