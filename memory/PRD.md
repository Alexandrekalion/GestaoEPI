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
- **Reconhecimento Facial:** face-api.js (TensorFlow.js)

## Credenciais de Teste
- **Admin:** administrador / LR1a2b3c4567@
- **Almoxarifado:** almoxarifado_teste / Almox@123456
- **Segurança:** seguranca_teste / Teste@123456

---

## Funcionalidades Implementadas

### ✅ Concluído (07/02/2026)
- [x] Migração completa de PostgreSQL para MongoDB
- [x] Login e autenticação JWT
- [x] Sistema RBAC com 5 perfis de acesso
- [x] Políticas de senha (complexidade + expiração 30 dias)
- [x] Dashboard com cards interativos e navegação filtrada
- [x] Cadastro de Empresas, Fornecedores, EPIs
- [x] Gestão de Kits com EPIs (bug de descrição corrigido)
- [x] Gestão de Colaboradores com foto grande na lista
- [x] Tela de Entrega de EPI com reconhecimento facial obrigatório
- [x] Tela de Configurações (contador de licença)
- [x] Tela de Usuários com gestão de perfis e reset de senha
- [x] Ícone da empresa no login e sidebar

### ✅ Implementado Hoje (07/02/2026)
- [x] **Dashboard Interativo:**
  - Clicar em "Estoque Baixo" → vai para EPIs filtrados por estoque baixo
  - Clicar em "Validade Próxima" → vai para EPIs próximos do vencimento
  - Filtros visuais com botões (Todos, Estoque Baixo, Vencimento)
  - Alertas visuais: linhas laranjas para estoque baixo, vermelhas para vencidos
  
- [x] **Layout Responsivo Mobile:**
  - Menu hamburger no mobile
  - Sidebar deslizante com overlay
  - Colaboradores em cards (não tabela) no mobile
  - EPIs com tabela responsiva

- [x] **Reconhecimento Facial Otimizado:**
  - Cache de templates faciais (carrega uma vez)
  - Detecção contínua de rosto em tempo real
  - Feedback visual: borda verde quando rosto detectado
  - Status: "Aguardando rosto..." / "Pronto para capturar!"
  - Botão só ativa quando rosto é detectado
  - Qualidade de imagem 1280x720 para melhor precisão

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] Teste completo RBAC para perfis RH e Gestor

### P2 - Média Prioridade
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
    │   ├── icone-cipolatti.png
    │   └── models/     # Modelos face-api.js
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.js            # Cards interativos
    │   │   ├── EPIs.js                 # Filtros + alertas visuais
    │   │   ├── Colaboradores.js        # Fotos + layout mobile
    │   │   ├── ColaboradorDetalhes.js  # Biometria otimizada
    │   │   └── EntregaEPI.js           # Reconhecimento facial
    │   ├── components/layout/
    │   │   ├── DashboardLayout.js      # Layout responsivo
    │   │   └── Sidebar.js              # Menu mobile
    │   └── contexts/
    └── .env
```

## Endpoints Principais
- POST /api/auth/login
- GET /api/auth/me
- CRUD /api/users, /api/companies, /api/employees, /api/epis, /api/kits, /api/suppliers
- GET, POST, DELETE /api/employees/{id}/facial-templates
- POST /api/deliveries
- GET /api/license, POST /api/license/add-days
- GET /api/dashboard/stats
- GET /api/stock/alerts

## Fluxo de Reconhecimento Facial
1. **Cadastrar colaborador** com foto (tela Colaboradores)
2. **Cadastrar template facial** na aba Biometria da ficha do colaborador
   - Detecção em tempo real mostra borda verde quando rosto detectado
   - Botão "Capturar Agora" só ativa com rosto detectado
3. **Entrega de EPI:** Sistema compara rosto capturado com templates cadastrados
4. Se match >= 40%, identifica colaborador e libera entrega
