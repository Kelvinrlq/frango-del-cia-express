## Objetivo

Apenas remover o segredo `MERCADOPAGO_ACCESS_TOKEN` (e opcionalmente `MERCADOPAGO_WEBHOOK_SECRET`) para você ver, na prática, o que acontece no fluxo Pix sem token. Nenhuma mudança de código.

## Ação

1. Deletar o segredo `MERCADOPAGO_ACCESS_TOKEN`.
2. Deletar o segredo `MERCADOPAGO_WEBHOOK_SECRET` (opcional — me confirma se quer tirar esse também).

## Comportamento esperado sem token

- Ao tentar pagar via Pix, a Edge Function `create-pix-payment` vai chamar a API do Mercado Pago com `Authorization: Bearer undefined` → o MP retorna `401 Unauthorized`.
- A função vai marcar o pedido como `failed` no banco e devolver `500` com `{ error: "Erro ao gerar pagamento PIX" }`.
- No front, aparece um toast/erro genérico de falha ao gerar Pix. Nenhum QR code é exibido.
- Dinheiro / débito / crédito continuam funcionando normalmente (não dependem desse token).

Depois você me envia os tokens novos e eu ajusto.

Confirma que posso remover?