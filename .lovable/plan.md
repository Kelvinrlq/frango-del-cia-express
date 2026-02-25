

# Diagnóstico: "Fora da área de cobertura" para CEP 79321-864

## O que aconteceu

Isto **não é um erro de código**. O sistema funcionou corretamente:

1. CEP 79321-864 foi encontrado pelo ViaCEP: "Rua Agostinho T. Monâco, Nova Corumbá, Corumbá"
2. A geocodificação retornou coordenadas corretas: lat=-19.044983, lon=-57.646983
3. A distância calculada foi **5,78 km** (rota real de carro)
4. A tabela de taxas só cobre até **4 km**, então retornou "Fora da área de cobertura"

O bairro **Nova Corumbá** fica na periferia sul da cidade, a quase 6 km do restaurante (R. Dom Pedro I, 2310). A mensagem exibida é o comportamento esperado.

## Solução proposta: Expandir a tabela de taxas

Para atender endereços mais distantes como Nova Corumbá, a tabela de taxas em `src/services/deliveryService.ts` precisa ser estendida.

### Alteração em `src/services/deliveryService.ts`

Expandir a `FEE_TABLE` para cobrir distâncias maiores:

```text
Tabela atual (até 4 km):
1.0 km → R$ 7,00
1.5 km → R$ 8,50
2.0 km → R$ 9,50
2.5 km → R$ 11,00
3.0 km → R$ 12,00
3.5 km → R$ 13,50
4.0 km → R$ 15,00

Proposta (até 7 km):
4.5 km → R$ 16,50
5.0 km → R$ 18,00
5.5 km → R$ 19,50
6.0 km → R$ 21,00
6.5 km → R$ 22,50
7.0 km → R$ 24,00
```

### Detalhes técnicos

- Arquivo alterado: `src/services/deliveryService.ts` — adicionar entradas na array `FEE_TABLE` (linhas 7-14)
- Nenhuma outra alteração necessária — o resto do código já trata `fee === null` como "fora da cobertura"
- Os valores acima seguem a progressão existente (~R$1,50 por 0,5 km). Pode ajustar conforme necessário

### Pergunta importante

Os valores sugeridos (R$16,50 a R$24,00) para 4,5-7 km estão adequados, ou prefere definir outros valores?

