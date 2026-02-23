
# Correção e Otimização do Cálculo de Taxa de Entrega

## Resumo
Corrigir coordenadas do restaurante, melhorar a precisão da geocodificação adicionando CEP e viewbox, e aprimorar o tratamento de erros em toda a cadeia.

## Alterações

### 1. Edge Function (`supabase/functions/calculate-delivery/index.ts`)

**Coordenadas corrigidas:**
- `RESTAURANT_LAT = -19.00889`
- `RESTAURANT_LON = -57.65130`

**Aceitar novos campos no body:** `state` e `zipCode` (enviados pelo frontend)

**Geocodificação melhorada:**
- Incluir CEP e estado na string de endereço: `${street}, ${number}, ${neighborhood}, ${city}, ${state}, ${zipCode}, Brasil`
- Adicionar parâmetros `viewbox` e `bounded=1` para restringir busca a Corumba-MS (usando bounding box aproximada da cidade)
- Aumentar `limit` para 3 resultados e selecionar o mais relevante (priorizar tipo "house"/"building", ou o mais proximo do centro da cidade)

**Tratamento de erros mais detalhado:**
- Mensagens distintas para geocodificacao falha vs rota nao calculavel
- Log mais detalhado no console para debug

### 2. Frontend - Serviço (`src/services/deliveryService.ts`)

- Atualizar `getDeliveryDistance` para aceitar e enviar `state` e `zipCode` para a edge function
- Propagar mensagens de erro da edge function diretamente ao usuario

### 3. Frontend - Modal (`src/components/OrderModal.tsx`)

- Passar `state` (fixo "MS" ou do ViaCEP) e `zipCode` (CEP digitado) ao chamar `getDeliveryDistance`
- Resetar estado da taxa quando o usuario alterar o numero da casa

## Detalhes Tecnicos

### Edge Function - Geocodificacao com viewbox

```text
viewbox: -57.72,-19.06,-57.58,-18.95  (bbox ao redor de Corumba)
bounded: 1
limit: 3
```

Logica de selecao do melhor resultado:
1. Filtrar resultados pelo tipo (house > building > road > outros)
2. Se nenhum tipo preferido, usar o primeiro resultado (maior relevancia do LocationIQ)

### Fluxo de dados atualizado

```text
Frontend (CEP, rua, numero, bairro, cidade, estado)
    |
    v
Edge Function
    |-- Geocodifica com viewbox + bounded
    |-- Seleciona melhor resultado
    |-- Calcula rota driving
    |-- Retorna distancia
    |
    v
deliveryService.ts (aplica tabela de taxas)
    |
    v
OrderModal (exibe taxa ou erro)
```

### Arquivos modificados
1. `supabase/functions/calculate-delivery/index.ts` - Coordenadas, geocodificacao, selecao de resultado, erros
2. `src/services/deliveryService.ts` - Novos parametros (state, zipCode)
3. `src/components/OrderModal.tsx` - Enviar state/zipCode, resetar taxa ao mudar numero
