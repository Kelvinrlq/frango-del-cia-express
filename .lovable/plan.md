## O que está acontecendo

O app não usa Public Key para gerar Pix. A função `create-pix-payment` chama diretamente a API `/v1/payments` do Mercado Pago com o segredo `MERCADOPAGO_ACCESS_TOKEN`.

Nos logs mais recentes, o próprio Mercado Pago retornou:

- `account_holder_name`: Kelvin Lucas Saucedo Arruda
- QR Pix contendo `kelvintrp@gmail.com`
- `collector_id`: `1834715098`

Isso indica que a API ainda está autenticando como a conta do Kelvin. Ou seja: o token salvo em `MERCADOPAGO_ACCESS_TOKEN` ainda pertence à conta antiga, ou a alteração do segredo ainda não foi refletida na execução usada para criar esse pagamento.

## Plano

1. Confirmar com uma chamada controlada à função `create-pix-payment` se novos pagamentos continuam vindo com `collector_id`/Pix da conta antiga.
2. Se continuar Kelvin, atualizar novamente somente o segredo `MERCADOPAGO_ACCESS_TOKEN` com o Access Token de produção da conta Mercado Pago correta.
3. Depois da atualização, criar um novo pedido/teste e conferir nos logs do Mercado Pago se o `collector_id` e a chave Pix mudaram.
4. Se o QR ainda sair Kelvin mesmo após token correto, verificar se o token foi copiado de uma aplicação criada dentro da conta Kelvin ou se há mais de uma credencial/app no painel do Mercado Pago.

## O que você precisa fazer no Mercado Pago

Não precisa desativar nada no Mercado Pago Developer e não precisa Public Key para esse fluxo Pix.

Você precisa pegar o **Access Token de Produção** logado na **conta Mercado Pago dona da chave Pix correta**:

1. Entrar no Mercado Pago Developer com a conta correta.
2. Ir em suas aplicações/credenciais.
3. Copiar o `Access Token` de **Produção**, não sandbox.
4. Substituir o segredo `MERCADOPAGO_ACCESS_TOKEN` no Lovable.

## Observação importante

O QR Pix não permite escolher uma chave manualmente no payload. Quem define a chave/conta recebedora é o Mercado Pago, com base no Access Token usado. Portanto, se aparece `kelvintrp@gmail.com`, o token ainda aponta para essa conta.