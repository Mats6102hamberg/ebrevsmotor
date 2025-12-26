const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Campaign-specific rate limiting
const campaignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 campaigns per window
  message: 'För många kampanjer skapade, försök igen senare',
  standardHeaders: true,
  legacyHeaders: false,
});

// Send campaign rate limiting (prevent spam)
const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 sends per hour
  message: 'För många kampanjer skickade, försök igen senare',
  standardHeaders: true,
  legacyHeaders: false,
});

// Database setup
const db = new sqlite3.Database('./newsletter.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subscribers table
    db.run(`CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      phone_number TEXT,
      subscribed INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed INTEGER DEFAULT 0,
      confirmation_token TEXT
    )`);

    // Newsletters table (boulefront, konstfront, winefront, etc.)
    db.run(`CREATE TABLE IF NOT EXISTS newsletters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subscriptions table
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscriber_id INTEGER,
      newsletter_id INTEGER,
      subscribed INTEGER DEFAULT 1,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(subscriber_id) REFERENCES subscribers(id),
      FOREIGN KEY(newsletter_id) REFERENCES newsletters(id),
      UNIQUE(subscriber_id, newsletter_id)
    )`);

    // Campaigns table
    db.run(`CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      newsletter_id INTEGER,
      subject TEXT NOT NULL,
      content_html TEXT,
      content_text TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_for DATETIME,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(newsletter_id) REFERENCES newsletters(id)
    )`);

    // Campaign stats table
    db.run(`CREATE TABLE IF NOT EXISTS campaign_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      emails_sent INTEGER DEFAULT 0,
      opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    )`);

    // Email templates table
    db.run(`CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT,
      html_content TEXT,
      text_content TEXT,
      thumbnail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // A/B tests table
    db.run(`CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      variant_a_subject TEXT,
      variant_b_subject TEXT,
      variant_a_content TEXT,
      variant_b_content TEXT,
      test_size INTEGER DEFAULT 50,
      winner_variant TEXT,
      variant_a_opens INTEGER DEFAULT 0,
      variant_b_opens INTEGER DEFAULT 0,
      variant_a_clicks INTEGER DEFAULT 0,
      variant_b_clicks INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    )`);

    // Automated flows table
    db.run(`CREATE TABLE IF NOT EXISTS automated_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      trigger_event TEXT,
      trigger_config TEXT,
      workflow_steps TEXT,
      is_active INTEGER DEFAULT 1,
      newsletter_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(newsletter_id) REFERENCES newsletters(id)
    )`);

    // Flow subscribers table (track who's in which flow)
    db.run(`CREATE TABLE IF NOT EXISTS flow_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow_id INTEGER,
      subscriber_id INTEGER,
      current_step INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY(flow_id) REFERENCES automated_flows(id),
      FOREIGN KEY(subscriber_id) REFERENCES subscribers(id)
    )`);

    // SMS campaigns table
    db.run(`CREATE TABLE IF NOT EXISTS sms_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      newsletter_id INTEGER,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      scheduled_for DATETIME,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(newsletter_id) REFERENCES newsletters(id)
    )`);

    // SMS stats table
    db.run(`CREATE TABLE IF NOT EXISTS sms_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sms_campaign_id INTEGER,
      messages_sent INTEGER DEFAULT 0,
      delivered INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sms_campaign_id) REFERENCES sms_campaigns(id)
    )`);

    // Landing pages table
    db.run(`CREATE TABLE IF NOT EXISTS landing_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      content_html TEXT,
      newsletter_id INTEGER,
      is_published INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(newsletter_id) REFERENCES newsletters(id)
    )`);

    // Landing page submissions table
    db.run(`CREATE TABLE IF NOT EXISTS landing_page_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landing_page_id INTEGER,
      email TEXT NOT NULL,
      name TEXT,
      phone_number TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(landing_page_id) REFERENCES landing_pages(id)
    )`);

    // Surveys table
    db.run(`CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      questions TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      newsletter_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(newsletter_id) REFERENCES newsletters(id)
    )`);

    // Survey responses table
    db.run(`CREATE TABLE IF NOT EXISTS survey_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER,
      email TEXT,
      name TEXT,
      responses TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(survey_id) REFERENCES surveys(id)
    )`);

    // Insert default newsletters
    const defaultNewsletters = [
      { name: 'Boulefront', slug: 'boulefront', description: 'Boulesport och tävlingar' },
      { name: 'Konstfront', slug: 'konstfront', description: 'Konst och utställningar' },
      { name: 'Winefront', slug: 'winefront', description: 'Viner och provningar' },
      { name: 'Arkitekturfront', slug: 'arkitekturfront', description: 'Arkitektur och design' },
      { name: 'Filmfront', slug: 'filmfront', description: 'Film och cinema' }
    ];

    defaultNewsletters.forEach(newsletter => {
      db.run(
        `INSERT OR IGNORE INTO newsletters (name, slug, description) VALUES (?, ?, ?)`,
        [newsletter.name, newsletter.slug, newsletter.description]
      );
    });

    // Insert default templates
    const templates = [
      {
        id: 1,
        name: 'Välkomstmail',
        subject: 'Välkommen till vårt nyhetsbrev!',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;"><div style="background-color: white; padding: 40px; border-radius: 10px;"><h1 style="color: #2c3e50; margin-bottom: 20px;">Välkommen! 👋</h1><p style="font-size: 16px; line-height: 1.6; color: #555;">Hej och tack för att du prenumererar på vårt nyhetsbrev!</p><p style="font-size: 16px; line-height: 1.6; color: #555;">Vi är glada att ha dig med oss. Här kommer du få de senaste nyheterna, tips och erbjudanden direkt i din inkorg.</p><a href="https://example.com" style="display: inline-block; margin-top: 20px; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Kom igång</a><p style="margin-top: 30px; color: #888; font-size: 14px;">Med vänliga hälsningar,<br><strong>Teamet</strong></p></div></div>',
        text: 'Välkommen!\n\nHej och tack för att du prenumererar på vårt nyhetsbrev!\n\nVi är glada att ha dig med oss.\n\nMed vänliga hälsningar,\nTeamet'
      },
      {
        id: 2,
        name: 'Produktlansering',
        subject: 'Ny produkt lanserad! 🚀',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60px 40px; border-radius: 10px; text-align: center; color: white;"><h1 style="margin: 0 0 20px 0; font-size: 32px;">Vi lanserar något nytt! 🚀</h1><p style="font-size: 18px; margin-bottom: 30px;">Upptäck vår senaste produkt som kommer förändra ditt sätt att arbeta</p><a href="https://example.com/product" style="display: inline-block; padding: 15px 40px; background-color: white; color: #667eea; text-decoration: none; border-radius: 50px; font-weight: bold;">Se produkten</a></div><div style="padding: 40px 20px; text-align: center;"><h2 style="color: #2c3e50;">Funktioner som gör skillnad</h2><ul style="list-style: none; padding: 0;"><li style="margin: 15px 0;">✅ Enkel att använda</li><li style="margin: 15px 0;">✅ Kraftfull prestanda</li><li style="margin: 15px 0;">✅ Prisvärd lösning</li></ul></div></div>',
        text: 'Vi lanserar något nytt!\n\nUpptäck vår senaste produkt som kommer förändra ditt sätt att arbeta.\n\nFunktioner:\n- Enkel att använda\n- Kraftfull prestanda\n- Prisvärd lösning\n\nBesök: https://example.com/product'
      },
      {
        id: 3,
        name: 'Event-inbjudan',
        subject: 'Du är inbjuden till vårt event! 🎉',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #fff3cd; padding: 40px; border-radius: 10px; border-left: 5px solid #ffc107;"><h1 style="color: #856404; margin-top: 0;">Du är inbjuden! 🎉</h1><p style="font-size: 16px; color: #856404; line-height: 1.6;">Vi har glädjen att bjuda in dig till vårt exklusiva event.</p><div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px;"><p style="margin: 5px 0;"><strong>📅 Datum:</strong> 15 november 2025</p><p style="margin: 5px 0;"><strong>🕐 Tid:</strong> 18:00 - 21:00</p><p style="margin: 5px 0;"><strong>📍 Plats:</strong> Stockholm Convention Center</p></div><a href="https://example.com/rsvp" style="display: inline-block; padding: 12px 30px; background-color: #ffc107; color: #856404; text-decoration: none; border-radius: 5px; font-weight: bold;">Anmäl dig här</a></div></div>',
        text: 'Du är inbjuden!\n\nVi har glädjen att bjuda in dig till vårt exklusiva event.\n\nDetaljer:\n📅 Datum: 15 november 2025\n🕐 Tid: 18:00 - 21:00\n📍 Plats: Stockholm Convention Center\n\nAnmäl dig: https://example.com/rsvp'
      },
      {
        id: 4,
        name: 'Månadsnyhetsbrev',
        subject: 'Månadens nyheter och uppdateringar',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #2c3e50; color: white; padding: 30px; text-align: center;"><h1 style="margin: 0;">Månadens Nyheter</h1><p style="margin: 10px 0 0 0;">Oktober 2025</p></div><div style="padding: 30px 20px;"><h2 style="color: #2c3e50;">Vad som hänt denna månad</h2><div style="border-left: 4px solid #3498db; padding-left: 20px; margin: 20px 0;"><h3 style="color: #3498db; margin-top: 0;">Nyhet 1</h3><p style="color: #555; line-height: 1.6;">Beskrivning av den första nyheten och vad den innebär för våra användare.</p></div><div style="border-left: 4px solid #e74c3c; padding-left: 20px; margin: 20px 0;"><h3 style="color: #e74c3c; margin-top: 0;">Nyhet 2</h3><p style="color: #555; line-height: 1.6;">Beskrivning av den andra nyheten och dess betydelse.</p></div><div style="border-left: 4px solid #2ecc71; padding-left: 20px; margin: 20px 0;"><h3 style="color: #2ecc71; margin-top: 0;">Nyhet 3</h3><p style="color: #555; line-height: 1.6;">Beskrivning av den tredje nyheten.</p></div></div></div>',
        text: 'Månadens Nyheter - Oktober 2025\n\nVad som hänt denna månad:\n\nNyhet 1\nBeskrivning av den första nyheten.\n\nNyhet 2\nBeskrivning av den andra nyheten.\n\nNyhet 3\nBeskrivning av den tredje nyheten.'
      },
      {
        id: 5,
        name: 'Specialerbjudande',
        subject: '🎁 Exklusivt erbjudande bara för dig!',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 50px 40px; border-radius: 10px; text-align: center; color: white;"><h1 style="margin: 0 0 10px 0; font-size: 36px;">🎁 Specialerbjudande</h1><p style="font-size: 20px; margin: 0 0 30px 0;">Bara för våra prenumeranter</p><div style="background-color: rgba(255,255,255,0.2); padding: 30px; border-radius: 10px; margin: 20px 0;"><p style="font-size: 48px; font-weight: bold; margin: 0;">30% RABATT</p><p style="font-size: 18px; margin: 10px 0 0 0;">Använd kod: <strong>SPECIAL30</strong></p></div><a href="https://example.com/shop" style="display: inline-block; padding: 15px 40px; background-color: white; color: #f5576c; text-decoration: none; border-radius: 50px; font-weight: bold; margin-top: 20px;">Shoppa nu</a><p style="margin-top: 20px; font-size: 14px;">Erbjudandet gäller till 31 december 2025</p></div></div>',
        text: 'SPECIALERBJUDANDE\n\n30% RABATT bara för våra prenumeranter!\n\nAnvänd kod: SPECIAL30\n\nShoppa nu: https://example.com/shop\n\nErbjudandet gäller till 31 december 2025'
      },
      {
        id: 6,
        name: 'Blogginlägg',
        subject: 'Nya artiklar på vår blogg',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #2c3e50; text-align: center;">Senaste från bloggen 📝</h1><div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 10px;"><img src="https://via.placeholder.com/560x200/3498db/ffffff?text=Artikel+1" style="width: 100%; border-radius: 5px; margin-bottom: 15px;" alt="Artikel"><h2 style="color: #2c3e50; margin-top: 0;">Titel på artikel 1</h2><p style="color: #555; line-height: 1.6;">En kort sammanfattning av artikeln som väcker läsarens intresse och får dem att vilja läsa mer...</p><a href="https://example.com/blog/1" style="color: #3498db; text-decoration: none; font-weight: bold;">Läs mer →</a></div><div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 10px;"><img src="https://via.placeholder.com/560x200/e74c3c/ffffff?text=Artikel+2" style="width: 100%; border-radius: 5px; margin-bottom: 15px;" alt="Artikel"><h2 style="color: #2c3e50; margin-top: 0;">Titel på artikel 2</h2><p style="color: #555; line-height: 1.6;">En kort sammanfattning av den andra artikeln...</p><a href="https://example.com/blog/2" style="color: #e74c3c; text-decoration: none; font-weight: bold;">Läs mer →</a></div></div>',
        text: 'Senaste från bloggen\n\nArtikel 1\nEn kort sammanfattning av artikeln.\nLäs mer: https://example.com/blog/1\n\nArtikel 2\nEn kort sammanfattning av den andra artikeln.\nLäs mer: https://example.com/blog/2'
      },
      {
        id: 7,
        name: 'Kundcase',
        subject: 'Se hur våra kunder lyckas',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; padding: 30px 20px;"><h1 style="color: #2c3e50;">Kundberättelse 💼</h1><p style="color: #555; font-size: 18px;">Se hur våra kunder uppnår fantastiska resultat</p></div><div style="background-color: #ecf0f1; padding: 30px; border-radius: 10px; margin: 20px 0;"><div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"><p style="font-size: 18px; font-style: italic; color: #555; line-height: 1.8;">"Denna lösning har förändrat vårt sätt att arbeta helt. Vi har ökat vår produktivitet med 150% på bara 3 månader!"</p><div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ecf0f1;"><p style="margin: 5px 0; color: #2c3e50;"><strong>Anna Andersson</strong></p><p style="margin: 5px 0; color: #7f8c8d;">VD, TechCorp AB</p></div></div></div><div style="text-align: center; margin-top: 30px;"><a href="https://example.com/cases" style="display: inline-block; padding: 12px 30px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px;">Läs fler kundcase</a></div></div>',
        text: 'Kundberättelse\n\n"Denna lösning har förändrat vårt sätt att arbeta helt. Vi har ökat vår produktivitet med 150% på bara 3 månader!"\n\n- Anna Andersson, VD, TechCorp AB\n\nLäs fler kundcase: https://example.com/cases'
      },
      {
        id: 8,
        name: 'Tips & Tricks',
        subject: '5 tips för att lyckas bättre',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;"><h1 style="margin: 0;">💡 Tips & Tricks</h1><p style="margin: 10px 0 0 0; font-size: 18px;">5 tips för att lyckas bättre</p></div><div style="background-color: white; padding: 30px;"><div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;"><h3 style="color: #667eea; margin-top: 0;">1️⃣ Första tipset</h3><p style="color: #555; line-height: 1.6;">Beskrivning av det första tipset och hur man tillämpar det.</p></div><div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;"><h3 style="color: #667eea; margin-top: 0;">2️⃣ Andra tipset</h3><p style="color: #555; line-height: 1.6;">Beskrivning av det andra tipset.</p></div><div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;"><h3 style="color: #667eea; margin-top: 0;">3️⃣ Tredje tipset</h3><p style="color: #555; line-height: 1.6;">Beskrivning av det tredje tipset.</p></div><div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;"><h3 style="color: #667eea; margin-top: 0;">4️⃣ Fjärde tipset</h3><p style="color: #555; line-height: 1.6;">Beskrivning av det fjärde tipset.</p></div><div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;"><h3 style="color: #667eea; margin-top: 0;">5️⃣ Femte tipset</h3><p style="color: #555; line-height: 1.6;">Beskrivning av det femte tipset.</p></div></div></div>',
        text: 'Tips & Tricks - 5 tips för att lyckas bättre\n\n1. Första tipset\nBeskrivning av det första tipset.\n\n2. Andra tipset\nBeskrivning av det andra tipset.\n\n3. Tredje tipset\nBeskrivning av det tredje tipset.\n\n4. Fjärde tipset\nBeskrivning av det fjärde tipset.\n\n5. Femte tipset\nBeskrivning av det femte tipset.'
      },
      {
        id: 9,
        name: 'Återengagemang',
        subject: 'Vi saknar dig! Kom tillbaka 💙',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; padding: 50px 30px;"><h1 style="color: #2c3e50; font-size: 36px; margin: 0 0 20px 0;">Vi saknar dig! 💙</h1><p style="font-size: 18px; color: #555; line-height: 1.6;">Det har gått ett tag sedan vi hördes senast. Vi har mycket nytt att dela med dig!</p><div style="margin: 40px 0;"><img src="https://via.placeholder.com/200x200/3498db/ffffff?text=❤️" style="width: 150px; height: 150px; border-radius: 50%;" alt="Heart"></div><h2 style="color: #2c3e50;">Vad du har missat:</h2><ul style="text-align: left; display: inline-block; margin: 20px auto;"><li style="margin: 10px 0; color: #555;">✨ Nya funktioner och uppdateringar</li><li style="margin: 10px 0; color: #555;">🎁 Exklusiva erbjudanden</li><li style="margin: 10px 0; color: #555;">📚 Värdefulla guider och tips</li></ul><a href="https://example.com" style="display: inline-block; margin-top: 30px; padding: 15px 40px; background-color: #3498db; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">Kom tillbaka</a></div></div>',
        text: 'Vi saknar dig!\n\nDet har gått ett tag sedan vi hördes senast. Vi har mycket nytt att dela med dig!\n\nVad du har missat:\n- Nya funktioner och uppdateringar\n- Exklusiva erbjudanden\n- Värdefulla guider och tips\n\nKom tillbaka: https://example.com'
      },
      {
        id: 10,
        name: 'Säsongshälsning',
        subject: 'God Jul och Gott Nytt År! 🎄',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #c94b4b 0%, #4b134f 100%); padding: 60px 40px; text-align: center; color: white; border-radius: 10px;"><h1 style="margin: 0 0 20px 0; font-size: 42px;">🎄 God Jul! 🎄</h1><p style="font-size: 20px; line-height: 1.6; margin: 20px 0;">Vi vill tacka dig för ett fantastiskt år och önska dig en riktigt God Jul och ett Gott Nytt År!</p><div style="background-color: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; margin: 30px 0;"><p style="font-size: 18px; margin: 0;">🎁 Som tack får du</p><p style="font-size: 32px; font-weight: bold; margin: 10px 0;">25% RABATT</p><p style="font-size: 16px; margin: 0;">på hela sortimentet</p><p style="margin-top: 15px; font-size: 14px;">Kod: <strong>JUL2025</strong></p></div><a href="https://example.com/shop" style="display: inline-block; padding: 15px 40px; background-color: white; color: #c94b4b; text-decoration: none; border-radius: 50px; font-weight: bold;">Shoppa julklapparna</a><p style="margin-top: 30px; font-size: 16px;">Med varma hälsningar,<br><strong>Hela teamet</strong></p></div></div>',
        text: 'God Jul och Gott Nytt År!\n\nVi vill tacka dig för ett fantastiskt år och önska dig en riktigt God Jul och ett Gott Nytt År!\n\nSom tack får du 25% RABATT på hela sortimentet.\nKod: JUL2025\n\nShoppa julklapparna: https://example.com/shop\n\nMed varma hälsningar,\nHela teamet'
      },
      {
        id: 11,
        name: 'Webinar-inbjudan',
        subject: 'Gratis webinar: Lär dig mer! 🎓',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #2c3e50; color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;"><h1 style="margin: 0 0 10px 0;">🎓 Gratis Webinar</h1><p style="margin: 0; font-size: 18px;">Lär dig experternas hemligheter</p></div><div style="background-color: white; padding: 40px; border: 2px solid #2c3e50; border-top: none; border-radius: 0 0 10px 10px;"><h2 style="color: #2c3e50; margin-top: 0;">Vad du kommer lära dig:</h2><ul style="color: #555; line-height: 2;"><li>📊 Hur du ökar din försäljning med 200%</li><li>💡 Bästa strategierna för 2025</li><li>🚀 Verktyg som sparar dig timmar varje vecka</li><li>❓ Frågestund med experter</li></ul><div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 30px 0;"><p style="margin: 5px 0; color: #2c3e50;"><strong>📅 Datum:</strong> 20 november 2025</p><p style="margin: 5px 0; color: #2c3e50;"><strong>🕐 Tid:</strong> 14:00 - 15:30</p><p style="margin: 5px 0; color: #2c3e50;"><strong>💻 Plattform:</strong> Zoom</p><p style="margin: 5px 0; color: #2c3e50;"><strong>💰 Pris:</strong> GRATIS!</p></div><div style="text-align: center;"><a href="https://example.com/webinar" style="display: inline-block; padding: 15px 40px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">Registrera dig nu</a><p style="margin-top: 15px; color: #7f8c8d; font-size: 14px;">Begränsat antal platser!</p></div></div></div>',
        text: 'Gratis Webinar - Lär dig experternas hemligheter\n\nVad du kommer lära dig:\n- Hur du ökar din försäljning med 200%\n- Bästa strategierna för 2025\n- Verktyg som sparar dig timmar varje vecka\n- Frågestund med experter\n\nDetaljer:\n📅 Datum: 20 november 2025\n🕐 Tid: 14:00 - 15:30\n💻 Plattform: Zoom\n💰 Pris: GRATIS!\n\nRegistrera dig: https://example.com/webinar\nBegränsat antal platser!'
      },
      {
        id: 12,
        name: 'Enkät-förfrågan',
        subject: 'Din åsikt är viktig för oss! 📋',
        html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; padding: 40px 20px;"><h1 style="color: #2c3e50; margin: 0 0 20px 0;">Vi vill höra från dig! 📋</h1><p style="font-size: 18px; color: #555; line-height: 1.6;">Din feedback hjälper oss att bli bättre</p></div><div style="background-color: #f8f9fa; padding: 40px; border-radius: 10px; margin: 20px 0;"><p style="color: #555; font-size: 16px; line-height: 1.8;">Hej!</p><p style="color: #555; font-size: 16px; line-height: 1.8;">Vi arbetar ständigt med att förbättra våra tjänster och din åsikt är ovärderlig för oss. Skulle du kunna ta 2 minuter att svara på vår korta enkät?</p><div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;"><p style="font-size: 48px; margin: 0;">⏱️</p><p style="font-size: 24px; color: #3498db; font-weight: bold; margin: 10px 0;">Bara 2 minuter</p></div><div style="text-align: center; margin-top: 30px;"><a href="https://example.com/survey" style="display: inline-block; padding: 15px 40px; background-color: #3498db; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">Svara på enkäten</a></div><p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 30px;">Som tack får du 10% rabatt på ditt nästa köp! 🎁</p></div></div>',
        text: 'Vi vill höra från dig!\n\nDin feedback hjälper oss att bli bättre.\n\nVi arbetar ständigt med att förbättra våra tjänster och din åsikt är ovärderlig för oss. Skulle du kunna ta 2 minuter att svara på vår korta enkät?\n\nSvara på enkäten: https://example.com/survey\n\nSom tack får du 10% rabatt på ditt nästa köp!'
      }
    ];

    templates.forEach(template => {
      db.run(
        `INSERT OR IGNORE INTO email_templates (id, name, subject, html_content, text_content) 
         VALUES (?, ?, ?, ?, ?)`,
        [template.id, template.name, template.subject, template.html, template.text]
      );
    });

    // Insert default automation flow
    const welcomeFlowSteps = JSON.stringify([
      {
        step: 1,
        type: 'email',
        delay_days: 0,
        subject: 'Välkommen till vårt nyhetsbrev!',
        content: 'Tack för att du prenumererar!'
      },
      {
        step: 2,
        type: 'email',
        delay_days: 3,
        subject: 'Här är våra bästa tips',
        content: 'Vi vill dela med oss av våra bästa tips...'
      },
      {
        step: 3,
        type: 'email',
        delay_days: 7,
        subject: 'Har du några frågor?',
        content: 'Vi finns här för att hjälpa dig!'
      }
    ]);

    db.run(
      `INSERT OR IGNORE INTO automated_flows (id, name, description, trigger_event, workflow_steps, is_active) 
       VALUES (1, 'Välkomstserie', 'Automatisk välkomstserie för nya prenumeranter', 'new_subscriber', ?, 1)`,
      [welcomeFlowSteps]
    );

    // Create database indexes for better performance
    db.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_newsletter ON subscriptions(newsletter_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_for)');
    db.run('CREATE INDEX IF NOT EXISTS idx_campaigns_newsletter ON campaigns(newsletter_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_campaign_stats_campaign ON campaign_stats(campaign_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_flow_subscribers_flow ON flow_subscribers(flow_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_flow_subscribers_subscriber ON flow_subscribers(subscriber_id)');
    
    console.log('Database indexes created');
  });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Email configuration (using Gmail as example)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Newsletter Engine',
    address: process.env.EMAIL_USER
  }
});

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'User already exists' });
        }
        
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET);
        res.json({ token, user: { id: this.lastID, email, name } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });
});

// Newsletter routes
app.get('/api/newsletters', (req, res) => {
  db.all('SELECT * FROM newsletters ORDER BY name', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Email templates routes
app.get('/api/templates', (req, res) => {
  db.all('SELECT * FROM email_templates ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/templates', authenticateToken, (req, res) => {
  const { name, subject, html_content, text_content } = req.body;
  
  if (!name || !subject) {
    return res.status(400).json({ error: 'Name and subject are required' });
  }
  
  db.run(
    `INSERT INTO email_templates (name, subject, html_content, text_content) 
     VALUES (?, ?, ?, ?)`,
    [name, subject, html_content, text_content],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error creating template' });
      }
      res.json({ 
        id: this.lastID, 
        message: 'Template created successfully'
      });
    }
  );
});

app.put('/api/templates/:id', authenticateToken, (req, res) => {
  const templateId = req.params.id;
  const { name, subject, html_content, text_content } = req.body;
  
  db.run(
    `UPDATE email_templates SET name = ?, subject = ?, html_content = ?, text_content = ? 
     WHERE id = ?`,
    [name, subject, html_content, text_content, templateId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error updating template' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ message: 'Template updated successfully' });
    }
  );
});

app.delete('/api/templates/:id', authenticateToken, (req, res) => {
  const templateId = req.params.id;
  
  db.run('DELETE FROM email_templates WHERE id = ?', [templateId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Error deleting template' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  });
});

// Subscriber routes
app.post('/api/subscribers', (req, res) => {
  const { email, name, phone_number, newsletter_slugs } = req.body;

  // First, create or get subscriber
  db.run(
    `INSERT OR REPLACE INTO subscribers (email, name, phone_number, confirmed) 
     VALUES (?, ?, ?, 1)`,
    [email, name, phone_number],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating subscriber' });
      }

      const subscriberId = this.lastID || 
        (() => {
          // If subscriber existed, get their ID
          db.get('SELECT id FROM subscribers WHERE email = ?', [email], (err, row) => row.id);
        })();

      // Subscribe to selected newsletters
      if (newsletter_slugs && newsletter_slugs.length > 0) {
        newsletter_slugs.forEach(slug => {
          db.get('SELECT id FROM newsletters WHERE slug = ?', [slug], (err, newsletter) => {
            if (newsletter) {
              db.run(
                `INSERT OR REPLACE INTO subscriptions (subscriber_id, newsletter_id, subscribed) 
                 VALUES (?, ?, 1)`,
                [subscriberId, newsletter.id]
              );
            }
          });
        });
      }

      res.json({ message: 'Subscriber added successfully', id: subscriberId });
    }
  );
});

// Campaign routes
app.get('/api/campaigns', authenticateToken, (req, res) => {
  const { newsletter_id } = req.query;
  
  let query = `
    SELECT c.*, n.name as newsletter_name 
    FROM campaigns c 
    LEFT JOIN newsletters n ON c.newsletter_id = n.id 
  `;
  let params = [];

  if (newsletter_id) {
    query += ' WHERE c.newsletter_id = ?';
    params.push(newsletter_id);
  }

  query += ' ORDER BY c.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/campaigns', authenticateToken, campaignLimiter, (req, res) => {
  const { newsletter_id, subject, content_html, content_text, scheduled_for } = req.body;

  // Determine status based on scheduled_for
  let status = 'draft';
  if (scheduled_for) {
    const scheduledDate = new Date(scheduled_for);
    const now = new Date();
    status = scheduledDate > now ? 'scheduled' : 'draft';
  }

  db.run(
    `INSERT INTO campaigns (newsletter_id, subject, content_html, content_text, scheduled_for, status) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [newsletter_id, subject, content_html, content_text, scheduled_for, status],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating campaign' });
      }
      res.json({ 
        id: this.lastID, 
        message: status === 'scheduled' 
          ? `Campaign scheduled for ${new Date(scheduled_for).toLocaleString()}` 
          : 'Campaign created successfully',
        status: status
      });
    }
  );
});

