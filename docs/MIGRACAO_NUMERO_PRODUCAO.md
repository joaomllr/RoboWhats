# Migração do número de teste para um número BR de produção

Runbook de apoio à migração descrita no `DECISIONS.md` (ADR-013). Este
documento existe para que, quando o chip novo chegar, falte só a parte manual
na interface da Meta — nada de código deveria mudar.

## 0. O que já foi confirmado, sem depender do chip

### 0.1 Nenhum hardcoding do número de teste

Revisão linha a linha de `supabase/functions/webhook/index.ts`,
`supabase/functions/_shared/metaSender.ts` e `supabase/functions/_shared/types.ts`
(19/set/2026):

- `webhook/index.ts:83` — `phoneNumberId` vem inteiramente de
  `metadata.phone_number_id`, lido do payload que a própria Meta envia no
  webhook. Nunca é um valor fixo no código.
- `webhook/index.ts:98-107` — o roteamento multi-tenant já é dinâmico: busca
  `tenant_id` em `phone_number_index` pelo `phone_number_id` recebido. Um
  número novo que não esteja cadastrado ali retorna `PHONE_NOT_CONFIGURED`
  (200, não quebra o webhook) — é só inserir a linha nova para ele passar a
  rotear.
- `metaSender.ts` — `phoneNumberId` é parâmetro da função (`SendWhatsAppOptions`),
  nunca um valor fixo. A URL da Graph API (`GRAPH_API_VERSION = "v26.0"`) é a
  única constante do arquivo, e já está na versão correta.
- Nenhum dos três arquivos contém `1322904704240693` (Phone Number ID de
  teste), `2589390954808409` (WABA de teste) ou qualquer número de telefone
  literal.

**Conclusão: zero mudança de código é necessária.** Só a linha nova em
`phone_number_index` (seção 0.2) e o secret `META_ACCESS_TOKEN` (seção 3)
precisam mudar.

A função `onboard-tenant` (`supabase/functions/onboard-tenant/index.ts`) já
faz exatamente esse tipo de inserção (cria tenant + vincula usuário + insere
`phone_number_index`) — é uma alternativa ao SQL direto se fizer sentido criar
um tenant de produção separado do tenant de teste (ver decisão pendente na
seção 0.4).

### 0.2 SQL pronto (não execute ainda)

Falta preencher `<PHONE_NUMBER_ID_PRODUCAO>` com o ID que a Meta gerar depois
que o número for registrado (seção 1, passo 5). O `tenant_id` abaixo é o do
tenant de teste já existente (`Fluxi - Tenant de Teste`) — troque se a decisão
for por um tenant de produção separado (ver seção 0.4).

```sql
-- Rode isto no SQL Editor do projeto Supabase (nsotmdvalhcqrigepkcu)
-- ou via mcp__Supabase__execute_sql, depois de ter o Phone Number ID real.

insert into public.phone_number_index (phone_number_id, tenant_id, waba_id)
values (
  '<PHONE_NUMBER_ID_PRODUCAO>',           -- preencher: Phone Number ID do número novo
  '11a7568d-b330-4e88-ae17-296c9368a18f', -- tenant "Fluxi - Tenant de Teste" (ajustar se for outro)
  '2589390954808409'                       -- WABA — ajustar se for uma WABA nova
);

-- Conferir depois do insert:
select phone_number_id, tenant_id, waba_id, created_at
from public.phone_number_index;
```

Se a decisão (seção 0.4) for por uma WABA nova em vez de adicionar o número à
WABA de teste existente, troque também o `waba_id` acima pelo novo.

### 0.3 Checklist para comprar e ativar o chip

Isto o usuário pode fazer sozinho, sem precisar de mim:

- [ ] Comprar um chip pré-pago de qualquer operadora (não precisa ser plano
      especial — só precisa receber SMS ou chamada).
- [ ] Inserir o chip em um aparelho (físico ou um Android virtual).
- [ ] **Não abrir o WhatsApp comum (nem o Business app) com esse número.** Se
      esse número já teve WhatsApp antes, apagar a conta primeiro
      (Configurações → Conta → Apagar minha conta) — a Cloud API exige que o
      número esteja livre de qualquer conta ativa no app.
- [ ] Guardar o número à mão, no formato que a operadora informa (com DDD).
- [ ] Ter acesso a um método de pagamento para cadastrar na WABA (a Meta pede
      forma de pagamento no cadastro do número, mesmo que o uso do piloto não
      gere cobrança — ver ADR-013 sobre o modelo de cobrança).
- [ ] Ter login de acesso ao Meta Business Manager / Meta for Developers da
      conta que já administra a WABA `2589390954808409`.

Quando todos os itens acima estiverem prontos, seguir para a seção 1.

