# CasalFinance — TODO / Ideias

## Bugs
- [x] Email whitelist ✅
- [ ] Lógica de acerto invertida (A deve 100, acerta 100, fica devendo 200)

## Funcionalidades
- [ ] Registrar gastos com divisão customizada (não só 50/50):
  - A pagou 100% de uma despesa que era de B (e vice versa)
  - Conta de R$300 dividida 50/50, mas A pagou R$150 e B pagou R$150 (ou qualquer %
  - Ex: A pagou 70%, B pagou 30% de um gasto compartilhado
- [ ] Editar transação já registrada
- [ ] Categorias customizadas pelo usuário
- [ ] Relatório mensal em PDF exportável
- [ ] Notificação push quando o outro registrar despesa

## UX / Design
- [ ] Modo offline mais robusto (IndexedDB?)
- [ ] Gráfico de evolução patrimonial
- [ ] Trocar avatar/emoji dos usuários

## Infra
- [ ] CI/CD: tests rodando antes do deploy
- [ ] Firebase Analytics

## Dívidas Técnicas
- [ ] TypeScript (o código é JS puro)
- [ ] Separar App.jsx em arquivos menores (hooks, components)