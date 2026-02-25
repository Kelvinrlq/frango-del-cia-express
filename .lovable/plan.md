

# Correção: Busca de CEP via Edge Function

## Problema Atual
A função `fetchCep` no `OrderModal.tsx` (linha 32) ainda chama `https://viacep.com.br/ws/${clean}/json/` diretamente do navegador, o que falha por CORS.

## Alterações Necessárias

### 1. Criar `supabase/functions/lookup-cep/index.ts`
- Edge Function que recebe `{ cep }` via POST
- Faz fetch server-side para ViaCEP
- Retorna os dados ou erro
- Headers CORS padrão

### 2. Atualizar `supabase/config.toml`
- Adicionar `[functions.lookup-cep]` com `verify_jwt = false`

### 3. Atualizar `src/components/OrderModal.tsx`
- Importar o client Supabase
- Substituir `fetchCep` (linhas 28-39) para usar `supabase.functions.invoke("lookup-cep", { body: { cep: clean } })`
- Manter a mesma lógica de preenchimento dos campos de endereço

### Arquivos
| Arquivo | Ação |
|---|---|
| `supabase/functions/lookup-cep/index.ts` | Criar |
| `supabase/config.toml` | Adicionar função |
| `src/components/OrderModal.tsx` | Alterar `fetchCep` |

