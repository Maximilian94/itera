# Regras de Mudança de Plano e Ciclo de Assinatura

Este documento descreve as regras implementadas para mudanças de plano e ciclo de cobrança no sistema de assinatura com Stripe.

## Visão Geral

O sistema implementa um **rules engine centralizado** (`SubscriptionChangeService`) que determina:
- Se a mudança é permitida
- Se é imediata ou agendada
- Se usa Checkout ou update direto
- Se aplica proration
- Como comunicar ao usuário (textos, datas, valores)

## Arquitetura

### Backend
- **SubscriptionChangeService**: Rules engine que implementa cenários S0-S16
- **Endpoints**:
  - `POST /stripe/billing/change/preview`: Retorna `ChangeDecision` sem executar mudança
  - `POST /stripe/billing/change/confirm`: Executa a mudança com base na decisão
- **Webhooks**: Sincronizam status da assinatura (`subscription.updated`, etc.)

### Frontend
- **PlanosPage**: SEMPRE chama `/preview` antes de mostrar diálogo
- **PlanChangeConfirmDialog**: Exibe decisão do backend (S0-S16) com textos/datas reais
- **Fluxo**: Usuário clica → Preview → Diálogo → Confirm → Execução

## Cenários (S0-S16)

| ID | Descrição | Permitido | Timing | Método | Proration | Observações |
|----|-----------|-----------|--------|--------|-----------|-------------|
| **S0** | Mesmo plano e intervalo | ❌ Não | - | - | - | Bloqueado: "Você já está neste plano" |
| **S1** | Mensal → Anual (mesmo plano) | ✅ Sim | Imediata | Checkout | Sim | Economia no anual |
| **S2** | Anual → Mensal (mesmo plano) | ✅ Sim | Agendada | Direto | Não | Mantém anual até renovação |
| **S3** | Upgrade: Mensal → Mensal | ✅ Sim | Imediata | Direto | Sim | Cobra diferença proporcional |
| **S4** | Upgrade: Anual → Anual | ✅ Sim | Imediata | Checkout | Sim | Cobra diferença proporcional |
| **S5** | Downgrade: Mensal → Mensal | ✅ Sim | Agendada | Direto | Não | Mantém plano atual até renovação |
| **S6** | Downgrade: Anual → Anual | ✅ Sim | Agendada | Direto | Não | Mantém plano atual até renovação |
| **S7** | Upgrade + Mensal → Anual | ✅ Sim | Imediata | Checkout | Sim | Melhor plano + economia |
| **S8** | Upgrade + Anual → Mensal | ⚠️ Depende | Imediata* | Checkout | Sim | **Bloqueado se gerar crédito** |
| **S9** | Downgrade + Mensal → Anual | ✅ Sim | Imediata | Checkout | Sim | Plano menor + anual |
| **S10** | Downgrade + Anual → Mensal | ✅ Sim | Agendada | Direto | Não | Mantém plano atual até renovação |
| **S11** | Pagamento pendente (past_due) | ❌ Não | - | - | - | Bloqueado: "Regularize pagamento" |
| **S12** | Durante trial | ✅ Sim | - | - | - | Aplica regras normais (S1-S10) |
| **S13** | `cancel_at_period_end=true` | ✅ Sim | - | - | - | Reativa assinatura (set `false`) |
| **S15** | Com schedule pendente | ✅ Sim | - | - | - | Cancela schedule anterior |
| **S16** | Reembolso/crédito manual | ❌ Não | - | - | - | Não implementado |

\* **S8**: Bloqueado se simulação do Stripe retornar crédito (`total_due <= 0`).

## Detalhamento dos Cenários

### S0: Mesmo Plano e Intervalo
**Situação**: Usuário tenta "trocar" para o plano que já possui.
**Decisão**: Bloqueado. Botão desabilitado na UI com mensagem "Você já está neste plano".

---

### S1: Mensal → Anual (Mesmo Plano)
**Situação**: Usuário quer economizar trocando para cobrança anual.
**Decisão**:
- ✅ Permitido
- ⏱️ Imediata
- 💳 Checkout (permite escolher forma de pagamento)
- 📊 Proration: Sim (crédito proporcional do mês não usado)

**Exemplo**:
- Usuário paga R$ 49,90/mês
- Faltam 20 dias para renovação mensal
- Troca para R$ 499/ano
- No Checkout: cobra R$ 499 - crédito dos 20 dias

**UI**:
- Título: "Trocar para cobrança anual?"
- Bullets: "Crédito proporcional do mês", "Cobrança hoje no Checkout"
- Botão: "Continuar para pagamento"

---

