/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import {
  createContext,
  useContext,
  type FocusEvent,
  type ReactNode,
} from "react"
import { AnimatePresence, motion } from "motion/react"
import useMeasure from "react-use-measure"
import { Drawer } from "vaul"

import { cn } from "@/lib/utils"

function isTextInput(target: EventTarget): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === "TEXTAREA" ||
    (target.tagName === "INPUT" &&
      !["checkbox", "radio", "button", "submit", "range"].includes(
        (target as HTMLInputElement).type
      ))
  )
}

/* ==================================================================== */
/* Types                                                                */
/* ==================================================================== */

export type ViewComponent = React.ComponentType<Record<string, unknown>>

export interface ViewsRegistry {
  [viewName: string]: ViewComponent
}

/* ==================================================================== */
/* Context                                                              */
/* ==================================================================== */

interface FamilyDrawerContextValue {
  isOpen: boolean
  view: string
  setView: (view: string) => void
  opacityDuration: number
  elementRef: ReturnType<typeof useMeasure>[0]
  bounds: ReturnType<typeof useMeasure>[1]
  views: ViewsRegistry | undefined
}

const FamilyDrawerContext = createContext<FamilyDrawerContextValue | undefined>(
  undefined
)

function useFamilyDrawer() {
  const context = useContext(FamilyDrawerContext)
  if (!context) {
    throw new Error(
      "FamilyDrawer components must be used within FamilyDrawerRoot"
    )
  }
  return context
}

/* ==================================================================== */
/* Root                                                                 */
/* ==================================================================== */

interface FamilyDrawerRootProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  view?: string
  defaultView?: string
  onViewChange?: (view: string) => void
  views?: ViewsRegistry
}

function FamilyDrawerRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  view: controlledView,
  defaultView = "default",
  onViewChange,
  views: customViews,
}: FamilyDrawerRootProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const [internalView, setInternalView] = React.useState(defaultView)
  const [elementRef, bounds] = useMeasure()

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen
  const view = controlledView !== undefined ? controlledView : internalView

  // Smooth constant for the height spring; view swaps get their own
  // crossfade timing inside FamilyDrawerAnimatedContent.
  const opacityDuration = 0.2

  const handleViewChange = (newView: string) => {
    if (controlledView === undefined) setInternalView(newView)
    onViewChange?.(newView)
  }

  const views =
    customViews && Object.keys(customViews).length > 0 ? customViews : undefined

  const contextValue: FamilyDrawerContextValue = {
    isOpen,
    view,
    setView: handleViewChange,
    opacityDuration,
    elementRef,
    bounds,
    views,
  }

  return (
    <FamilyDrawerContext.Provider value={contextValue}>
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        {children}
      </Drawer.Root>
    </FamilyDrawerContext.Provider>
  )
}

/* ==================================================================== */
/* Trigger / Close                                                      */
/* ==================================================================== */

interface FamilyDrawerTriggerProps {
  children?: ReactNode
  asChild?: boolean
  className?: string
}

