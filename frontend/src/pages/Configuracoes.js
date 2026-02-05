import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Calendar, Clock } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Configuracoes() {
  const [license, setLicense] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [licenseRes, historyRes] = await Promise.all([
        axios.get(`${API}/license`, { headers: getAuthHeader() }),
        axios.get(`${API}/license/history`, { headers: getAuthHeader() })
      ]);
      setLicense(licenseRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addDays = async (days) => {
    try {
      await axios.post(
        `${API}/license/add-days`,
        { days },
        { headers: getAuthHeader() }
      );
      toast.success(`${days} dias adicionados com sucesso!`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao adicionar dias');
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
      <div className="space-y-6" data-testid="configuracoes-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-slate-600 mt-1">Gerencie a licença do painel (Super-admin)</p>
        </div>

        {license && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-md p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Licença do Painel</h2>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold font-mono">{license.days_remaining}</p>
                  <p className="text-xl text-emerald-100">dias restantes</p>
                </div>
                <p className="text-sm text-emerald-100 mt-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expira em: {new Date(license.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
                <Clock className="w-16 h-16" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Button
                onClick={() => addDays(1)}
                data-testid="add-1-day"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                +1 Dia
              </Button>
              <Button
                onClick={() => addDays(7)}
                data-testid="add-7-days"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                +7 Dias
              </Button>
              <Button
                onClick={() => addDays(30)}
                data-testid="add-30-days"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                +30 Dias
              </Button>
              <Button
                onClick={() => {
                  const days = prompt('Quantos dias deseja adicionar?');
                  if (days) addDays(parseInt(days));
                }}
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                Customizado
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Histórico de Ativações</h3>
          
          {history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum histórico disponível</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-md">
                  <div>
                    <p className="font-medium text-slate-900">
                      +{entry.days_added} dias adicionados
                    </p>
                    {entry.reason && (
                      <p className="text-sm text-slate-600 mt-1">{entry.reason}</p>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(entry.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
