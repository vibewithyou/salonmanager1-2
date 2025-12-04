import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transactionId, amount, reason }: RefundRequest = await req.json();

    console.log(`Processing refund of €${amount} for transaction ${transactionId}`);

    // Fetch transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.payment_status !== "completed") {
      throw new Error("Can only refund completed transactions");
    }

    if (amount > transaction.total_amount) {
      throw new Error("Refund amount exceeds transaction total");
    }

    // Create refund record
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .insert({
        transaction_id: transactionId,
        amount,
        reason,
        status: "pending",
      })
      .select()
      .single();

    if (refundError) {
      throw new Error("Failed to create refund record");
    }

    let refundResult: any = { refundId: refund.id };

    // Process Stripe refund if applicable
    if (transaction.payment_method === "stripe" && transaction.stripe_payment_intent_id) {
      if (!stripeSecretKey) {
        throw new Error("Stripe is not configured");
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });

      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: transaction.stripe_payment_intent_id,
          amount: Math.round(amount * 100), // Convert to cents
          reason: reason === "duplicate" ? "duplicate" : 
                  reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
        });

        await supabase
          .from("refunds")
          .update({
            stripe_refund_id: stripeRefund.id,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", refund.id);

        refundResult.stripeRefundId = stripeRefund.id;
      } catch (stripeError: any) {
        await supabase
          .from("refunds")
          .update({ status: "failed" })
          .eq("id", refund.id);
        throw new Error("Stripe refund failed: " + stripeError.message);
      }
    } else {
      // For cash or other payment methods, just mark as completed
      await supabase
        .from("refunds")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", refund.id);
    }

    // Update transaction status
    const isFullRefund = amount >= transaction.total_amount;
    await supabase
      .from("transactions")
      .update({
        payment_status: isFullRefund ? "refunded" : "partially_refunded",
      })
      .eq("id", transactionId);

    console.log(`Refund processed successfully for transaction ${transactionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...refundResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Refund processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
