
# ServiYama

<div align="center">

![Status](https://img.shields.io/badge/Status-Em%20Produção-brightgreen)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000000?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=000)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)
![EAS Build](https://img.shields.io/badge/EAS-Build-23272F?logo=expo&logoColor=white)

**Aplicativo mobile e web para gestão de serviços técnicos da Yamamotto, com fluxo ponta a ponta para técnicos e administração, evidências digitais e painel administrativo integrado.**

</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Executar](#-como-executar)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Build e Distribuição](#-build-e-distribuição)
- [Deploy Web (Vercel)](#-deploy-web-vercel)
- [Troubleshooting](#-troubleshooting)
- [Qualidade](#-qualidade)
- [Roadmap](#-roadmap)
- [Equipe](#-equipe)
- [Contribuição](#-contribuição)

---

## 🎯 Visão Geral

O **ServiYama** foi desenvolvido para profissionalizar a operação de serviços em campo, reduzindo retrabalho e aumentando a rastreabilidade.

### 🔍 Problemas Resolvidos
- Falta de padrão na finalização de atendimento
- Baixa visibilidade operacional para o administrativo
- Dificuldade de auditoria de serviços concluídos
- Processos manuais para acompanhamento da agenda dos técnicos

### 💡 Solução Entregue
- Fluxo mobile e web único para técnico e admin
- Dados operacionais conectados com backend real
- Registro de evidência (foto e assinatura) por atendimento
- Painel administrativo com leitura consolidada de pedidos, técnicos e relatórios

---

## ⚡ Funcionalidades

### 👨‍🔧 Técnico
- Autenticação e recuperação de senha
- Agenda e histórico de serviços
- Detalhes completos do pedido
- Conclusão com checklist, foto única e assinatura
- Registro de observação quando checklist não é concluído
- Notificação local de novos serviços atribuídos

### 🏢 Administração
- Visão geral de pedidos e status
- Tela de técnicos com dados reais da API
- Relatórios operacionais
- Tratamento de erros de carga com feedback visual

---

## 🛠 Tecnologias

### Mobile & Web
```
Expo SDK 54      - Plataforma de apps multiplataforma
React 19         - UI declarativa
React Native 0.81- Mobile nativo
React Navigation - Navegação
```

### Estado, Validação e UX
```
Context API      - Gerenciamento de estado
Formik           - Formulários
Yup              - Validação
```

### Integração e Build
```
API HTTP         - Fallback entre hosts
EAS Build        - Android e iOS
Vercel           - Deploy web
```

---

## 🗂 Estrutura do Projeto

Principais diretórios:
- [screens](screens)
- [components](components)
- [navigation](navigation)
- [context](context)
- [constants](constants)
- [hooks](hooks)
- [assets/images](assets/images)

Arquivos de configuração:
- [app.json](app.json)
- [eas.json](eas.json)
- [package.json](package.json)

---

## 🚀 Como Executar

### Pré-requisitos
```
Node.js 18+
npm
Conta Expo (para build EAS)
```

### Instalação
```bash
npm install
```

### Executar em desenvolvimento
```bash
npm.cmd run start
```

Execução por plataforma:
- Android: `npm.cmd run android`
- iOS (macOS): `npm.cmd run ios`
- Web: `npm.cmd run web`

---

## 🔑 Variáveis de Ambiente

Para acesso a rotas administrativas, configure:
- `EXPO_PUBLIC_ADMIN_API_KEY`

Exemplo de arquivo `.env.local`:
```env
EXPO_PUBLIC_ADMIN_API_KEY=seu_token_admin_aqui
```

---

## 🏗 Build e Distribuição

### Android APK (instalação direta)
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

### Configuração atual
No arquivo [eas.json](eas.json):
- `preview`: Android APK (internal)
- `production`: Android AAB
- `ios-simulator`: build de simulador
No arquivo [app.json](app.json):
- Nome do app: ServiYama
- Slug EAS legado: yamaservios
- Android package: com.yamamotto.yamaservios
- iOS bundleIdentifier: com.yamamotto.yamaservios

---

## 🌐 Deploy Web (Vercel)

### Passo a Passo
1. Gere o build web:
	```bash
	npm run build:web
	```
2. Copie a pasta `dist/` para o repositório de deploy (repo dist) e faça push.
3. O Vercel detecta o push e faz o deploy automaticamente.

**Se a tela ficar branca:**
- Abra o DevTools (F12) → Console, tire print dos erros e envie para análise.

---

## 🛡 Troubleshooting

### 1. PowerShell bloqueia npm
Se houver erro de ExecutionPolicy, use `npm.cmd` e `npx.cmd` no lugar de `npm` e `npx`.

### 2. Build em modo CI não interativo
Antes de iniciar start/build no terminal local:
```powershell
Remove-Item Env:CI
```

### 3. Diagnóstico de ambiente Expo
```bash
npx.cmd expo-doctor
```

### 4. Erro de acesso admin no app
Confirme se `EXPO_PUBLIC_ADMIN_API_KEY` está configurada no ambiente em execução.

---

## 🧪 Qualidade

### Lint
```bash
npm.cmd run lint
```

### Health check
```bash
npx.cmd expo-doctor
```

---

## 🗺 Roadmap

- Melhorar cobertura de testes automatizados
- Adicionar pipeline de release com versionamento semântico
- Publicar guia de observabilidade (logs e métricas)
- Incluir seção de demonstração visual com capturas das telas

---

## 👥 Equipe

Projeto: **ServiYama**  
Time: Yamamotto

---

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:
1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. **Commit** suas mudanças (`git commit -m 'feat: NovaFuncionalidade'`)
4. **Push** para a branch (`git push origin feature/NovaFuncionalidade`)
5. **Abra** um Pull Request

---

<div align="center">

**Desenvolvido com ❤️ pela equipe ServiYama**

[⬆️ Voltar ao topo](#serviyama)

</div>