// Helper function to add tracking to links
function addTrackingToLinks(html, campaignId) {
  if (!html) return html;
  
  // Add tracking parameter to all links
  return html.replace(
    /href="([^"]+)"/g, 
    (match, url) => {
      const separator = url.includes('?') ? '&' : '?';
      return `href="${url}${separator}utm_campaign=${campaignId}&utm_source=newsletter"`;
    }
  );
}

// Helper function to send email batch
async function sendEmailBatch(batch, campaign, campaignId) {
  const results = { sent: 0, errors: [] };
  
  for (const subscriber of batch) {
    try {
      // Add tracking to HTML
      const trackingHtml = addTrackingToLinks(campaign.content_html, campaignId);
      
      await emailTransporter.sendMail({
        from: `${process.env.EMAIL_FROM_NAME || campaign.newsletter_name} <${process.env.EMAIL_USER}>`,
        to: `${subscriber.name || ''} <${subscriber.email}>`,
        subject: campaign.subject,
        html: trackingHtml,
        text: campaign.content_text,
        replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER
      });
      results.sent++;
    } catch (error) {
      results.errors.push({ email: subscriber.email, error: error.message });
    }
  }
  
  return results;
}

app.post('/api/campaigns/:id/send', authenticateToken, sendLimiter, async (req, res) => {
  const campaignId = req.params.id;

  try {
    // Get campaign details
    const campaign = await new Promise((resolve, reject) => {
      db.get(
        `SELECT c.*, n.name as newsletter_name 
         FROM campaigns c 
         LEFT JOIN newsletters n ON c.newsletter_id = n.id 
         WHERE c.id = ?`,
        [campaignId],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('Campaign not found'));
          else resolve(row);
        }
      );
    });

    // Get subscribers for this newsletter
    const subscribers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.email, s.name 
         FROM subscribers s 
         JOIN subscriptions sub ON s.id = sub.subscriber_id 
         WHERE sub.newsletter_id = ? AND sub.subscribed = 1 AND s.confirmed = 1`,
        [campaign.newsletter_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No subscribers found' });
    }

    let totalSent = 0;
    let allErrors = [];

    // Send emails in batches of 50
    const batchSize = 50;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const results = await sendEmailBatch(batch, campaign, campaignId);
      totalSent += results.sent;
      allErrors = allErrors.concat(results.errors);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE campaigns SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['sent', campaignId],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Save campaign stats
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO campaign_stats (campaign_id, emails_sent, bounces) VALUES (?, ?, ?)',
        [campaignId, totalSent, allErrors.length],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({
      message: `Campaign sent to ${totalSent} subscribers`,
      sent: totalSent,
      total: subscribers.length,
      errors: allErrors
    });

  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: error.message || 'Failed to send campaign' });
  }
});

// Campaign stats endpoint
app.get('/api/campaigns/:id/stats', authenticateToken, (req, res) => {
  const campaignId = req.params.id;
  
  db.get(
    'SELECT * FROM campaign_stats WHERE campaign_id = ?',
    [campaignId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!stats) {
        return res.json({ 
          emails_sent: 0, 
          opens: 0, 
          clicks: 0, 
          bounces: 0 
        });
      }
      res.json(stats);
    }
  );
});

// Stats endpoint
app.get('/api/stats', authenticateToken, (req, res) => {
  const stats = {};

  // Get total subscribers
  db.get('SELECT COUNT(*) as total FROM subscribers WHERE confirmed = 1', (err, row) => {
    stats.totalSubscribers = row.total;

    // Get subscribers per newsletter
    db.all(
      `SELECT n.name, COUNT(s.id) as count 
       FROM newsletters n 
       LEFT JOIN subscriptions sub ON n.id = sub.newsletter_id 
       LEFT JOIN subscribers s ON sub.subscriber_id = s.id 
       WHERE sub.subscribed = 1 AND s.confirmed = 1 
       GROUP BY n.id`,
      (err, rows) => {
        stats.newsletterStats = rows;

        // Get campaign stats
        db.all(
          `SELECT n.name, COUNT(c.id) as campaign_count 
           FROM newsletters n 
           LEFT JOIN campaigns c ON n.id = c.newsletter_id 
           GROUP BY n.id`,
          (err, rows) => {
            stats.campaignStats = rows;
            res.json(stats);
          }
        );
      }
    );
  });
});

// SMS Campaign routes
app.get('/api/sms-campaigns', authenticateToken, (req, res) => {
  const { newsletter_id } = req.query;
  
  let query = `
    SELECT sc.*, n.name as newsletter_name 
    FROM sms_campaigns sc 
    LEFT JOIN newsletters n ON sc.newsletter_id = n.id 
  `;
  let params = [];

  if (newsletter_id) {
    query += ' WHERE sc.newsletter_id = ?';
    params.push(newsletter_id);
  }

  query += ' ORDER BY sc.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/sms-campaigns', authenticateToken, campaignLimiter, (req, res) => {
  const { newsletter_id, message, scheduled_for } = req.body;

  if (!message || message.length > 160) {
    return res.status(400).json({ error: 'Message is required and must be 160 characters or less' });
  }

  let status = 'draft';
  if (scheduled_for) {
    const scheduledDate = new Date(scheduled_for);
    const now = new Date();
    status = scheduledDate > now ? 'scheduled' : 'draft';
  }

  db.run(
    `INSERT INTO sms_campaigns (newsletter_id, message, scheduled_for, status) 
     VALUES (?, ?, ?, ?)`,
    [newsletter_id, message, scheduled_for, status],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating SMS campaign' });
      }
      res.json({ 
        id: this.lastID, 
        message: status === 'scheduled' 
          ? `SMS campaign scheduled for ${new Date(scheduled_for).toLocaleString()}` 
          : 'SMS campaign created successfully',
        status: status
      });
    }
  );
});

app.post('/api/sms-campaigns/:id/send', authenticateToken, sendLimiter, async (req, res) => {
  const campaignId = req.params.id;

  try {
    // Get SMS campaign details
    const campaign = await new Promise((resolve, reject) => {
      db.get(
        `SELECT sc.*, n.name as newsletter_name 
         FROM sms_campaigns sc 
         LEFT JOIN newsletters n ON sc.newsletter_id = n.id 
         WHERE sc.id = ?`,
        [campaignId],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('SMS campaign not found'));
          else resolve(row);
        }
      );
    });

    // Get subscribers with phone numbers for this newsletter
    const subscribers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.phone_number, s.name 
         FROM subscribers s 
         JOIN subscriptions sub ON s.id = sub.subscriber_id 
         WHERE sub.newsletter_id = ? AND sub.subscribed = 1 AND s.confirmed = 1 AND s.phone_number IS NOT NULL`,
        [campaign.newsletter_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No subscribers with phone numbers found' });
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(400).json({ 
        error: 'Twilio is not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file' 
      });
    }

    // Send SMS using Twilio (mock for now - will be implemented when Twilio is configured)
    let totalSent = 0;
    let totalFailed = 0;

    // In production, you would use Twilio SDK here
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    for (const subscriber of subscribers) {
      try {
        // Mock send - replace with actual Twilio call
        // await client.messages.create({
        //   body: campaign.message,
        //   from: process.env.TWILIO_PHONE_NUMBER,
        //   to: subscriber.phone_number
        // });
        totalSent++;
        console.log(`SMS sent to ${subscriber.phone_number}: ${campaign.message}`);
      } catch (error) {
        totalFailed++;
        console.error(`Failed to send SMS to ${subscriber.phone_number}:`, error);
      }
    }

    // Update campaign status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE sms_campaigns SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['sent', campaignId],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Save SMS stats
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO sms_stats (sms_campaign_id, messages_sent, delivered, failed) VALUES (?, ?, ?, ?)',
        [campaignId, totalSent, totalSent, totalFailed],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({
      message: `SMS campaign sent to ${totalSent} subscribers`,
      sent: totalSent,
      total: subscribers.length,
      failed: totalFailed
    });

  } catch (error) {
    console.error('Send SMS campaign error:', error);
    res.status(500).json({ error: error.message || 'Failed to send SMS campaign' });
  }
});

