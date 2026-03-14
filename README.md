# ServiYama

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000000?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=000)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![EAS Build](https://img.shields.io/badge/EAS-Build-23272F?logo=expo&logoColor=white)](https://docs.expo.dev/build/introduction/)

Aplicativo mobile de operacao de servicos tecnicos da Yamamotto. O projeto cobre o fluxo ponta a ponta para tecnico e administracao, com conclusao de servico por checklist, foto e assinatura, alem de painel administrativo com dados reais de API.

## Indice

- [Visao Geral](#visao-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Executar](#como-executar)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Build e Distribuicao](#build-e-distribuicao)
- [Troubleshooting](#troubleshooting)
- [Qualidade](#qualidade)
- [Roadmap](#roadmap)

## Visao Geral

O ServiYama foi desenvolvido para profissionalizar a operacao de servicos em campo, reduzindo retrabalho e aumentando rastreabilidade.

### Problemas resolvidos

- Falta de padrao na finalizacao de atendimento
- Baixa visibilidade operacional para o administrativo
- Dificuldade de auditoria de servicos concluidos
- Processos manuais para acompanhamento da agenda dos tecnicos

### Solucao entregue

- Fluxo mobile unico para tecnico e admin
- Dados operacionais conectados com backend real
- Registro de evidencia (foto e assinatura) por atendimento
- Painel administrativo com leitura consolidada de pedidos, tecnicos e relatorios

## Funcionalidades

### Tecnico

- Autenticacao e recuperacao de senha
- Agenda e historico de servicos
- Detalhes completos do pedido
- Conclusao com checklist, foto unica e assinatura
- Registro de observacao quando checklist nao e concluido
- Notificacao local de novos servicos atribuidos

### Administracao

- Visao geral de pedidos e status
- Tela de tecnicos com dados reais da API
- Relatorios operacionais
- Tratamento de erros de carga com feedback visual

## Tecnologias

### Mobile

- Expo SDK 54
- React 19
- React Native 0.81
- React Navigation

### Estado, validacao e UX

- Context API
- Formik
- Yup

### Integracao e build

- API HTTP com fallback entre hosts
- EAS Build para Android e iOS

## Estrutura do Projeto

Principais diretorios do projeto:

- [screens](screens)
- [components](components)
- [navigation](navigation)
- [context](context)
- [constants](constants)
- [hooks](hooks)
- [assets/images](assets/images)

Arquivos de configuracao importantes:

- [app.json](app.json)
- [eas.json](eas.json)
- [package.json](package.json)

## Como Executar

### Pre-requisitos

- Node.js 18 ou superior
- npm
- Conta Expo (para build com EAS)

### Instalacao

```bash
npm install
```

### Executar em desenvolvimento

```bash
npm.cmd run start
```

Execucao por plataforma:

- Android: `npm.cmd run android`
- iOS (macOS): `npm.cmd run ios`
- Web: `npm.cmd run web`

## Variaveis de Ambiente

Para acesso a rotas administrativas, configure:

- `EXPO_PUBLIC_ADMIN_API_KEY`

Exemplo de arquivo `.env.local`:

```env
EXPO_PUBLIC_ADMIN_API_KEY=seu_token_admin_aqui
```

## Build e Distribuicao

### Android APK (instalacao direta)

```bash
npm.cmd run build:apk
```

### Android AAB (Play Store)

```bash
npm.cmd run build:aab
```

### iOS simulador (sem conta Apple paga)

```bash
npx.cmd eas-cli build --platform ios --profile ios-simulator
```

### iOS dispositivo real / TestFlight

Requer conta Apple Developer paga.

```bash
npx.cmd eas-cli build --platform ios --profile preview
```

### Configuracao atual

No arquivo [eas.json](eas.json):

- `preview`: Android APK (internal)
- `production`: Android AAB
- `ios-simulator`: build de simulador

No arquivo [app.json](app.json):

- Nome do app: ServiYama
- Slug EAS legado: yamaservios
- Android package: com.yamamotto.yamaservios
- iOS bundleIdentifier: com.yamamotto.yamaservios

## Troubleshooting

### 1. PowerShell bloqueia npm

Se houver erro de ExecutionPolicy, use `npm.cmd` e `npx.cmd` no lugar de `npm` e `npx`.

### 2. Build em modo CI nao interativo

Antes de iniciar start/build no terminal local:

```powershell
Remove-Item Env:CI
```

### 3. Diagnostico de ambiente Expo

```bash
npx.cmd expo-doctor
```

### 4. Erro de acesso admin no app

Confirme se `EXPO_PUBLIC_ADMIN_API_KEY` esta configurada no ambiente em execucao.

## Qualidade

Lint:

```bash
npm.cmd run lint
```

Health check:

```bash
npx.cmd expo-doctor
```

## Roadmap

- Melhorar cobertura de testes automatizados
- Adicionar pipeline de release com versionamento semantico
- Publicar guia de observabilidade (logs e metricas)
- Incluir secao de demonstracao visual com capturas das telas

## Equipe

Projeto: ServiYama  
Time: Yamamotto
