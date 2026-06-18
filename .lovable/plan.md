## Objetivo

No resumo do pedido (tela "Finalizar Pedido"), quando a forma de pagamento for **Dinheiro**, perguntar se o cliente precisa de troco e, em caso afirmativo, para quanto. Só permitir enviar o pedido após essa escolha.

## Mudanças

### 1. `src/components/OrderModal.tsx` (frontend)
- Novos estados: `needsChange: boolean | null` e `changeFor: string` (valor em reais digitado pelo cliente).
- Resetar esses estados quando a forma de pagamento mudar para algo diferente de "dinheiro".
- Dentro do bloco do resumo (step `confirm`), logo após o card de Entrega/Pagamento e **somente quando `payment === "dinheiro"`**, renderizar um novo card "Troco" com:
  - Pergunta "Precisa de troco?" e dois botões grandes (estilo já usado no projeto): **Sim** / **Não**.
  - Se "Sim" selecionado: input numérico "Troco para quanto?" com máscara em R$, validando que o valor seja **maior que o total do pedido**.
- Botão "Enviar Pedido" desabilitado enquanto:
  - `payment === "dinheiro"` e `needsChange === null`, ou
  - `needsChange === true` e `changeFor` inválido (vazio, não numérico ou ≤ total).
- Ao enviar, incluir nos dados do pedido:
  - `change_for`: número (valor da nota) quando precisa de troco
  - `change_amount`: `change_for - total` (calculado no submit, apenas para exibição/uso pela cozinha)
  - quando "Não": enviar `change_for: null` / flag "sem troco"

### 2. Mensagem do WhatsApp (backend)
- Em `supabase/functions/create-order/index.ts`, na montagem da mensagem do pedido em dinheiro, acrescentar uma linha:
  - "Troco para R$ X,XX (levar R$ Y,YY de troco)" — quando precisa de troco
  - "Não precisa de troco" — caso contrário
- Aceitar os novos campos `change_for` / `needs_change` no payload da função e validá-los no servidor (se dinheiro + needs_change=true, exigir change_for > total).

### 3. Persistência
- Salvar `needs_change` (boolean) e `change_for` (numeric, nullable) na tabela `orders` via migração, para histórico do pedido.

## Fora de escopo
- Mapa/pin de localização (adiado conforme pedido).
- Mudanças em outras formas de pagamento (PIX, débito, crédito permanecem iguais).
