'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Instagram, Heart, MessageCircle, ExternalLink, RefreshCw, Sparkles, AlertCircle, Video, Image as ImageIcon, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BrandLoader from '@/components/ui/BrandLoader'

interface MediaItem {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

interface MediaStats {
  totalPostsFetched: number
  totalLikes: number
  totalComments: number
  avgLikes: number
  avgComments: number
  engagementRate: number
}

export default function InstagramMediaGrid() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState('')
  const [followers, setFollowers] = useState(0)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [stats, setStats] = useState<MediaStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInstagramMedia()
  }, [])

  const fetchInstagramMedia = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard/instagram-media')
      const data = await res.json()

      if (data.connected) {
        setConnected(true)
        setUsername(data.username || '')
        setFollowers(data.followers || 0)
        setMedia(data.media || [])
        setStats(data.stats || null)
      } else {
        setConnected(false)
        if (data.error) setError(data.error)
      }
    } catch (err: any) {
      console.error('Failed to load Instagram media:', err)
      setError('Failed to fetch Instagram posts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchInstagramMedia()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs flex flex-col items-center justify-center min-h-[220px]">
        <BrandLoader />
        <p className="text-xs text-slate-500 font-semibold mt-3 animate-pulse">Loading Instagram Posts & Analytics...</p>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600 border border-pink-100">
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Instagram Media & Engagement</h3>
              <p className="text-xs text-slate-500 font-medium">Connect Instagram to view recent Posts, Reels & Engagement Rate</p>
            </div>
          </div>
          <a
            href="/api/auth/instagram/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95"
          >
            <Instagram className="h-3.5 w-3.5" />
            Connect Instagram
          </a>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white shadow-xs">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">Instagram Feed & Engagement</h3>
              {username && (
                <span className="text-xs font-bold text-pink-600 bg-pink-50 border border-pink-200/60 px-2 py-0.5 rounded-md">
                  @{username.replace('@', '')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">Real-time media analytics & performance stats</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats && stats.engagementRate > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-extrabold shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>{stats.engagementRate}% Engagement Rate</span>
            </div>
          )}
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Posts Fetched</span>
            <div className="text-lg font-black text-slate-900">{stats.totalPostsFetched}</div>
          </div>
          <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Heart className="h-3 w-3 fill-rose-500" /> Avg. Likes
            </span>
            <div className="text-lg font-black text-rose-900">{stats.avgLikes.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <MessageCircle className="h-3 w-3 fill-blue-500" /> Avg. Comments
            </span>
            <div className="text-lg font-black text-blue-900">{stats.avgComments.toLocaleString()}</div>
          </div>
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3.5 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Followers</span>
            <div className="text-lg font-black text-purple-900">{followers.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Posts & Reels Grid */}
      {media.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-1">
          {media.map((item) => {
            const displayImg = item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-square border border-slate-200/80 shadow-2xs cursor-pointer"
              >
                {/* Image / Thumbnail */}
                {displayImg ? (
                  <img
                    src={displayImg}
                    alt={item.caption || 'Instagram Post'}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-400">
                    <Instagram className="h-8 w-8" />
                  </div>
                )}

                {/* Media Type Icon Badge */}
                <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] shadow-sm">
                  {item.media_type === 'VIDEO' && <Video className="h-3.5 w-3.5 text-amber-400" />}
                  {item.media_type === 'IMAGE' && <ImageIcon className="h-3.5 w-3.5 text-blue-400" />}
                  {item.media_type === 'CAROUSEL_ALBUM' && <Layers className="h-3.5 w-3.5 text-purple-400" />}
                </div>

                {/* Hover Overlay with Likes, Comments & Link */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 text-white">
                  <div className="flex justify-end">
                    <a
                      href={item.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors"
                      title="View on Instagram"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-white" />
                    </a>
                  </div>

                  <div className="space-y-1.5">
                    {item.caption && (
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-tight font-medium">
                        {item.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs font-bold pt-1 border-t border-white/20">
                      <span className="flex items-center gap-1 text-rose-400">
                        <Heart className="h-3.5 w-3.5 fill-rose-500" />
                        {item.like_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <MessageCircle className="h-3.5 w-3.5 fill-blue-500" />
                        {item.comments_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-xs font-medium">
          No recent Instagram posts found.
        </div>
      )}
    </div>
  )
}
