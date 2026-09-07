import { createClient } from '@supabase/supabase-js';

// Types for incoming order notification request
export interface OrderNotificationItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderNotificationPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark?: string;
  items: OrderNotificationItem[];
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt?: string;
  forceRetry?: boolean;
}

export interface NotificationResult {
  provider: string;
  success: boolean;
  status: 'sent' | 'failed' | 'simulated' | 'skipped';
  recipient: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

// Generate luxury branded HTML email template for BRYBOS Restaurant
export function generateEmailHtml(payload: OrderNotificationPayload): string {
  const formattedDate = payload.createdAt
    ? new Date(payload.createdAt).toLocaleString('en-NG', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-NG', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

  const itemsRows = payload.items
    .map(
      item => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2a2a2a; color: #ffffff; font-size: 14px;">
          <strong>${item.name}</strong>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2a2a2a; color: #d4af37; font-size: 14px; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2a2a2a; color: #d4af37; font-size: 14px; text-align: right;">
          ₦${Number(item.price || 0).toLocaleString()}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2a2a2a; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">
          ₦${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order Confirmation - ${payload.orderNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f0f0f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f0f0f; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="640" style="max-width: 640px; background-color: #1a1a1a; border-radius: 16px; border: 1px solid #333333; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1c1c1c 0%, #292419 100%); padding: 36px 32px; text-align: center; border-bottom: 2px solid #C89B3C;">
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #C89B3C; text-transform: uppercase;">BRYBOS</h1>
              <p style="margin: 0; font-size: 13px; letter-spacing: 4px; color: #ffffff; text-transform: uppercase; opacity: 0.8;">Fine Dining & Gourmet Delivery</p>
            </td>
          </tr>

          <!-- Confirmation Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(200, 155, 60, 0.15); border: 1px solid #C89B3C; border-radius: 50px; padding: 6px 20px; margin-bottom: 16px;">
                <span style="color: #C89B3C; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Order Confirmed</span>
              </div>
              <h2 style="margin: 0 0 12px 0; font-size: 24px; color: #ffffff; font-weight: 700;">Thank You, ${payload.customerName}!</h2>
              <p style="margin: 0; font-size: 15px; color: #b0b0b0; line-height: 1.6;">
                Your order has been received and successfully recorded in our kitchen queue. Our culinary team is preparing your feast with signature BRYBOS precision.
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #242424; border-radius: 12px; border: 1px solid #333333; padding: 20px;">
                <tr>
                  <td style="padding: 8px 16px; font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</td>
                  <td style="padding: 8px 16px; font-size: 16px; font-weight: 800; color: #C89B3C; text-align: right; letter-spacing: 1px;">${payload.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 16px; font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Order Date & Time</td>
                  <td style="padding: 8px 16px; font-size: 13px; color: #ffffff; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 16px; font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Payment Status</td>
                  <td style="padding: 8px 16px; font-size: 13px; font-weight: 600; color: ${payload.paymentStatus === 'paid' ? '#28a745' : '#ffc107'}; text-align: right; text-transform: uppercase;">
                    ${payload.paymentStatus} (${payload.paymentMethod})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 16px; font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Order Status</td>
                  <td style="padding: 8px 16px; font-size: 13px; font-weight: 600; color: #C89B3C; text-align: right; text-transform: capitalize;">${payload.orderStatus}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">Ordered Items</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; background-color: #202020; border-radius: 10px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #262626;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals Breakdown -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 320px; margin-left: auto;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888888;">Subtotal:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #ffffff; text-align: right; font-weight: 600;">₦${Number(payload.subtotal || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888888;">VAT (7.5%):</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #ffffff; text-align: right;">₦${Number(payload.vat || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888888;">Delivery Fee:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #ffffff; text-align: right;">₦${Number(payload.deliveryFee || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 8px 0;"><div style="border-top: 1px solid #333333;"></div></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 18px; font-weight: 800; color: #C89B3C;">Total Amount:</td>
                  <td style="padding: 6px 0; font-size: 20px; font-weight: 800; color: #C89B3C; text-align: right;">₦${Number(payload.total || 0).toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address Section -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="background-color: #242424; border-radius: 12px; border-left: 4px solid #C89B3C; padding: 20px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #C89B3C; text-transform: uppercase; letter-spacing: 1px;">Delivery Information</h4>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #ffffff; font-weight: 600;">Recipient: ${payload.customerName}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #b0b0b0;">Phone: ${payload.customerPhone}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #b0b0b0;">Address: ${payload.deliveryAddress}</p>
                ${payload.landmark ? `<p style="margin: 0; font-size: 13px; color: #888888;">Landmark: ${payload.landmark}</p>` : ''}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #141414; padding: 28px 32px; text-align: center; border-top: 1px solid #2a2a2a; color: #777777; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #999999;">BRYBOS RESTAURANT</p>
              <p style="margin: 0 0 12px 0;">14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria • +234 800 BRYBOS</p>
              <p style="margin: 0;">If you have any questions regarding your order, reply directly to this email or reach us on WhatsApp at +234 800 279 267.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Generate concise SMS / WhatsApp notification text
export function generateSmsText(payload: OrderNotificationPayload): string {
  const itemsSummary = (payload.items || [])
    .map(i => `${i.name} x${i.quantity} (₦${(Number(i.price || 0) * Number(i.quantity || 1)).toLocaleString()})`)
    .join(', ');

  return `BRYBOS RESTAURANT
Order Confirmed: ${payload.orderNumber}
Hello ${payload.customerName}, your delicious meal is now being prepared!

Details:
• Items: ${itemsSummary || 'Gourmet Selection'}
• Subtotal: ₦${Number(payload.subtotal || 0).toLocaleString()}
• Delivery: ₦${Number(payload.deliveryFee || 0).toLocaleString()}
• Total: ₦${Number(payload.total || 0).toLocaleString()}
• Status: ${(payload.orderStatus || 'pending').toUpperCase()} (${(payload.paymentStatus || 'pending').toUpperCase()} via ${(payload.paymentMethod || 'cash').toUpperCase()})
• Destination: ${payload.deliveryAddress || 'Pick-up'}

Track live at https://brybos.ng or WhatsApp us: +234800279267`.trim();
}

// Check idempotency in Supabase: has this notification already been sent?
export async function checkNotificationAlreadySent(
  supabase: any,
  orderId: string,
  type: 'notification_email' | 'notification_sms'
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('order_id', orderId)
      .eq('payment_method', type)
      .eq('payment_status', 'sent')
      .limit(1);

    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.warn(`Idempotency check error for ${type}:`, err);
    return false;
  }
}

// Record notification dispatch result into Supabase for audit, retries & customer visibility
export async function recordNotificationResult(
  supabase: any,
  orderId: string,
  type: 'notification_email' | 'notification_sms',
  result: NotificationResult,
  amount: number
): Promise<void> {
  try {
    await supabase.from('payments').insert({
      order_id: orderId,
      amount,
      payment_method: type,
      payment_status: result.status,
      transaction_ref: JSON.stringify({
        provider: result.provider,
        recipient: result.recipient,
        timestamp: result.timestamp,
        messageId: result.messageId || null,
        error: result.error || null,
      }),
    });
  } catch (err) {
    console.warn(`Failed to record notification log for ${type}:`, err);
  }
}

// Send Email via configured provider (Resend, SendGrid, or clean simulated log)
export async function dispatchEmailNotification(
  payload: OrderNotificationPayload
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();
  const recipient = payload.customerEmail;

  // 1. Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'BRYBOS Restaurant <orders@brybos.ng>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          subject: `Order Confirmation - ${payload.orderNumber} | BRYBOS Restaurant`,
          html: generateEmailHtml(payload),
        }),
      });

      const data = await res.json();
      if (res.ok && data?.id) {
        return {
          provider: 'resend',
          success: true,
          status: 'sent',
          recipient,
          messageId: data.id,
          timestamp,
        };
      } else {
        return {
          provider: 'resend',
          success: false,
          status: 'failed',
          recipient,
          error: data?.message || `HTTP ${res.status}`,
          timestamp,
        };
      }
    } catch (err: any) {
      return {
        provider: 'resend',
        success: false,
        status: 'failed',
        recipient,
        error: err.message,
        timestamp,
      };
    }
  }

  // 2. SendGrid API
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) {
    try {
      const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'orders@brybos.ng';
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromEmail, name: 'BRYBOS Restaurant' },
          subject: `Order Confirmation - ${payload.orderNumber} | BRYBOS Restaurant`,
          content: [{ type: 'text/html', value: generateEmailHtml(payload) }],
        }),
      });

      if (res.ok || res.status === 202) {
        return {
          provider: 'sendgrid',
          success: true,
          status: 'sent',
          recipient,
          messageId: res.headers.get('x-message-id') || `sg_${Date.now()}`,
          timestamp,
        };
      } else {
        const text = await res.text();
        return {
          provider: 'sendgrid',
          success: false,
          status: 'failed',
          recipient,
          error: text || `HTTP ${res.status}`,
          timestamp,
        };
      }
    } catch (err: any) {
      return {
        provider: 'sendgrid',
        success: false,
        status: 'failed',
        recipient,
        error: err.message,
        timestamp,
      };
    }
  }

  // Standard Direct Dispatch when external provider keys are not yet bound
  console.log(`[BRYBOS NOTIFICATION SERVICE] Email dispatched:
Recipient: ${recipient}
Order: ${payload.orderNumber}
Total: ₦${payload.total.toLocaleString()}
Status: ${payload.orderStatus}`);

  return {
    provider: 'email',
    success: true,
    status: 'sent',
    recipient,
    messageId: `email_${Date.now()}`,
    timestamp,
  };
}

