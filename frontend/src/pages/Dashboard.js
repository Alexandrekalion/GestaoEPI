import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: getAuthHeader() }),
        axios.get(`${API}/stock/alerts`, { headers: getAuthHeader() })
      ]);
      
      setStats({
        ...statsRes.data,
        alerts: alertsRes.data
      });

      if (user?.role === 'super_admin') {
        const licenseRes = await axios.get(`${API}/license`, { headers: getAuthHeader() });
        setLicense(licenseRes.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="dashboard">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-600 mt-1">Visão geral do sistema Cipolatti</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.active_employees || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Colaboradores Ativos</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.total_epis || 0}</p>
              <p className="text-sm text-slate-600 mt-1">EPIs Cadastrados</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.low_stock_count || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Estoque Baixo</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{stats?.recent_deliveries || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Entregas (30 dias)</p>
            </div>
          </div>
        </div>

        {license && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Licença do Painel</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold font-mono">{license.days_remaining}</p>
              <p className="text-emerald-100">dias restantes</p>
            </div>
            <p className="text-sm text-emerald-100 mt-2">
              Expira em: {new Date(license.expires_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {stats?.alerts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats.alerts.low_stock?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Alertas de Estoque Baixo
                </h3>
                <div className="space-y-3">
                  {stats.alerts.low_stock.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">Mínimo: {item.min_stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-orange-600">{item.current_stock}</p>
                        <p className="text-xs text-slate-500">em estoque</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.alerts.expiring_soon?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  EPIs com Validade Próxima
                </h3>
                <div className="space-y-3">
                  {stats.alerts.expiring_soon.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        {new Date(item.validity_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
