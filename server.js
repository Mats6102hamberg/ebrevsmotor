const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  message: { error: 'För många förfrågningar, försök igen senare' }
});

app.use('/api/', limiter);

// Gmail SMTP transporter med app-lösenord
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // false för port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify SMTP configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Configuration Error:', error.message);
  } else {
    console.log('✅ SMTP Server ready');
  }
});

/**
 * sendMail() - Kärn-funktion för e-postutskick
 *
 * @param {Object} options
 * @param {string} options.to - Mottagare (hashas i logg)
 * @param {string} options.subject - Ämnesrad
 * @param {string} options.html - HTML-body
 * @param {string} options.text - Text-fallback
 * @returns {Promise<Object>} { success: boolean, messageId?: string, error?: string }
 */
async function sendMail({ to, subject, html, text }) {
  try {
    // Validera input
    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required fields: to, subject, html/text');
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      replyTo: process.env.EMAIL_REPLY_TO,
      to: to,
      subject: subject,
      html: html,
      text: text || stripHtml(html) // Fallback till stripped HTML om text saknas
    };

    const info = await transporter.sendMail(mailOptions);

    // Logga success utan att visa e-postadressen i klartext
    const hashedRecipient = hashEmail(to);
    console.log(`✅ Email sent | Recipient: ${hashedRecipient} | MessageID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    // Logga fel utan att visa e-postadressen i klartext
    const hashedRecipient = to ? hashEmail(to) : 'UNKNOWN';
    console.error(`❌ Email failed | Recipient: ${hashedRecipient} | Error: ${error.message}`);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Hash email för säker loggning
 */
function hashEmail(email) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(email).digest('hex').substring(0, 8);
}

/**
 * Strip HTML för text-fallback
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Batch-utskick med delay mellan emails
 */
async function sendBatch(recipients, subject, html, text) {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  const batchSize = parseInt(process.env.BATCH_SIZE) || 5;
  const batchDelay = parseInt(process.env.BATCH_DELAY_MS) || 2000;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    const result = await sendMail({
      to: recipient,
      subject,
      html,
      text
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push({
        recipient: hashEmail(recipient),
        error: result.error
      });
    }

    // Delay mellan batches
    if ((i + 1) % batchSize === 0 && i < recipients.length - 1) {
      console.log(`⏸️  Batch ${Math.floor(i / batchSize) + 1} completed. Waiting ${batchDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  return results;
}

// ===== API ENDPOINTS =====

// Root endpoint - landing page
app.get('/', (req, res) => {
  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  res.send(`
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-brevsmotor - ERS Informationsutskick</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 800px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #1e3a8a;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 15px;
      background: ${smtpConfigured ? '#ecfdf5' : '#fef2f2'};
      border-left: 4px solid ${smtpConfigured ? '#10b981' : '#ef4444'};
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .status-icon {
      font-size: 24px;
    }
    .endpoints {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .endpoint {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .endpoint:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    .method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 10px;
    }
    .get { background: #dbeafe; color: #1e40af; }
    .post { background: #dcfce7; color: #166534; }
    .path {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #374151;
    }
    .description {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📧 E-brevsmotor</h1>
    <p class="subtitle">ERS Informationsutskick - API Server</p>

    <div class="status">
      <span class="status-icon">${smtpConfigured ? '✅' : '⚠️'}</span>
      <div>
        <strong>${smtpConfigured ? 'SMTP Konfigurerad' : 'SMTP Ej Konfigurerad'}</strong><br>
        <small>${smtpConfigured ? 'Servern är redo att skicka email via ' + process.env.SMTP_HOST : 'Konfigurera SMTP i .env-filen'}</small>
      </div>
    </div>

    <div class="endpoints">
      <h2 style="margin-bottom: 15px; font-size: 18px; color: #374151;">Tillgängliga Endpoints</h2>

      <div class="endpoint">
        <div>
          <span class="method get">GET</span>
          <span class="path">/health</span>
        </div>
        <div class="description">Hälsokontroll och serverstatus</div>
      </div>

      <div class="endpoint">
        <div>
          <span class="method post">POST</span>
          <span class="path">/api/test-email</span>
        </div>
        <div class="description">
          Skicka testmail till en mottagare<br>
          <code>{ "to": "email@example.com" }</code>
        </div>
      </div>

      <div class="endpoint">
        <div>
          <span class="method post">POST</span>
          <span class="path">/api/send-ers-info</span>
        </div>
        <div class="description">
          Skicka ERS-informationsbrev till lista (max 50)<br>
          <code>{ "recipients": ["email1@example.com", "email2@example.com"] }</code>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>E-brevsmotor v1.0 - Smartflow AB</p>
      <p>Port: ${process.env.PORT || 3040} | Node.js + Express + Nodemailer</p>
    </div>
  </div>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'E-brevsmotor',
    smtp: {
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
      host: process.env.SMTP_HOST
    }
  });
});

// Test single email
app.post('/api/test-email', async (req, res) => {
  const { to, subject, html, text } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Missing recipient (to)' });
  }

  const result = await sendMail({
    to,
    subject: subject || 'Test från E-brevsmotor',
    html: html || '<h1>Test</h1><p>Detta är ett testmail.</p>',
    text: text || 'Test\n\nDetta är ett testmail.'
  });

  if (result.success) {
    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error
    });
  }
});

// Send ERS information email (manual trigger)
app.post('/api/send-ers-info', async (req, res) => {
  const { recipients } = req.body;

  // Validera
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: 'Missing or invalid recipients array'
    });
  }

  if (recipients.length > 50) {
    return res.status(400).json({
      error: 'Max 50 recipients per request (safety limit)'
    });
  }

  const subject = 'ERS är nu tillgängligt – informationsbrev';

  const html = `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e3a8a; font-size: 24px; margin-bottom: 10px; }
    p { margin-bottom: 15px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <h1>ERS är nu tillgängligt</h1>

  <p>Detta är ett informationsbrev om att ERS (Enterprise Research Shield) nu är tillgängligt.</p>

  <p>ERS är ett professionellt stöd för resonemang, analys och struktur i textbaserat arbete. Det hjälper användare att tydliggöra tankar, identifiera perspektiv och belysa möjliga konsekvenser – särskilt i sammanhang där noggrannhet, omdöme och ansvar är viktiga.</p>

  <p><strong>ERS erbjuder:</strong></p>
  <ul>
    <li>Reflektion kring innehåll</li>
    <li>Strukturering av resonemang</li>
    <li>Identifiering av risker, oklarheter eller antaganden</li>
    <li>Stöd inför beslut, formuleringar eller bedömningar</li>
  </ul>

  <p>ERS är inte ett uppslagsverk och ersätter inte specialiserade tjänster, men kan bidra som ett professionellt verktyg i det dagliga arbetet.</p>

  <p>För mer information, vänligen kontakta oss.</p>

  <div class="footer">
    <p>Med vänliga hälsningar,<br>Smartflow AB</p>
    <p style="font-size: 12px; color: #999;">Detta är ett informationsbrev. Du får detta eftersom du tidigare har visat intresse för våra tjänster.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
ERS är nu tillgängligt

Detta är ett informationsbrev om att ERS (Enterprise Research Shield) nu är tillgängligt.

ERS är ett professionellt stöd för resonemang, analys och struktur i textbaserat arbete. Det hjälper användare att tydliggöra tankar, identifiera perspektiv och belysa möjliga konsekvenser – särskilt i sammanhang där noggrannhet, omdöme och ansvar är viktiga.

ERS erbjuder:
- Reflektion kring innehåll
- Strukturering av resonemang
- Identifiering av risker, oklarheter eller antaganden
- Stöd inför beslut, formuleringar eller bedömningar

ERS är inte ett uppslagsverk och ersätter inte specialiserade tjänster, men kan bidra som ett professionellt verktyg i det dagliga arbetet.

För mer information, vänligen kontakta oss.

---
Med vänliga hälsningar,
Smartflow AB

Detta är ett informationsbrev. Du får detta eftersom du tidigare har visat intresse för våra tjänster.
  `.trim();

  console.log(`📧 Starting ERS info email batch: ${recipients.length} recipients`);

  const results = await sendBatch(recipients, subject, html, text);

  console.log(`\n📊 Batch Summary:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   Sent: ${results.sent}`);
  console.log(`   Failed: ${results.failed}`);

  res.json({
    success: true,
    results: {
      total: results.total,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors
    }
  });
});

// Start server
const PORT = process.env.PORT || 3040;
app.listen(PORT, () => {
  console.log(`\n✅ E-brevsmotor running on http://localhost:${PORT}`);
  console.log(`📧 SMTP configured: ${!!(process.env.SMTP_USER && process.env.SMTP_PASSWORD)}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health              - Health check`);
  console.log(`  POST /api/test-email      - Send test email`);
  console.log(`  POST /api/send-ers-info   - Send ERS info batch\n`);
});
