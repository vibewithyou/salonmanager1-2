import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  transactionId: string;
  invoiceType: "invoice" | "receipt";
  salonId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transactionId, invoiceType, salonId }: InvoiceRequest = await req.json();

    console.log(`Creating ${invoiceType} for transaction ${transactionId}`);

    // Fetch transaction with items
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Fetch transaction items
    const { data: items, error: itemsError } = await supabase
      .from("transaction_items")
      .select("*")
      .eq("transaction_id", transactionId);

    if (itemsError) {
      throw new Error("Failed to fetch transaction items");
    }

    // Fetch salon info
    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("name, address, city, postal_code, email, phone")
      .eq("id", salonId)
      .single();

    if (salonError) {
      throw new Error("Salon not found");
    }

    // Generate invoice number
    const { data: invoiceNumber, error: numError } = await supabase
      .rpc("generate_invoice_number", { p_salon_id: salonId });

    if (numError) {
      throw new Error("Failed to generate invoice number");
    }

    // Format line items
    const lineItems = (items || []).map((item: any) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      type: item.item_type,
    }));

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        transaction_id: transactionId,
        salon_id: salonId,
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        customer_name: transaction.guest_name,
        customer_email: transaction.guest_email,
        customer_phone: transaction.guest_phone,
        line_items: lineItems,
        subtotal: transaction.subtotal,
        tax_amount: transaction.tax_amount,
        discount_amount: transaction.discount_amount,
        tip_amount: transaction.tip_amount,
        total_amount: transaction.total_amount,
        status: transaction.payment_status === "completed" ? "paid" : "draft",
        paid_at: transaction.payment_status === "completed" ? transaction.completed_at : null,
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error("Failed to create invoice: " + invoiceError.message);
    }

    // Send email if customer has email and type is invoice
    if (transaction.guest_email && invoiceType === "invoice") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          const emailHtml = generateInvoiceHtml(invoice, salon, lineItems, transaction);
          
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${salon.name} <onboarding@resend.dev>`,
              to: [transaction.guest_email],
              subject: `${invoiceType === "invoice" ? "Rechnung" : "Quittung"} ${invoiceNumber}`,
              html: emailHtml,
            }),
          });

          // Update invoice as sent
          await supabase
            .from("invoices")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", invoice.id);

          console.log(`Invoice email sent to ${transaction.guest_email}`);
        } catch (emailError) {
          console.error("Failed to send invoice email:", emailError);
        }
      }
    }

    console.log(`Invoice ${invoiceNumber} created successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: invoice.id,
          invoice_number: invoiceNumber,
          invoice_type: invoiceType,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Invoice creation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateInvoiceHtml(invoice: any, salon: any, lineItems: any[], transaction: any): string {
  const itemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${item.unit_price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${item.total_price.toFixed(2)}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .salon-name { font-size: 24px; font-weight: bold; color: #333; }
        .invoice-title { font-size: 20px; color: #666; margin-top: 10px; }
        .invoice-number { font-size: 14px; color: #888; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f5f5f5; padding: 10px; text-align: left; }
        .totals { margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="salon-name">${salon.name}</div>
        <div style="font-size: 14px; color: #666; margin-top: 5px;">
          ${salon.address || ""}<br>
          ${salon.postal_code || ""} ${salon.city || ""}<br>
          ${salon.phone || ""}<br>
          ${salon.email || ""}
        </div>
        <div class="invoice-title">${invoice.invoice_type === "invoice" ? "Rechnung" : "Quittung"}</div>
        <div class="invoice-number">Nr: ${invoice.invoice_number}</div>
        <div class="invoice-number">Datum: ${new Date(invoice.created_at).toLocaleDateString("de-DE")}</div>
      </div>

      ${invoice.customer_name ? `
        <div style="margin-bottom: 20px;">
          <strong>Kunde:</strong><br>
          ${invoice.customer_name}<br>
          ${invoice.customer_email || ""}<br>
          ${invoice.customer_phone || ""}
        </div>
      ` : ""}

      <table>
        <thead>
          <tr>
            <th>Beschreibung</th>
            <th style="text-align: center;">Menge</th>
            <th style="text-align: right;">Einzelpreis</th>
            <th style="text-align: right;">Gesamt</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Zwischensumme:</span>
          <span>€${transaction.subtotal.toFixed(2)}</span>
        </div>
        ${transaction.discount_amount > 0 ? `
          <div class="total-row" style="color: green;">
            <span>Rabatt:</span>
            <span>-€${transaction.discount_amount.toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="total-row">
          <span>MwSt. (${transaction.tax_rate}%):</span>
          <span>€${transaction.tax_amount.toFixed(2)}</span>
        </div>
        ${transaction.tip_amount > 0 ? `
          <div class="total-row">
            <span>Trinkgeld:</span>
            <span>€${transaction.tip_amount.toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="total-row grand-total">
          <span>Gesamtbetrag:</span>
          <span>€${transaction.total_amount.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Vielen Dank für Ihren Besuch!</p>
        <p>${salon.name}</p>
      </div>
    </body>
    </html>
  `;
}