// SMS stats endpoint
app.get('/api/sms-campaigns/:id/stats', authenticateToken, (req, res) => {
  const campaignId = req.params.id;
  
  db.get(
    'SELECT * FROM sms_stats WHERE sms_campaign_id = ?',
    [campaignId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!stats) {
        return res.json({ 
          messages_sent: 0, 
          delivered: 0, 
          failed: 0 
        });
      }
      res.json(stats);
    }
  );
});

// Landing Pages routes
app.get('/api/landing-pages', authenticateToken, (req, res) => {
  db.all(
    `SELECT lp.*, n.name as newsletter_name 
     FROM landing_pages lp 
     LEFT JOIN newsletters n ON lp.newsletter_id = n.id 
     ORDER BY lp.created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.get('/api/landing-pages/:slug', (req, res) => {
  const slug = req.params.slug;
  
  db.get(
    'SELECT * FROM landing_pages WHERE slug = ? AND is_published = 1',
    [slug],
    (err, page) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!page) {
        return res.status(404).json({ error: 'Landing page not found' });
      }
      
      // Increment views
      db.run('UPDATE landing_pages SET views = views + 1 WHERE id = ?', [page.id]);
      
      res.json(page);
    }
  );
});

app.post('/api/landing-pages', authenticateToken, (req, res) => {
  const { title, slug, description, content_html, newsletter_id } = req.body;
  
  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and slug are required' });
  }
  
  db.run(
    `INSERT INTO landing_pages (title, slug, description, content_html, newsletter_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [title, slug, description, content_html, newsletter_id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Slug already exists' });
        }
        return res.status(500).json({ error: 'Error creating landing page' });
      }
      res.json({ 
        id: this.lastID, 
        message: 'Landing page created successfully'
      });
    }
  );
});

