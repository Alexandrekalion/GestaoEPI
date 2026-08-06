# GestaoEPI

Sistema web para gestao de equipamentos de protecao individual, colaboradores, estoque e registros de entrega.

## Visao geral

O GestaoEPI e uma versao historica da familia de sistemas de controle de EPIs. O projeto organiza cadastros operacionais, controle de estoque, kits, fornecedores e fluxo de entrega em uma aplicacao full stack com frontend React e backend FastAPI.

O repositorio permanece como registro da evolucao do produto, anterior as versoes mais recentes ja existentes na conta.

## Problema resolvido

Empresas que controlam EPIs manualmente podem ter dificuldade para acompanhar estoque, validade, responsaveis, historico de entrega e rastreabilidade. Este projeto centraliza essas informacoes em uma interface web, reduzindo dispersao de dados e apoiando rotinas de seguranca do trabalho.

## Publico e contexto de uso

- Equipes de seguranca do trabalho.
- Almoxarifado e setores responsaveis por entregas.
- Gestores que precisam consultar estoque, colaboradores e registros operacionais.

## Principais funcionalidades confirmadas

- Autenticacao de usuarios.
- Dashboard com indicadores operacionais.
- Cadastro de colaboradores.
- Cadastro de empresas, fornecedores, EPIs e ferramentas.
- Gestao de kits de EPIs.
- Controle de estoque e alertas de validade ou quantidade.
- Registro de entrega de EPIs.
- Recursos de QR Code e reconhecimento facial identificados no codigo.
- Documentacao operacional presente no repositorio.

## Como funciona

O backend disponibiliza uma API FastAPI para autenticar usuarios, persistir cadastros e processar operacoes. O frontend React consome essa API e organiza os modulos em telas de dashboard, cadastros, estoque, kits e entregas.

## Tecnologias utilizadas

- Python
- FastAPI
- MongoDB
- React
- JavaScript
- Tailwind CSS
- face-api.js
- html5-qrcode
- ReportLab e OpenPyXL identificados nas dependencias

## Arquitetura resumida

- `backend/`: API, modelos, autenticacao, banco de dados, seed e testes.
- `frontend/`: aplicacao React, paginas, componentes, contexto de autenticacao e assets.
- `tests/` e `backend/tests/`: testes e verificacoes do backend.
- `test_reports/`: registros de execucoes de teste.
- `memory/`: documentacao historica de produto.

## Status

Versao historica. O repositorio parece representar uma etapa inicial da evolucao do GestaoEPI e nao deve ser apresentado como versao principal atual.

## Relacao com outras versoes

Ha repositorios mais recentes da mesma familia, incluindo `GestaoEPI-v2`, `GestaoEPI-v3`, `GestaoEPI-V4` e versoes 5.x. Esta versao deve ser usada como referencia de evolucao do produto.

## Limitacoes conhecidas

- A documentacao original indica que alguns recursos de reconhecimento facial dependem de modelos e configuracao local.
- Por ser uma versao antiga, o repositorio deve passar por revisao de seguranca antes de qualquer divulgacao ampla.
- Nao ha confirmacao de uso em producao.

## Participacao no desenvolvimento

O projeto demonstra atuacao em desenvolvimento full stack, modelagem de rotinas operacionais, integracao entre frontend e backend, organizacao de cadastros, controle de estoque e evolucao incremental de um sistema empresarial.

## Autoria

Desenvolvido por Michele Santana — Kalion Tecnologia
