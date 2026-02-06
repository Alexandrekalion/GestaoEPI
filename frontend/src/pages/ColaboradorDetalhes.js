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
  
  // Estados para biometria facial
  const [facialTemplates, setFacialTemplates] = useState([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturingFace, setCapturingFace] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    fetchData();
    loadFaceModels();
  }, [id]);
  
  const loadFaceModels = useCallback(async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar modelos faciais:', error);
    }
  }, []);
  
  const fetchFacialTemplates = async () => {
    try {
      const res = await axios.get(`${API}/employees/${id}/facial-templates`, { headers: getAuthHeader() });
      setFacialTemplates(res.data);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [colabRes, deliveriesRes, docsRes, templatesRes] = await Promise.all([
        axios.get(`${API}/employees/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/deliveries?employee_id=${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/document-signatures?employee_id=${id}`, { headers: getAuthHeader() }).catch(() => ({ data: [] })),
        axios.get(`${API}/employees/${id}/facial-templates`, { headers: getAuthHeader() }).catch(() => ({ data: [] }))
      ]);
      
      setColaborador(colabRes.data);
      setHistorico(deliveriesRes.data);
      setDocumentos(docsRes.data);
      setFacialTemplates(templatesRes.data);
      
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
  
  // Função para capturar e cadastrar template facial
  const captureFacialTemplate = async () => {
    if (!webcamRef.current || !modelsLoaded) {
      toast.error('Câmera ou modelos não carregados');
      return;
    }
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error('Não foi possível capturar a imagem');
      return;
    }
    
    setCapturingFace(true);
    try {
      const img = await faceapi.fetchImage(imageSrc);
      
      // Opções otimizadas para captura de template
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5
      });
      
      const detection = await faceapi
        .detectSingleFace(img, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
        toast.error('Nenhum rosto detectado. Posicione o rosto de frente para a câmera com boa iluminação.');
        setCapturingFace(false);
        return;
      }
      
      // Verificar qualidade da detecção
      if (detection.detection.score < 0.7) {
        toast.error('Qualidade da imagem baixa. Melhore a iluminação e tente novamente.');
        setCapturingFace(false);
        return;
      }
      
      // Salvar o descriptor como template facial
      const descriptorArray = Array.from(detection.descriptor);
      
      await axios.post(
        `${API}/employees/${id}/facial-templates`,
        { descriptor: JSON.stringify(descriptorArray) },
        { headers: getAuthHeader() }
      );
      
      toast.success('✓ Template facial cadastrado com sucesso!');
      setShowWebcam(false);
      fetchFacialTemplates();
    } catch (error) {
      console.error('Erro ao processar facial:', error);
      toast.error('Erro ao processar reconhecimento facial');
    } finally {
      setCapturingFace(false);
    }
  };
  
  const deleteFacialTemplate = async (templateId) => {
    if (!window.confirm('Tem certeza que deseja excluir este template facial?')) return;
    
    try {
      await axios.delete(`${API}/employees/${id}/facial-templates/${templateId}`, { headers: getAuthHeader() });
      toast.success('Template excluído');
      fetchFacialTemplates();
    } catch (error) {
      toast.error('Erro ao excluir template');
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
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('resumo')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'resumo'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            EPIs em Uso
          </button>
          <button
            onClick={() => setActiveTab('biometria')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'biometria'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
            data-testid="tab-biometria"
          >
            <ScanFace className="w-4 h-4 inline mr-2" />
            Biometria Facial
            {facialTemplates.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {facialTemplates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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
        
        {/* Biometria Facial */}
        {activeTab === 'biometria' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-blue-600" />
              Cadastro de Biometria Facial
            </h3>
            
            {!colaborador.photo_path && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Foto não cadastrada</p>
                    <p className="text-sm text-amber-700">Para utilizar o reconhecimento facial, é necessário que o colaborador tenha uma foto cadastrada.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Templates cadastrados */}
            <div className="mb-6">
              <h4 className="font-medium text-slate-700 mb-3">Templates Faciais Cadastrados</h4>
              {facialTemplates.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <ScanFace className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum template facial cadastrado</p>
                  <p className="text-sm text-slate-400 mt-1">Cadastre ao menos um template para habilitar o reconhecimento facial</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {facialTemplates.map((template, idx) => (
                    <div 
                      key={template.id} 
                      className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Template Facial #{idx + 1}</p>
                          <p className="text-sm text-slate-600">
                            Cadastrado em: {new Date(template.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFacialTemplate(template.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir template"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Captura de novo template */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-700 mb-3">Cadastrar Novo Template</h4>
              
              {!modelsLoaded ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-slate-600">Carregando modelos de reconhecimento...</span>
                </div>
              ) : !showWebcam ? (
                <button
                  onClick={() => setShowWebcam(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-4 flex items-center justify-center gap-2"
                  data-testid="start-facial-capture"
                >
                  <ScanFace className="w-5 h-5" />
                  Iniciar Captura Facial
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.92}
                      className="w-full rounded-lg border-4 border-blue-200"
                      videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 30 }
                      }}
                      mirrored={true}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-64 border-4 border-dashed border-blue-400 rounded-3xl opacity-60"></div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Dicas para melhor captura:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Posicione o rosto dentro da área tracejada</li>
                      <li>• Garanta boa iluminação (evite contraluz)</li>
                      <li>• Olhe diretamente para a câmera</li>
                      <li>• Remova óculos escuros ou chapéus</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={captureFacialTemplate}
                      disabled={capturingFace}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                      data-testid="capture-facial-button"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {capturingFace ? 'Processando...' : 'Capturar e Salvar'}
                    </button>
                    <button
                      onClick={() => setShowWebcam(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg px-6 py-3"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
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
