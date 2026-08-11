'use client'

import React from 'react'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  collapsed?: boolean
  href?: string
}

export default function Logo({
  className = '',
  size = 'md',
  collapsed = false,
  href = '/',
}: LogoProps) {
  // Dimensions per size
  const dim = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'

  const logoContent = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/logo-icon.svg"
        alt="1to7 Logo"
        className={`${dim} aspect-square rounded-full object-cover transition-transform hover:scale-105 drop-shadow-sm shrink-0`}
      />
      {!collapsed && (
        <div className="flex flex-col justify-center min-w-0 leading-none">
          <div className={`font-black tracking-tight flex items-baseline gap-1.5 text-white ${titleSize}`}>
            <span className="font-extrabold bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
              1to7
            </span>
            <span className="font-bold text-slate-200 text-xs tracking-widest uppercase opacity-90">
              Media
            </span>
          </div>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none cursor-pointer">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