### S2: Anual → Mensal (Mesmo Plano)
**Situação**: Usuário quer voltar para cobrança mensal.
**Decisão**:
- ✅ Permitido
- 📅 Agendada (vale na próxima renovação)
- 🔧 Direto (sem pagamento agora)
- 📊 Proration: Não

**Exemplo**:
- Usuário tem plano anual (R$ 499/ano)
- Faltam 3 meses para renovação
- Agenda troca para mensal (R$ 49,90/mês)
- Mantém acesso ao anual até renovação
- A partir da renovação: cobra mensalmente

**UI**:
- Título: "Trocar para cobrança mensal?"
- Bullets: "A mudança vale a partir de DD/MM/AAAA", "Não há cobrança agora"
- Botão: "Agendar para DD/MM/AAAA"

---

### S3: Upgrade Mensal → Mensal
**Situação**: Usuário quer plano superior no mesmo ciclo (mensal).
**Decisão**:
- ✅ Permitido
- ⏱️ Imediata
- 🔧 Direto (subscription.update)
- 📊 Proration: Sim (cobra diferença proporcional)

**Exemplo**:
- Usuário tem Essencial Mensal (R$ 29,90)
- Faltam 15 dias para renovação
- Upgrade para Estratégico Mensal (R$ 49,90)
- Stripe cobra ~R$ 10 (diferença proporcional de 15 dias)
- Próxima renovação: cobra R$ 49,90

**UI**:
- Título: "Fazer upgrade?"
- Bullets: "Mudança aplicada agora", "Cobrança proporcional"
- Botão: "Confirmar upgrade"

---

### S4: Upgrade Anual → Anual
**Situação**: Usuário quer plano superior no mesmo ciclo (anual).
**Decisão**:
- ✅ Permitido
- ⏱️ Imediata
- 💳 Checkout
- 📊 Proration: Sim

**Exemplo**:
- Usuário tem Essencial Anual (R$ 299/ano)
- Faltam 6 meses para renovação
- Upgrade para Estratégico Anual (R$ 499/ano)
- No Checkout: cobra ~R$ 100 (diferença proporcional de 6 meses)

**UI**:
- Título: "Fazer upgrade?"
- Bullets: "Mudança aplicada agora", "Cobrança proporcional no Checkout"
- Botão: "Continuar para pagamento"

---

### S5/S6: Downgrade (Mensal/Anual)
**Situação**: Usuário quer plano inferior.
**Decisão**:
- ✅ Permitido
- 📅 Agendada
- 🔧 Direto
- 📊 Proration: Não

**Exemplo (S5)**:
- Usuário tem Elite Mensal (R$ 89,90)
- Downgrade para Essencial Mensal (R$ 29,90)
- Mantém Elite até renovação
- A partir da renovação: cobra R$ 29,90

**Exemplo (S6)**:
- Usuário tem Elite Anual (R$ 899/ano)
- Downgrade para Essencial Anual (R$ 299/ano)
- Mantém Elite até renovação
- A partir da renovação: cobra R$ 299

**UI**:
- Título: "Fazer downgrade?"
- Bullets: "A mudança vale a partir de DD/MM/AAAA", "Mantém plano atual até lá"
- Botão: "Agendar para DD/MM/AAAA"

---

### S7: Upgrade + Mensal → Anual
**Situação**: Usuário quer plano superior E trocar para anual.
**Decisão**:
- ✅ Permitido
- ⏱️ Imediata
- 💳 Checkout
- 📊 Proration: Sim

**Exemplo**:
- Usuário tem Essencial Mensal (R$ 29,90)
- Upgrade para Estratégico Anual (R$ 499/ano)
- Crédito proporcional do mês + cobrança do anual no Checkout

**UI**:
- Título: "Fazer upgrade e trocar para anual?"
- Bullets: "Crédito proporcional do mês", "Cobrança hoje no Checkout"
- Botão: "Continuar para pagamento"

---

### S8: Upgrade + Anual → Mensal ⚠️
**Situação**: Usuário quer plano superior mas trocar para mensal.
**Decisão**:
- ⚠️ **Permitido SOMENTE se não gerar crédito**
- ⏱️ Imediata (se permitido)
- 💳 Checkout
- 📊 Proration: Sim
- **Bloqueio**: Se `upcoming_invoice.total <= 0`, bloqueia com mensagem

**Implementação**:
```typescript
// Backend: SubscriptionChangeService
const wouldGenerateCredit = await this.checkIfGeneratesCredit(
  stripeSubscriptionId,
  targetPriceId,
);
if (wouldGenerateCredit) {
  return { allowed: false, reasonBlocked: '...' };
}
```