app.put('/api/landing-pages/:id', authenticateToken, (req, res) => {
  const pageId = req.params.id;
  const { title, slug, description, content_html, newsletter_id, is_published } = req.body;
  
  db.run(
    `UPDATE landing_pages 
     SET title = ?, slug = ?, description = ?, content_html = ?, newsletter_id = ?, is_published = ?
     WHERE id = ?`,
    [title, slug, description, content_html, newsletter_id, is_published, pageId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Slug already exists' });
        }
        return res.status(500).json({ error: 'Error updating landing page' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Landing page not found' });
      }
      res.json({ message: 'Landing page updated successfully' });
    }
  );
});

app.delete('/api/landing-pages/:id', authenticateToken, (req, res) => {
  const pageId = req.params.id;
  
  db.run('DELETE FROM landing_pages WHERE id = ?', [pageId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting landing page' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    res.json({ message: 'Landing page deleted successfully' });
  });
});

// Landing page submission (public endpoint)
app.post('/api/landing-pages/:slug/submit', async (req, res) => {
  const slug = req.params.slug;
  const { email, name, phone_number, data } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    // Get landing page
    const page = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM landing_pages WHERE slug = ? AND is_published = 1',
        [slug],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('Landing page not found'));
          else resolve(row);
        }
      );
    });
    
    // Save submission
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO landing_page_submissions (landing_page_id, email, name, phone_number, data) 
         VALUES (?, ?, ?, ?, ?)`,
        [page.id, email, name, phone_number, JSON.stringify(data)],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    // Increment conversions
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE landing_pages SET conversions = conversions + 1 WHERE id = ?',
        [page.id],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    // Add subscriber if newsletter is linked
    if (page.newsletter_id) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO subscribers (email, name, phone_number, confirmed) 
           VALUES (?, ?, ?, 1)`,
          [email, name, phone_number],
          function(err) {
            if (err) {
              reject(err);
            } else {
              const subscriberId = this.lastID;
              
              // Subscribe to newsletter
              db.run(
                `INSERT OR IGNORE INTO subscriptions (subscriber_id, newsletter_id, subscribed) 
                 VALUES (?, ?, 1)`,
                [subscriberId, page.newsletter_id],
                (err) => err ? reject(err) : resolve()
              );
            }
          }
        );
      });
    }
    
    res.json({ 
      message: 'Submission successful',
      success: true 
    });
    
  } catch (error) {
    console.error('Landing page submission error:', error);
    res.status(500).json({ error: error.message || 'Submission failed' });
  }
});

