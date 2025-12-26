# Newsletter Engine

En kraftfull och användarvänlig nyhetsbrevsmotor för att hantera flera nyhetsbrev (Boulefront, Konstfront, Winefront, Arkitekturfront, Filmfront).

## 🚀 Huvudfunktioner

### Core Features
- 🔐 **Autentisering** - Säker inloggning med JWT-tokens och bcrypt
- 📧 **Multi-Newsletter Support** - Hantera flera nyhetsbrev samtidigt
- 👥 **Prenumeranthantering** - Lägg till prenumeranter med e-post och telefonnummer
- 📨 **E-postkampanjer** - Skapa, schemalägga och skicka kampanjer med HTML/text
- 📊 **Avancerad Analytics** - Detaljerad statistik med öppningar, klick och engagemang
- 🛡️ **Rate Limiting** - Skydd mot överbelastning och spam

### Nya Avancerade Funktioner
- 📱 **SMS-kampanjer** - Skicka SMS via Twilio till prenumeranter
- 🎯 **Landing Pages** - Skapa och publicera landing pages med conversion tracking
- 📋 **Surveys/Enkäter** - Bygg enkäter och samla in feedback från användare
- 📝 **12+ Email Templates** - Professionella mallar för olika användningsområden
- ⏰ **Schemaläggning** - Automatisk utskick av schemalagda kampanjer
- 🔗 **UTM Tracking** - Automatisk spårning av länkar i kampanjer
- 📈 **Real-time Stats** - Live-statistik för kampanjer, SMS och landing pages

## Teknisk Stack

### Backend
- Node.js + Express
- SQLite databas
- JWT autentisering
- Nodemailer för e-post
- Bcrypt för lösenordskryptering

### Frontend
- React + Vite
- Mantine UI-komponenter
- Modern och responsiv design

## Installation

1. **Installera dependencies:**
```bash
npm install
```

2. **Konfigurera miljövariabler:**
```bash
cp .env.example .env
# Redigera .env och lägg till dina e-postuppgifter
```

3. **Starta backend-servern:**
```bash
npm start
```

4. **Installera frontend-dependencies (i separat terminal):**
```bash
npm install vite @vitejs/plugin-react react react-dom @mantine/core @mantine/hooks @mantine/form @mantine/notifications
```

5. **Starta frontend-utvecklingsservern:**
```bash
npx vite
```

## Användning

1. **Registrera en användare:**
   - Använd API-endpoint: `POST /api/auth/register`
   - Eller använd ett verktyg som Postman/curl

2. **Logga in:**
   - Öppna `http://localhost:5173` i din webbläsare
   - Logga in med dina uppgifter

3. **Hantera nyhetsbrev:**
   - Dashboard visar översikt
   - Lägg till prenumeranter
   - Skapa kampanjer
   - Skicka nyhetsbrev

## API Endpoints

### Autentisering
- `POST /api/auth/register` - Registrera ny användare
- `POST /api/auth/login` - Logga in

### Nyhetsbrev
- `GET /api/newsletters` - Hämta alla nyhetsbrev

### Prenumeranter
- `POST /api/subscribers` - Lägg till prenumerant

### Kampanjer (kräver autentisering)
- `GET /api/campaigns` - Hämta kampanjer
- `POST /api/campaigns` - Skapa kampanj
- `POST /api/campaigns/:id/send` - Skicka kampanj

### Statistik (kräver autentisering)
- `GET /api/stats` - Hämta statistik

## E-postkonfiguration

För att skicka e-post via Gmail:

1. Aktivera 2-faktor-autentisering på ditt Google-konto
2. Generera ett app-specifikt lösenord (https://myaccount.google.com/apppasswords)
3. Lägg till uppgifterna i `.env`:
```
EMAIL_USER=din-email@gmail.com
EMAIL_PASS=ditt-app-specifika-lösenord
EMAIL_FROM_NAME=Boulefront Nyhetsbrev
EMAIL_REPLY_TO=kontakt@boulefront.se
```

### Viktigt för att undvika spam-filter:

- **EMAIL_FROM_NAME**: Använd ett professionellt namn (t.ex. "Boulefront Nyhetsbrev")
- **EMAIL_REPLY_TO**: En riktig e-postadress där mottagare kan svara
- E-post skickas som: `Boulefront Nyhetsbrev <din-email@gmail.com>`
- Mottagare ser: `Lars Pettersson <lars.pettersson@example.com>`

Detta gör att e-posten ser professionell ut och minskar risken att hamna i spam!

## Säkerhet

- JWT-tokens för autentisering
- Bcrypt för lösenordskryptering
- Rate limiting för API-skydd
- CORS-konfiguration
- Miljövariabler för känslig data

## Utveckling

```bash
# Starta backend i dev-läge med nodemon
npm run dev

# Starta frontend
npx vite

# Backend körs på: http://localhost:3000
# Frontend körs på: http://localhost:5173
```

## Produktion

1. Bygg frontend:
```bash
npx vite build
```

2. Servera statiska filer från Express eller använd en separat webbserver

3. Sätt säkra miljövariabler i produktion

## Licens

MIT
