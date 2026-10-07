interface ResultsHeaderProps {
  /** The address or area name shown under "Results for" */
  title: React.ReactNode
  /** Rendered above "Results for", e.g. a back link */
  above?: React.ReactNode
  /** Rendered under the title, e.g. saved date or neighbourhood link */
  below?: React.ReactNode
  /** Score and action buttons on the right */
  actions?: React.ReactNode
}

// Shared by the address search, saved address and neighbourhood views. The
// row wraps instead of forcing title and actions onto one line: at phone widths
// two action buttons alone are wider than the container, and the old
// non-wrapping row pushed the last button ("Add to comparison", "Remove") past
// the right edge. min-w-0 lets a long address wrap rather than widen the row.
export default function ResultsHeader({ title, above, below, actions }: ResultsHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-56">
        {above}
        <p style={{ color: '#a0a0a0' }} className="text-xs mb-1">Results for</p>
        <p className="text-white font-semibold text-sm break-words">{title}</p>
        {below}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
          {actions}
        </div>
      )}
    </div>
  )
}
