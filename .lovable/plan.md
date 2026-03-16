

## Melhorar Formulário de Entrega + Link Google Maps

### Problema Atual
- Rua e Bairro aparecem em bloco informativo não-editável após busca do CEP
- Campo Número aceita qualquer caractere (deveria ser só números)
- Não há link do Google Maps gerado
- Cidade/Estado vêm do ViaCEP mas deveriam ser fixos "Corumbá, MS"

### Alterações em `src/components/OrderModal.tsx`

#### 1. Tornar Rua e Bairro editáveis
Substituir o bloco informativo (`<div className="mt-2 bg-muted...">`) por dois inputs editáveis que são preenchidos automaticamente pelo CEP mas permitem correção manual. Adicionar estados separados para `street` e `neighborhood` (ou usar `deliveryInfo` diretamente com setters).

#### 2. Cidade/Estado fixos
Após busca do CEP, sempre setar `city: "Corumbá"` e `state: "MS"`. Exibir como campo desabilitado ou texto fixo "Corumbá, MS".

#### 3. Número apenas numérico
Filtrar `handleHouseNumberChange` para aceitar apenas dígitos: `val.replace(/\D/g, "")`.

#### 4. Google Maps Link
Após todos os campos obrigatórios preenchidos, exibir um botão/link clicável:
```
const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${houseNumber}, ${neighborhood}, Corumbá, MS`)}`;
```
Mostrar abaixo do formulário de endereço com ícone de mapa, abrindo em nova aba.

#### 5. Incluir link do Maps na mensagem WhatsApp
Adicionar linha `🗺️ *Mapa:* ${googleMapsLink}` na função `buildWhatsAppMessage`.

### Resumo das mudanças
- Arquivo único: `src/components/OrderModal.tsx`
- Rua/Bairro: inputs editáveis pré-preenchidos pelo CEP
- Número: filtro numérico
- Cidade/Estado: fixo "Corumbá, MS", não editável
- Link Google Maps: gerado e exibido + incluído no WhatsApp

