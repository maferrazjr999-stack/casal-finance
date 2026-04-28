# AGENTS.md — CasalFinance

## Visão Geral

App PWA de finanças para casais. Dois usuários (A e B) registram despesas compartilhadas ou individuais. O sistema calcula quem deve pra quem ("acerto").

## Stack

- React + Vite (JSX, sem TypeScript)
- Firebase Firestore + Google Auth
- Vercel (produção)
- PWA (Service Worker + manifest)
- localStorage como cache offline

## Arquitetura

### App.jsx
- **State:** `state` (users, transactions, onboarded), `loading`
- **Auth:** Firebase Auth via Google (popup + redirect)
- **Sync:** `subscribeState` do firebase.js (onSnapshot)
- **Update:** `update` callback — salva no localStorage E no Firestore
- **Theme:** dark/light via `prefers-color-scheme`

### firebase.js
```js
subscribeState(callback)    // onSnapshot em state/main
saveState(state)          // setDoc com merge
```

### Transactions
Cada transação tem:
```js
{
  id: number,
  desc: string,
  value: number,
  date: "YYYY-MM-DD",
  paidBy: "A" | "B",
  type: "shared" | "individual",
  category: string
}
```

Transferências têm `type: "transfer"` + `from/to`.

### Balanço
```
balance > 0  → B deve R$ balance pra A
balance < 0  → A deve R$ |balance| pra B
```

## Padrões de Código

### Estado local
```jsx
const [state, setState] = useState(() => loadLocal() || DEFAULT_STATE);
```

### Atualizar state
```jsx
const update = useCallback((fn) => {
  setState(prev => {
    const next = fn(prev);
    saveLocal(next);
    saveState(next); // Firebase (async)
    return next;
  });
}, []);
```

### Commit messages
Formato: `type: description`
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `refactor:` refatoração
- `style:` CSS/styling only
- `docs:` documentação

## Fluxo de Trabalho

1. Editar arquivos em `casal-finance/src/`
2. Testar local: `npm run dev`
3. Build: `npm run build`
4. Commit: `git add . && git commit -m "feat: descrição" && git push`
5. Vercel rebuilda automático

## Importante

- Service Worker gerencia cache offline
- Ícones PWA são gerados via Canvas no index.html (dinâmicos)
- Auth: popup funciona em desktop, redirect é fallback pra mobile
- Dados não têm delete real —心虚 removidas do array local

## Atalhos

Para fazer deploy manual (sem git):
```bash
cd /home/workspace/casal-finance && npm run build && vercel --prod --yes
```
