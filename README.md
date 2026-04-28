# CasalFinance

App PWA de controle financeiro para casais. Registre despesas compartilhadas, acompanhe quem pagou o quê, e veja o balanço entre parceiros.

## Stack

- **Frontend:** React + Vite (JSX)
- **Backend:** Firebase (Firestore + Auth com Google)
- **Deploy:** Vercel (auto-deploy via GitHub)
- **PWA:** Service Worker + manifest (ícones gerados dinamicamente)

## Funcionalidades

- Login com Google (popup + redirect)
- Cadastro de despesas (compartilhada ou individual)
- Transferências entre parceiros (acerto de contas)
- Gráficos de gasto por categoria (donut)
- Evolução mensal (bar chart)
- Histórico com filtros (mês, categoria)
- Exportar CSV
- Sync em tempo real via Firebase Firestore
- Modo offline (localStorage como fallback)
- Dark mode automático

## Estrutura

```
casal-finance/
├── public/
│   ├── index.html          # HTML com PWA meta tags + SW registration
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service Worker (cache)
│   ├── icon-192.png       # Ícone PWA 192x192
│   ├── icon-512.png       # Ícone PWA 512x512
│   └── favicon.svg
├── src/
│   ├── App.jsx            # Componente principal (todo o app)
│   ├── firebase.js        # Firebase init + sync (Firestore + Auth)
│   └── main.jsx           # Entry point React
├── vercel.json            # Config deploy Vercel
├── package.json
└── vite.config.js
```

## Firebase

Projeto: `casal-finance-a2bde` (Firestore + Google Auth)

Estrutura do Firestore:
- `state/main` — documento com `users`, `transactions`, `onboarded`
- `transactions` — sub-coleção (futuro)

Regras de segurança: apenas usuários autenticados com Google leem/escrevem.

## Setup local

```bash
cd casal-finance
npm install
npm run dev      # dev server em localhost:5173
npm run build    # build de produção → dist/
```

## Deploy

```bash
git add . && git commit -m "descrição" && git push
# Vercel rebuilda automático via GitHub integration
```

## URLs

- **Produção:** https://casal-finance-psi.vercel.app
- **GitHub:** https://github.com/maferrazjr999-stack/casal-finance
