import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Truck, Search } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    contact: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`, { headers: getAuthHeader() });
      setFornecedores(response.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/suppliers`, formData, { headers: getAuthHeader() });
      toast.success('Fornecedor cadastrado com sucesso!');
      setShowDialog(false);
      setFormData({ name: '', cnpj: '', contact: '', phone: '', email: '' });
      fetchData();
    } catch (error) {
      console.error('Erro completo:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar fornecedor');
    }
  };

  const filteredFornecedores = fornecedores.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.cnpj && f.cnpj.includes(searchTerm))
  );

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
      <div className="space-y-6" data-testid="fornecedores-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fornecedores</h1>
            <p className="text-slate-600 mt-1">Gerencie os fornecedores de EPIs e ferramentas</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-fornecedor-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Fornecedor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome/Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pessoa de Contato</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Cadastrar Fornecedor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar fornecedor por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredFornecedores.map((fornecedor) => (
              <div key={fornecedor.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{fornecedor.name}</h3>
                    {fornecedor.cnpj && (
                      <p className="text-sm text-slate-600 mt-1">CNPJ: {fornecedor.cnpj}</p>
                    )}
                    {fornecedor.contact && (
                      <p className="text-sm text-slate-600 mt-1">Contato: {fornecedor.contact}</p>
                    )}
                    {fornecedor.phone && (
                      <p className="text-sm text-slate-600">Tel: {fornecedor.phone}</p>
                    )}
                    {fornecedor.email && (
                      <p className="text-sm text-slate-600">Email: {fornecedor.email}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredFornecedores.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum fornecedor cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