### 0.4 Decisão pendente — perguntar ao usuário

Duas coisas ficam em aberto até você (João) decidir:

1. **O número de teste (`1322904704240693`) continua ativo para testes de
   desenvolvimento, ou é aposentado assim que o número de produção estiver
   no ar?** Manter os dois não tem custo adicional nem risco — a linha em
   `phone_number_index` de um simplesmente convive com a do outro. A
   recomendação é manter, porque o número de teste continua útil para
   validar mudanças de código sem gerar tráfego real.
2. **O número de produção usa a mesma WABA de teste (`2589390954808409`) e o
   mesmo tenant (`Fluxi - Tenant de Teste`), ou é um tenant/WABA de produção
   separado?** Adicionar o número à WABA existente é o caminho mais simples
   e é o que a Meta sugere por padrão ao clicar em "Adicionar número" dentro
   de uma WABA já existente. Um tenant separado só faz sentido se você quiser
   isolar métricas de "teste" vs. "produção" na tabela `usage` — o que hoje
   não tem nenhuma tela dedicada no dashboard para diferenciar.

O SQL da seção 0.2 já está escrito assumindo a opção recomendada em ambos os
casos (manter o número de teste, reaproveitar tenant e WABA). Ajuste antes de
rodar se a decisão for outra.

---

## 1. Passo a passo na interface da Meta (guiado, ao vivo)

Esta parte exige login e cliques manuais — reporte cada tela por aqui que eu
guio o próximo passo.

1. Acesse [business.facebook.com](https://business.facebook.com) ou
   [developers.facebook.com](https://developers.facebook.com) com a conta que
   administra a WABA `2589390954808409`, e abra o **WhatsApp Manager**.
2. Vá em **Contas do WhatsApp Business** → selecione a WABA existente (ou,
   se a decisão da seção 0.4 for por uma WABA nova, crie uma).
3. Na aba **Números de telefone**, clique em **Adicionar número de telefone**.
4. Preencha o número do chip novo (com código do país +55) e o **nome de
   exibição** (ex.: "Fluxi" ou o nome comercial que preferir — o nome de
   exibição só é aprovado de fato depois da Verificação de Negócio, mas o
   número funciona para enviar mensagens antes disso).
5. Escolha o método de verificação (SMS ou chamada de voz) e confirme o
   código recebido no chip.
6. **Se a interface oferecer uma etapa de "Confirmar empresa" / Business
   Verification neste momento, pule/adie essa etapa.** Não é necessária para
   enviar mensagens reais — ver ADR-013 para a justificativa e a fonte.
7. Depois do número verificado, copie o **Phone Number ID** dele — normalmente
   aparece na própria tela de detalhes do número, ou em
   **Configurações da API** → **Configuração**. É esse valor que entra no
   `<PHONE_NUMBER_ID_PRODUCAO>` do SQL da seção 0.2.
8. Gere um novo **token de acesso** no contexto desse número/WABA — não
   reaproveite automaticamente o token do número de teste sem confirmar que
   ele cobre o número novo (ver seção 3).

Me avise a cada tela em que algo não bater com a descrição acima — a interface
da Meta muda de layout com frequência e o roteiro pode estar levemente
desatualizado.

---

## 2. Depois de ter o Phone Number ID novo

1. Rodar o SQL da seção 0.2 (preenchido) — inserir a linha em
   `phone_number_index`.
2. Confirmar a assinatura do app à WABA: `GET {WABA_ID}/subscribed_apps`. Se
   for a mesma WABA de teste, isso já deve estar ativo (verificado no
   diagnóstico do `#131030`/`#130497`) — só repetir se a WABA for nova.
3. Atualizar o secret `META_ACCESS_TOKEN` no Supabase com o token gerado no
   passo 8 da seção 1.
4. Confirmar que o endpoint do webhook
   (`https://nsotmdvalhcqrigepkcu.supabase.co/functions/v1/webhook`) está
   configurado para essa WABA em **Configuração** → **Webhooks**.

## 3. Validação end-to-end

1. Pedir para qualquer número de celular BR normal (não precisa estar
   cadastrado como destinatário de teste — essa restrição de 5 contatos só
   existe no modo de teste) mandar uma mensagem para o número de produção.
2. Conferir nos `function_logs` da Edge Function `webhook` que não apareceu
   `#131030` nem `#130497`.
3. Conferir na tabela `conversations` que existe uma linha nova com
   `direction = 'outbound'` para esse contato.
4. Repetir o teste com uma mensagem tipo "quanto custa?" para confirmar que o
   lead scoring marca `quente` e o `stage` transiciona para `lead_quente`.

Só considerar a migração concluída depois do passo 3 confirmado com dado
real — build ou deploy sem erro não é suficiente.
