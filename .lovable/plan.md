

# Integração Mercado Pago PIX

## Resumo

Integrar pagamento PIX via Mercado Pago quando o cliente escolher PIX. Em vez de apenas mandar a mensagem WhatsApp pedindo PIX, o sistema vai gerar um QR Code real do Mercado Pago com o valor exato, o cliente paga, e o sistema detecta o pagamento antes de enviar o pedido pelo WhatsApp.

## Passo 1: Configurar Secret

Adicionar o Access Token de teste do Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN`) como secret no Supabase.

## Passo 2: Criar tabelas no banco

- **`orders`**: id, customer_name, customer_phone, total_amount, payment_status (pending/paid/failed/cancelled), items (JSONB), order_type, delivery_info (JSONB), created_at
- **`payments`**: id, order_id (FK), mercadopago_payment_id, amount, status, pix_key, qr_code, qr_code_base64, expires_at, created_at

Sem RLS (app público, sem autenticação).

## Passo 3: Criar 3 Edge Functions

### `create-pix-payment`
- Recebe dados do pedido (valor, email, itens)
- Cria pedido na tabela `orders`
- Chama API Mercado Pago `POST /v1/payments` com `payment_method_id: "pix"`
- Salva resposta na tabela `payments`
- Retorna QR Code + chave PIX + data de expiração

### `check-payment-status`
- Recebe `payment_id`
- Consulta API Mercado Pago `GET /v1/payments/{id}`
- Atualiza status no banco se mudou
- Retorna status atual

### `mercadopago-webhook`
- Recebe notificações do Mercado Pago
- Atualiza status do pagamento e do pedido no banco
- Retorna 200 OK

## Passo 4: Criar componentes frontend

### `src/types/payment.types.ts`
Interfaces para PixPaymentData, PaymentStatusData.

### `src/services/paymentService.ts`
Funções: `createPixPayment()`, `checkPaymentStatus()`.

### `src/components/PixPaymentDisplay.tsx`
- QR Code (imagem base64)
- Chave PIX copiável com botão "Copiar"
- Valor formatado
- Countdown timer (30 min)
- Instruções ao cliente

### `src/components/PaymentStatus.tsx`
- Polling a cada 3 segundos
- Estados visuais: aguardando (spinner), confirmado (check verde), erro (X vermelho)
- Auto-para polling após aprovação ou 30 min

## Passo 5: Modificar OrderModal.tsx

Quando o pagamento for **PIX** (entrega ou retirada):
1. Ao clicar "Enviar Pedido", em vez de abrir WhatsApp direto, chama `create-pix-payment`
2. Exibe novo step `"pix"` com o componente PixPaymentDisplay
3. Monitora pagamento com polling (PaymentStatus)
4. Quando pagamento aprovado → envia mensagem WhatsApp automaticamente + tela de sucesso

Quando o pagamento for **dinheiro/débito/crédito** (só entrega):
- Mantém fluxo atual: abre WhatsApp direto

### Novo fluxo de steps
```text
type → form → confirm → [pix] → sent
                     ↘ (não-pix) → sent
```

## Passo 6: Config

Adicionar as 3 edge functions ao `supabase/config.toml` com `verify_jwt = false`.

## O que NÃO muda
- Fluxo de retirada continua com PIX obrigatório, mas agora com QR Code real
- Fluxo de entrega com dinheiro/débito/crédito continua indo direto pro WhatsApp
- Cálculo de frete, validações de endereço, nome — tudo mantido

