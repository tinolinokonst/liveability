import { PNNL_ATLAS } from '@/lib/dataCenters'

/**
 * Required credit for the PNNL IM3 Open Source Data Center Atlas (ODbL 1.0),
 * on the data-center card and in the footer. Clicks don't reach the card's
 * open handler.
 */
export default function DataCenterAtlasCredit({ className, linkClassName = 'underline' }: { className?: string; linkClassName?: string }) {
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <span className={className}>
      <a href={PNNL_ATLAS.url} target="_blank" rel="noopener noreferrer" className={linkClassName} onClick={stop}>Data Center Atlas</a>
      {' '}&copy; Pacific Northwest National Laboratory (IM3), licensed under{' '}
      <a href={PNNL_ATLAS.licenceUrl} target="_blank" rel="noopener noreferrer" className={linkClassName} onClick={stop}>{PNNL_ATLAS.licence}</a>
      , {PNNL_ATLAS.version}
    </span>
  )
}
