import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Package } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EPIs() {
  const [epis, setEpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type_category: '',
    ca_number: '',
    brand: '',
    size: '',
    qr_code: '',
    current_stock: 0,
    min_stock: 0
  });

  useEffect(() => {
    fetchEPIs();
  }, []);

  const fetchEPIs = async () => {
    try {
      const response = await axios.get(`${API}/epis`, { headers: getAuthHeader() });
      setEpis(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar EPIs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/epis`, formData, { headers: getAuthHeader() });
      toast.success('EPI cadastrado com sucesso!');
      setShowDialog(false);
      setFormData({ name: '', type_category: '', ca_number: '', brand: '', size: '', qr_code: '', current_stock: 0, min_stock: 0 });
      fetchEPIs();
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
      <div className="space-y-6" data-testid="epis-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cadastro de EPIs</h1>
            <p className="text-slate-600 mt-1">Gerencie os equipamentos de proteção individual</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-epi-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo EPI
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo EPI</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do EPI *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria/Tipo *</label>
                  <input
                    type="text"
                    required
                    value={formData.type_category}
                    onChange={(e) => setFormData({...formData, type_category: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CA (Certificado) *</label>
                  <input
                    type="text"
                    required
                    value={formData.ca_number}
                    onChange={(e) => setFormData({...formData, ca_number: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Marca</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tamanho</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({...formData, size: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">QR Code</label>
                  <input
                    type="text"
                    value={formData.qr_code}
                    onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Estoque Atual</label>
                    <input
                      type="number"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value)})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estoque Mínimo</label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value)})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Cadastrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">EPI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">CA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Marca</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estoque</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {epis.map((epi) => (
                  <tr key={epi.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{epi.name}</p>
                          <p className="text-sm text-slate-500">{epi.size || 'Único'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{epi.type_category}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{epi.ca_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{epi.brand || '-'}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-900">{epi.current_stock}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        epi.current_stock > epi.min_stock
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {epi.current_stock > epi.min_stock ? 'OK' : 'Baixo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
