import React from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
};
