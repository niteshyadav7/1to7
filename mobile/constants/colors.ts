/**
 * 1to7 Media — Dark theme color system
 * Matches the website's slate-950 + purple/pink gradient palette
 */
export const Colors = {
  // Backgrounds
  bg: '#020617',           // slate-950
  bgCard: 'rgba(15,23,42,0.6)',  // slate-900/60
  bgElevated: '#0f172a',  // slate-900
  bgInput: 'rgba(255,255,255,0.05)',  // white/5
  bgOverlay: 'rgba(0,0,0,0.6)',

  // Borders
  border: 'rgba(255,255,255,0.05)',   // white/5
  borderLight: 'rgba(255,255,255,0.1)', // white/10
  borderFocus: 'rgba(168,85,247,0.5)', // purple-500/50

  // Text
  text: '#ffffff',
  textSecondary: '#94a3b8',   // slate-400
  textMuted: '#64748b',       // slate-500
  textPlaceholder: '#475569', // slate-600

  // Brand gradients (start, end)
  purple: '#9333ea',    // purple-600
  purpleLight: '#a855f7', // purple-500
  pink: '#ec4899',      // pink-500
  pinkLight: '#f472b6', // pink-400

  // Status
  success: '#10b981',   // emerald-500
  successBg: 'rgba(16,185,129,0.15)',
  successBorder: 'rgba(16,185,129,0.2)',
  successText: '#6ee7b7', // emerald-300

  warning: '#f59e0b',   // amber-500
  warningBg: 'rgba(245,158,11,0.15)',
  warningBorder: 'rgba(245,158,11,0.2)',
  warningText: '#fcd34d', // amber-300

  error: '#ef4444',     // red-500
  errorBg: 'rgba(239,68,68,0.15)',
  errorBorder: 'rgba(239,68,68,0.2)',
  errorText: '#fca5a5', // red-300

  info: '#3b82f6',      // blue-500
  infoBg: 'rgba(59,130,246,0.15)',
  infoBorder: 'rgba(59,130,246,0.2)',
  infoText: '#93c5fd',  // blue-300

  // Specific accent
  indigo: '#6366f1',    // indigo-500
  cyan: '#06b6d4',      // cyan-500
  amber: '#f59e0b',     // amber-500
} as const
