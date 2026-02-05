import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import ChangePassword from '@/pages/ChangePassword';
import Dashboard from '@/pages/Dashboard';
import EntregaEPI from '@/pages/EntregaEPI';
import Colaboradores from '@/pages/Colaboradores';
import Empresas from '@/pages/Empresas';
import EPIs from '@/pages/EPIs';
import Ferramentas from '@/pages/Ferramentas';
import Kits from '@/pages/Kits';
import Estoque from '@/pages/Estoque';
import EquipeExterna from '@/pages/EquipeExterna';
import Documentacao from '@/pages/Documentacao';
import Usuarios from '@/pages/Usuarios';
import Configuracoes from '@/pages/Configuracoes';
import Fornecedores from '@/pages/Fornecedores';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/entrega-epi" element={<PrivateRoute><EntregaEPI /></PrivateRoute>} />
      <Route path="/colaboradores" element={<PrivateRoute><Colaboradores /></PrivateRoute>} />
      <Route path="/empresas" element={<PrivateRoute><Empresas /></PrivateRoute>} />
      <Route path="/epis" element={<PrivateRoute><EPIs /></PrivateRoute>} />
      <Route path="/ferramentas" element={<PrivateRoute><Ferramentas /></PrivateRoute>} />
      <Route path="/kits" element={<PrivateRoute><Kits /></PrivateRoute>} />
      <Route path="/estoque" element={<PrivateRoute><Estoque /></PrivateRoute>} />
      <Route path="/equipe-externa" element={<PrivateRoute><EquipeExterna /></PrivateRoute>} />
      <Route path="/documentacao" element={<PrivateRoute><Documentacao /></PrivateRoute>} />
      <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
      <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
