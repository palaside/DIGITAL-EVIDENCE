import React, { useEffect, useRef } from 'react'
import styles from './CanvasPreview.module.css'
import computeScaleAndOffsets from '../lib/scale'
import tokens from '../design/design-tokens.json'

type Props = {
  src?: string
  file?: File
  alt?: string
  onDraw?: () => void
}

export const CANVAS_WIDTH = (tokens as any).layout.canvas.width as number
export const CANVAS_HEIGHT = (tokens as any).layout.canvas.height as number

export default function CanvasPreview({ src, file, alt = '', onDraw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let url: string | undefined
    const img = new Image()
    img.crossOrigin = 'anonymous'

    const handleLoad = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = CANVAS_WIDTH
      canvas.height = CANVAS_HEIGHT
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // clear
      ctx.fillStyle = (tokens as any).color.canvas
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // compute scale and offsets
      const { Wnew, Hnew, x_start, y_start } = computeScaleAndOffsets(img.width, img.height)
      ctx.drawImage(img, x_start, y_start, Wnew, Hnew)
      onDraw?.()
    }

    img.onerror = () => {
      // draw placeholder
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = (tokens as any).color.paper
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = (tokens as any).color.secondary
      ctx.fillText('Image failed to load', 10, 20)
    }

    img.onload = handleLoad

    if (file) {
      url = URL.createObjectURL(file)
      img.src = url
    } else if (src) {
      img.src = src
    } else {
      // nothing to draw, clear canvas
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = (tokens as any).color.canvas
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        }
      }
    }

    return () => {
      if (url) URL.revokeObjectURL(url)
      img.onload = null
      img.onerror = null
    }
  }, [src, file, onDraw])

  return (
    <div className={styles.root} aria-label={alt}>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
      </div>
    </div>
  )
}
