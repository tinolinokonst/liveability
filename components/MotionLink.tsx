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
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    </motion.div>
  )
}
