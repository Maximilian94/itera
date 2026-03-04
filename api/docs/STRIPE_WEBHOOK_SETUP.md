# Stripe Webhook - Fase 3B

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/stripe/utils/verify-stripe-webhook.ts` | Verificação de assinatura via Stripe SDK |
| `src/stripe/stripe-webhook.mapper.ts` | Extração de planName e updateBillingUrl |
| `src/stripe-webhook/stripe-webhook.module.ts` | Módulo NestJS |
| `src/stripe-webhook/stripe-webhook.controller.ts` | Controller POST /stripe/webhook |
| `src/stripe-webhook/stripe-webhook.service.ts` | Service com idempotência e envio de emails |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/stripe/stripe.module.ts` | Removido StripeWebhookController (movido para StripeWebhookModule) |
| `src/app.module.ts` | Adicionado import de StripeWebhookModule |

## Arquivos removidos

| Arquivo | Motivo |
|---------|--------|
| `src/stripe/stripe-webhook.controller.ts` | Substituído por `stripe-webhook/stripe-webhook.controller.ts` |

---

## rawBody no NestJS

O NestJS usa o body parser do Express por padrão. Para webhooks, precisamos do **raw body** (Buffer) para verificação de assinatura — o body parseado como JSON altera o payload e invalida a assinatura.

**Configuração atual em `main.ts`:**

```typescript
const app = await NestFactory.create(AppModule, { bodyParser: false });
app.use(
  json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
```

- `bodyParser: false` desabilita o parser padrão.
- O middleware `json()` do Express faz o parse e, via `verify`, armazena o buffer original em `req.rawBody`.
- Todas as rotas recebem `rawBody`; o controller do webhook usa `req.rawBody` para verificação.

**Segurança:** O `rawBody` é o buffer original antes do parse. Não é exposto em logs nem em respostas. O webhook secret nunca é logado.

---

## Teste local com Stripe CLI

1. **Instalar Stripe CLI** (se ainda não tiver):
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login no Stripe:**
   ```bash
   stripe login
   ```

3. **Encaminhar webhooks para a API local:**
   ```bash
   stripe listen --forward-to localhost:3000/stripe/webhook
   ```
   O CLI exibirá um `webhook signing secret` temporário (ex: `whsec_...`). Use-o em `STRIPE_WEBHOOK_SECRET` no `.env` local.

4. **Subir a API:**
   ```bash
   npm run start:dev
   ```

5. **Disparar eventos de teste:**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger invoice.payment_failed
   stripe trigger customer.subscription.deleted
   ```

**Nota:** Os eventos `trigger` são genéricos e podem não ter `stripeCustomerId` vinculado a um usuário no banco. Para testes completos, faça um checkout real em modo teste e use o `stripeCustomerId` do usuário criado.
