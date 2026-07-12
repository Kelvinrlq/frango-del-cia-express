## Credenciais salvas ✅

`MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` da nova aplicação foram gravados com segurança. As edge functions já leem esses valores em tempo real — não é preciso alterar código.

## Sobre a chave PIX `1b050e6e-...`

O Mercado Pago **ignora qualquer chave PIX enviada pela API** e usa automaticamente a chave da conta dona do Access Token. Como o novo token pertence à conta que tem `1b050e6e-7b0f-4378-b8a9-a9eefddd4615` registrada, o próximo QR code virá com essa chave — sem alterações no código.

## Próximo passo: teste real

1. Abrir o site em outra aba/anônima
2. Fazer um pedido de teste (combo + Pix)
3. Ler o "copia e cola" do QR code gerado
4. Confirmar que:
   - Não aparece mais `kelvintrp@gmail.com`
   - Aparece a chave `1b050e6e-7b0f-4378-b8a9-a9eefddd4615` (ou o nome do novo titular)
5. Pagar via app do Mercado Pago
6. Confirmar que o pedido muda para "pago" automaticamente (webhook funcionando com a nova assinatura)

## Se algo falhar

- **QR ainda mostra kelvintrp** → o Access Token colado ainda é da conta antiga. Criar a app dentro da conta nova e refazer.
- **Pagamento não muda status para "pago"** → assinatura do webhook errada. Copiar novamente a "Assinatura secreta" da aba Webhooks (produção) e me avisar para reabrir o formulário.
- Vou checar os logs da função `mercadopago-webhook` se precisar diagnosticar.

Me avise o resultado do teste (ou cole o "copia e cola" do QR se quiser que eu confirme a chave antes de pagar).
