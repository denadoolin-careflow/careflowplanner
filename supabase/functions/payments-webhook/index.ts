import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) { console.error('No userId in customData'); return; }
  const item = items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId', { rawPriceId: item.price.id, rawProductId: item.product.id });
    return;
  }
  await getSupabase().from('billing_subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paddle_subscription_id' });
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;
  await getSupabase().from('billing_subscriptions').update({
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    updated_at: new Date().toISOString(),
  }).eq('paddle_subscription_id', id).eq('environment', env);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase().from('billing_subscriptions').update({
    status: 'canceled',
    updated_at: new Date().toISOString(),
  }).eq('paddle_subscription_id', data.id).eq('environment', env);
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // Record lifetime purchases (one-time, no subscription_id)
  if (data.subscriptionId) return; // handled by subscription events
  const userId = data.customData?.userId;
  if (!userId) { console.warn('Transaction without userId'); return; }
  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  if (!priceId) { console.warn('Transaction missing price externalId'); return; }
  // Look up product externalId via price.productId if needed; for lifetime we know mapping
  const productId = priceId === 'lifetime_pro_onetime' ? 'lifetime_pro' : (item?.price?.productId ?? 'unknown');
  await getSupabase().from('lifetime_purchases').upsert({
    user_id: userId,
    paddle_transaction_id: data.id,
    paddle_customer_id: data.customerId,
    product_id: productId,
    price_id: priceId,
    environment: env,
  }, { onConflict: 'paddle_transaction_id' });
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated: await handleSubscriptionCreated(event.data, env); break;
    case EventName.SubscriptionUpdated: await handleSubscriptionUpdated(event.data, env); break;
    case EventName.SubscriptionCanceled: await handleSubscriptionCanceled(event.data, env); break;
    case EventName.TransactionCompleted: await handleTransactionCompleted(event.data, env); break;
    default: console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});