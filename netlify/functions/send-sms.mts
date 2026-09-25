// Sends a text message to a JT Hair Salon stylist via Twilio.
// POST JSON: { stylist: "John" | "Zhanna", message: string }
// If SMS_API_KEY is set, requests must include it in the "x-api-key" header.

const STYLISTS: Record<string, { name: string; phone: string; email?: string }> = {
  john: { name: 'John Gutierrez', phone: '+13104875469' },
  zhanna: { name: 'Zhanna', phone: '+14243404979', email: 'zhannik0110@gmail.com' },
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const apiKey = Netlify.env.get('SMS_API_KEY')
  if (apiKey && req.headers.get('x-api-key') !== apiKey) {
    return new Response('Unauthorized', { status: 401 })
  }

  const accountSid = Netlify.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Netlify.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Netlify.env.get('TWILIO_PHONE_NUMBER')
  if (!accountSid || !authToken || !fromNumber) {
    return Response.json({ error: 'SMS service not configured' }, { status: 500 })
  }

  let body: { stylist?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const stylist = STYLISTS[(body.stylist || '').trim().split(' ')[0].toLowerCase()]
  if (!stylist) {
    return Response.json({ error: `Unknown stylist: ${body.stylist}` }, { status: 400 })
  }
  const message = (body.message || '').trim().slice(0, 600)
  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: stylist.phone, From: fromNumber, Body: message }),
  })
  const data = await res.json()

  if (!res.ok) {
    console.error('Twilio error:', data)
    return Response.json({ error: data.message }, { status: 502 })
  }
  return Response.json({ stylist: stylist.name, sid: data.sid, status: data.status })
}
