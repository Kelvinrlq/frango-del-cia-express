# Plano: Corrigir roteamento SPA na Vercel

## Objetivo
Resolver o erro 404 ao acessar `/admin` diretamente ou recarregar páginas no deploy da Vercel, configurando rewrites para a Single Page Application (Vite/React).

## O que será feito
1. Criar o arquivo `vercel.json` na raiz do projeto.
2. Configurar a regra de rewrite para que qualquer caminho `/(.*)` sirva o `index.html`, permitindo que o React Router lide com as rotas no cliente.

## Configuração proposta

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Sobre acesso de outros dispositivos/redes

Sim, a correção permite acessar `/admin` de qualquer dispositivo ou rede, desde que:
- A URL publicada na Vercel esteja acessível (sem bloqueios de rede/firewall no lado do visitante).
- A pessoa conheça a senha do painel admin (`frango21`), pois a autenticação continua sendo feita no frontend.

O rewrite apenas garante que o servidor da Vercel entregue o app React para rotas profundas, em vez de responder com 404.
