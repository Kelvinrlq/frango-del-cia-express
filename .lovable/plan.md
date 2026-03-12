
## Alterar Preço do Frango para R$ 1,00 (Teste)

### Objetivo
Mudar o preço base do frango de R$ 50,00 para R$ 1,00 para facilitar testes de pagamento PIX.

### Alterações Necessárias

#### 1. `src/types/order.ts`
- Alterar `FRANGO_PRICE` de `50` para `1`

#### 2. `src/components/ProductCard.tsx`
- Atualizar display manual de preços:
  - `formatCurrency(50)` → `formatCurrency(1)` (preço base)
  - `formatCurrency(51)` → `formatCurrency(2)` (débito: base + 1)
  - `formatCurrency(52.5)` → `formatCurrency(3.5)` (crédito: base + 2.5)

#### 3. `supabase/functions/create-pix-payment/index.ts`
- Alterar `FRANGO_PRICE` de `50` para `1` na validação server-side
- **IMPORTANTE**: Requer deploy da edge function após alteração

### Observações
- O acréscimo de débito (R$ 1) e crédito (R$ 2,50) será mantido proporcional
- Para produção, lembre-se de reverter para R$ 50,00
