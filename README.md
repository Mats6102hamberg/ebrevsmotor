# E-brevsmotor

Node/Express e-postmotor för ERS-informationsutskick med Gmail SMTP.

## Arkitektur

- **Stabilitet prioriteras** före funktionalitet
- Manuell kontroll vid varje steg
- Tydlig loggning utan att exponera e-postadresser
- Rate limiting aktiverat
- Batch-utskick med delay

## Setup

### 1. Skapa .env

```bash
cp .env.example .env
```

### 2. Konfigurera Gmail App Password

1. Gå till https://myaccount.google.com/apppasswords
2. Skapa nytt app-lösenord för "Mail"
3. Kopiera lösenordet till `.env`

### 3. Uppdatera .env

```env
SMTP_USER=din-email@gmail.com
SMTP_PASSWORD=ditt-app-password
EMAIL_FROM_NAME=ERS Informationsbrev
EMAIL_FROM=din-email@gmail.com
EMAIL_REPLY_TO=din-email@gmail.com
```

### 4. Starta server

```bash
npm start
```

Server körs på: `http://localhost:3040`

## API Endpoints

### GET /health

Kontrollera serverstatus och SMTP-konfiguration.

```bash
curl http://localhost:3040/health
```

### POST /api/test-email

Skicka testmail till 1 mottagare.

```bash
curl -X POST http://localhost:3040/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test från E-brevsmotor",
    "html": "<h1>Test</h1><p>Detta är ett testmail.</p>",
    "text": "Test\n\nDetta är ett testmail."
  }'
```

### POST /api/send-ers-info

Skicka ERS-informationsbrev till lista av mottagare.

**VIKTIGT:** Max 50 mottagare per request (säkerhetsgräns).

```bash
curl -X POST http://localhost:3040/api/send-ers-info \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "mottagare1@example.com",
      "mottagare2@example.com"
    ]
  }'
```

## Säkerhet

### E-postadresser loggas ALDRIG i klartext

Alla e-postadresser hashas (SHA-256, 8 tecken) före loggning:

```
✅ Email sent | Recipient: a3f5c2d1 | MessageID: <...>
```

### Rate Limiting

- **15 minuter fönster**
- **Max 10 requests** per IP

### Batch Settings

- **Batch size:** 5 emails per batch
- **Delay:** 2000ms mellan batches

Konfigurerbart via `.env`:
```env
BATCH_SIZE=5
BATCH_DELAY_MS=2000
```

## Testning

### Steg 1: Testmail till dig själv

```bash
curl -X POST http://localhost:3040/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "din-email@gmail.com"
  }'
```

**Förväntat resultat:**
- ✅ Du får ett testmail
- ✅ Server loggar: `✅ Email sent | Recipient: XXXXXXXX | MessageID: ...`

### Steg 2: ERS-info till 1 mottagare (pilot)

```bash
curl -X POST http://localhost:3040/api/send-ers-info \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["din-email@gmail.com"]
  }'
```

**Förväntat resultat:**
- ✅ Du får ERS-informationsbrevet
- ✅ Ämnesrad: "ERS är nu tillgängligt – informationsbrev"
- ✅ HTML och text-version fungerar

### Steg 3: Pilot med 20–50 mottagare

```bash
curl -X POST http://localhost:3040/api/send-ers-info \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "mottagare1@example.com",
      "mottagare2@example.com",
      ...
    ]
  }'
```

**Server loggar:**
```
📧 Starting ERS info email batch: 20 recipients
✅ Email sent | Recipient: a3f5c2d1 | MessageID: <...>
✅ Email sent | Recipient: b7d2e9f4 | MessageID: <...>
⏸️  Batch 1 completed. Waiting 2000ms...
...

📊 Batch Summary:
   Total: 20
   Sent: 20
   Failed: 0
```

## ERS-informationsbrev

### Ämnesrad
```
ERS är nu tillgängligt – informationsbrev
```

### Innehåll

- Saklig och professionell ton
- Ingen CTA-knapp (informationsbrev, ej säljbrev)
- HTML + text-version
- Avsändare: "ERS Informationsbrev <din-email@gmail.com>"
- Reply-to: Konfigurerbar i .env

## Loggning

