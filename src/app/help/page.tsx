'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, WifiOff, Mail, Shield, HelpCircle,
  ChevronDown, ChevronRight, Sparkles, Upload, FileImage,
  Bell, Users, Download, CheckCircle, AlertCircle, Zap,
  BookOpen, Settings
} from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  primary: '#e5e5e5', success: '#86efac', warning: '#fdba74', error: '#fca5a5',
  blue: '#60a5fa', purple: '#a78bfa', pink: '#f9a8d4',
};

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .hlp { font-family: 'Inter', system-ui, sans-serif; min-height: 100svh; background: ${T.bg}; color: ${T.text}; }
  .hlp-header { background: ${T.surface}; border-bottom: 1px solid ${T.border}; padding: 14px 16px; position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 12px; }
  .hlp-back { width: 34px; height: 34px; border: 1px solid ${T.border}; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: ${T.textDim}; flex-shrink: 0; }
  .hlp-main { max-width: 680px; margin: 0 auto; padding: 20px 16px 80px; display: flex; flex-direction: column; gap: 8px; }
  .hlp-hero { background: linear-gradient(135deg, #1e1b4b, #1e3a5f); border: 1px solid #2d2d6b; border-radius: 16px; padding: 24px 20px; text-align: center; margin-bottom: 8px; }
  .hlp-section-header { display: flex; align-items: center; gap: 10px; padding: 14px 0 6px; }
  .hlp-section-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .hlp-section-label { font-size: 12px; font-weight: 700; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.8px; }
  .hlp-card { background: ${T.surface}; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; }
  .hlp-item { border-bottom: 1px solid #2a2a2a; cursor: pointer; }
  .hlp-item:last-child { border-bottom: none; }
  .hlp-item-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; gap: 12px; }
  .hlp-item-title { font-size: 14px; font-weight: 600; color: ${T.text}; }
  .hlp-item-body { padding: 0 16px 14px; font-size: 13px; color: ${T.textDim}; line-height: 1.65; }
  .hlp-step { display: flex; gap: 12px; margin-bottom: 10px; }
  .hlp-step-num { width: 22px; height: 22px; border-radius: 50%; background: ${T.surfaceHigh}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${T.textDim}; flex-shrink: 0; margin-top: 1px; }
  .hlp-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; margin: 2px 2px 2px 0; }
  .hlp-tip { display: flex; gap: 10px; padding: 10px 12px; border-radius: 8px; margin-top: 10px; font-size: 12px; line-height: 1.5; }
  .hlp-faq-q { font-size: 13px; font-weight: 600; color: ${T.text}; margin-bottom: 6px; }
  .hlp-faq-a { font-size: 13px; color: ${T.textDim}; line-height: 1.65; }
  .hlp-kbd { display: inline-block; background: ${T.surfaceHigh}; border: 1px solid ${T.border}; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-family: monospace; color: ${T.textDim}; }
  .hlp-divider { height: 1px; background: ${T.border}; margin: 4px 0; }
  .hlp-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; }
