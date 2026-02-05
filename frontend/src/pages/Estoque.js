import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertTriangle, Package } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Estoque() {
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/stock/alerts`, { headers: getAuthHeader() });
      setAlerts(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="estoque-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Estoque</h1>
          <p className="text-slate-600 mt-1">Monitore os níveis de estoque e alertas</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Estoque Baixo</h2>
                <p className="text-sm text-slate-600">{alerts.low_stock.length} itens</p>
              </div>
            </div>
            
            {alerts.low_stock.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum item com estoque baixo</p>
            ) : (
              <div className="space-y-3">
                {alerts.low_stock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-md border border-orange-200">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">Mínimo: {item.min_stock}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-orange-600">{item.current_stock}</p>
                      <p className="text-xs text-slate-500">em estoque</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Validade Próxima</h2>
                <p className="text-sm text-slate-600">{alerts.expiring_soon.length} itens</p>
              </div>
            </div>
            
            {alerts.expiring_soon.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum item próximo do vencimento</p>
            ) : (
              <div className="space-y-3">
                {alerts.expiring_soon.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-red-600" />
                      <p className="font-medium text-slate-900">{item.name}</p>
                    </div>
                    <p className="text-sm font-medium text-red-600">
                      {new Date(item.validity_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
