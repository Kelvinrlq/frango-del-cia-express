

# Adicionar campo "Nome" no formulário de entrega

## Problema
Quando o cliente escolhe "Entrega", não há campo para digitar o nome. O nome só existe na opção "Retirada" (`pickupName`). O estabelecimento precisa saber quem está a receber a entrega.

## Alterações

### `src/components/OrderModal.tsx`

1. **Novo estado** — adicionar `deliveryName` (linha ~68, junto aos outros estados de delivery):
   ```typescript
   const [deliveryName, setDeliveryName] = useState("");
   ```

2. **Input no formulário de entrega** (antes do campo CEP, ~linha 317) — adicionar:
   ```
   👤 Nome de quem vai receber *
   [input text]
   ```

3. **Validação** — em `canProceedForm()` (linha 140), adicionar `deliveryName.trim()` como condição obrigatória para entrega.

4. **Mensagem WhatsApp** — em `buildWhatsAppMessage()` (linha 163), adicionar `👤 *Nome:* ${deliveryName}` na seção de entrega.

5. **Resumo do pedido** (step "confirm") — mostrar o nome do cliente na seção de entrega, similar ao que já existe para retirada.

Nenhum outro arquivo precisa de alteração.