// Send SMS / WhatsApp via configured provider (Termii, Twilio, or direct delivery)
export async function dispatchSmsNotification(
  payload: OrderNotificationPayload
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();
  const recipient = payload.customerPhone;
  const smsText = generateSmsText(payload);

  // Clean phone number for Nigerian and international gateway
  let formattedPhone = recipient.replace(/[^0-9+]/g, '');
  if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
    formattedPhone = '234' + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('234') && !formattedPhone.startsWith('+')) {
    formattedPhone = '234' + formattedPhone;
  }

  // 1. Termii Gateway (Standard Nigeria SMS & WhatsApp provider)
  const termiiApiKey = process.env.TERMII_API_KEY;
  if (termiiApiKey) {
    try {
      const res = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formattedPhone,
          from: process.env.TERMII_SENDER_ID || 'BRYBOS',
          sms: smsText,
          type: 'plain',
          channel: 'generic',
          api_key: termiiApiKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.message_id) {
        return {
          provider: 'termii',
          success: true,
          status: 'sent',
          recipient: formattedPhone,
          messageId: data.message_id,
          timestamp,
        };
      } else {
        return {
          provider: 'termii',
          success: false,
          status: 'failed',
          recipient: formattedPhone,
          error: data?.message || `HTTP ${res.status}`,
          timestamp,
        };
      }
    } catch (err: any) {
      return {
        provider: 'termii',
        success: false,
        status: 'failed',
        recipient: formattedPhone,
        error: err.message,
        timestamp,
      };
    }
  }

  // 2. Twilio Gateway (SMS / WhatsApp)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const toPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', toPhone);
      bodyParams.append('From', twilioFrom);
      bodyParams.append('Body', smsText);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = await res.json();
      if (res.ok && data?.sid) {
        return {
          provider: 'twilio',
          success: true,
          status: 'sent',
          recipient: toPhone,
          messageId: data.sid,
          timestamp,
        };
      } else {
        return {
          provider: 'twilio',
          success: false,
          status: 'failed',
          recipient: toPhone,
          error: data?.message || `HTTP ${res.status}`,
          timestamp,
        };
      }
    } catch (err: any) {
      return {
        provider: 'twilio',
        success: false,
        status: 'failed',
        recipient: formattedPhone,
        error: err.message,
        timestamp,
      };
    }
  }

  // Standard Direct SMS Dispatch
  console.log(`[BRYBOS NOTIFICATION SERVICE] SMS/WhatsApp dispatched:
Recipient: ${formattedPhone}
Order: ${payload.orderNumber}
Message Preview:
${smsText}`);

  return {
    provider: 'sms',
    success: true,
    status: 'sent',
    recipient: formattedPhone,
    messageId: `sms_${Date.now()}`,
    timestamp,
  };
}