`;

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="hlp-card">
      {items.map((item, i) => (
        <div key={i} className="hlp-item">
          <div className="hlp-item-header" onClick={() => setOpen(open === i ? null : i)}>
            <span className="hlp-item-title">{item.title}</span>
            {open === i ? <ChevronDown size={16} color={T.textMuted} /> : <ChevronRight size={16} color={T.textMuted} />}
          </div>
          {open === i && <div className="hlp-item-body">{item.content}</div>}
        </div>
      ))}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="hlp-step">
      <div className="hlp-step-num">{n}</div>
      <div style={{ paddingTop: 2 }}>{children}</div>
    </div>
  );
}

function Tip({ color, bg, icon: Icon, children }: { color: string; bg: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="hlp-tip" style={{ background: bg, border: `1px solid ${color}33` }}>
      <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ color: T.textDim }}>{children}</span>
    </div>
  );
}

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="hlp">
      <style>{css}</style>

      <header className="hlp-header">
        <button className="hlp-back" onClick={() => router.back()}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Help & Documentation</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Go Capture — User Guide</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={15} color={T.purple} />
        </div>
      </header>

      <div className="hlp-main">

        {/* Hero */}
        <div className="hlp-hero">
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Sparkles size={22} color={T.purple} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Welcome to Go Capture</div>
          <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.65, maxWidth: 380, margin: '0 auto' }}>
            Capture invoices and documents instantly — by camera, gallery, file upload, or email. OCR extracts the data automatically so you don't have to type anything.
          </div>
        </div>

        {/* Getting Started */}
        <div className="hlp-section-header">
          <div className="hlp-section-icon" style={{ background: 'rgba(134,239,172,0.12)' }}><Zap size={15} color={T.success} /></div>
          <span className="hlp-section-label">Getting Started</span>
        </div>
        <Accordion items={[
          {
            title: 'Setting up your account',
            content: <>
              <Step n={1}>Open the app and sign in with your email — a magic link will be sent to you, no password needed.</Step>
              <Step n={2}>On first login you'll be asked for your name and organisation. Fill these in so admins can identify your uploads.</Step>
              <Step n={3}>If your organisation already exists, ask your admin for the <strong style={{ color: T.text }}>org code</strong> and enter it under Settings → Join Organisation.</Step>
              <Step n={4}>Enable <strong style={{ color: T.text }}>push notifications</strong> in Settings so you're alerted when invoices arrive by email.</Step>
              <Tip color={T.success} bg="rgba(134,239,172,0.07)" icon={CheckCircle}>
                Add the app to your home screen for the best experience — tap Share → Add to Home Screen in your browser.
              </Tip>
            </>
          },
          {
            title: 'Navigating the app',
            content: <>
              <p style={{ marginBottom: 10 }}>The bottom navigation bar gives you quick access to the main sections:</p>
              {[
                { label: 'Dashboard', desc: 'Overview of your recent documents and KPIs' },
                { label: 'Capture', desc: 'The main action — take a photo or upload a file' },
                { label: 'Review', desc: 'Documents pending your review or approval' },
                { label: 'Documents', desc: 'Browse, search, preview and download all files' },
                { label: 'Settings', desc: 'Profile, notifications, organisation' },
              ].map(({ label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: T.text, minWidth: 80, fontSize: 13 }}>{label}</span>
                  <span style={{ color: T.textDim, fontSize: 13 }}>{desc}</span>
                </div>
              ))}
            </>
          },
        ]} />

        {/* Capturing Documents */}
        <div className="hlp-section-header">
          <div className="hlp-section-icon" style={{ background: 'rgba(167,139,250,0.12)' }}><Camera size={15} color={T.purple} /></div>
          <span className="hlp-section-label">Capturing Documents</span>
        </div>
        <Accordion items={[
          {
            title: 'Camera — take a photo',
            content: <>
              <Step n={1}>Tap <strong style={{ color: T.text }}>Capture</strong> in the bottom nav, then tap <strong style={{ color: T.text }}>Camera</strong>.</Step>
              <Step n={2}>Point your camera at the invoice or document and take the photo. Try to get the whole document in frame with good lighting.</Step>
              <Step n={3}>OCR runs automatically — you'll see a progress spinner while the AI reads the document.</Step>
              <Step n={4}>Review the extracted fields, correct anything that looks wrong, then tap <strong style={{ color: T.text }}>Save</strong>.</Step>
              <Tip color={T.purple} bg="rgba(167,139,250,0.07)" icon={Sparkles}>
                Flat surface, good light, and a straight-on angle give the best OCR accuracy. Avoid glare and shadows.
              </Tip>
            </>
          },
          {
            title: 'Gallery — pick an existing image',
            content: <>
              <Step n={1}>Tap <strong style={{ color: T.text }}>Capture</strong> → <strong style={{ color: T.text }}>Gallery</strong>.</Step>
              <Step n={2}>Your phone's image picker opens — select the photo you want to process.</Step>
              <Step n={3}>OCR runs the same as with camera captures. Review and save.</Step>
              <Tip color={T.blue} bg="rgba(96,165,250,0.07)" icon={FileImage}>
                Works with screenshots of invoices too — useful if you received an invoice as an image in WhatsApp or email.
              </Tip>
            </>
          },
          {
            title: 'Upload File — PDF or HEIC',
            content: <>
              <Step n={1}>Tap <strong style={{ color: T.text }}>Capture</strong> → <strong style={{ color: T.text }}>Upload File</strong>.</Step>
              <Step n={2}>Select a PDF or HEIC file from your device. PDFs are rendered and read page by page.</Step>
              <Step n={3}>OCR extracts fields — line items are also captured for PDFs with structured layouts.</Step>
              <Tip color={T.warning} bg="rgba(253,186,116,0.07)" icon={AlertCircle}>
                For best results with PDFs, use digital (not scanned) PDFs. Scanned PDFs work but may have lower accuracy.
              </Tip>
            </>
          },
          {
            title: 'Reviewing and editing extracted data',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>After OCR runs, you'll see a review form with the extracted fields:</p>
              {[
                ['Supplier', 'The business that issued the invoice'],
                ['Invoice Date', 'Date shown on the document'],
                ['Amount', 'Total amount due or paid'],
                ['Document Type', 'Invoice, receipt, credit note, etc.'],
                ['Status', 'Open, paid, or disputed'],
                ['Notes', 'Any extra context you want to record'],
              ].map(([field, desc]) => (
                <div key={field} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: T.text, minWidth: 100 }}>{field}</span>
                  <span style={{ color: T.textDim }}>{desc}</span>
                </div>
              ))}
              <Tip color={T.success} bg="rgba(134,239,172,0.07)" icon={CheckCircle}>
                All edits are tracked — admins can see what was changed from the original OCR output.
              </Tip>
            </>
          },
        ]} />

        {/* Offline Mode */}
        <div className="hlp-section-header">
          <div className="hlp-section-icon" style={{ background: 'rgba(253,186,116,0.12)' }}><WifiOff size={15} color={T.warning} /></div>
          <span className="hlp-section-label">Offline Mode</span>
        </div>
        <Accordion items={[
          {
            title: 'How offline capture works',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>Go Capture works without an internet connection. Here's what happens:</p>
              <Step n={1}>When you lose connection, the app automatically shows the <strong style={{ color: T.text }}>Offline</strong> screen.</Step>
              <Step n={2}>You can still capture documents — they're saved to a local queue on your device.</Step>
              <Step n={3}>A badge on the offline screen shows how many documents are queued.</Step>
              <Step n={4}>When you reconnect, the app redirects to the dashboard and uploads everything automatically — OCR runs in the background.</Step>
              <Step n={5}>A notification confirms how many documents were uploaded and processed.</Step>
              <Tip color={T.warning} bg="rgba(253,186,116,0.07)" icon={WifiOff}>
                Don't close the app immediately after reconnecting — give it a few seconds to finish syncing.
              </Tip>
            </>
          },
          {
            title: 'What works offline vs. what needs connection',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>Here's a quick reference:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { works: true, label: 'Capturing photos and images' },
                  { works: true, label: 'Uploading files to the queue' },
                  { works: true, label: 'Viewing the offline capture screen' },
                  { works: false, label: 'OCR processing (runs on reconnect)' },
                  { works: false, label: 'Viewing your document list' },
                  { works: false, label: 'Reviewing or editing existing invoices' },
                  { works: false, label: 'Receiving email invoices' },
                ].map(({ works, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <CheckCircle size={13} color={works ? T.success : T.textMuted} />
                    <span style={{ color: works ? T.textDim : T.textMuted }}>{label}</span>
                    {!works && <span className="hlp-tag" style={{ background: 'rgba(107,107,107,0.1)', color: T.textMuted }}>needs connection</span>}
                  </div>
                ))}
              </div>
            </>
          },
        ]} />

        {/* Email Ingestion */}
        <div className="hlp-section-header">
          <div className="hlp-section-icon" style={{ background: 'rgba(249,168,212,0.12)' }}><Mail size={15} color={T.pink} /></div>
          <span className="hlp-section-label">Email Invoice Ingestion</span>
        </div>
        <Accordion items={[
          {
            title: 'Sending invoices by email',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>You can forward invoices directly to Go Capture via email:</p>
              <Step n={1}>Ask your admin for the <strong style={{ color: T.text }}>inbound email address</strong> for your organisation.</Step>
              <Step n={2}>Forward any invoice email to that address — PDF attachments are automatically extracted and processed.</Step>
              <Step n={3}>The invoice appears in your list with status <span className="hlp-chip" style={{ background: 'rgba(253,186,116,0.12)', color: T.warning }}>Pending Review</span> and source <span className="hlp-chip" style={{ background: 'rgba(249,168,212,0.12)', color: T.pink }}>Email</span>.</Step>
              <Step n={4}>You'll receive a push notification (if enabled) when the invoice arrives.</Step>
              <Tip color={T.pink} bg="rgba(249,168,212,0.07)" icon={Mail}>
                The email subject and sender are saved alongside the invoice so you can trace where it came from.
              </Tip>
            </>
          },
          {
            title: 'Reviewing email invoices',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>Email invoices go into a <strong style={{ color: T.text }}>Pending Review</strong> state so you can verify the OCR before they're filed.</p>
              <Step n={1}>Tap the <strong style={{ color: T.text }}>bell icon</strong> on the dashboard — it shows a badge when email invoices need review.</Step>
              <Step n={2}>Open the Review page and tap any pending invoice to see the extracted fields and the original PDF.</Step>
              <Step n={3}>Correct any fields that are wrong, then tap <strong style={{ color: T.text }}>Approve</strong> to file it.</Step>
            </>
          },
        ]} />

        {/* Admin Guide */}
        <div className="hlp-section-header">
          <div className="hlp-section-icon" style={{ background: 'rgba(96,165,250,0.12)' }}><Shield size={15} color={T.blue} /></div>
          <span className="hlp-section-label">Admin Guide</span>
        </div>
        <Accordion items={[
          {
            title: 'Admin console overview',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>The admin console is accessible at <span className="hlp-kbd">/admin</span> to users with the admin role. From there you can access:</p>
              {[
                ['User Management', 'Create, edit and assign roles to users'],
                ['Organisations', 'Create org codes, manage members'],
                ['OCR Analytics', 'Field accuracy and correction patterns'],
                ['Activity Journal', 'Live feed of every user action'],
                ['Activity Report', 'Usage stats, heatmaps, leaderboard'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: T.text, minWidth: 140 }}>{title}</span>
                  <span style={{ color: T.textDim }}>{desc}</span>
                </div>
              ))}
            </>
          },
          {
            title: 'Managing users and roles',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>There are three roles in Go Capture:</p>
              {[
                { role: 'admin', color: '#f9a8d4', desc: 'Full access to all data, admin console, and user management' },
                { role: 'manager', color: T.blue, desc: 'Can view and approve all invoices in their organisation' },
                { role: 'user', color: T.textDim, desc: 'Can capture and manage their own invoices only' },
              ].map(({ role, color, desc }) => (
                <div key={role} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13 }}>
                  <span className="hlp-tag" style={{ background: `${color}20`, color, minWidth: 60, justifyContent: 'center' }}>{role}</span>
                  <span style={{ color: T.textDim }}>{desc}</span>
                </div>
              ))}
              <Tip color={T.blue} bg="rgba(96,165,250,0.07)" icon={Users}>
                Assign users to an organisation so their documents are grouped together in reports.
              </Tip>
            </>
          },
          {
            title: 'Reading the Activity Journal',
            content: <>
              <p style={{ marginBottom: 10, color: T.textDim }}>The journal shows a chronological feed of all user actions. Use the filters to drill down:</p>
              {[
                ['Date range', 'Today, last 7 days, 30 days, 90 days'],
                ['Action type', 'Login, OCR scan, offline capture, email, etc.'],
                ['User', 'Filter to a specific team member'],
                ['Search', 'Search by user name, email, or action'],
              ].map(([filter, desc]) => (
                <div key={filter} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: T.text, minWidth: 100 }}>{filter}</span>
                  <span style={{ color: T.textDim }}>{desc}</span>
                </div>
              ))}
            </>
          },
        ]} />

        {/* FAQ */}
        <div className="hlp-section-header">
          <div className="hlp-section-icon" style={{ background: 'rgba(253,186,116,0.12)' }}><HelpCircle size={15} color={T.warning} /></div>
          <span className="hlp-section-label">FAQ</span>
        </div>
        <Accordion items={[
          {
            title: 'Why is OCR not picking up my invoice correctly?',
            content: <div className="hlp-faq-a">
              OCR accuracy depends on image quality. Try: <strong style={{ color: T.text }}>better lighting</strong> (avoid shadows and glare), <strong style={{ color: T.text }}>flat surface</strong> (no curved pages), and <strong style={{ color: T.text }}>straight-on angle</strong>. For PDFs, digital PDFs are processed more accurately than scanned ones. If a field is wrong, just edit it manually — edits are tracked but don't block saving.
            </div>
          },
          {
            title: 'I captured something offline but it never synced',
            content: <div className="hlp-faq-a">
              When you reconnect, the sync runs automatically in the background. If it didn't appear:<br /><br />
              1. Check your connection is actually working (try loading a website).<br />
              2. Refresh the dashboard — pull down or navigate away and back.<br />
              3. If still missing, go to <strong style={{ color: T.text }}>Capture</strong> — the offline page shows how many are still queued.<br /><br />
              The queue is stored on your device and will retry on the next app open.
            </div>
          },
          {
            title: 'I\'m not getting push notifications',
            content: <div className="hlp-faq-a">
              Check two things:<br /><br />
              1. <strong style={{ color: T.text }}>Settings → Push Notifications</strong> — make sure the toggle is on and your browser granted permission.<br />
              2. Your browser must support Web Push — Chrome, Edge, and Safari (iOS 16.4+) all work. Firefox on iOS does not.<br /><br />
              If you toggled it off and back on, the subscription refreshes automatically.
            </div>
          },
          {
            title: 'Can I use Go Capture on desktop?',
            content: <div className="hlp-faq-a">
              Yes — the app works in any modern browser. Camera capture won't work on desktop without a webcam, but you can still upload files and PDFs, review documents, and use all admin features. For the best mobile experience, add it to your home screen as a PWA.
            </div>
          },
          {
            title: 'How do I export my invoices?',
            content: <div className="hlp-faq-a">
              On the <strong style={{ color: T.text }}>Dashboard</strong> or <strong style={{ color: T.text }}>Invoice List</strong>, tap the <strong style={{ color: T.text }}>Export CSV</strong> button. This downloads a spreadsheet with all visible invoices (respecting your current filters). For bulk document downloads, go to <strong style={{ color: T.text }}>Documents</strong> and use the ZIP download.
            </div>
          },
          {
            title: 'My session expired — how do I log back in?',
            content: <div className="hlp-faq-a">
              Go Capture uses magic link login — no passwords. If your session expires, simply enter your email on the login screen and a new link will be sent. Sessions last 7 days by default. If you're frequently getting logged out, check that your browser isn't clearing cookies on close.
            </div>
          },
          {
            title: 'How do I join or create an organisation?',
            content: <div className="hlp-faq-a">
              <strong style={{ color: T.text }}>To join:</strong> Get the org code from your admin, then go to Settings → Join Organisation and enter the code.<br /><br />
              <strong style={{ color: T.text }}>To create:</strong> Admins can create organisations from the Admin Console → Organisations page. Each org gets a unique join code to share with members.
            </div>
          },
        ]} />

        {/* Version footer */}
        <div style={{ textAlign: 'center', paddingTop: 16, color: T.textMuted, fontSize: 11 }}>
          Go Capture · Built by Go 2 Analytics
        </div>

      </div>
    </div>
  );
}
