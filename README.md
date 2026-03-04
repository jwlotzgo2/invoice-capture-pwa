# Invoice Capture PWA

A Progressive Web Application for capturing and managing invoices with AI-powered OCR extraction. Built with Next.js, Supabase, and Claude AI.

![Invoice Capture PWA](https://img.shields.io/badge/PWA-Ready-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan)

## ✨ Features

### Core Features
- 📸 **Camera Capture** - Take photos of invoices directly in the app
- 🤖 **AI-Powered OCR** - Claude AI extracts invoice data automatically
- ✏️ **Manual Editing** - Review and edit all extracted fields
- 🔍 **Search & Filter** - Find invoices by supplier, date, status, etc.
- 📱 **PWA Support** - Install on your device with offline capabilities
- 🔐 **Secure Auth** - Email/password authentication via Supabase
- ☁️ **Cloud Storage** - Invoice images stored securely in Supabase Storage
- 📲 **App Shortcuts** - Quick access to open app or capture directly

### Email Integration (Phase 3)
- 📧 **Email Capture** - Forward invoices via email for automatic processing
- 🔗 **Postmark Integration** - Reliable inbound email webhook
- 📎 **Attachment Processing** - Automatic extraction of invoice images

### Admin Console (Phase 3)
- 👥 **User Management** - View all users, activity, and invoice counts
- 🔐 **Role-Based Access** - Admin and user roles with protected routes
- 📊 **Dashboard** - Overview of system metrics and status

### OCR Analytics (Phase 3)
- 📈 **Accuracy Monitoring** - Track OCR performance over time
- 🎯 **Field Analysis** - See which fields are corrected most often
- 📉 **Trend Tracking** - Monitor correction patterns and improvements

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account (free tier works)
- An Anthropic API key (for Claude AI)
- A GitHub account (for version control)
- A Vercel account (for deployment)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/invoice-capture-pwa.git
cd invoice-capture-pwa

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your credentials
# Then start development server
npm run dev
```

---

## 📋 Detailed Setup Instructions

### 1. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project details:
   - **Name**: `invoice-capture` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup (~2 minutes)

#### Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values to your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key

#### Set Up the Database

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New Query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" to create the tables and policies

#### Set Up Storage

1. Go to **Storage** in Supabase dashboard
2. Click "New Bucket"
3. Create bucket with these settings:
   - **Name**: `invoices`
   - **Public bucket**: ✅ Yes (for easy image access)
4. After creating, go to **Policies** tab
5. Create the following policies (or run `supabase/storage-policies.sql`):

**Upload Policy:**
```sql
CREATE POLICY "Users can upload invoice images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Download Policy (Public):**
```sql
CREATE POLICY "Public can view invoice images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'invoices');
```

**Delete Policy:**
```sql
CREATE POLICY "Users can delete own invoice images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL**: 
   - Development: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`
5. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback`

---

### 2. Claude API Setup

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Go to **API Keys**
4. Click "Create Key"
5. Copy the key to your `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```

> **Note**: Claude API usage is billed. Check [pricing](https://www.anthropic.com/pricing) for details.

---

### 3. GitHub Repository Setup

#### Create Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository:
   - **Name**: `invoice-capture-pwa`
   - **Visibility**: Private (recommended)
3. Don't initialize with README (we have one)

#### Push Your Code

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Invoice Capture PWA"

# Add remote
git remote add origin https://github.com/your-username/invoice-capture-pwa.git

# Push
git push -u origin main
```

---

### 4. Vercel Deployment

#### Connect GitHub

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select "invoice-capture-pwa"

#### Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ANTHROPIC_API_KEY` | Your Claude API key |

#### Deploy

1. Click "Deploy"
2. Wait for the build to complete (~2-3 minutes)
3. Your app is live at `https://your-project.vercel.app`

#### Update Supabase URLs

After deployment, update your Supabase settings:
1. Go to **Authentication** → **URL Configuration**
2. Update **Site URL** to your Vercel URL
3. Add the callback URL: `https://your-project.vercel.app/auth/callback`

---

### 5. Postmark Inbound Email Setup

This enables users to forward/send invoices via email for automatic OCR processing.

#### Create a Postmark Account

1. Go to [postmarkapp.com](https://postmarkapp.com) and create an account
2. Verify your email address
3. Create a new **Server** (e.g., "Invoice Capture")

#### Configure Inbound Email

1. In your Postmark server, go to **Default Inbound Stream**
2. Click **Settings** → **Inbound**
3. You have two options:

**Option A: Use Postmark's Inbound Address (Easiest)**
- Note the inbound email address provided (e.g., `abc123@inbound.postmarkapp.com`)
- Users will forward invoices to this address

**Option B: Use Your Own Domain**
1. Add a custom inbound domain (e.g., `invoices.yourdomain.com`)
2. Add the required MX record to your DNS:
   ```
   MX  invoices.yourdomain.com  10  inbound.postmarkapp.com
   ```
3. Wait for DNS propagation and verify in Postmark

#### Configure the Webhook

1. In **Inbound** settings, set the **Webhook URL**:
   ```
   https://your-app.vercel.app/api/email/inbound
   ```
2. (Optional) Add a webhook secret for security:
   - Generate a random string (e.g., `openssl rand -hex 32`)
   - Add it to your Vercel environment variables as `POSTMARK_WEBHOOK_SECRET`
   - In Postmark, add the secret in **Custom Headers**:
     ```
     X-Postmark-Webhook-Secret: your-secret-here
     ```

#### Environment Variables

Add these to your `.env.local` and Vercel:

```env
# Required for webhook authentication
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Webhook security
POSTMARK_WEBHOOK_SECRET=your-webhook-secret

# For reference (not required in code)
POSTMARK_INBOUND_ADDRESS=your-address@inbound.postmarkapp.com
```

> **Important**: Get your `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Settings → API → service_role key. This is required for the webhook to bypass RLS and create invoices.

#### How Email Capture Works

1. **User sends/forwards an invoice email** to the Postmark inbound address
2. **Postmark receives the email** and sends it to your webhook
3. **The webhook**:
   - Validates the sender is a registered user
   - Extracts image attachments (JPEG, PNG, GIF, WebP)
   - Uploads images to Supabase Storage
   - Runs OCR using Claude AI
   - Creates invoice records with extracted data
4. **User sees the invoice** in their dashboard, ready for review

#### Supported Attachment Types

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

> **Note**: PDF support coming in a future update.

#### Testing the Integration

1. Send a test email with an invoice image to your inbound address
2. Check the webhook logs in Vercel Functions
3. Verify the invoice appears in the user's dashboard

#### Troubleshooting

- **"Sender not registered"**: The sender email must match a registered user's email
- **"No image attachments"**: Ensure the invoice is attached as an image, not embedded
- **Webhook not receiving**: Verify the webhook URL is correct and DNS is propagated

---

## 📱 PWA Installation

### On Mobile (iOS/Android)

1. Open the app URL in your mobile browser
2. Tap the share icon (iOS) or menu (Android)
3. Select "Add to Home Screen"
4. The app icon will appear on your home screen

### On Desktop (Chrome/Edge)

1. Open the app URL
2. Click the install icon in the address bar
3. Or use the browser menu → "Install Invoice Capture"

### PWA Shortcuts

After installation, you can:
- **Long-press** the app icon to access shortcuts
- **Open App** - Goes directly to invoices list
- **Capture Invoice** - Opens camera immediately

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

### Project Structure

```
invoice_capture_pwa/
├── public/
│   ├── icons/           # PWA icons (generate these)
│   ├── manifest.json    # PWA manifest
│   └── sw.js           # Service worker
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/      # Admin API routes (stats, users, analytics)
│   │   │   ├── email/      # Postmark webhook endpoint
│   │   │   ├── invoices/   # Invoice CRUD API
│   │   │   ├── ocr/        # OCR processing API
│   │   │   └── ocr-edits/  # OCR accuracy tracking API
│   │   ├── admin/          # Admin dashboard pages
│   │   │   ├── analytics/  # OCR analytics page
│   │   │   └── users/      # User management page
│   │   ├── auth/           # Auth pages
│   │   ├── capture/        # Camera capture page
│   │   ├── invoices/       # Invoice list & detail
│   │   └── offline/        # Offline fallback
│   ├── components/         # React components
│   ├── lib/
│   │   ├── admin.ts        # Admin utility functions
│   │   └── supabase/       # Supabase clients
│   └── types/              # TypeScript types
├── supabase/
│   ├── schema.sql          # Phase 1 database schema
│   ├── phase3-schema.sql   # Phase 3 schema additions
│   └── storage-policies.sql
└── .env.local              # Environment variables
```

### Generate PWA Icons

Use a tool like [realfavicongenerator.net](https://realfavicongenerator.net) or [pwa-asset-generator](https://github.com/nickvision/pwa-asset-generator):

```bash
# Install pwa-asset-generator
npm install -g pwa-asset-generator

# Generate icons from your logo
pwa-asset-generator logo.png public/icons --background "#3b82f6"
```

Required icon sizes: 72, 96, 128, 144, 152, 192, 384, 512

---

## 🔒 Security Considerations

1. **Row Level Security (RLS)** - Supabase RLS ensures users only access their own data
2. **API Key Protection** - Server-side API keys are not exposed to clients
3. **Authentication** - All protected routes require valid session
4. **HTTPS** - Vercel automatically provides SSL certificates

---

## 🗺️ Roadmap

### Completed
- [x] **Phase 1**: Core invoice capture, OCR, and PWA features
- [x] **Phase 3**: Postmark email capture integration
- [x] **Phase 3**: Admin console with user management
- [x] **Phase 3**: OCR accuracy monitoring and analytics

### Upcoming
- [ ] **Phase 2**: Multi-tenant architecture with organizations
- [ ] **Phase 4**: Ledger system with accounting integration
- [ ] **Phase 4**: Bulk operations and batch processing
- [ ] **Phase 4**: Export to CSV/Excel
- [ ] **Phase 5**: PDF invoice support for email capture

---

## 🐛 Troubleshooting

### Camera not working
- Ensure HTTPS is used (camera requires secure context)
- Check browser permissions for camera access
- Try uploading an image instead

### OCR extraction issues
- Ensure image is clear and well-lit
- Position invoice within the frame guide
- Check Anthropic API key is valid

### Auth issues
- Verify Supabase URL and anon key are correct
- Check redirect URLs in Supabase dashboard
- Clear browser cookies and try again

### Storage issues
- Verify 'invoices' bucket exists and is public
- Check storage policies are correctly set
- Ensure user is authenticated

---

## 📄 License

MIT License - Feel free to use for your own projects.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [Supabase](https://supabase.com) - Backend as a Service
- [Claude AI](https://anthropic.com) - AI-powered OCR
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide Icons](https://lucide.dev) - Icons
