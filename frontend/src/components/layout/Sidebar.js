import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Building2, 
  HardHat, 
  Wrench, 
  Box, 
  UserCog, 
  FileText, 
  UsersRound, 
  Settings,
  LogOut,
  Truck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/entrega-epi', icon: HardHat, label: 'Entrega de EPI', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/colaboradores', icon: Users, label: 'Colaboradores', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/empresas', icon: Building2, label: 'Empresas', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/epis', icon: Package, label: 'Cadastro EPI', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/ferramentas', icon: Wrench, label: 'Ferramentas', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/kits', icon: Box, label: 'Kits', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/estoque', icon: Package, label: 'Estoque', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/equipe-externa', icon: UsersRound, label: 'Equipe Externa', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/documentacao', icon: FileText, label: 'Documentação', roles: ['super_admin', 'admin', 'gestor'] },
    { path: '/usuarios', icon: UserCog, label: 'Usuários', roles: ['super_admin', 'admin'] },
    { path: '/configuracoes', icon: Settings, label: 'Configurações', roles: ['super_admin'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="w-64 bg-slate-900 min-h-screen flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-md flex items-center justify-center">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">Cipolatti</h1>
            <p className="text-slate-400 text-xs">Gestão de EPI</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.path.replace('/', '')}`}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-3 py-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            <p className="text-slate-400 text-xs truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          data-testid="logout-button"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );
};