function FamilyDrawerTrigger({
  children,
  asChild = false,
  className,
}: FamilyDrawerTriggerProps) {
  if (asChild) {
    return <Drawer.Trigger asChild>{children}</Drawer.Trigger>
  }
  return (
    <Drawer.Trigger asChild>
      <button
        type="button"
        className={cn(
          "fixed top-1/2 left-1/2 h-[44px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border bg-background px-4 py-2 font-medium text-foreground antialiased transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {children}
      </button>
    </Drawer.Trigger>
  )
}

interface FamilyDrawerCloseProps {
  children?: ReactNode
  asChild?: boolean
  className?: string
}

function FamilyDrawerClose({
  children,
  asChild = false,
  className,
}: FamilyDrawerCloseProps) {
  const defaultClose = (
    <button
      data-vaul-no-drag=""
      type="button"
      className={cn(
        "absolute end-5 top-5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:ring-2 focus-visible:ring-ring active:scale-75",
        className
      )}
    >
      {children || <CloseIcon />}
    </button>
  )

  if (asChild) {
    return <Drawer.Close asChild>{defaultClose}</Drawer.Close>
  }
  return <Drawer.Close asChild>{defaultClose}</Drawer.Close>
}

/* ==================================================================== */
/* Portal / Overlay / Content                                           */
/* ==================================================================== */

function FamilyDrawerPortal({ children }: { children: ReactNode }) {
  return <Drawer.Portal>{children}</Drawer.Portal>
}

function FamilyDrawerOverlay({
  className,
  onClick,
}: {
  className?: string
  onClick?: () => void
}) {
  const { setView } = useFamilyDrawer()
  return (
    <Drawer.Overlay
      className={cn("fixed inset-0 z-40 bg-black/30", className)}
      onClick={onClick || (() => setView("default"))}
    />
  )
}

function FamilyDrawerContent({ children }: { children: ReactNode }) {
  const { bounds } = useFamilyDrawer()
  // While a text input inside the drawer is focused, vaul takes over
  // `style.height` on this node for keyboard avoidance — bow out of the
  // height animation so vaul's inline style wins uncontested.
  const [keyboardLikelyOpen, setKeyboardLikelyOpen] = React.useState(false)

  const handleFocusIn = (e: FocusEvent) => {
    if (isTextInput(e.target)) setKeyboardLikelyOpen(true)
  }
  const handleFocusOut = () => setKeyboardLikelyOpen(false)

  return (
    <Drawer.Content
      asChild
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-[420px] overflow-hidden rounded-[36px] border border-border bg-popover text-popover-foreground outline-none md:mx-auto md:w-full"
    >
      <motion.div
        onFocus={handleFocusIn}
        onBlur={handleFocusOut}
        animate={{
          height: keyboardLikelyOpen ? undefined : bounds.height,
          transition: { duration: 0.27, ease: [0.25, 1, 0.5, 1] },
        }}
      >
        {children}
      </motion.div>
    </Drawer.Content>
  )
}

/* ==================================================================== */
/* Animated wrapper / content                                           */
/* ==================================================================== */

function FamilyDrawerAnimatedWrapper({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { elementRef } = useFamilyDrawer()
  return (
    <div ref={elementRef} className={cn("px-6 pb-6 pt-2.5 antialiased", className)}>
      {children}
    </div>
  )
}

function FamilyDrawerAnimatedContent({ children }: { children: ReactNode }) {
  const { view, opacityDuration } = useFamilyDrawer()

  return (
    <AnimatePresence initial={false} mode="popLayout" custom={view}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        key={view}
        transition={{ duration: opacityDuration, ease: [0.26, 0.08, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/* ==================================================================== */
/* Helper components                                                    */
/* ==================================================================== */

interface FamilyDrawerHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  className?: string
}

function FamilyDrawerHeader({
  icon,
  title,
  description,
  className,
}: FamilyDrawerHeaderProps) {
  return (
    <header className={cn("mt-[21px]", className)}>
      {icon}
      <h2 className="mt-2.5 text-[22px] font-semibold text-foreground md:font-medium">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] font-medium leading-6 text-muted-foreground md:font-normal">
          {description}
        </p>
      )}
    </header>
  )
}

interface FamilyDrawerButtonProps {
  children: ReactNode
  onClick: () => void
  className?: string
}

function FamilyDrawerButton({
  children,
  onClick,
  className,
}: FamilyDrawerButtonProps) {
  return (
    <button
      data-vaul-no-drag=""
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full cursor-pointer items-center gap-[15px] rounded-[16px] bg-muted px-4 text-[16px] font-semibold text-foreground transition-transform focus:scale-95 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 md:font-medium",
        className
      )}
    >
      {children}
    </button>
  )
}

interface FamilyDrawerSecondaryButtonProps {
  children: ReactNode
  onClick: () => void
  className?: string
}

function FamilyDrawerSecondaryButton({
  children,
  onClick,
  className,
}: FamilyDrawerSecondaryButtonProps) {
  return (
    <button
      data-vaul-no-drag=""
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full cursor-pointer items-center justify-center gap-[10px] rounded-full text-center text-[17px] font-semibold transition-transform focus:scale-95 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 md:font-medium",
        className
      )}
    >
      {children}
    </button>
  )
}

/* ==================================================================== */
/* View content renderer                                                */
/* ==================================================================== */

function FamilyDrawerViewContent({
  views: propViews,
}: {
  views?: ViewsRegistry
}) {
  const { view, views: contextViews } = useFamilyDrawer()
  const views = propViews || contextViews

  if (!views) {
    throw new Error(
      "FamilyDrawerViewContent requires views to be provided via props or FamilyDrawerRoot"
    )
  }

  const ViewComponent = views[view]
  if (!ViewComponent) {
    const DefaultComponent = views.default
    return DefaultComponent ? <DefaultComponent /> : null
  }
  return <ViewComponent />
}

/* ==================================================================== */
/* Icons                                                                */
/* ==================================================================== */

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M10.4854 1.99998L2.00007 10.4853"
        stroke="#999999"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.4854 10.4844L2.00007 1.99908"
        stroke="#999999"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ==================================================================== */
/* Exports                                                              */
/* ==================================================================== */

export {
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
  FamilyDrawerPortal,
  FamilyDrawerOverlay,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerAnimatedContent,
  FamilyDrawerClose,
  FamilyDrawerHeader,
  FamilyDrawerButton,
  FamilyDrawerSecondaryButton,
  FamilyDrawerViewContent,
  useFamilyDrawer,
}
