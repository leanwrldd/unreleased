import { RefObject, useEffect, useState } from 'react'

export interface VirtualWindow {
  /** First row index to render (inclusive). */
  start: number
  /** Last row index to render (exclusive). */
  end: number
  /** Full scroll height of all rows — set on the positioned content container. */
  totalHeight: number
}

/**
 * Fixed-stride vertical windowing. Renders only the rows visible in the scroll
 * viewport (plus an overscan margin) so large lists/grids don't mount thousands
 * of nodes (and, here, thousands of decoded album-art bitmaps) at once.
 *
 * Rows are expected to be absolutely positioned within `contentRef` at
 * `index * rowStride`, and `contentRef` sized to `totalHeight`. `contentRef`'s
 * offset within the scroller is accounted for, so a non-sticky header above the
 * content (e.g. the sortable column row) doesn't skew the visible range.
 *
 * @param rowStride full height of one row including any vertical gap, in px.
 */
export function useVirtualWindow(
  scrollRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>,
  rowCount: number,
  rowStride: number,
  overscan = 4,
): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0)
  const [clientH, setClientH] = useState(0)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = (): void => setScrollTop(el.scrollTop)
    // clientHeight / offsetTop only change on layout, not on scroll — measure
    // them via ResizeObserver to avoid layout reads on every scroll event.
    const measure = (): void => {
      setClientH(el.clientHeight)
      setScrollTop(el.scrollTop)
      setOffset(contentRef.current ? contentRef.current.offsetTop : 0)
    }
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (contentRef.current) ro.observe(contentRef.current)
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect() }
  }, [scrollRef, contentRef])

  const totalHeight = rowCount * rowStride
  if (rowStride <= 0 || rowCount === 0) return { start: 0, end: rowCount, totalHeight }
  const eff = Math.max(0, scrollTop - offset)
  const start = Math.max(0, Math.floor(eff / rowStride) - overscan)
  const end = Math.min(rowCount, Math.ceil((eff + clientH) / rowStride) + overscan)
  return { start, end, totalHeight }
}
