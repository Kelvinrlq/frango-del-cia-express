O log confirma que o QR Code novo está sendo gerado diretamente pelo Mercado Pago com a conta antiga:

- `collector.account_holder_name`: Kelvin Lucas Saucedo Arruda
- `qr_code`: contém `kelvintrp@gmail.com`
- `live_mode`: true

Isso significa que não é cache do site nem QR antigo. O token que a função está usando ainda pertence à conta antiga, ou o Mercado Pago ainda está roteando essa credencial para a conta antiga.

Plano de ação:

1. Reabrir o formulário seguro para substituir somente `MERCADOPAGO_ACCESS_TOKEN`.
2. Você deve colar o Access Token de produção copiado dentro da conta Mercado Pago correta, na aplicação criada nessa conta.
3. Depois disso, gerar um pedido totalmente novo; QR Codes já criados nunca mudam.
4. Conferir novamente os logs do `create-pix-payment` para validar se o `collector.account_holder_name` deixou de ser Kelvin e se o QR não contém mais `kelvintrp@gmail.com`.

O que provavelmente está acontecendo:

- Não precisa desativar nada no Mercado Pago Developer, em geral só trocar o Access Token correto resolve.
- A chave Pix não é escolhida pelo código. O Mercado Pago usa automaticamente a chave Pix da conta dona do Access Token.
- Se o QR continua com `kelvintrp@gmail.com`, o Access Token salvo ainda é da conta antiga ou foi copiado de uma aplicação criada na conta antiga.

Checklist para pegar o token certo:

1. Sair da conta Kelvin no Mercado Pago/Mercado Livre.
2. Entrar exatamente na conta nova que possui a chave Pix `1b050e6e-7b0f-4378-b8a9-a9eefddd4615`.
3. Ir em Desenvolvedores > Suas integrações > Aplicações.
4. Abrir/criar uma aplicação nessa conta nova.
5. Copiar a credencial de Produção: `Access Token`.
6. Substituir `MERCADOPAGO_ACCESS_TOKEN` com esse valor.

Implementação necessária: nenhuma alteração em código, apenas atualizar o segredo e testar novo pedido.