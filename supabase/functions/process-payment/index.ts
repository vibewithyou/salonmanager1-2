import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  transactionId: string;
  paymentMethod: "stripe" | "paypal";
  amount: number;
  currency: string;
  customerEmail?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transactionId, paymentMethod, amount, currency, customerEmail }: PaymentRequest = await req.json();

    console.log(`Processing ${paymentMethod} payment for transaction ${transactionId}`);

    // Validate transaction exists
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.payment_status === "completed") {
      throw new Error("Transaction already completed");
    }

    let paymentResult: any = null;

    if (paymentMethod === "stripe") {
      if (!stripeSecretKey) {
        throw new Error("Stripe is not configured");
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });

      // Create or retrieve customer
      let customerId: string | undefined;
      if (customerEmail) {
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: customerEmail,
            metadata: { transaction_id: transactionId },
          });
          customerId = customer.id;
        }
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata: {
          transaction_id: transactionId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update transaction with Stripe payment intent ID
      await supabase
        .from("transactions")
        .update({
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", transactionId);

      paymentResult = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };

    } else if (paymentMethod === "paypal") {
      // PayPal integration would go here
      // For now, return a placeholder that requires frontend PayPal SDK integration
      const paypalOrderId = `PAYPAL_${transactionId}_${Date.now()}`;
      
      await supabase
        .from("transactions")
        .update({
          paypal_order_id: paypalOrderId,
        })
        .eq("id", transactionId);

      paymentResult = {
        orderId: paypalOrderId,
        // Frontend should use PayPal SDK to complete the payment
      };
    }

    console.log(`Payment initiated successfully for transaction ${transactionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethod,
        ...paymentResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