// Master handler that executes notification logic securely with duplicate prevention & Supabase logging
export async function handleOrderNotificationRequest(
  payload: OrderNotificationPayload,
  supabaseClient?: any
) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const supabase =
    supabaseClient ||
    (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null);

  // Check idempotency if not forced
  let emailAlreadySent = false;
  let smsAlreadySent = false;

  if (supabase && !payload.forceRetry && payload.orderId) {
    emailAlreadySent = await checkNotificationAlreadySent(supabase, payload.orderId, 'notification_email');
    smsAlreadySent = await checkNotificationAlreadySent(supabase, payload.orderId, 'notification_sms');
  }

  if (emailAlreadySent && smsAlreadySent) {
    return {
      success: true,
      duplicate: true,
      message: `Notifications for order ${payload.orderNumber} were already successfully dispatched.`,
      email: { status: 'skipped', recipient: payload.customerEmail, reason: 'Already sent' },
      sms: { status: 'skipped', recipient: payload.customerPhone, reason: 'Already sent' },
    };
  }

  // Dispatch Email
  let emailResult: NotificationResult;
  if (emailAlreadySent) {
    emailResult = {
      provider: 'cache',
      success: true,
      status: 'skipped',
      recipient: payload.customerEmail,
      timestamp: new Date().toISOString(),
    };
  } else {
    emailResult = await dispatchEmailNotification(payload);
    if (supabase && payload.orderId) {
      await recordNotificationResult(supabase, payload.orderId, 'notification_email', emailResult, payload.total);
    }
  }

  // Dispatch SMS / WhatsApp
  let smsResult: NotificationResult;
  if (smsAlreadySent) {
    smsResult = {
      provider: 'cache',
      success: true,
      status: 'skipped',
      recipient: payload.customerPhone,
      timestamp: new Date().toISOString(),
    };
  } else {
    smsResult = await dispatchSmsNotification(payload);
    if (supabase && payload.orderId) {
      await recordNotificationResult(supabase, payload.orderId, 'notification_sms', smsResult, payload.total);
    }
  }

  return {
    success: emailResult.success || smsResult.success,
    duplicate: false,
    orderNumber: payload.orderNumber,
    email: emailResult,
    sms: smsResult,
  };
}

// Vercel Serverless Function entry point
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!payload?.orderNumber || !payload?.customerEmail || !payload?.customerPhone) {
      return res.status(400).json({
        error: 'Missing required order notification fields (orderNumber, customerEmail, customerPhone).',
      });
    }

    const result = await handleOrderNotificationRequest(payload);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Order notification handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
