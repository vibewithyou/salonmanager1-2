import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "appointment_reminder" | "appointment_confirmed" | "appointment_cancelled" | "appointment_updated";
  email: string;
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName?: string;
  stylistName?: string;
  salonName?: string;
  language?: "de" | "en";
}

const getEmailContent = (data: NotificationRequest) => {
  const isGerman = data.language === "de";
  
  const templates = {
    appointment_reminder: {
      subject: isGerman ? `Terminerinnerung - ${data.salonName}` : `Appointment Reminder - ${data.salonName}`,
      html: isGerman ? `
        <h1>Terminerinnerung</h1>
        <p>Hallo ${data.customerName},</p>
        <p>wir möchten Sie an Ihren bevorstehenden Termin erinnern:</p>
        <ul>
          <li><strong>Datum:</strong> ${data.appointmentDate}</li>
          <li><strong>Uhrzeit:</strong> ${data.appointmentTime}</li>
          ${data.serviceName ? `<li><strong>Service:</strong> ${data.serviceName}</li>` : ""}
          ${data.stylistName ? `<li><strong>Stylist:</strong> ${data.stylistName}</li>` : ""}
        </ul>
        <p>Wir freuen uns auf Ihren Besuch!</p>
        <p>Mit freundlichen Grüßen,<br>${data.salonName}</p>
      ` : `
        <h1>Appointment Reminder</h1>
        <p>Hello ${data.customerName},</p>
        <p>We would like to remind you of your upcoming appointment:</p>
        <ul>
          <li><strong>Date:</strong> ${data.appointmentDate}</li>
          <li><strong>Time:</strong> ${data.appointmentTime}</li>
          ${data.serviceName ? `<li><strong>Service:</strong> ${data.serviceName}</li>` : ""}
          ${data.stylistName ? `<li><strong>Stylist:</strong> ${data.stylistName}</li>` : ""}
        </ul>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>${data.salonName}</p>
      `
    },
    appointment_confirmed: {
      subject: isGerman ? `Termin bestätigt - ${data.salonName}` : `Appointment Confirmed - ${data.salonName}`,
      html: isGerman ? `
        <h1>Termin bestätigt</h1>
        <p>Hallo ${data.customerName},</p>
        <p>Ihr Termin wurde bestätigt:</p>
        <ul>
          <li><strong>Datum:</strong> ${data.appointmentDate}</li>
          <li><strong>Uhrzeit:</strong> ${data.appointmentTime}</li>
          ${data.serviceName ? `<li><strong>Service:</strong> ${data.serviceName}</li>` : ""}
          ${data.stylistName ? `<li><strong>Stylist:</strong> ${data.stylistName}</li>` : ""}
        </ul>
        <p>Wir freuen uns auf Ihren Besuch!</p>
        <p>Mit freundlichen Grüßen,<br>${data.salonName}</p>
      ` : `
        <h1>Appointment Confirmed</h1>
        <p>Hello ${data.customerName},</p>
        <p>Your appointment has been confirmed:</p>
        <ul>
          <li><strong>Date:</strong> ${data.appointmentDate}</li>
          <li><strong>Time:</strong> ${data.appointmentTime}</li>
          ${data.serviceName ? `<li><strong>Service:</strong> ${data.serviceName}</li>` : ""}
          ${data.stylistName ? `<li><strong>Stylist:</strong> ${data.stylistName}</li>` : ""}
        </ul>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>${data.salonName}</p>
      `
    },
    appointment_cancelled: {
      subject: isGerman ? `Termin storniert - ${data.salonName}` : `Appointment Cancelled - ${data.salonName}`,
      html: isGerman ? `
        <h1>Termin storniert</h1>
        <p>Hallo ${data.customerName},</p>
        <p>Ihr Termin am ${data.appointmentDate} um ${data.appointmentTime} wurde leider storniert.</p>
        <p>Bitte kontaktieren Sie uns, um einen neuen Termin zu vereinbaren.</p>
        <p>Mit freundlichen Grüßen,<br>${data.salonName}</p>
      ` : `
        <h1>Appointment Cancelled</h1>
        <p>Hello ${data.customerName},</p>
        <p>Your appointment on ${data.appointmentDate} at ${data.appointmentTime} has been cancelled.</p>
        <p>Please contact us to schedule a new appointment.</p>
        <p>Best regards,<br>${data.salonName}</p>
      `
    },
    appointment_updated: {
      subject: isGerman ? `Termin geändert - ${data.salonName}` : `Appointment Updated - ${data.salonName}`,
      html: isGerman ? `
        <h1>Termin geändert</h1>
        <p>Hallo ${data.customerName},</p>
        <p>Ihr Termin wurde auf einen neuen Zeitpunkt verschoben:</p>
        <ul>
          <li><strong>Neues Datum:</strong> ${data.appointmentDate}</li>
          <li><strong>Neue Uhrzeit:</strong> ${data.appointmentTime}</li>
          ${data.serviceName ? `<li><strong>Service:</strong> ${data.serviceName}</li>` : ""}
          ${data.stylistName ? `<li><strong>Stylist:</strong> ${data.stylistName}</li>` : ""}
        </ul>
        <p>Wir freuen uns auf Ihren Besuch!</p>
        <p>Mit freundlichen Grüßen,<br>${data.salonName}</p>
      ` : `
        <h1>Appointment Updated</h1>
        <p>Hello ${data.customerName},</p>
        <p>Your appointment has been rescheduled:</p>
        <ul>
          <li><strong>New Date:</strong> ${data.appointmentDate}</li>
          <li><strong>New Time:</strong> ${data.appointmentTime}</li>
          ${data.serviceName ? `<li><strong>Service:</strong> ${data.serviceName}</li>` : ""}
          ${data.stylistName ? `<li><strong>Stylist:</strong> ${data.stylistName}</li>` : ""}
        </ul>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>${data.salonName}</p>
      `
    }
  };

  return templates[data.type];
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();
    console.log("Notification data:", data);

    const emailContent = getEmailContent(data);
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SalonManager <onboarding@resend.dev>",
        to: [data.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResponse = await response.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
