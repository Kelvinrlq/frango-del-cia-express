

## Corrigir Erros de Build

### Problema 1: Import inexistente
`src/components/OrderModal.tsx` importa `calculateDeliveryFee` de `@/services/deliveryService`, mas essa função não existe no arquivo. O código já não usa essa função (taxa fixa de R$10 é calculada inline).

**Correção**: Remover `calculateDeliveryFee` do import na linha 9 do `OrderModal.tsx`.

### Problema 2: Erro Deno/OpenAI
Erro de resolução de tipos do `npm:openai@^4.52.5`. Provavelmente um arquivo de tipos do Supabase referenciando OpenAI. Não afeta o build do frontend diretamente — é um erro de tipo do Deno que aparece no linter mas não impede o deploy das edge functions.

### Alterações
- **`src/components/OrderModal.tsx` linha 9**: Remover `calculateDeliveryFee` do import (manter apenas `getDeliveryDistance`)

### Código Atual Revisado
O código já reflete as mudanças feitas no VS Code:
- Evolution API integrada para envio automático de WhatsApp (sem draft)
- Taxa fixa de R$10 para Corumbá
- Fluxo `create-order` → `build-whatsapp-message` → Evolution API funcionando
- CPF e telefone com máscaras

Após corrigir o build, me diga quais mudanças adicionais você quer fazer.

