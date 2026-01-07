# Email & SMS Notification Setup Guide

This document explains how to set up email and SMS notifications for SAFECORD.

## Overview

The frontend now triggers notification endpoints when:
- A user receives a direct message
- A user receives a call

## Required Backend Endpoints

### 1. POST `/notification/message`
Sends email/SMS when a user receives a message.

**Request Body:**
```json
{
  "recipientId": "user-id",
  "senderUsername": "sender-name",
  "message": "message content"
}
```

**Implementation:**
1. Fetch recipient's profile (email, phone, notification preferences)
2. If `emailNotifications` enabled and email exists, send email
3. If `smsNotifications` enabled and phone exists, send SMS

### 2. POST `/notification/call`
Sends email/SMS when a user receives a call.

**Request Body:**
```json
{
  "recipientId": "user-id",
  "callerUsername": "caller-name"
}
```

**Implementation:**
1. Fetch recipient's profile (email, phone, notification preferences)
2. If `emailNotifications` enabled and email exists, send email
3. If `smsNotifications` enabled and phone exists, send SMS

## Database Schema Updates

Update the `profiles` table to include:
```sql
ALTER TABLE profiles ADD COLUMN email TEXT;
ALTER TABLE profiles ADD COLUMN phone TEXT;
ALTER TABLE profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN sms_notifications BOOLEAN DEFAULT true;
```

## Email Service Setup (SendGrid Example)

### Install SendGrid in your Supabase Edge Function:
```typescript
import { SendGrid } from 'sendgrid';

const sendgrid = new SendGrid(Deno.env.get('SENDGRID_API_KEY')!);

async function sendEmail(to: string, subject: string, body: string) {
  await sendgrid.send({
    to,
    from: 'noreply@safecord.com',
    subject,
    text: body,
    html: `<p>${body}</p>`
  });
}
```

### Set Environment Variable:
In your Supabase dashboard, add:
- `SENDGRID_API_KEY` = your SendGrid API key

## SMS Service Setup (Twilio Example)

### Install Twilio in your Supabase Edge Function:
```typescript
const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

async function sendSMS(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', fromNumber);
  formData.append('Body', body);
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });
}
```

### Set Environment Variables:
In your Supabase dashboard, add:
- `TWILIO_ACCOUNT_SID` = your Twilio Account SID
- `TWILIO_AUTH_TOKEN` = your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` = your Twilio phone number

## Example Notification Endpoint Implementation

```typescript
// /notification/message endpoint
Deno.serve(async (req) => {
  const { recipientId, senderUsername, message } = await req.json();
  
  // Fetch recipient profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, phone, email_notifications, sms_notifications')
    .eq('user_id', recipientId)
    .single();
  
  if (!profile) {
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  }
  
  // Send email notification
  if (profile.email_notifications && profile.email) {
    await sendEmail(
      profile.email,
      `New message from ${senderUsername}`,
      `You have a new message from ${senderUsername}: "${message}"`
    );
  }
  
  // Send SMS notification
  if (profile.sms_notifications && profile.phone) {
    await sendSMS(
      profile.phone,
      `SAFECORD: New message from ${senderUsername}: "${message.substring(0, 100)}"`
    );
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

## Profile Update Endpoint Changes

Update the `/profile/update` endpoint to accept and store:
- `email`
- `phone`
- `emailNotifications`
- `smsNotifications`

```typescript
const { email, phone, emailNotifications, smsNotifications } = await req.json();

await supabase
  .from('profiles')
  .update({
    email,
    phone,
    email_notifications: emailNotifications,
    sms_notifications: smsNotifications
  })
  .eq('username', username);
```

## Security Considerations

1. **Rate Limiting**: Implement rate limits on notification endpoints to prevent spam
2. **Phone Number Validation**: Validate phone numbers before storing
3. **Email Validation**: Validate email addresses before storing
4. **Opt-out Links**: Include unsubscribe links in emails
5. **Cost Management**: Monitor SMS/email usage to avoid unexpected costs
6. **PII Protection**: Remember that email/phone are PII - handle securely and comply with privacy laws

## Testing

1. Set up test accounts in SendGrid/Twilio
2. Use your own email/phone for initial testing
3. Test with notification preferences enabled/disabled
4. Verify notifications are sent only when preferences allow

## Alternative Services

Instead of SendGrid/Twilio, you can use:
- **Email**: AWS SES, Mailgun, Postmark, Resend
- **SMS**: AWS SNS, MessageBird, Vonage

Choose based on your budget and region requirements.