### Success
```
✅ Email sent | Recipient: a3f5c2d1 | MessageID: <20241225123456@gmail.com>
```

### Failure
```
❌ Email failed | Recipient: a3f5c2d1 | Error: Invalid recipient
```

### Batch Summary
```
📊 Batch Summary:
   Total: 50
   Sent: 48
   Failed: 2
```

## Begränsningar (Steg A)

Detta är **STEG A** - initial lansering:

- ✅ Max 50 mottagare per request
- ✅ Manuell trigger via API
- ✅ Inga automatiska schemaläggningar
- ✅ Ingen databas (stateless)
- ✅ Ingen prenumeranthantering

**För framtida steg:**
- Koppling till databas för prenumeranter
- Automatiska utskick
- Kampanjhantering
- Integration med ERS säkerhetsscanning

## Candidate Finder

Automatiserad verktyg för att hitta potentiella ERS-kunder genom att söka efter organisationer och extrahera kontaktinformation från deras webbplatser.

### Översikt

Candidate Finder kan arbeta i två lägen:

1. **Google Custom Search API** - Automatisk sökning efter organisationer (kräver API-nyckel)
2. **Fallback-läge** - Manuell lista av URL:er i `urls.txt`

### Setup

#### Alternativ 1: Google Custom Search API (Rekommenderat)

1. **Skaffa API-nyckel:**
   - Gå till https://developers.google.com/custom-search/v1/overview
   - Skapa nytt projekt och aktivera Custom Search API
   - Generera API-nyckel

2. **Skapa Search Engine:**
   - Gå till https://programmablesearchengine.google.com/
   - Klicka "Add" och konfigurera sökmotorn
   - Kopiera "Search engine ID" (cx)

3. **Uppdatera .env:**
   ```env
   GOOGLE_CSE_API_KEY=din-api-nyckel
   GOOGLE_CSE_CX=ditt-search-engine-id
   CANDIDATE_RATE_LIMIT_MS=2000
   ```

#### Alternativ 2: Fallback-läge (Manuell lista)

1. **Skapa urls.txt:**
   ```bash
   touch urls.txt
   ```

2. **Lägg till URL:er (en per rad):**
   ```
   https://example.com
   https://region-norr.se
   https://kommun-syd.se
   ```

### Användning

```bash
npm run candidates
```

**Output:**
- `data/private/candidates.csv` - CSV-format för manuell granskning
- `data/private/candidates.json` - JSON-format för vidare bearbetning

### Output-struktur

#### CSV-kolumner:

| Kolumn | Beskrivning |
|--------|-------------|
| Organization | Organisationsnamn (extraherat från titel) |
| Website | Huvudwebbplats |
| Source URL | Ursprunglig URL (sökresultat eller manuell lista) |
| Contact Page | URL till hittad kontaktsida |
| Email | Föreslagen e-postadress |
| Confidence | Konfidensnivå (0-100%) |
| Needs Review | `true` om manuell granskning behövs |
| Snippet | Beskrivning från sökresultat |

#### JSON-struktur:

```json
[
  {
    "org_name": "Region Norr IT-avdelning",
    "website": "https://region-norr.se",
    "source_url": "https://region-norr.se/kontakt",
    "contact_page_url": "https://region-norr.se/kontakt",
    "suggested_email": "it-sakerhetsansvarig@region-norr.se",
    "confidence_score": 85,
    "needs_review": false,
    "snippet": "Region Norr IT säkerhet kontakt..."
  }
]
```

### Konfidenspoäng

Algoritmen bedömer trovärdighet (0-100%):

| Faktor | Påverkan |
|--------|----------|
| Hittad på dedikerad kontaktsida (`/kontakt`, `/contact`) | +30% |
| Professionellt prefix (`info@`, `kontakt@`, `contact@`) | +20% |
| E-postdomän matchar webbplats | +20% |
| Många e-postadresser hittade (>5) | -10% |
| Basnivå | 30% |

**Konfidensnivåer:**
- **≥70%** - Hög trovärdighet, kan användas direkt
- **50-69%** - Medel, rekommenderad granskning
- **<50%** - Låg, manuell verifiering krävs

### Manuell granskning

Filtrera kandidater som behöver granskas:

