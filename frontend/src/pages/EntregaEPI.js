import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Search, Camera, QrCode, User, Package, CheckCircle2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { getAuthHeader } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as faceapi from 'face-api.js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EntregaEPI() {
  const [step, setStep] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [facialMatch, setFacialMatch] = useState(null);
  const [epis, setEpis] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const webcamRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    loadFaceModels();
    fetchEPIs();
  }, []);

  const loadFaceModels = async () => {
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
  };

  const fetchEPIs = async () => {
    try {
      const response = await axios.get(`${API}/epis`, { headers: getAuthHeader() });
      setEpis(response.data);
    } catch (error) {
      console.error('Erro ao buscar EPIs:', error);
    }
  };

  const searchEmployees = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/employees?search=${searchTerm}`, {
        headers: getAuthHeader()
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      toast.error('Erro ao buscar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  const selectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setStep('verify');
  };

  const captureAndVerifyFace = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc || !modelsLoaded) {
      toast.error('Não foi possível capturar a imagem');
      return;
    }

    setLoading(true);
    try {
      const img = await faceapi.fetchImage(imageSrc);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('Nenhum rosto detectado. Tente novamente.');
        setLoading(false);
        return;
      }

      const templatesRes = await axios.get(
        `${API}/employees/${selectedEmployee.id}/facial-templates`,
        { headers: getAuthHeader() }
      );

      if (templatesRes.data.length === 0) {
        toast.warning('Colaborador sem template facial. Prosseguindo sem verificação.');
        setFacialMatch({ score: 0, verified: false });
        setShowWebcam(false);
        setStep('delivery');
        setLoading(false);
        return;
      }

      let bestMatch = 0;
      templatesRes.data.forEach(template => {
        const savedDescriptor = JSON.parse(template.descriptor);
        const distance = faceapi.euclideanDistance(detection.descriptor, savedDescriptor);
        const similarity = 1 - distance;
        if (similarity > bestMatch) {
          bestMatch = similarity;
        }
      });

      const threshold = 0.6;
      const verified = bestMatch >= threshold;

      setFacialMatch({ score: bestMatch, verified });
      setShowWebcam(false);
      
      if (verified) {
        toast.success('Rosto verificado com sucesso!');
        setStep('delivery');
      } else {
        toast.warning('Verificação facial com baixa confiança. Prossiga com cautela.');
        setStep('delivery');
      }
    } catch (error) {
      console.error('Erro na verificação facial:', error);
      toast.error('Erro na verificação facial');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (qrCode) => {
    const epi = epis.find(e => e.qr_code === qrCode);
    if (epi) {
      addItem(epi);
      toast.success(`EPI ${epi.name} adicionado`);
    } else {
      toast.error('EPI não encontrado');
    }
  };

  const startQRScanner = () => {
    setShowQRScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: 250
      });
      
      scanner.render(
        (decodedText) => {
          handleQRScan(decodedText);
          scanner.clear();
          setShowQRScanner(false);
        },
        (error) => {
          console.log('QR scan error:', error);
        }
      );
      
      qrScannerRef.current = scanner;
    }, 100);
  };

  const addItem = (epi) => {
    if (!selectedItems.find(item => item.epi_id === epi.id)) {
      setSelectedItems([...selectedItems, {
        epi_id: epi.id,
        name: epi.name,
        quantity: 1,
        size: epi.size,
        batch: epi.batch,
        qr_code: epi.qr_code
      }]);
    }
  };

  const removeItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const completeDelivery = async () => {
    if (selectedItems.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/deliveries`,
        {
          employee_id: selectedEmployee.id,
          delivery_type: deliveryType,
          is_return: deliveryType === 'return',
          facial_match_score: facialMatch?.score,
          items: selectedItems
        },
        { headers: getAuthHeader() }
      );

      toast.success(
        deliveryType === 'delivery' 
          ? 'Entrega registrada com sucesso!' 
          : 'Devolução registrada com sucesso!'
      );
      
      resetForm();
    } catch (error) {
      console.error('Erro ao registrar:', error);
      toast.error(error.response?.data?.detail || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setSelectedEmployee(null);
    setFacialMatch(null);
    setSelectedItems([]);
    setSearchTerm('');
    setEmployees([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="entrega-epi-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Entrega de EPI</h1>
          <p className="text-slate-600 mt-1">Registre entregas e devoluções de equipamentos</p>
        </div>

        {step === 'search' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Buscar Colaborador</h2>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  data-testid="search-employee"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchEmployees()}
                  placeholder="Digite nome, CPF ou empresa..."
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={searchEmployees}
                data-testid="search-button"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md px-6 py-2 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => selectEmployee(employee)}
                  className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all"
                  data-testid={`employee-card-${employee.id}`}
                >
                  <div className="flex items-center gap-3">
                    {employee.photo_path ? (
                      <img 
                        src={`${BACKEND_URL}${employee.photo_path}`}
                        alt={employee.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{employee.full_name}</p>
                      <p className="text-sm text-slate-500 font-mono">{employee.cpf}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        employee.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'verify' && selectedEmployee && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Verificar Colaborador</h2>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
              {selectedEmployee.photo_path ? (
                <img 
                  src={`${BACKEND_URL}${selectedEmployee.photo_path}`}
                  alt={selectedEmployee.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900">{selectedEmployee.full_name}</p>
                <p className="text-sm text-slate-600">CPF: {selectedEmployee.cpf}</p>
                <p className="text-sm text-slate-600">Empresa: {selectedEmployee.company_id || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-4">
              {!showWebcam ? (
                <>
                  <button
                    onClick={() => setShowWebcam(true)}
                    data-testid="start-facial-recognition"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capturar e Verificar Rosto
                  </button>
                  
                  <button
                    onClick={() => setStep('delivery')}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md px-4 py-3"
                  >
                    Pular Verificação
                  </button>
                </>
              ) : (
                <div>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-lg mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={captureAndVerifyFace}
                      disabled={loading}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md px-4 py-2 disabled:opacity-50"
                    >
                      {loading ? 'Verificando...' : 'Capturar'}
                    </button>
                    <button
                      onClick={() => setShowWebcam(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md px-4 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'delivery' && selectedEmployee && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Registrar Movimentação</h2>
                {facialMatch && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    facialMatch.verified
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {facialMatch.verified ? '✓ Rosto Verificado' : '⚠ Baixa Confiança'}
                  </span>
                )}
              </div>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex-1 py-3 rounded-md font-medium transition-all ${
                    deliveryType === 'delivery'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="delivery-type-delivery"
                >
                  Entrega
                </button>
                <button
                  onClick={() => setDeliveryType('return')}
                  className={`flex-1 py-3 rounded-md font-medium transition-all ${
                    deliveryType === 'return'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="delivery-type-return"
                >
                  Devolução
                </button>
              </div>

              <button
                onClick={startQRScanner}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-md px-4 py-3 flex items-center justify-center gap-2 mb-4"
                data-testid="start-qr-scanner"
              >
                <QrCode className="w-5 h-5" />
                Escanear QR Code
              </button>

              {showQRScanner && (
                <div id="qr-reader" className="mb-4"></div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ou selecione manualmente:
                </label>
                <select
                  onChange={(e) => {
                    const epi = epis.find(ep => ep.id === parseInt(e.target.value));
                    if (epi) addItem(epi);
                    e.target.value = '';
                  }}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  data-testid="select-epi"
                >
                  <option value="">Selecione um EPI...</option>
                  {epis.map((epi) => (
                    <option key={epi.id} value={epi.id}>
                      {epi.name} - Estoque: {epi.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              {selectedItems.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-sm font-medium text-slate-700">Itens selecionados:</p>
                  {selectedItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">Quantidade: {item.quantity}</p>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={completeDelivery}
                  disabled={loading || selectedItems.length === 0}
                  data-testid="complete-delivery"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {loading ? 'Processando...' : 'Confirmar'}
                </button>
                <button
                  onClick={resetForm}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md px-6 py-3"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