**Exemplo bloqueado**:
- Usuário tem Essencial Anual (R$ 299/ano)
- Faltam 11 meses para renovação
- Tenta upgrade para Estratégico Mensal (R$ 49,90/mês)
- Stripe calcularia: crédito de 11 meses (~R$ 274) - R$ 49,90 = **crédito negativo**
- **Bloqueado** com mensagem: "Esta mudança geraria crédito, o que não é permitido. Aguarde até a próxima renovação."

**Exemplo permitido**:
- Usuário tem Essencial Anual (R$ 299/ano)
- Falta 1 mês para renovação
- Upgrade para Elite Mensal (R$ 89,90/mês)
- Stripe calcula: crédito de 1 mês (~R$ 24) é menor que R$ 89,90 = **cobrar diferença**
- ✅ Permitido

**UI (bloqueado)**:
- Título: "Troca não permitida"
- Bullets: "Aguarde até a próxima renovação", "Ou escolha outro plano"
- Botão: "Entendi"

---

### S9: Downgrade + Mensal → Anual
**Situação**: Usuário quer plano inferior mas trocar para anual.
**Decisão**:
- ✅ Permitido
- ⏱️ Imediata
- 💳 Checkout
- 📊 Proration: Sim

**Exemplo**:
- Usuário tem Elite Mensal (R$ 89,90)
- Downgrade para Essencial Anual (R$ 299/ano)
- Crédito proporcional do mês + cobrança do anual no Checkout

---

### S10: Downgrade + Anual → Mensal
**Situação**: Usuário quer plano inferior e trocar para mensal.
**Decisão**:
- ✅ Permitido
- 📅 Agendada
- 🔧 Direto
- 📊 Proration: Não

**Exemplo**:
- Usuário tem Elite Anual (R$ 899/ano)
- Downgrade para Essencial Mensal (R$ 29,90/mês)
- Mantém Elite Anual até renovação
- A partir da renovação: cobra mensalmente

---

### S11: Pagamento Pendente
**Situação**: Assinatura com status `PAST_DUE` (falha de pagamento).
**Decisão**:
- ❌ Bloqueado
- Mensagem: "Você possui um pagamento pendente. Regularize sua assinatura antes de trocar de plano."

**UI**:
- Título: "Pagamento pendente"
- Bullets: "Atualize seu método de pagamento", "Entre em contato com o suporte"
- Botão: "Entendi" / "Regularizar pagamento"

---

### S12: Durante Trial
**Situação**: Usuário está no período de 7 dias (CDC).
**Decisão**: Aplica as mesmas regras (S1-S10).

---

### S13: Cancelamento Agendado
**Situação**: `cancel_at_period_end = true` (usuário solicitou cancelamento).
**Decisão**:
- ✅ Permitido (todas as mudanças)
- **Efeito**: Reativa assinatura (set `cancel_at_period_end=false`)

**Implementação**:
```typescript
if (subscription.cancelAtPeriodEnd) {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
```

---

### S15: Schedule Pendente
**Situação**: Já existe um schedule (downgrade agendado).
**Decisão**:
- ✅ Permitido (todas as mudanças)
- **Efeito**: Cancela schedule anterior antes de aplicar novo

**Implementação**:
```typescript
if (subscription.stripeScheduleId) {
  await stripe.subscriptionSchedules.release(scheduleId);
}
```

---

### S16: Reembolso/Crédito Manual
**Situação**: Não implementado.
**Decisão**: ❌ Bloqueado

---

## Fluxo de Implementação

### 1. Usuário Clica no Botão
```typescript
// PlanosPage.tsx
<Button onClick={() => openPlanChangeDialog(plan)}>
  Trocar para anual
</Button>
```

### 2. Frontend Chama Preview
```typescript
const openPlanChangeDialog = async (plan: PlanInfo) => {
  const priceId = billingInterval === 'month'
    ? plan.monthlyPriceId
    : plan.yearlyPriceId;

  // Preview antes de mostrar diálogo
  const decision = await stripeService.previewChange({ targetPriceId: priceId });

  setPlanChangeDialog({ open: true, plan, decision });
}
```

### 3. Backend Avalia Cenário
```typescript
// SubscriptionChangeService
async previewChange(userId: string, targetPriceId: string): Promise<ChangeDecision> {
  const subscription = await this.prisma.subscription.findFirst(...);
  const input = { currentPlan, currentInterval, targetPlan, targetInterval, ... };

  // Aplica regras S0-S16
  return this.evaluateScenario(input);
}
```

### 4. UI Exibe Decisão
```typescript
// PlanChangeConfirmDialog.tsx
<Dialog>
  <DialogTitle>{decision.uiCopy.title}</DialogTitle>
  <DialogContent>
    <p>{decision.uiCopy.body}</p>
    <ul>
      {decision.uiCopy.bulletPoints.map(bullet => <li>{bullet}</li>)}
    </ul>
  </DialogContent>
  <DialogActions>
    <Button>{decision.uiCopy.secondaryButton}</Button>
    <Button onClick={confirm}>{decision.uiCopy.primaryButton}</Button>
  </DialogActions>
</Dialog>
```

