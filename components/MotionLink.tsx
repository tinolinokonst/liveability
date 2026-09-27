"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ReactNode, CSSProperties } from 'react'

interface MotionLinkProps {
  href: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export default function MotionLink({ href, className, style, children }: MotionLinkProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="inline-block"
    >
      {/* block, not the default inline: vertical padding on an inline <a>
          paints outside the wrapper's box, so stacked buttons overlapped.
          h-full keeps side-by-side buttons equal height in a stretched row. */}
      <Link href={href} className={`block h-full ${className ?? ''}`} style={style}>
        {children}
      </Link>
    </motion.div>
  )
}
