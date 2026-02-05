import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Box, Search } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Kits() {
  const [kits, setKits] = useState([]);
  const [epis, setEpis] = useState([]);
  const [ferramentas, setFerramentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: []
  });
  const [selectedEPI, setSelectedEPI] = useState('');
  const [selectedTool, setSelectedTool] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kitsRes, episRes, toolsRes] = await Promise.all([
        axios.get(`${API}/kits`, { headers: getAuthHeader() }),
        axios.get(`${API}/epis`, { headers: getAuthHeader() }),
        axios.get(`${API}/tools`, { headers: getAuthHeader() })
      ]);
      setKits(kitsRes.data);
      setEpis(episRes.data);
      setFerramentas(toolsRes.data);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addEPIToKit = () => {
    if (!selectedEPI) return;
    const epi = epis.find(e => e.id === parseInt(selectedEPI));
    if (epi && !formData.items.find(i => i.epi_id === epi.id)) {
      setFormData({
        ...formData,
        items: [...formData.items, { epi_id: epi.id, name: epi.name, type: 'epi', quantity: 1 }]
      });
      setSelectedEPI('');
    }
  };

  const addToolToKit = () => {
    if (!selectedTool) return;
    const tool = ferramentas.find(t => t.id === parseInt(selectedTool));
    if (tool && !formData.items.find(i => i.tool_id === tool.id)) {
      setFormData({
        ...formData,
        items: [...formData.items, { tool_id: tool.id, name: tool.name, type: 'tool', quantity: 1 }]
      });
      setSelectedTool('');
    }
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/kits`, formData, { headers: getAuthHeader() });
      toast.success('Kit criado com sucesso!');
      setShowDialog(false);
      setFormData({ name: '', description: '', items: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar kit');
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
      <div className="space-y-6" data-testid="kits-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kits</h1>
            <p className="text-slate-600 mt-1">Gerencie kits de EPIs e ferramentas</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Novo Kit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Kit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Kit *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Ex: Kit Eletricista, Kit Altura, Kit Solda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="flex min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3">Adicionar EPIs ao Kit</h3>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedEPI}
                      onChange={(e) => setSelectedEPI(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um EPI...</option>
                      {epis.map(epi => (
                        <option key={epi.id} value={epi.id}>{epi.name}</option>
                      ))}
                    </select>
                    <Button type="button" onClick={addEPIToKit} className="bg-blue-500 hover:bg-blue-600">
                      Adicionar
                    </Button>
                  </div>

                  <h3 className="font-medium text-slate-900 mb-3">Adicionar Ferramentas ao Kit</h3>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedTool}
                      onChange={(e) => setSelectedTool(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione uma ferramenta...</option>
                      {ferramentas.map(tool => (
                        <option key={tool.id} value={tool.id}>{tool.name}</option>
                      ))}
                    </select>
                    <Button type="button" onClick={addToolToKit} className="bg-orange-500 hover:bg-orange-600">
                      Adicionar
                    </Button>
                  </div>

                  {formData.items.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-slate-700">Itens do Kit:</p>
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                          <span className="text-sm">
                            {item.name} ({item.type === 'epi' ? 'EPI' : 'Ferramenta'})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-500 text-sm hover:text-red-700"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Criar Kit
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((kit) => (
            <div key={kit.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Box className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{kit.name}</h3>
                  {kit.description && (
                    <p className="text-sm text-slate-600 mt-1">{kit.description}</p>
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