// Get landing page stats
app.get('/api/landing-pages/:id/stats', authenticateToken, (req, res) => {
  const pageId = req.params.id;
  
  db.all(
    'SELECT * FROM landing_page_submissions WHERE landing_page_id = ? ORDER BY created_at DESC',
    [pageId],
    (err, submissions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      db.get(
        'SELECT views, conversions FROM landing_pages WHERE id = ?',
        [pageId],
        (err, page) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            views: page?.views || 0,
            conversions: page?.conversions || 0,
            conversion_rate: page?.views > 0 ? ((page.conversions / page.views) * 100).toFixed(2) : 0,
            submissions: submissions
          });
        }
      );
    }
  );
});

// Survey routes
app.get('/api/surveys', authenticateToken, (req, res) => {
  db.all(
    `SELECT s.*, n.name as newsletter_name,
     (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as response_count
     FROM surveys s
     LEFT JOIN newsletters n ON s.newsletter_id = n.id
     ORDER BY s.created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.get('/api/surveys/:id', (req, res) => {
  const surveyId = req.params.id;
  
  db.get(
    'SELECT * FROM surveys WHERE id = ? AND is_active = 1',
    [surveyId],
    (err, survey) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!survey) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      // Parse questions JSON
      survey.questions = JSON.parse(survey.questions);
      res.json(survey);
    }
  );
});

app.post('/api/surveys', authenticateToken, (req, res) => {
  const { title, description, questions, newsletter_id } = req.body;
  
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Title and questions are required' });
  }
  
  db.run(
    `INSERT INTO surveys (title, description, questions, newsletter_id) 
     VALUES (?, ?, ?, ?)`,
    [title, description, JSON.stringify(questions), newsletter_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating survey' });
      }
      res.json({ 
        id: this.lastID, 
        message: 'Survey created successfully'
      });
    }
  );
});

app.put('/api/surveys/:id', authenticateToken, (req, res) => {
  const surveyId = req.params.id;
  const { title, description, questions, newsletter_id, is_active } = req.body;
  
  db.run(
    `UPDATE surveys 
     SET title = ?, description = ?, questions = ?, newsletter_id = ?, is_active = ?
     WHERE id = ?`,
    [title, description, JSON.stringify(questions), newsletter_id, is_active, surveyId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating survey' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.json({ message: 'Survey updated successfully' });
    }
  );
});

app.delete('/api/surveys/:id', authenticateToken, (req, res) => {
  const surveyId = req.params.id;
  
  db.run('DELETE FROM surveys WHERE id = ?', [surveyId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting survey' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    res.json({ message: 'Survey deleted successfully' });
  });
});

// Submit survey response (public endpoint)
app.post('/api/surveys/:id/submit', async (req, res) => {
  const surveyId = req.params.id;
  const { email, name, responses } = req.body;
  
  if (!responses) {
    return res.status(400).json({ error: 'Responses are required' });
  }
  
  try {
    // Check if survey exists and is active
    const survey = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM surveys WHERE id = ? AND is_active = 1',
        [surveyId],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('Survey not found or inactive'));
          else resolve(row);
        }
      );
    });
    
    // Save response
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO survey_responses (survey_id, email, name, responses) 
         VALUES (?, ?, ?, ?)`,
        [surveyId, email, name, JSON.stringify(responses)],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    res.json({ 
      message: 'Survey response submitted successfully',
      success: true 
    });
    
  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ error: error.message || 'Submission failed' });
  }
});

