'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Lock, Eye, FileText, CheckCircle2, ArrowLeft, Mail, Globe, Trash2, Key, Database, RefreshCw } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const lastUpdated = "August 12, 2026"

  const sections = [
    { id: "overview", title: "1. Overview & Data Controller" },
    { id: "information-we-collect", title: "2. Information We Collect" },
    { id: "instagram-data", title: "3. Instagram API & Data Usage" },
    { id: "how-we-use-data", title: "4. How We Use Your Information" },
    { id: "data-sharing", title: "5. Data Sharing & Security" },
    { id: "data-retention-deletion", title: "6. Data Retention & User Deletion Rights" },
    { id: "meta-compliance", title: "7. Meta Platform Data Compliance" },
    { id: "contact-us", title: "8. Contact Information" },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#f50057] via-primary to-amber-400 p-0.5 shadow-md group-hover:scale-105 transition-transform">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-xs text-white tracking-wider">1to7</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-primary transition-colors">1TO7 MEDIA</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Creator Portal</span>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2 rounded-lg transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Portal
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        
        {/* Header Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 text-center sm:text-left border-b border-slate-800 pb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" />
            Legal & Transparency
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            At 1to7 Media, we take your privacy and creator data security seriously. This policy outlines how we collect, handle, and protect your information when using our Creator Portal and Meta/Instagram integrations.
          </p>
          <div className="text-xs text-slate-500 font-medium">
            Last Updated: <span className="text-slate-300 font-semibold">{lastUpdated}</span>
          </div>
        </motion.div>

        {/* 2-Column Section: Sticky Table of Contents & Detailed Clauses */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sticky top-24 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Table of Contents
            </h3>
            <nav className="space-y-1">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="block text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 px-3 py-2 rounded-lg transition-colors"
                >
                  {sec.title}
                </a>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Meta Data Compliance Ready
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Fully compliant with Meta Platform Terms and Instagram API Developer Policies.
              </p>
            </div>
          </aside>

          {/* Detailed Legal Content */}
          <div className="lg:col-span-8 space-y-8 text-slate-300 text-sm leading-relaxed">
            
            {/* Section 1 */}
            <section id="overview" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                1. Overview & Data Controller
              </h2>
              <p>
                <strong>1to7 Media</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the <strong>1to7 Media Creator Portal</strong> available at <code className="text-pink-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">users.1to7media.in</code>.
              </p>
              <p>
                This Privacy Policy describes our policies regarding the collection, use, and disclosure of personal and social account information when creators sign up, connect their Instagram accounts, apply for brand collaborations, and receive campaign payouts.
              </p>
            </section>

            {/* Section 2 */}
            <section id="information-we-collect" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-400" />
                2. Information We Collect
              </h2>
              <p>We collect information to provide better collaboration matching and payout services to creators:</p>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li><strong>Account Registration Info:</strong> Full name, email address, mobile phone number, city, and state.</li>
                <li><strong>Payout & Bank Details:</strong> Bank account holder name, account number, and IFSC code for campaign earnings transfer.</li>
                <li><strong>Technical & Log Data:</strong> Device platform, IP address, and session security tokens.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="instagram-data" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-pink-500" />
                3. Instagram API & Data Usage
              </h2>
              <p>
                When you authenticate using <strong>Instagram Sign-In</strong> via the official Meta Graph API, we request permission to access specific account details:
              </p>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-200">Data Fields Accessed via Meta API:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                  <div className="flex items-center gap-2">🔹 Instagram User ID & Handle</div>
                  <div className="flex items-center gap-2">🔹 Full Name & Profile Picture</div>
                  <div className="flex items-center gap-2">🔹 Follower & Media Count</div>
                  <div className="flex items-center gap-2">🔹 Bio & Website Link</div>
                  <div className="flex items-center gap-2">🔹 Account Category (Business/Creator)</div>
                  <div className="flex items-center gap-2">🔹 OAuth Access Tokens</div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                We <strong>never</strong> ask for or store your Instagram password. All authentication is handled securely by Meta’s official OAuth dialogs.
              </p>
            </section>

            {/* Section 4 */}
            <section id="how-we-use-data" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-400" />
                4. How We Use Your Information
              </h2>
              <p>We use creator data strictly for legitimate operational purposes:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li>To verify creator identity and authenticity.</li>
                <li>To display live campaign analytics and follower metrics to potential brand partners.</li>
                <li>To match your influencer niche with relevant brand sponsorship applications.</li>
                <li>To process campaign payouts directly to your designated bank account.</li>
                <li>To send important status updates regarding campaign approvals and submissions.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="data-sharing" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                5. Data Sharing & Security
              </h2>
              <p>
                <strong>We do not sell, rent, or trade your personal or Instagram data to third parties or advertising brokers.</strong>
              </p>
              <p>
                Your data is stored in encrypted databases hosted on Supabase PostgreSQL with TLS/SSL encryption in transit and AES encryption at rest. Bank details are strictly restricted to payout administrative systems.
              </p>
            </section>

            {/* Section 6 */}
            <section id="data-retention-deletion" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-400" />
                6. Data Retention & User Deletion Rights
              </h2>
              <p>
                You retain complete control over your creator data. You can request full deletion of your account and associated Instagram data at any time:
              </p>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="font-bold text-white">How to Delete Your Data:</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>Email our data privacy team at <a href="mailto:collab@1to7media.in" className="text-primary font-bold underline">collab@1to7media.in</a> with the subject line <em>&quot;Account Deletion Request&quot;</em>.</li>
                  <li>Or revoke app permissions directly on Instagram by visiting: <br /><span className="text-slate-400 font-mono">Instagram Settings ➔ Security ➔ Apps and Websites ➔ Remove 1to7 Media</span>.</li>
                </ol>
                <p className="text-slate-400">
                  Upon receiving a request, all stored tokens and profile snapshots are permanently erased from our databases within 48 hours.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section id="meta-compliance" className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-400" />
                7. Meta Platform Data Compliance
              </h2>
              <p>
                Our platform strictly complies with the <strong>Meta Platform Terms</strong> and <strong>Developer Policies</strong>. Data retrieved via Meta Graph APIs is used solely to facilitate creator services within our portal and is never transferred to data brokers or used for unauthorized user tracking.
              </p>
            </section>

            {/* Section 8 */}
            <section id="contact-us" className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                8. Contact Information
              </h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or your creator data, please contact us:
              </p>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1 text-xs">
                <div className="font-extrabold text-white">1to7 Media Privacy Team</div>
                <div className="text-slate-400">Email: <a href="mailto:collab@1to7media.in" className="text-primary font-bold hover:underline">collab@1to7media.in</a></div>
                <div className="text-slate-400">Website: <a href="https://users.1to7media.in" className="text-slate-300 font-semibold hover:underline">users.1to7media.in</a></div>
              </div>
            </section>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 1to7 Media. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 text-slate-400 font-medium">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/login" className="hover:text-white transition-colors">Creator Portal</Link>
        </div>
      </footer>
    </div>
  )
}