```bash
# Visa alla som behöver granskning
cat data/private/candidates.csv | grep "true"

# Visa bara högkvalitativa resultat
cat data/private/candidates.csv | grep "false"
```

### Processbeskrivning

1. **Sökning:**
   - Google CSE: Söker med fördefinierade termer (se `CONFIG.searchTerms`)
   - Fallback: Läser URL:er från `urls.txt`

2. **robots.txt-kontroll:**
   - Kollar om webbplatsen tillåter crawling
   - Hoppar över om `Disallow: /` för alla user agents

3. **Kontaktsida-upptäckt:**
   - Testar vanliga sökvägar: `/kontakt`, `/contact`, `/om-oss`, `/about`
   - Använder första tillgängliga sida

4. **E-postextraktion:**
   - Regex-baserad extraktion från HTML
   - Filtrerar bort vanliga "noise"-adresser (example.com, sentry.io, etc.)
   - Prioriterar professionella prefix (info@, kontakt@)

5. **Export:**
   - Sparar både CSV och JSON
   - Markerar resultat som behöver granskning

### Etik och compliance

**Viktigt:**
- Respekterar `robots.txt`
- Rate limiting aktiverat (2s delay mellan requests)
- Exponentiell backoff vid fel
- User-Agent: `Mozilla/5.0 (compatible; ERS-CandidateFinder/1.0; +https://smartflow.se)`
- Timeout: 10s per request

**GDPR:**
- All output sparas i `data/private/` (ingår i `.gitignore`)
- **COMMITTA ALDRIG** kandidatlistor till version control
- E-postadresser är offentligt tillgänglig information från organisationers webbplatser

### Söktermer (Google CSE)

Fördefinierade söktermer i `candidates.js`:

```javascript
searchTerms: [
  'region it säkerhet kontakt',
  'sjukhus informationssäkerhet kontakt',
  'kommun it-avdelning kontakt'
]
```

Anpassa efter målgrupp genom att redigera `CONFIG.searchTerms`.

### Exempel på körning

```
$ npm run candidates

🔍 ERS Candidate Finder

📡 Using Google Custom Search API...

Searching: "region it säkerhet kontakt"
Searching: "sjukhus informationssäkerhet kontakt"
Searching: "kommun it-avdelning kontakt"

Found 15 unique candidates

[1/15] Region Norr IT-avdelning
   Website: https://region-norr.se
   Checking: https://region-norr.se/kontakt
   ✅ Email: it-sakerhetsansvarig@region-norr.se (confidence: 85%)

[2/15] Sahlgrenska Universitetssjukhuset
   Website: https://sahlgrenska.se
   Checking: https://sahlgrenska.se/kontakt
   ⚠️  No email found

...

✅ CSV exported: /Users/admin/CascadeProjects/ebrevsmotor/data/private/candidates.csv
✅ JSON exported: /Users/admin/CascadeProjects/ebrevsmotor/data/private/candidates.json

📊 Summary:
   Total candidates: 15
   With email: 12
   High confidence (≥70%): 8
   Needs manual review: 7

✅ Done!
```

### Integration med E-brevsmotor

Efter manuell granskning:

1. Öppna `data/private/candidates.csv`
2. Granska rader där `Needs Review = true`
3. Verifiera e-postadresser manuellt
4. Exportera godkända adresser till lista
5. Använd `/api/send-ers-info` för utskick

## Troubleshooting

### SMTP Configuration Error

**Problem:** `❌ SMTP Configuration Error: Invalid login`

**Lösning:**
1. Kontrollera att Gmail App Password är korrekt
2. Verifiera att SMTP_USER matchar Gmail-kontot
3. Testa anslutningen: `curl http://localhost:3040/health`

### Rate Limit Exceeded

**Problem:** `För många förfrågningar, försök igen senare`

**Lösning:**
- Vänta 15 minuter
- Eller justera rate limit i `.env`

### Email not received

**Problem:** Email skickas (logs visar success) men mottagaren får inget

**Lösning:**
1. Kontrollera spam-mapp
2. Verifiera att EMAIL_FROM är korrekt
3. Kontrollera Gmail "Sent" för att se om mailet skickades

## Utveckling

```bash
npm run dev
```

Server startar med auto-reload vid filändringar.

## Licens

MIT - Smartflow AB