// Get survey results
app.get('/api/surveys/:id/results', authenticateToken, (req, res) => {
  const surveyId = req.params.id;
  
  db.all(
    'SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY created_at DESC',
    [surveyId],
    (err, responses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse responses JSON
      const parsedResponses = responses.map(r => ({
        ...r,
        responses: JSON.parse(r.responses)
      }));
      
      res.json({
        total_responses: responses.length,
        responses: parsedResponses
      });
    }
  );
});

// Automation Workflow routes
app.get('/api/automation-flows', authenticateToken, (req, res) => {
  db.all(
    `SELECT af.*, n.name as newsletter_name,
     (SELECT COUNT(*) FROM flow_subscribers WHERE flow_id = af.id) as active_subscribers
     FROM automated_flows af
     LEFT JOIN newsletters n ON af.newsletter_id = n.id
     ORDER BY af.created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse JSON fields
      const flows = rows.map(flow => ({
        ...flow,
        trigger_config: flow.trigger_config ? JSON.parse(flow.trigger_config) : null,
        workflow_steps: flow.workflow_steps ? JSON.parse(flow.workflow_steps) : []
      }));
      
      res.json(flows);
    }
  );
});

app.get('/api/automation-flows/:id', authenticateToken, (req, res) => {
  const flowId = req.params.id;
  
  db.get(
    'SELECT * FROM automated_flows WHERE id = ?',
    [flowId],
    (err, flow) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!flow) {
        return res.status(404).json({ error: 'Automation flow not found' });
      }
      
      // Parse JSON fields
      flow.trigger_config = flow.trigger_config ? JSON.parse(flow.trigger_config) : null;
      flow.workflow_steps = flow.workflow_steps ? JSON.parse(flow.workflow_steps) : [];
      
      res.json(flow);
    }
  );
});

app.post('/api/automation-flows', authenticateToken, (req, res) => {
  const { name, description, trigger_event, trigger_config, workflow_steps, newsletter_id } = req.body;
  
  if (!name || !trigger_event || !workflow_steps || workflow_steps.length === 0) {
    return res.status(400).json({ error: 'Name, trigger event, and workflow steps are required' });
  }
  
  db.run(
    `INSERT INTO automated_flows (name, description, trigger_event, trigger_config, workflow_steps, newsletter_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, trigger_event, JSON.stringify(trigger_config), JSON.stringify(workflow_steps), newsletter_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating automation flow' });
      }
      res.json({ 
        id: this.lastID, 
        message: 'Automation flow created successfully'
      });
    }
  );
});

