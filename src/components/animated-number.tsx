import { useEffect } from "react"
import { animate, motion, useMotionValue, useTransform } from "motion/react"

const faFormat = new Intl.NumberFormat("fa-IR")

interface AnimatedNumberProps {
  value: number
  className?: string
}

/** Number that smoothly counts up/down whenever `value` changes. */
export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value)
  const text = useTransform(motionValue, (latest) =>
    faFormat.format(Math.round(latest))
  )

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [value, motionValue])

  return (
    <motion.span className={className} aria-label={faFormat.format(value)}>
      {text}
    </motion.span>
  )
}
