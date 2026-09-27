"use client"

import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, X, Check } from 'lucide-react'
import { submitFeedback, MAX_FEEDBACK_LENGTH } from '@/lib/feedback'

type Status = 'idle' | 'sending' | 'sent' | 'error'

interface Props {
  userId: string
  /** Where the feedback was sent from, stored alongside the message */
  page: string
}

export default function FeedbackButton({ userId, page }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    textareaRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Close a moment after a successful send so the confirmation is readable
  useEffect(() => {
    if (status !== 'sent') return
    const t = setTimeout(() => {
      setOpen(false)
      setStatus('idle')
    }, 1800)
    return () => clearTimeout(t)
  }, [status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    try {
      await submitFeedback(userId, message, page)
      setMessage('')
      setStatus('sent')
    } catch (err) {
      console.error('Failed to send feedback:', err)
      setStatus('error')
    }
  }

  const tooLong = message.length > MAX_FEEDBACK_LENGTH

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl p-4 shadow-2xl"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm">Send feedback</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
              className="p-1 rounded-lg transition-colors hover:bg-[#2a2a2a]"
              style={{ color: '#a0a0a0' }}
            >
              <X size={14} />
            </button>
          </div>

          {status === 'sent' ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm" style={{ color: '#a0a0a0' }}>
              <Check size={14} style={{ color: '#f97316' }} />
              Thanks — your feedback was sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => {
                  setMessage(e.target.value)
                  if (status === 'error') setStatus('idle')
                }}
                placeholder="Something broken, missing, or confusing? Tell us."
                rows={4}
                disabled={status === 'sending'}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#f97316] resize-none disabled:opacity-50"
                style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
              />
              {status === 'error' && (
                <p className="text-xs" style={{ color: '#f87171' }}>
                  Couldn&apos;t send your feedback. Please try again.
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: tooLong ? '#f87171' : '#3a3a3a' }}>
                  {message.length}/{MAX_FEEDBACK_LENGTH}
                </span>
                <button
                  type="submit"
                  disabled={!message.trim() || tooLong || status === 'sending'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#f97316' }}
                >
                  {status === 'sending' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Send
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Icon-only on phones, where a labelled pill covered dashboard content */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Feedback"
        title="Feedback"
        className="flex items-center gap-1.5 p-3 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-colors shadow-lg"
        style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
      >
        <MessageSquare size={15} className="sm:w-[13px] sm:h-[13px]" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    </div>
  )
}
