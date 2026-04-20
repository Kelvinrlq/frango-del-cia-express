

## Plano: Remover botão "Abrir WhatsApp" da tela de sucesso

### O que muda
Na tela final ("Pedido Criado!" do `OrderModal.tsx`), remover toda a área circulada em vermelho:
- O texto "📱 Toque no botão abaixo para avisar o estabelecimento pelo WhatsApp"
- O botão verde "📱 Abrir WhatsApp"
- O texto "Se o WhatsApp não abrir, ligue para (67) 9327-7165..."

A tela ficará apenas com:
- 🎉 Pedido Criado!
- Card amarelo com #número e total
- (Se PIX) confirmação de pagamento
- Botão "Fechar"

### Detalhes técnicos
**Arquivo:** `src/components/OrderModal.tsx`

1. **Remover blocos JSX** (linhas ~816-835): o parágrafo de instrução, o `<a href={whatsAppUrl}>` e o aviso com telefone.

2. **Manter** a chamada `prepareWhatsAppAndNotifyGroup(orderId)` em `handleSubmit` e `handlePixApproved` — ela continua necessária porque dispara o **Telegram para o grupo dos entregadores** em background (fire-and-forget). Apenas paramos de exibir a URL do WhatsApp para o cliente.

3. **Limpar estado não utilizado** (opcional, mas mais limpo):
   - Remover `whatsAppUrl` / `setWhatsAppUrl` (state e chamadas) já que não é mais exibido.
   - Manter `sentDailyNumber` e `sentOrderTotal` (ainda usados no card).

4. **Sem mudanças em** services, edge functions, banco, ou painel admin — pedidos continuam aparecendo no `/admin` em tempo real, que é exatamente o canal pelo qual a dona vai ver o pedido.

### Observação sobre o GitHub
Você mencionou ter atualizado e enviado para o GitHub. O Lovable sincroniza automaticamente em ambas as direções, então as alterações do GitHub já estão refletidas aqui. Sobre o commit em português: o Lovable gera as mensagens de commit automaticamente quando faço alterações; não consigo escrever a mensagem manualmente, mas o conteúdo do commit refletirá a mudança ("remover botão e instruções do WhatsApp da tela de pedido finalizado").

### Build error mencionado
O erro de build sobre `npm:openai@^4.52.5` é de uma edge function (provavelmente algo que veio do GitHub). Não é causado por essa alteração e pode ser tratado em uma tarefa separada se você quiser — me avise se quer que eu olhe junto.

