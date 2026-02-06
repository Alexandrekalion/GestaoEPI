# Cipolatti - Sistema de Gestão de EPI

## Visão Geral
Sistema web para gestão de Equipamentos de Proteção Individual (EPI) com rastreamento de estoque, cadastro de kits, colaboradores (com foto), empresas e entrega de EPI exclusivamente por reconhecimento facial.

## Problema Original
O usuário solicitou um sistema completo com:
1. Identidade visual da empresa (ícone Cipolatti)
2. Controle de entrega/devolução de EPI por reconhecimento facial
3. Rastreamento de estoque com alertas visuais
4. Cadastro de kits, colaboradores, empresas e fornecedores
5. Sistema RBAC com perfis: Admin, Gestor, RH, Segurança do Trabalho, Almoxarifado
6. Contador de licença com bloqueio do sistema quando expirado
7. Conformidade LGPD para dados sensíveis

## Stack Técnica
- **Backend:** FastAPI (Python), MongoDB com motor (assíncrono)
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Autenticação:** JWT com políticas de senha e expiração (30 dias)

## Credenciais de Teste
- **Admin:** administrador / LR1a2b3c4567@
- **Almoxarifado:** almoxarifado_teste / Almox@123456
- **Segurança:** seguranca_teste / Teste@123456

---

## Funcionalidades Implementadas

### ✅ Concluído (06/02/2026)
- [x] Migração completa de PostgreSQL para MongoDB
- [x] Login e autenticação JWT
- [x] Sistema RBAC com 5 perfis de acesso
- [x] Políticas de senha (complexidade + expiração 30 dias)
- [x] Dashboard com cards interativos (dados estáticos)
- [x] Cadastro de Empresas, Fornecedores, EPIs
- [x] Gestão de Kits com EPIs
- [x] Gestão de Colaboradores com foto
- [x] Tela de Entrega de EPI (UI para reconhecimento facial)
- [x] Tela de Configurações (contador de licença)
- [x] Tela de Usuários com gestão de perfis e reset de senha
- [x] Ícone da empresa no login e sidebar
- [x] Layout de tabela com ações em Empresas, Fornecedores, Kits

### 🔧 Corrigido Hoje (06/02/2026)
- [x] **Bug Kits:** Descrição dos itens (EPIs) agora exibe corretamente em visualização, edição e impressão
- [x] **Bug Sidebar:** Ícone da empresa agora carrega corretamente no menu lateral

---

## Backlog Priorizado

### P0 - Crítico
- [ ] **Implementar Reconhecimento Facial Real**
  - Integrar face-api.js ou similar
  - Capturar imagem da webcam
  - Processar e comparar com templates cadastrados
  - Retornar colaborador correspondente

### P1 - Alta Prioridade
- [ ] **Dashboard Dinâmico (BI)**
  - Conectar cards aos endpoints de stats reais
  - GET /api/stats/low-stock
  - GET /api/stats/expiring-epis
  
- [ ] **Alertas Visuais de Estoque**
  - Amarelo para estoque baixo
  - Vermelho para zerado/vencido
  - Unificar na tela de Cadastro EPI

### P2 - Média Prioridade
- [ ] Teste completo RBAC para perfis RH e Gestor
- [ ] Funcionalidade de Impressão em todas as telas
- [ ] Importação de Colaboradores via Excel/CSV

### P3 - Futuro
- [ ] "Esqueci minha senha" (integrar Resend/SendGrid)
- [ ] Relatórios de entregas por período
- [ ] Histórico de movimentações por EPI

---

## Arquitetura de Arquivos

```
/app/
├── backend/
│   ├── server.py       # API FastAPI com todas as rotas
│   ├── schemas.py      # Modelos Pydantic
│   ├── database.py     # Conexão MongoDB
│   ├── auth.py         # Autenticação JWT
│   ├── seed.py         # Seed de dados iniciais
│   └── tests/          # Testes pytest
└── frontend/
    ├── public/
    │   └── icone-cipolatti.png
    ├── src/
    │   ├── pages/      # Login, Dashboard, Kits, etc.
    │   ├── components/ # Layout, Sidebar
    │   └── contexts/   # AuthContext
    └── .env
```

## Endpoints Principais
- POST /api/auth/login
- GET /api/auth/me
- CRUD /api/users, /api/companies, /api/employees, /api/epis, /api/kits, /api/suppliers
- POST /api/deliveries
- GET /api/license, POST /api/license/add-days
- GET /api/dashboard/stats
