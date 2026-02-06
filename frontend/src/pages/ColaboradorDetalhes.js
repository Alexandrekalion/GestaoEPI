import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ArrowLeft, User, Package, AlertTriangle, Calendar, History, FileText, ScanFace, CheckCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ColaboradorDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [colaborador, setColaborador] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [itemsEmUso, setItemsEmUso] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumo');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [colabRes, deliveriesRes, docsRes] = await Promise.all([
        axios.get(`${API}/employees/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/deliveries?employee_id=${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/document-signatures?employee_id=${id}`, { headers: getAuthHeader() })
      ]);
      
      setColaborador(colabRes.data);
      setHistorico(deliveriesRes.data);
      setDocumentos(docsRes.data);
      
      // Calcular itens em uso
      const itemsMap = {};
      deliveriesRes.data.forEach(delivery => {
        if (delivery.items) {
          delivery.items.forEach(item => {
            const key = item.epi_id || item.tool_id || item.name;
            const name = item.epi_name || item.tool_name || item.name;
            if (!itemsMap[key]) {
              itemsMap[key] = { 
                name, 
                quantity: 0, 
                lastDelivery: null,
                epiData: item
              };
            }
            if (delivery.is_return) {
              itemsMap[key].quantity -= item.quantity;
            } else {
              itemsMap[key].quantity += item.quantity;
              itemsMap[key].lastDelivery = delivery.created_at;
            }
          });
        }
      });
      
      const items = Object.entries(itemsMap)
        .filter(([_, v]) => v.quantity > 0)
        .map(([id, v]) => ({ id, ...v }));
      setItemsEmUso(items);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do colaborador');
    } finally {
      setLoading(false);
    }
  };

  const isNearExpiry = (date) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
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

  if (!colaborador) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Colaborador não encontrado</p>
          <button onClick={() => navigate('/colaboradores')} className="mt-4 text-emerald-600 hover:underline">
            Voltar para lista
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="colaborador-detalhes-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/colaboradores')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ficha do Colaborador</h1>
            <p className="text-slate-600 mt-1">Detalhes e histórico completo</p>
          </div>
        </div>

        {/* Informações do Colaborador */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="flex items-start gap-6">
            {colaborador.photo_path ? (
              <img 
                src={`${BACKEND_URL}${colaborador.photo_path}`}
                alt={colaborador.full_name}
                className="w-32 h-32 rounded-xl object-cover border-4 border-slate-100 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 bg-emerald-100 rounded-xl flex items-center justify-center border-4 border-slate-100 shadow-md">
                <User className="w-16 h-16 text-emerald-600" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{colaborador.full_name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">CPF</p>
                  <p className="font-mono text-slate-900">{colaborador.cpf}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">RG</p>
                  <p className="text-slate-900">{colaborador.rg || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Matrícula</p>
                  <p className="font-mono text-slate-900">{colaborador.registration_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    colaborador.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {colaborador.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Cargo</p>
                  <p className="text-slate-900">{colaborador.position || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Setor</p>
                  <p className="text-slate-900">{colaborador.department || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Telefone</p>
                  <p className="text-slate-900">{colaborador.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Email</p>
                  <p className="text-slate-900">{colaborador.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('resumo')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'resumo'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            EPIs em Uso
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'historico'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Histórico Completo
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'documentos'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Documentos Assinados
          </button>
        </div>

        {/* EPIs em Uso */}
        {activeTab === 'resumo' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              EPIs Atualmente com o Colaborador
            </h3>
            
            {itemsEmUso.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhum EPI em posse do colaborador</p>
            ) : (
              <div className="space-y-3">
                {itemsEmUso.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isExpired(item.epiData?.validity_date) 
                        ? 'bg-red-50 border-red-200' 
                        : isNearExpiry(item.epiData?.validity_date)
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isExpired(item.epiData?.validity_date) 
                          ? 'bg-red-100' 
                          : isNearExpiry(item.epiData?.validity_date)
                          ? 'bg-amber-100'
                          : 'bg-emerald-100'
                      }`}>
                        <Package className={`w-5 h-5 ${
                          isExpired(item.epiData?.validity_date) 
                            ? 'text-red-600' 
                            : isNearExpiry(item.epiData?.validity_date)
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">
                          Entregue em: {item.lastDelivery ? new Date(item.lastDelivery).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {(isExpired(item.epiData?.validity_date) || isNearExpiry(item.epiData?.validity_date)) && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className={`w-4 h-4 ${isExpired(item.epiData?.validity_date) ? 'text-red-500' : 'text-amber-500'}`} />
                          <span className={`text-sm font-medium ${isExpired(item.epiData?.validity_date) ? 'text-red-600' : 'text-amber-600'}`}>
                            {isExpired(item.epiData?.validity_date) ? 'Vencido' : 'Próximo do vencimento'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-700 bg-slate-200 px-3 py-1 rounded-full">
                        Qtd: {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Histórico Completo */}
        {activeTab === 'historico' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Histórico de Movimentações
            </h3>
            
            {historico.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhuma movimentação registrada</p>
            ) : (
              <div className="space-y-4">
                {historico.map((delivery, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border ${
                      delivery.is_return 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          delivery.is_return 
                            ? 'bg-blue-200 text-blue-800' 
                            : 'bg-emerald-200 text-emerald-800'
                        }`}>
                          {delivery.is_return ? 'Devolução' : 'Entrega'}
                        </span>
                        {delivery.facial_match_score && (
                          <span className="text-xs text-slate-500">
                            Verificação facial: {(delivery.facial_match_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(delivery.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {delivery.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-white/50 p-2 rounded">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{item.epi_name || item.tool_name || item.name}</span>
                          <span className="text-slate-500">(Qtd: {item.quantity})</span>
                        </div>
                      ))}
                    </div>
                    {delivery.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">Obs: {delivery.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documentos Assinados */}
        {activeTab === 'documentos' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Documentos Assinados
            </h3>
            
            {documentos.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhum documento assinado</p>
            ) : (
              <div className="space-y-3">
                {documentos.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.template_name || 'Documento'}</p>
                        <p className="text-sm text-slate-600">
                          Assinado em: {new Date(doc.signed_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {doc.signed_document_path && (
                      <a 
                        href={`${BACKEND_URL}${doc.signed_document_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:underline"
                      >
                        Visualizar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