### 5. Usuário Confirma
```typescript
const handleConfirmPlanChange = async () => {
  const result = await stripeService.confirmChange({ targetPriceId });

  if (result.checkoutUrl) {
    window.location.href = result.checkoutUrl; // Redirect to Stripe
  } else {
    // Scheduled or direct change
    queryClient.invalidateQueries(['stripe', 'access']);
    setSuccessMessage('Mudança agendada!');
  }
}
```

### 6. Backend Executa
```typescript
// SubscriptionChangeService
async confirmChange(userId: string, targetPriceId: string) {
  const decision = await this.previewChange(userId, targetPriceId);

  if (!decision.allowed) throw new BadRequestException(...);

  // S13: Reativar se cancelado
  if (subscription.cancelAtPeriodEnd) {
    await stripe.subscriptions.update(..., { cancel_at_period_end: false });
  }

  // S15: Cancelar schedule anterior
  if (subscription.stripeScheduleId) {
    await stripe.subscriptionSchedules.release(scheduleId);
  }

  // Executar mudança
  if (decision.changeMethod === 'CHECKOUT') {
    return { checkoutUrl: await this.createCheckoutForChange(...) };
  } else if (decision.changeTiming === 'IMMEDIATE') {
    return await this.applyImmediateChange(...);
  } else {
    return await this.scheduleChange(...);
  }
}
```

### 7. Webhooks Sincronizam
```typescript
// StripeService (webhook handler)
switch (event.type) {
  case 'checkout.session.completed':
    // Cria/atualiza subscription, cancela antiga
  case 'subscription.updated':
    // Atualiza status, limpa scheduled se aplicado
  case 'subscription.deleted':
    // Marca como CANCELED
}
```

---

## Campos do Banco de Dados

### Subscription
```prisma
model Subscription {
  id                    String             @id
  stripeSubscriptionId  String             @unique
  stripePriceId         String             // Current price
  plan                  SubscriptionPlan   // ESSENCIAL | ESTRATEGICO | ELITE
  status                SubscriptionStatus // ACTIVE | PAST_DUE | CANCELED
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean            @default(false)

  // Scheduled change fields
  stripeScheduleId      String?
  scheduledPlan         SubscriptionPlan?
  scheduledPriceId      String?
  scheduledInterval     String?            // 'month' | 'year'

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
}
```

---

## Testes

### Cenários a Testar

1. **S0**: Tentar trocar para plano atual → Bloqueado
2. **S1**: Mensal → Anual → Checkout com crédito
3. **S2**: Anual → Mensal → Agendado
4. **S3**: Upgrade mensal → Cobra diferença
5. **S5**: Downgrade mensal → Agendado
6. **S8 bloqueado**: Anual → Mensal com crédito → Bloqueado
7. **S8 permitido**: Anual → Mensal sem crédito → Checkout
8. **S11**: Past_due → Bloqueado
9. **S13**: Cancelamento agendado → Reativa
10. **S15**: Schedule pendente → Cancela anterior

### Exemplo de Teste
```typescript
describe('SubscriptionChangeService', () => {
  it('S1: monthly to annual - allowed, immediate, checkout', async () => {
    const decision = await service.previewChange(userId, yearlyPriceId);
    expect(decision.allowed).toBe(true);
    expect(decision.scenarioId).toBe('S1');
    expect(decision.changeTiming).toBe('IMMEDIATE');
    expect(decision.changeMethod).toBe('CHECKOUT');
    expect(decision.proration).toBe(true);
  });

  it('S8: upgrade annual to monthly with credit - blocked', async () => {
    const decision = await service.previewChange(userId, monthlyPriceId);
    expect(decision.allowed).toBe(false);
    expect(decision.scenarioId).toBe('S8');
    expect(decision.reasonBlocked).toContain('crédito');
  });
});
```

---

## Referências

- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions/upgrade-downgrade
- **Subscription Schedules**: https://stripe.com/docs/billing/subscriptions/subscription-schedules
- **Proration**: https://stripe.com/docs/billing/subscriptions/prorations

---

## Changelog

- **2026-02-16**: Implementação inicial com cenários S0-S16
- **2026-02-16**: Adicionado campo `scheduledInterval` ao schema
- **2026-02-16**: Criado `SubscriptionChangeService` com rules engine
- **2026-02-16**: Endpoints `/billing/change/preview` e `/billing/change/confirm`
- **2026-02-16**: Refatorado frontend para usar preview antes de confirmar
