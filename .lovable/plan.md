# Ocultar a opção de pagamento por Pix (só no front)

Objetivo: o botão "Pix" some da tela de pagamento, então nenhum cliente consegue gerar QR Code. Todo o resto (edge functions, segredos, componentes) fica intacto para reativar depois com o novo Access Token.

## O que muda para o cliente

- Na escolha de pagamento aparecem apenas: Dinheiro, Débito e Crédito (na entrega).
- Como Pix não pode mais ser escolhido, nunca aparece a tela de QR Code / chave copia e cola.
- O CPF só era pedido no Pix, então deixa de aparecer na prática.
- Se alguém tiver um perfil salvo com Pix como forma preferida, o site sugere Dinheiro.

## O que continua igual

- Pedidos por Dinheiro, Débito e Crédito seguem normais (inclusive o troco).
- Telegram/WhatsApp, painel admin e histórico de pedidos seguem iguais.
- Pedidos antigos pagos por Pix continuam no histórico com os rótulos atuais.

## Detalhes técnicos

- `src/components/OrderModal.tsx`: remover apenas `"pix"` da lista `availablePayments` (entrega e retirada) e trocar o fallback do perfil de `"pix"` para `"dinheiro"`. Todo o código do fluxo Pix (passo `pix`, `pixData`, `createPixPayment`, bloco de CPF) permanece no arquivo, apenas inalcançável.
- `src/components/ProductCard.tsx`: ajustar o texto que cita Pix.
- Nada é apagado: `PixPaymentDisplay.tsx`, `PaymentStatus.tsx`, `paymentService.ts` e `payment.types.ts` ficam como estão.
- Backend intocado: `create-pix-payment`, `check-payment-status` e `mercadopago-webhook` continuam publicadas.
- Segredos `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` permanecem — você troca o Access Token quando quiser reativar.

## Para reativar depois

Basta recolocar `"pix"` em `availablePayments` e atualizar o Access Token / assinatura secreta da nova conta.
