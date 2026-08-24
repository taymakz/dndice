import * as React from "react"

/** Tracks the resolved (light/dark) theme applied on <html>, staying in
 *  sync even when the theme changes through shortcuts or other tabs. */
export function useResolvedTheme() {
  const [resolved, setResolved] = React.useState<"dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  )

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setResolved(
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light"
      )
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  return resolved
}
