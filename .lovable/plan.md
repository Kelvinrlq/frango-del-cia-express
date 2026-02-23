

# Correção: Busca de CEP via Edge Function (Proxy ViaCEP)

## Problema
A busca de CEP falha porque o navegador bloqueia requisições diretas ao ViaCEP (CORS). A solução é criar uma Edge Function como proxy server-side.

## Alterações

### 1. Nova Edge Function: `supabase/functions/lookup-cep/index.ts`
- Recebe `{ cep }` no body (POST)
- Faz fetch server-side para `https://viacep.com.br/ws/{cep}/json/`
- Retorna os dados do ViaCEP ou mensagem de erro
- Headers CORS padrao

### 2. Atualizar `supabase/config.toml`
- Adicionar:
```text
[functions.lookup-cep]
verify_jwt = false
```

### 3. Atualizar `src/components/OrderModal.tsx`
- Substituir a funcao `fetchCep` (linhas 33-42) que chama ViaCEP diretamente
- Usar `supabase.functions.invoke("lookup-cep", { body: { cep: clean } })` no lugar
- Manter toda a logica existente de preenchimento de campos (logradouro, bairro, localidade, uf)
- Adicionar import do supabase client

### Resumo dos arquivos
| Arquivo | Acao |
|---|---|
| `supabase/functions/lookup-cep/index.ts` | Criar (novo) |
| `supabase/config.toml` | Adicionar config da funcao |
| `src/components/OrderModal.tsx` | Alterar `fetchCep` para usar Edge Function |

