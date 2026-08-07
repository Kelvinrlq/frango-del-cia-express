# Trocar a conta do Mercado Pago (Pix)

Objetivo: apagar as credenciais atuais do Mercado Pago do projeto e depois cadastrar as novas que você vai fornecer.

## O que será feito

1. **Remover as credenciais atuais**
   - Apagar o segredo `MERCADOPAGO_ACCESS_TOKEN`
   - Apagar o segredo `MERCADOPAGO_WEBHOOK_SECRET`
   - Nada de token fica escrito no código; eles só existem como segredos no backend.

2. **Estado do sistema enquanto estiver sem token**
   - O Pix deixa de funcionar: ao tentar pagar por Pix o cliente recebe erro ao gerar o QR Code.
   - O webhook do Mercado Pago passa a rejeitar todas as chamadas (falha segura).
   - Dinheiro, débito e crédito na entrega continuam funcionando normalmente.

3. **Cadastrar as credenciais novas** (quando você enviar)
   - Vou abrir o formulário seguro pedindo o novo **Access Token** (produção, da nova conta) e a nova **Assinatura Secreta** do webhook.
   - Onde pegar na nova conta: Mercado Pago Developers > Suas integrações > criar/abrir a aplicação > "Credenciais de produção" (Access Token) e "Webhooks" > configurar a URL do webhook e copiar a "Assinatura secreta".
   - URL do webhook a cadastrar lá: `https://tnjdzvajwmtxtsawhkab.supabase.co/functions/v1/mercadopago-webhook` (evento: Pagamentos).

4. **Teste final**
   - Fazer um pedido de teste por Pix, conferir que o QR Code é gerado na conta nova e que o pedido muda de "pendente" para "pago" após o pagamento.

## Detalhes técnicos

- Segredos removidos via ferramenta de secrets; nenhuma alteração de código é necessária.
- As funções `create-pix-payment`, `check-payment-status` e `mercadopago-webhook` leem `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET` do ambiente — elas voltam a funcionar automaticamente assim que os novos valores forem salvos.