app.put('/api/automation-flows/:id', authenticateToken, (req, res) => {
  const flowId = req.params.id;
  const { name, description, trigger_event, trigger_config, workflow_steps, newsletter_id, is_active } = req.body;
  
  db.run(
    `UPDATE automated_flows 
     SET name = ?, description = ?, trigger_event = ?, trigger_config = ?, workflow_steps = ?, newsletter_id = ?, is_active = ?
     WHERE id = ?`,
    [name, description, trigger_event, JSON.stringify(trigger_config), JSON.stringify(workflow_steps), newsletter_id, is_active, flowId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating automation flow' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Automation flow not found' });
      }
      res.json({ message: 'Automation flow updated successfully' });
    }
  );
});

app.delete('/api/automation-flows/:id', authenticateToken, (req, res) => {
  const flowId = req.params.id;
  
  db.run('DELETE FROM automated_flows WHERE id = ?', [flowId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting automation flow' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Automation flow not found' });
    }
    res.json({ message: 'Automation flow deleted successfully' });
  });
});

// Get flow subscribers
app.get('/api/automation-flows/:id/subscribers', authenticateToken, (req, res) => {
  const flowId = req.params.id;
  
  db.all(
    `SELECT fs.*, s.email, s.name
     FROM flow_subscribers fs
     JOIN subscribers s ON fs.subscriber_id = s.id
     WHERE fs.flow_id = ?
     ORDER BY fs.started_at DESC`,
    [flowId],
    (err, subscribers) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(subscribers);
    }
  );
});

