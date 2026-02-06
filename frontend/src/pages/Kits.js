import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Box, Search, Edit2, Trash2, Eye, Package, Wrench, X } from 'lucide-react';
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
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: []
  });
  const [selectedEPI, setSelectedEPI] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [epiQuantity, setEpiQuantity] = useState(1);
  const [toolQuantity, setToolQuantity] = useState(1);

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
    if (!selectedEPI) {
      toast.error('Selecione um EPI');
      return;
    }
    const epi = epis.find(e => e.id === selectedEPI);
    if (epi) {
      if (formData.items.find(i => i.epi_id === epi.id)) {
        toast.error('Este EPI já foi adicionado ao kit');
        return;
      }
      setFormData({
        ...formData,
        items: [...formData.items, { 
          epi_id: epi.id, 
          name: epi.name, 
          type: 'epi', 
          quantity: epiQuantity,
          ca_number: epi.ca_number
        }]
      });
      setSelectedEPI('');
      setEpiQuantity(1);
      toast.success(`${epi.name} adicionado ao kit`);
    }
  };

  const addToolToKit = () => {
    if (!selectedTool) {
      toast.error('Selecione uma ferramenta');
      return;
    }
    const tool = ferramentas.find(t => t.id === selectedTool);
    if (tool) {
      if (formData.items.find(i => i.tool_id === tool.id)) {
        toast.error('Esta ferramenta já foi adicionada ao kit');
        return;
      }
      setFormData({
        ...formData,
        items: [...formData.items, { 
          tool_id: tool.id, 
          name: tool.name, 
          type: 'tool', 
          quantity: toolQuantity,
          serial_number: tool.serial_number
        }]
      });
      setSelectedTool('');
      setToolQuantity(1);
      toast.success(`${tool.name} adicionado ao kit`);
    }
  };

  const removeItem = (index) => {
    const item = formData.items[index];
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
    toast.success(`${item.name} removido do kit`);
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = newQuantity;
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item ao kit');
      return;
    }
    
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

  const openKitDetails = (kit) => {
    setSelectedKit(kit);
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', items: [] });
    setSelectedEPI('');
    setSelectedTool('');
    setEpiQuantity(1);
    setToolQuantity(1);
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
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-kit-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Kit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Kit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome do Kit *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Ex: Kit Eletricista, Kit Altura, Kit Solda"
                      data-testid="kit-name-input"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="flex min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Descreva o kit e sua finalidade..."
                    />
                  </div>
                </div>

                {/* Adicionar EPIs */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Adicionar EPIs
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <select
                      value={selectedEPI}
                      onChange={(e) => setSelectedEPI(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="select-epi-kit"
                    >
                      <option value="">Selecione um EPI...</option>
                      {epis.map(epi => (
                        <option key={epi.id} value={epi.id}>
                          {epi.name} (CA: {epi.ca_number})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={epiQuantity}
                      onChange={(e) => setEpiQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-center"
                      placeholder="Qtd"
                    />
                    <Button 
                      type="button" 
                      onClick={addEPIToKit} 
                      className="bg-emerald-500 hover:bg-emerald-600"
                      data-testid="add-epi-to-kit"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Adicionar Ferramentas */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-600" />
                    Adicionar Ferramentas
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <select
                      value={selectedTool}
                      onChange={(e) => setSelectedTool(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="select-tool-kit"
                    >
                      <option value="">Selecione uma ferramenta...</option>
                      {ferramentas.map(tool => (
                        <option key={tool.id} value={tool.id}>
                          {tool.name} {tool.serial_number ? `(S/N: ${tool.serial_number})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={toolQuantity}
                      onChange={(e) => setToolQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-center"
                      placeholder="Qtd"
                    />
                    <Button 
                      type="button" 
                      onClick={addToolToKit} 
                      className="bg-orange-500 hover:bg-orange-600"
                      data-testid="add-tool-to-kit"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Lista de itens do kit */}
                {formData.items.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-slate-900 mb-3">
                      Itens do Kit ({formData.items.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-md border ${
                            item.type === 'epi' 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.type === 'epi' ? (
                              <Package className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Wrench className="w-5 h-5 text-orange-600" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.type === 'epi' ? `CA: ${item.ca_number || 'N/A'}` : `S/N: ${item.serial_number || 'N/A'}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 flex gap-3">
                  <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600" data-testid="submit-kit">
                    Criar Kit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Kits */}
        {kits.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-12 text-center">
            <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum kit cadastrado</h3>
            <p className="text-slate-600 mb-4">Crie seu primeiro kit clicando no botão acima</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kits.map((kit) => (
              <div 
                key={kit.id} 
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Box className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{kit.name}</h3>
                      {kit.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{kit.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Resumo dos itens */}
                <div className="border-t border-slate-100 pt-3 mt-3">
                  <p className="text-xs text-slate-500 mb-2">
                    {kit.items?.length || 0} item(ns) no kit
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openKitDetails(kit)}
                      className="flex-1"
                      data-testid={`view-kit-${kit.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog de Visualização do Kit */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-600" />
                {selectedKit?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedKit && (
              <div className="space-y-4">
                {selectedKit.description && (
                  <p className="text-slate-600">{selectedKit.description}</p>
                )}
                
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-900 mb-3">Itens do Kit</h3>
                  
                  {(!selectedKit.items || selectedKit.items.length === 0) ? (
                    <p className="text-slate-500 text-center py-4">Nenhum item cadastrado neste kit</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedKit.items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-md border ${
                            item.epi_id 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.epi_id ? (
                              <Package className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Wrench className="w-5 h-5 text-orange-600" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{item.name || 'Item'}</p>
                              <p className="text-xs text-slate-500">
                                {item.epi_id ? 'EPI' : 'Ferramenta'}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-700 bg-white px-3 py-1 rounded-full border">
                            Qtd: {item.quantity || 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 text-sm text-slate-500">
                  Criado em: {new Date(selectedKit.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
