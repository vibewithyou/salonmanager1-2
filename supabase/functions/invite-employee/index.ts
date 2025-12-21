import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Edge function to invite a newly created employee to set up their account.
 *
 * When invoked this function generates an invite link via Supabase Auth's admin
 * API using the service role key, updates the corresponding invitation
 * record to `sent`, and then dispatches a personalized email via Resend
 * containing the link. The invite link will prompt the user to set a
 * password on first login. All fields in the request body are required
 * except for the first and last name.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  employeeId: string;
  salonId: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

serve(async (req) => {
  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: InviteRequest = await req.json();
    const { employeeId, salonId, email, first_name, last_name } = body;
    if (!employeeId || !salonId || !email) {
      throw new Error("employeeId, salonId and email are required fields");
    }

    // Generate an invite link using the admin API. This creates the user if
    // necessary and returns a short-lived URL where they can set a password.
    const redirectTo = Deno.env.get("INVITE_REDIRECT_URL") || undefined;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: {
          employee_id: employeeId,
          salon_id: salonId,
          first_name: first_name || null,
          last_name: last_name || null,
        },
      },
    });
    if (linkError || !linkData) {
      throw new Error(linkError?.message || "Failed to generate invite link");
    }
    const inviteLink = linkData.action_link;

    // Mark the invitation as sent
    await supabase
      .from("employee_invitations")
      .update({ status: "sent" })
      .eq("employee_id", employeeId)
      .eq("email", email);

    // Optionally send an email via Resend. If the API key is missing the
    // invite link is returned in the response and can be sent by other means.
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      // Fetch salon name to personalize the message
      const { data: salonData } = await supabase
        .from("salons")
        .select("name")
        .eq("id", salonId)
        .single();
      const salonName = salonData?.name || "SalonManager";

      // Use the custom invitation template provided by the frontend. We compute
      // the current year and build a full HTML document. The registrationUrl
      // should point to the Supabase invite link returned above.
      const registrationUrl = inviteLink;
      const currentYear = new Date().getFullYear();
      const html = `
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Einladung zu SalonManager</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #0d0d0d; color: #d4af37; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #0d0d0d; padding: 20px; border-radius: 8px; }
        .logo { text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; padding: 12px 24px; margin-top: 20px; background-color: #d4af37;
                  color: #0d0d0d; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <img src="https://raw.githubusercontent.com/step2001/salonmanager-assets/main/logo-dark-small.png"
               alt="SalonManager Logo" style="max-width: 200px; height: auto;" />
        </div>
        <h1 style="color: #d4af37;">Willkommen bei ${salonName}</h1>
        <p style="color: #ffffff;">Hallo ${first_name || ''} ${last_name || ''},</p>
        <p style="color: #ffffff;">Sie wurden eingeladen, Teil des Teams von ${salonName} zu werden.
        Bitte legen Sie Ihren Account an, indem Sie auf den folgenden Button klicken:</p>
        <a href="${registrationUrl}" class="button">Account einrichten</a>
        <p style="color: #888;">Falls der Button nicht funktioniert, kopieren Sie diesen Link und fügen ihn in die Adresszeile Ihres Browsers ein:</p>
        <p style="color: #888; overflow-wrap: break-word; font-size: 12px;">${registrationUrl}</p>
        <div class="footer">
          <p style="color: #555;">© ${currentYear} ${salonName}. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </body>
    </html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${salonName} <no-reply@salonmanager.app>`,
          to: [email],
          subject: `Einladung zu ${salonName}`,
          html,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, inviteLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("invite-employee error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});