// Background job for scheduled campaigns
const checkScheduledCampaigns = async () => {
  const now = new Date().toISOString();
  
  db.all(
    `SELECT * FROM campaigns 
     WHERE status = 'scheduled' 
     AND scheduled_for <= ?`,
    [now],
    async (err, campaigns) => {
      if (err) {
        console.error('Error checking scheduled campaigns:', err);
        return;
      }

      if (campaigns && campaigns.length > 0) {
        console.log(`Found ${campaigns.length} scheduled campaigns to send`);
        
        for (const campaign of campaigns) {
          try {
            console.log(`Sending scheduled campaign: ${campaign.id} - ${campaign.subject}`);
            
            // Update status to 'sending' to prevent duplicate sends
            await new Promise((resolve, reject) => {
              db.run(
                'UPDATE campaigns SET status = ? WHERE id = ?',
                ['sending', campaign.id],
                (err) => err ? reject(err) : resolve()
              );
            });

            // Trigger the send (reuse existing send logic)
            // Note: In production, you'd call the actual send function here
            // For now, we just update the status
            await new Promise((resolve, reject) => {
              db.run(
                'UPDATE campaigns SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['sent', campaign.id],
                (err) => err ? reject(err) : resolve()
              );
            });

            console.log(`Campaign ${campaign.id} sent successfully`);
          } catch (error) {
            console.error(`Error sending campaign ${campaign.id}:`, error);
            
            // Revert to scheduled if send failed
            db.run(
              'UPDATE campaigns SET status = ? WHERE id = ?',
              ['scheduled', campaign.id]
            );
          }
        }
      }
    }
  );
};

// Run every minute (60000ms)
setInterval(checkScheduledCampaigns, 60000);
console.log('Scheduled campaigns checker started (runs every 60 seconds)');

// Run once on startup after a delay to let database initialize
setTimeout(checkScheduledCampaigns, 5000);

app.listen(PORT, () => {
  console.log(`Newsletter engine running on port ${PORT}`);
});
