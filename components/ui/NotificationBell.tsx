'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, ExternalLink, Users, CreditCard, AlertCircle, FileText, Sparkles, X, Trash2, Clock } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string
  createdAt: string
}

interface NotificationBellProps {
  apiEndpoint: string
  accentColor?: 'indigo' | 'purple'
  storageKey?: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const notifConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  new_application: { icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  payment_requested: { icon: FileText, color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  partial_request: { icon: CreditCard, color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  appeal: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/15' },
  approved: { icon: Sparkles, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  payment_initiated: { icon: CreditCard, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  completed: { icon: Check, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  partial_approved: { icon: Check, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  partial_rejected: { icon: X, color: 'text-red-400', bgColor: 'bg-red-500/15' },
}

export default function NotificationBell({ apiEndpoint, accentColor = 'indigo', storageKey = 'notif_read' }: NotificationBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Load persisted state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setReadIds(new Set(JSON.parse(stored)))
      const dismissed = localStorage.getItem(`${storageKey}_dismissed`)
      if (dismissed) setDismissedIds(new Set(JSON.parse(dismissed)))
    } catch { /* ignore */ }
  }, [storageKey])

  const saveReadIds = useCallback((ids: Set<string>) => {
    setReadIds(ids)
    try { localStorage.setItem(storageKey, JSON.stringify([...ids])) } catch { /* ignore */ }
  }, [storageKey])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint)
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch { /* ignore */ }
  }, [apiEndpoint])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id))
  const unreadCount = visibleNotifications.filter(n => !readIds.has(n.id)).length

  const handleNotificationClick = (notif: Notification) => {
    const newReadIds = new Set(readIds)
    newReadIds.add(notif.id)
    saveReadIds(newReadIds)
    setIsOpen(false)
    router.push(notif.link)
  }

  const markAllRead = () => {
    const newReadIds = new Set(readIds)
    visibleNotifications.forEach(n => newReadIds.add(n.id))
    saveReadIds(newReadIds)
  }

  const clearAll = () => {
    const newDismissed = new Set(dismissedIds)
    notifications.forEach(n => newDismissed.add(n.id))
    setDismissedIds(newDismissed)
    try { localStorage.setItem(`${storageKey}_dismissed`, JSON.stringify([...newDismissed])) } catch { /* ignore */ }
    markAllRead()
  }

  const dismissOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newDismissed = new Set(dismissedIds)
    newDismissed.add(id)
    setDismissedIds(newDismissed)
    try { localStorage.setItem(`${storageKey}_dismissed`, JSON.stringify([...newDismissed])) } catch { /* ignore */ }
  }

  const toggleOpen = () => {
    setIsAnimating(true)
    setIsOpen(!isOpen)
    setTimeout(() => setIsAnimating(false), 200)
  }

  const isPurple = accentColor === 'purple'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? isPurple ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30' : 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        <Bell className={`h-[18px] w-[18px] transition-transform duration-200 ${isOpen ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold text-white px-1 shadow-lg ring-2 ring-slate-950 ${
            isPurple ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/30' : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-indigo-500/30'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-3 w-[400px] bg-slate-900 border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] z-[100] overflow-hidden flex flex-col"
          style={{ maxHeight: 'min(520px, calc(100vh - 100px))' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-slate-900 to-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-lg ${
                  isPurple ? 'bg-gradient-to-br from-purple-600 to-pink-500 shadow-purple-500/25' : 'bg-gradient-to-br from-indigo-600 to-purple-500 shadow-indigo-500/25'
                }`}>
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white tracking-tight">Notifications</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      isPurple ? 'text-purple-400 hover:bg-purple-500/10' : 'text-indigo-400 hover:bg-indigo-500/10'
                    }`}
                  >
                    <CheckCheck className="h-3 w-3" /> Read all
                  </button>
                )}
                {visibleNotifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
            {visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border ${
                  isPurple ? 'bg-purple-500/5 border-purple-500/10' : 'bg-indigo-500/5 border-indigo-500/10'
                }`}>
                  <Bell className={`h-7 w-7 ${isPurple ? 'text-purple-500/30' : 'text-indigo-500/30'}`} />
                </div>
                <p className="text-sm font-semibold text-slate-400">No notifications</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">
                  You&apos;re all caught up! New activity will appear here.
                </p>
              </div>
            ) : (
              <div className="py-1">
                {visibleNotifications.map((notif, idx) => {
                  const isRead = readIds.has(notif.id)
                  const config = notifConfig[notif.type] || { icon: Bell, color: 'text-slate-400', bgColor: 'bg-slate-500/15' }
                  const IconComponent = config.icon

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group relative flex items-start gap-3.5 px-5 py-3.5 cursor-pointer transition-all duration-150 ${
                        isRead
                          ? 'hover:bg-white/[0.02]'
                          : isPurple ? 'bg-purple-500/[0.03] hover:bg-purple-500/[0.06]' : 'bg-indigo-500/[0.03] hover:bg-indigo-500/[0.06]'
                      } ${idx !== visibleNotifications.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                    >
                      {/* Unread indicator line */}
                      {!isRead && (
                        <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${
                          isPurple ? 'bg-purple-500' : 'bg-indigo-500'
                        }`} />
                      )}

                      {/* Icon */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.bgColor} mt-0.5 transition-transform group-hover:scale-105`}>
                        <IconComponent className={`h-4 w-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-semibold leading-tight ${isRead ? 'text-slate-400' : 'text-white'}`}>
                          {notif.title}
                        </p>
                        <p className={`text-[11px] mt-0.5 leading-snug truncate ${isRead ? 'text-slate-600' : 'text-slate-400'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3 w-3 text-slate-600" />
                          <span className="text-[10px] text-slate-600 font-medium">{timeAgo(notif.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <button
                          onClick={(e) => dismissOne(e, notif.id)}
                          className="p-1 rounded-md hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <ExternalLink className="h-3 w-3 text-slate-600" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
