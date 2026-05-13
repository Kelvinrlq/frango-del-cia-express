## Plano: Perfis de cliente com login rápido por telefone

### Visão geral do fluxo
1. **Primeira visita** — modal "Bem-vindo!" pede apenas **Nome** e **Telefone**. Cria o perfil e salva o telefone no `localStorage` do navegador (`cfa21:active_phone`).
2. **Próximas visitas (mesmo navegador)** — o site lê o telefone do `localStorage` automaticamente, busca o perfil e já entra logado. **Não aparece nenhum modal pedindo cadastro de novo.** A pessoa só vê "Olá, {nome}" no topo.
3. **Pedido** — formulários pré-preenchidos com nome, telefone, último tipo de pedido (entrega/retirada) e última forma de pagamento. Endereços salvos aparecem como cards selecionáveis. Tudo é editável.
4. **Após pedido** — endereço novo é salvo automaticamente; preferências (tipo + pagamento) são atualizadas no perfil.
5. **Trocar/sair** — botão "Sou outra pessoa" no header limpa o `localStorage` e reabre o modal de boas-vindas.

> ⚠️ Segurança: login só pelo telefone, sem senha. Quem tiver acesso ao navegador da pessoa entra direto na conta dela. Adequado para o público idoso, mas vale lembrar.

---

### O que será criado/alterado

#### 1. Banco de dados (nova migração)

- **`customer_profiles`**: `phone` (único), `name`, `last_order_type`, `last_payment_method`, `last_email`, `last_cpf`, timestamps.
- **`customer_addresses`**: `profile_id` (FK), `label` ("Casa", "Trabalho"…), `cep`, `street`, `house_number`, `neighborhood`, `complement`, `city`, `is_default`, timestamps.

RLS ativo, acesso só via Edge Functions com `service_role`.

#### 2. Edge Functions novas

- **`get-or-create-profile`** — `{ phone, name? }` → retorna perfil + endereços. Cria se não existir e vier nome.
- **`update-profile`** — atualiza nome e/ou telefone do perfil. Se trocar telefone, valida unicidade.
- **`upsert-address`** / **`delete-address`** — gerencia endereços salvos.
- **`list-customer-orders`** — recebe telefone, retorna histórico de pedidos daquele cliente (com itens, total, status, data).
- Atualizar **`create-order`** e **`create-pix-payment`** para, ao final, gravar `last_order_type` + `last_payment_method` no perfil e salvar o endereço usado (se for novo).

#### 3. Frontend

- **`src/context/ProfileContext.tsx`** (novo)
  - Ao montar: lê `cfa21:active_phone` do `localStorage`. Se existir, chama `get-or-create-profile` e popula contexto. Sem modal.
  - Se não existir, expõe `needsOnboarding = true`.
  - Métodos: `login(phone, name)`, `logout()`, `updateProfile()`, `addAddress()`, `removeAddress()`, `refresh()`.

- **`src/components/WelcomeModal.tsx`** (novo) — só aparece quando `needsOnboarding`. Pede nome + telefone com máscara. Botão grande "Começar".

- **`src/components/Header.tsx`** — quando logado, mostra "Olá, {nome}" + menu suspenso com:
  - 📜 **Meus pedidos** → abre `MyOrdersModal`
  - ✏️ **Editar meus dados** → abre `EditProfileModal`
  - 🚪 **Sou outra pessoa** → `logout()`

- **`src/components/MyOrdersModal.tsx`** (novo) — lista pedidos do cliente (via `list-customer-orders`), com data, número do dia, itens, total, status traduzido.

- **`src/components/EditProfileModal.tsx`** (novo) — edita nome e telefone. Se mudar o telefone, atualiza o `localStorage` e o backend.

- **`src/components/OrderModal.tsx`**:
  - Pré-preenche nome/telefone do perfil.
  - Pré-seleciona último tipo de pedido e forma de pagamento.
  - Em entrega: lista endereços salvos como cards (rótulo + rua/número), com "Editar"/"Excluir" + opção "Usar outro endereço".
  - Após criar pedido novo manualmente, salva o endereço no perfil automaticamente (sem perguntar).

- **`src/services/profileService.ts`** (novo) — wrappers das edge functions.

- **`src/pages/Index.tsx`** — envolve com `<ProfileProvider>` e renderiza `<WelcomeModal>`.

#### 4. Memória do projeto
Adicionar `mem://features/perfis-cliente` documentando: telefone como ID, persistência em `localStorage`, sem senha, múltiplos endereços, histórico via telefone.

---

### Resumo dos arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/...sql` | Tabelas `customer_profiles` + `customer_addresses` com RLS |
| `supabase/functions/get-or-create-profile/` | Nova |
| `supabase/functions/update-profile/` | Nova |
| `supabase/functions/upsert-address/` | Nova |
| `supabase/functions/delete-address/` | Nova |
| `supabase/functions/list-customer-orders/` | Nova |
| `supabase/functions/create-order/index.ts` | Salva prefs + endereço |
| `supabase/functions/create-pix-payment/index.ts` | Idem |
| `supabase/config.toml` | Registrar novas funções |
| `src/context/ProfileContext.tsx` | Novo, com auto-login via `localStorage` |
| `src/components/WelcomeModal.tsx` | Novo |
| `src/components/MyOrdersModal.tsx` | Novo |
| `src/components/EditProfileModal.tsx` | Novo |
| `src/components/Header.tsx` | Saudação + menu (Meus pedidos / Editar / Sair) |
| `src/components/OrderModal.tsx` | Pré-preenchimento + lista de endereços salvos |
| `src/services/profileService.ts` | Novo |
| `src/pages/Index.tsx` | Envolve com `ProfileProvider` |