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
- [x] Gestão de Kits com EPIs
- [x] Gestão de Colaboradores com foto grande na lista
- [x] Tela de Entrega de EPI com reconhecimento facial obrigatório
- [x] Tela de Configurações (contador de licença)
- [x] Tela de Usuários com gestão de perfis e reset de senha
- [x] Ícone da empresa no login e sidebar
- [x] Layout responsivo para smartphones

### ✅ Implementado Hoje (07/02/2026)
- [x] **Interface de Captura Ampliada:**
  - Área de webcam com fundo escuro para melhor contraste
  - Guia de enquadramento 64x80 (45% maior que antes)
  - Marcadores de canto para facilitar posicionamento
  - minHeight: 400px garantindo área visível adequada
  
- [x] **Processamento Facial Robusto:**
  - inputSize: 608 para maior precisão
  - Logs detalhados para debug (score, landmarks, descriptor)
  - Mensagens de erro específicas com % de qualidade
  - Tratamento de erros da API com detalhes
  
- [x] **Assinatura Facial no Histórico:**
  - Foto da captura exibida ao lado de cada entrega
  - Badge com % de match da verificação facial
  - Endpoint /api/deliveries/save-photo funcional
  - Campo facial_photo_path salvo em cada delivery

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

## Fluxo de Reconhecimento Facial

### Cadastro de Template
1. Colaboradores → Ver Ficha → Aba "Biometria Facial"
2. Clique em "Iniciar Captura Facial"
3. Posicione o rosto na área tracejada (verde = detectado)
4. Clique "Capturar Agora" quando borda ficar verde
5. Sistema salva descriptor de 128 dimensões no banco

### Entrega de EPI
1. Entrega de EPI → Posicione rosto na câmera
2. Clique "Identificar Colaborador"
3. Sistema compara com todos os templates cadastrados
4. Se match >= 40%, identifica e libera entrega
5. Foto da captura é salva como "assinatura facial"

### Validade Jurídica
- Cada entrega armazena:
  - facial_photo_path: foto do momento da entrega
  - facial_match_score: % de similaridade
  - delivered_by: responsável pela entrega
  - created_at: timestamp preciso
- Histórico do colaborador exibe foto ao lado de cada item

---

## Arquitetura de Arquivos

```
/app/
├── backend/
│   ├── server.py       # API FastAPI
│   ├── schemas.py      # Modelos Pydantic
│   └── uploads/deliveries/  # Fotos de entrega
└── frontend/
    ├── public/models/  # Modelos face-api.js
    ├── src/pages/
    │   ├── ColaboradorDetalhes.js  # Biometria + Histórico com foto
    │   └── EntregaEPI.js           # Reconhecimento + Captura
    └── src/components/layout/
        └── DashboardLayout.js      # Layout responsivo
```
