# Desativar o pagamento por Pix

Objetivo: o cliente não vê mais a opção Pix e o sistema não gera mais QR Code nem chave "copia e cola".

## O que muda para o cliente

- Na escolha de pagamento aparecem apenas: Dinheiro, Débito e Crédito (na entrega).
- Nada de tela de QR Code, chave Pix, contagem regressiva ou "aguardando pagamento".
- O CPF deixa de ser pedido (ele só existia por causa do Pix).
- Na vitrine do produto, o texto passa de "Pix ou dinheiro" para "Dinheiro, débito ou crédito na entrega".
- Se alguém tiver um perfil salvo com Pix como forma preferida, o site passa a sugerir Dinheiro.

## O que continua igual

- Pedidos por Dinheiro, Débito e Crédito seguem normais (inclusive o troco).
- Envio para Telegram/WhatsApp e o painel admin continuam funcionando.
- Pedidos antigos pagos por Pix continuam no histórico e no painel, com os rótulos atuais.

## Detalhes técnicos

- `src/components/OrderModal.tsx`: remover `"pix"` de `availablePayments`, remover o passo `pix`, o estado `pixData/pixLoading/pixError`, os handlers `handlePixApproved`/`handlePixExpired`, a chamada a `createPixPayment`, o bloco de CPF e os avisos de QR Code. Fallback do perfil passa a `"dinheiro"`.
- Remover os componentes/serviços que ficam sem uso: `src/components/PixPaymentDisplay.tsx`, `src/components/PaymentStatus.tsx`, `src/services/paymentService.ts`, `src/types/payment.types.ts`.
- `src/components/ProductCard.tsx`: ajustar os textos que citam Pix.
- Backend: manter as edge functions `create-pix-payment`, `check-payment-status` e `mercadopago-webhook` no projeto, mas sem uso pelo front. Como os segredos do Mercado Pago já foram removidos, elas não geram cobrança. Se você preferir, também posso excluí-las de vez — me avise.
- `src/pages/Admin.tsx` e `MyOrdersModal`: rótulos de status mantidos (referem-se a pedidos antigos).
