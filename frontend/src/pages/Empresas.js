import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Building2 } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    cnpj: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: ''
  });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/companies`, { headers: getAuthHeader() });
      setEmpresas(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/companies`, formData, { headers: getAuthHeader() });
      toast.success('Empresa cadastrada com sucesso!');
      setShowDialog(false);
      setFormData({ legal_name: '', trade_name: '', cnpj: '', address: '', contact_person: '', contact_phone: '', contact_email: '' });
      fetchEmpresas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar');
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
      <div className="space-y-6" data-testid="empresas-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Empresas</h1>
            <p className="text-slate-600 mt-1">Gerencie as empresas cadastradas</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-empresa-button">
                <Plus className="w-4 h-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={formData.legal_name}
                    onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({...formData, trade_name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Endereço</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="flex min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Cadastrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((empresa) => (
            <div key={empresa.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{empresa.legal_name}</h3>
                  {empresa.trade_name && (
                    <p className="text-sm text-slate-600 truncate">{empresa.trade_name}</p>
                  )}
                  <p className="text-sm text-slate-500 font-mono mt-1">{empresa.cnpj}</p>
                  {empresa.contact_person && (
                    <p className="text-sm text-slate-600 mt-2">Contato: {empresa.contact_person}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
