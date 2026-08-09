export type ScaleResult = {
  scale: number
  Wnew: number
  Hnew: number
  x_start: number
  y_start: number
}

const CANVAS_W = 645
const CANVAS_H = 890

export function computeScaleAndOffsets(Worig: number, Horig: number): ScaleResult {
  if (!isFinite(Worig) || !isFinite(Horig) || Worig <= 0 || Horig <= 0) {
    throw new Error('Invalid original dimensions')
  }

  const scale = Math.min(CANVAS_W / Worig, CANVAS_H / Horig)
  const Wnew = Math.round(Worig * scale)
  const Hnew = Math.round(Horig * scale)
  const x_start = (CANVAS_W - Wnew) / 2
  const y_start = (CANVAS_H - Hnew) / 2

  return { scale, Wnew, Hnew, x_start, y_start }
}

export default computeScaleAndOffsets
