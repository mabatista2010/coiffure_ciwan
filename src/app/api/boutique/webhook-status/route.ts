import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface WebhookInfo {
  id: string;
  url: string;
  status: string;
  events: string[];
}

interface EventInfo {
  id: string;
  type: string;
  created: string;
  livemode: boolean;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET() {
  try {
    const diagnostics: {
      stripe_configured: boolean;
      webhook_secret_configured: boolean;
      webhooks_list: WebhookInfo[];
      recent_events: EventInfo[];
      errors: string[];
    } = {
      stripe_configured: false,
      webhook_secret_configured: false,
      webhooks_list: [],
      recent_events: [],
      errors: []
    };

    // Verificar si Stripe está configurado
    try {
      await stripe.accounts.retrieve();
      diagnostics.stripe_configured = true;
    } catch {
      diagnostics.errors.push('Stripe no está configurado correctamente');
    }

    // Verificar si el webhook secret está configurado
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      diagnostics.webhook_secret_configured = true;
    } else {
      diagnostics.errors.push('STRIPE_WEBHOOK_SECRET no está configurado');
    }

    // Obtener lista de webhooks
    try {
      const webhooks = await stripe.webhookEndpoints.list();
      diagnostics.webhooks_list = webhooks.data.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        status: webhook.status,
        events: webhook.enabled_events
      }));
    } catch (error) {
      diagnostics.errors.push('Error al obtener webhooks: ' + (error as Error).message);
    }

    // Obtener eventos recientes
    try {
      const events = await stripe.events.list({
        limit: 10,
        types: ['checkout.session.completed', 'payment_intent.succeeded', 'payment_intent.payment_failed']
      });
      
      diagnostics.recent_events = events.data.map(event => ({
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        livemode: event.livemode
      }));
    } catch (error) {
      diagnostics.errors.push('Error al obtener eventos: ' + (error as Error).message);
    }

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('Error in webhook status API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: (error as Error).message
    }, { status: 500 });
  }
} 