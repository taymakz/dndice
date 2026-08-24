import { AnimatePresence, motion } from "motion/react"
import {
  BookOpen,
  Check,
  ChevronRight,
  Dices,
  Globe,
  Minus,
  Monitor,
  Moon,
  PackagePlus,
  Palette,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sun,
  Timer,
  Trash2,
  User,
  X,
} from "lucide-react"

import { useTheme } from "@/components/theme-provider"

import { DieFace } from "@/components/dice-shape"
import {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerButton,
  FamilyDrawerContent,
  FamilyDrawerHeader,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerSecondaryButton,
  FamilyDrawerTrigger,
  FamilyDrawerViewContent,
  useFamilyDrawer,
  type ViewsRegistry,
} from "@/components/ui/family-drawer"
import { buttonVariants } from "@/components/ui/button"
import { DIE_SIDES, DIE_TYPES, type DieType } from "@/lib/dice"
import { cn } from "@/lib/utils"

interface PoolItem {
  id: number
  type: DieType
}

interface SettingsMenuProps {
  pool: PoolItem[]
  onAdd: (type: DieType) => void
  onRemove: (id: number) => void
  onRemoveType: (type: DieType) => void
  onReset: () => void
  modifier: number
  onModifierChange: (value: number) => void
  speedMs: number
  onSpeedChange: (ms: number) => void
}

const faFormat = new Intl.NumberFormat("fa-IR")
const MAX_DICE = 20

const SPEED_OPTIONS = [
  { ms: 0, title: "صفر", hint: "بدون انیمیشن" },
  { ms: 2000, title: "معمولی", hint: "۲ ثانیه" },
  { ms: 4000, title: "آهسته", hint: "۴ ثانیه" },
] as const

export function SettingsMenu({
  pool,
  onAdd,
  onRemove,
  onRemoveType,
  onReset,
  modifier,
  onModifierChange,
  speedMs,
  onSpeedChange,
}: SettingsMenuProps) {
  const { theme, setTheme } = useTheme()
  const speedLabel =
    SPEED_OPTIONS.find((option) => option.ms === speedMs)?.title ??
    `${faFormat.format(Math.round(speedMs / 100) / 10)} ثانیه`
  const themeLabels = { light: "روشن", dark: "تاریک", system: "سیستم" } as const

  function MenuView() {
    const { setView } = useFamilyDrawer()
    return (
      <div>
        <h2 className="mb-3 text-[19px] font-semibold text-foreground">
          تنظیمات تاس
        </h2>
        <div className="flex flex-col gap-2">
          <FamilyDrawerButton onClick={() => setView("shapes")} className="justify-between">
            <span className="flex items-center gap-[15px]">
              <Dices className="size-4" />
              تاس‌های انتخاب‌شده
            </span>
            <span className="flex items-center gap-1.5">
              {pool.length > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground tabular-nums">
                  {faFormat.format(pool.length)}
                </span>
              )}
              <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
            </span>
          </FamilyDrawerButton>
          <FamilyDrawerButton onClick={() => setView("modifier")} className="justify-between">
            <span className="flex items-center gap-[15px]">
              <SlidersHorizontal className="size-4" />
              اصلاحیه (Modifier)
            </span>
            <span className="flex items-center gap-1.5">
              {modifier !== 0 && (
                <span
                  dir="ltr"
                  className="rounded-full bg-muted-foreground/15 px-2 py-0.5 text-[11px] font-bold tabular-nums"
                >
                  {(modifier > 0 ? "+" : "") + modifier}
                </span>
              )}
              <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
            </span>
          </FamilyDrawerButton>
          <FamilyDrawerButton onClick={() => setView("speed")} className="justify-between">
            <span className="flex items-center gap-[15px]">
              <Timer className="size-4" />
              سرعت چرخش تاس
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {speedLabel}
              </span>
              <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
            </span>
          </FamilyDrawerButton>
          <FamilyDrawerButton onClick={() => setView("theme")} className="justify-between">
            <span className="flex items-center gap-[15px]">
              <Palette className="size-4" />
              تم
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {themeLabels[theme]}
              </span>
              <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
            </span>
          </FamilyDrawerButton>
          <FamilyDrawerButton onClick={() => setView("guide")} className="justify-between">
            <span className="flex items-center gap-[15px]">
              <BookOpen className="size-4" />
              آموزش طریقه استفاده از تاس ها
            </span>
            <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
          </FamilyDrawerButton>
          <FamilyDrawerButton onClick={() => setView("creator")} className="justify-between">
            <span className="flex items-center gap-[15px]">
              <User className="size-4" />
              سازنده
            </span>
            <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
          </FamilyDrawerButton>
          <FamilyDrawerButton
            onClick={() => {
              onReset()
              setView("default")
            }}
            className="bg-destructive/10 text-destructive hover:bg-destructive/15"
          >
            <RotateCcw className="size-4" />
            ریست کن
          </FamilyDrawerButton>
        </div>
      </div>
    )
  }

  function ShapesView() {
    const { setView } = useFamilyDrawer()
    const counts = new Map<DieType, number>()
    for (const item of pool) counts.set(item.type, (counts.get(item.type) ?? 0) + 1)

    return (
      <div>
        <FamilyDrawerHeader
          icon={<Dices className="size-9" />}
          title="تاس‌های انتخاب‌شده"
          description="روی هر تاس بزن تا حذف شود."
        />
        <div data-vaul-no-drag="" className="mt-5">
          {pool.length === 0 ? (
            <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
              هنوز تاسی انتخاب نکردی.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {pool.map((item) => (
                  <motion.button
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 550, damping: 32 }}
                    whileTap={{ scale: 0.85 }}
                    type="button"
                    onClick={() => onRemove(item.id)}
                    title="حذف"
                    className="flex cursor-pointer items-center gap-1 rounded-full border bg-background py-1 pe-2 ps-1.5 transition-colors hover:border-destructive/60 hover:bg-destructive/10"
                  >
                    <DieFace
                      type={item.type}
                      className="size-4 [&>*]:fill-primary/15 [&>*]:stroke-foreground/70"
                    />
                    <span dir="ltr" className="text-[11px] font-bold">
                      {item.type}
                    </span>
                    <X className="size-3 text-muted-foreground" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence initial={false}>
            {[...counts.entries()].map(([type, count]) =>
              count > 1 ? (
                <motion.p
                  key={type}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-xs text-muted-foreground"
                >
                  {faFormat.format(count)}× {type}
                </motion.p>
              ) : null
            )}
          </AnimatePresence>

          <div className="mt-5">
            <FamilyDrawerButton onClick={() => setView("select")}>
              <PackagePlus className="size-4" />
              افزودن یا کم کردن تاس
              <ChevronRight className="ms-auto size-4 rotate-180 text-muted-foreground" />
            </FamilyDrawerButton>
          </div>
        </div>
        <div className="mt-6">
          <BackButton />
        </div>
      </div>
    )
  }

  function SelectView() {
    const { setView } = useFamilyDrawer()
    const counts = new Map<DieType, number>()
    for (const item of pool) counts.set(item.type, (counts.get(item.type) ?? 0) + 1)

    return (
      <div>
        <FamilyDrawerHeader
          icon={<PackagePlus className="size-9" />}
          title="انتخاب تاس"
          description="با + اضافه کن و با − کم کن."
        />
        <div data-vaul-no-drag="" className="mt-5 flex flex-col gap-1.5">
          {DIE_TYPES.map((type) => {
            const count = counts.get(type) ?? 0
            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2"
              >
                <DieFace
                  type={type}
                  className="size-7 [&>*]:fill-primary/10 [&>*]:stroke-foreground/60"
                />
                <span dir="ltr" className="text-sm font-bold">
                  {type}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({faFormat.format(DIE_SIDES[type])} وجهی)
                </span>
                <span className="ms-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`حذف یک ${type}`}
                    disabled={count === 0 || !counts.has(type)}
                    onClick={() => removeOneType(pool, type, onRemoveType, onRemove)}
                    className="grid size-8 place-items-center rounded-full bg-background transition-transform hover:bg-accent active:scale-90 disabled:opacity-30"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">
                    {count > 0 ? faFormat.format(count) : "۰"}
                  </span>
                  <button
                    type="button"
                    aria-label={`افزودن یک ${type}`}
                    disabled={pool.length >= MAX_DICE}
                    onClick={() => onAdd(type)}
                    className="grid size-8 place-items-center rounded-full bg-background transition-transform hover:bg-accent active:scale-90 disabled:opacity-30"
                  >
                    <Plus className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف همه ${type}`}
                    disabled={count === 0}
                    onClick={() => onRemoveType(type)}
                    className="grid size-8 place-items-center rounded-full bg-background transition-transform hover:bg-destructive/10 hover:text-destructive active:scale-90 disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-6">
          <BackButton onClick={() => setView("shapes")} />
        </div>
      </div>
    )
  }

  function ModifierView() {
    return (
      <div>
        <FamilyDrawerHeader
          icon={<SlidersHorizontal className="size-9" />}
          title="اصلاحیه (Modifier)"
          description="عددی که بعد از ریختن تاس‌ها به مجموع اضافه یا از آن کم می‌شود؛ مثل 1d20 + 5."
        />
        <div data-vaul-no-drag="" className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="کاهش اصلاحیه"
            disabled={modifier <= -20}
            onClick={() => onModifierChange(modifier - 1)}
            className="grid size-12 place-items-center rounded-2xl bg-muted transition-transform hover:bg-accent active:scale-90 disabled:opacity-30"
          >
            <Minus className="size-5" />
          </button>
          <span
            dir="ltr"
            className="w-16 text-center text-4xl font-black tabular-nums"
          >
            {(modifier > 0 ? "+" : "") + faFormat.format(modifier)}
          </span>
          <button
            type="button"
            aria-label="افزایش اصلاحیه"
            disabled={modifier >= 30}
            onClick={() => onModifierChange(modifier + 1)}
            className="grid size-12 place-items-center rounded-2xl bg-muted transition-transform hover:bg-accent active:scale-90 disabled:opacity-30"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <div className="mt-6 flex gap-2">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="min-w-0 flex-1"
          >
            <BackButton />
          </motion.div>
          <AnimatePresence initial={false}>
            {modifier !== 0 && (
              <motion.div
                key="clear-modifier"
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 460, damping: 32 }}
                className="min-w-0 flex-1"
              >
                <FamilyDrawerSecondaryButton
                  onClick={() => onModifierChange(0)}
                  className="bg-destructive/10 text-destructive"
                >
                  حذف اصلاحیه
                </FamilyDrawerSecondaryButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  function ThemeView() {
    const options = [
      { value: "light", label: "روشن", icon: Sun },
      { value: "dark", label: "تاریک", icon: Moon },
      { value: "system", label: "سیستم", icon: Monitor },
    ] as const

    return (
      <div>
        <FamilyDrawerHeader
          icon={<Palette className="size-9" />}
          title="تم"
          description="ظاهر روشن یا تاریک برنامه را انتخاب کنید."
        />
        <div data-vaul-no-drag="" className="mt-6 flex gap-2">
          {options.map(({ value, label, icon: Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-accent"
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            )
          })}
        </div>
        <div className="mt-7">
          <BackButton />
        </div>
      </div>
    )
  }

  function SpeedView() {
    return (
      <div>
        <FamilyDrawerHeader
          icon={<Timer className="size-9" />}
          title="سرعت چرخش تاس"
          description="مدت زمان چرخش و ثابت شدن تاس‌ها بعد از ریختن."
        />
        <div data-vaul-no-drag="" className="mt-6 flex flex-col gap-2">
          {SPEED_OPTIONS.map((option) => {
            const active = speedMs === option.ms
            return (
              <button
                key={option.ms}
                type="button"
                onClick={() => onSpeedChange(option.ms)}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-accent"
                )}
              >
                <span className="font-bold">{option.title}</span>
                <span className="flex items-center gap-2 text-xs opacity-80">
                  {option.hint}
                  {active && <Check className="size-4" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-7">
          <BackButton />
        </div>
      </div>
    )
  }

  function GuideView() {
    const { setView } = useFamilyDrawer()
    return (
      <div>
        <FamilyDrawerHeader
          icon={<BookOpen className="size-9" />}
          title="آموزش طریقه استفاده از تاس های D&D"
        />
        <GuideBody />
        <div className="mt-6">
          <BackButton onClick={() => setView("default")} />
        </div>
      </div>
    )
  }

  function CreatorView() {
    const { setView } = useFamilyDrawer()
    return (
      <div>
        <FamilyDrawerHeader
          icon={<User className="size-9" />}
          title="سازنده"
        />
        <div data-vaul-no-drag="" className="mt-6 flex flex-col gap-2">
          <a
            href="https://taymakz.ir"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 transition-colors hover:bg-accent"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Globe className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">
                وب‌سایت شخصی
              </span>
              <span dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                taymakz.ir
              </span>
            </span>
            <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
          </a>
          <a
            href="https://github.com/taymakz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3 transition-colors hover:bg-accent"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <GitHubMark />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">GitHub</span>
              <span dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                github.com/taymakz
              </span>
            </span>
            <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
          </a>
        </div>
        <div className="mt-7">
          <BackButton onClick={() => setView("default")} />
        </div>
      </div>
    )
  }

  const views: ViewsRegistry = {
    default: MenuView,
    shapes: ShapesView,
    select: SelectView,
    modifier: ModifierView,
    theme: ThemeView,
    speed: SpeedView,
    guide: GuideView,
    creator: CreatorView,
  }

  return (
    <FamilyDrawerRoot views={views}>
      <FamilyDrawerTrigger asChild>
        <button
          type="button"
          aria-label="منوی تنظیمات"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-14 w-14 rounded-2xl font-bold"
          )}
        >
          <Settings className="size-5" />
        </button>
      </FamilyDrawerTrigger>
      <FamilyDrawerPortal>
        <FamilyDrawerOverlay />
        <FamilyDrawerContent>
          <FamilyDrawerAnimatedWrapper>
            <FamilyDrawerAnimatedContent>
              <FamilyDrawerViewContent />
            </FamilyDrawerAnimatedContent>
          </FamilyDrawerAnimatedWrapper>
        </FamilyDrawerContent>
      </FamilyDrawerPortal>
    </FamilyDrawerRoot>
  )
}

function BackButton({ onClick }: { onClick?: () => void }) {
  const { setView } = useFamilyDrawer()
  return (
    <FamilyDrawerSecondaryButton
      onClick={onClick || (() => setView("default"))}
      className="bg-muted text-foreground"
    >
      بازگشت
    </FamilyDrawerSecondaryButton>
  )
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.05 11.05 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

/** Removes a single instance of `type` using the per-id remover when possible. */
function removeOneType(
  pool: PoolItem[],
  type: DieType,
  onRemoveType: (type: DieType) => void,
  onRemoveId: (id: number) => void
) {
  const item = [...pool].reverse().find((candidate) => candidate.type === type)
  if (item) onRemoveId(item.id)
  else onRemoveType(type)
}

function GuideBody() {
  return (
    <div
      data-vaul-no-drag=""
      className="content-scroll mt-4 max-h-[46dvh] space-y-3 overflow-y-auto text-[12px] leading-6 text-muted-foreground"
    >
      <p>
        در بازی‌های نقش‌آفرینی مثل D&amp;D، بیشتر تصمیم‌ها با «تاس» گرفته
        می‌شود. روی هر تاس معمولاً با این شکل می‌نویسند: d20 یا d6. حرف d یعنی
        Dice (تاس) و عدد بعدش یعنی تعداد وجه‌های تاس. مثلاً d6 یعنی تاس ۶ وجهی.
      </p>
      <div>
        <h3 className="mb-1 text-xs font-bold text-foreground">
          معروف‌ترین تاس‌ها در D&amp;D
        </h3>
        <ul className="list-disc space-y-1 ps-4">
          <li>
            <b>d4</b> (۴ وجهی): عددهای ۱ تا ۴؛ معمولاً برای آسیب کم یا اثرهای
            کوچک استفاده می‌شود.
          </li>
          <li>
            <b>d6</b> (۶ وجهی): عددهای ۱ تا ۶؛ خیلی رایج برای آسیب
            سلاح‌ها/جادوها و بعضی جدول‌های تصادفی.
          </li>
          <li>
            <b>d8</b> (۸ وجهی): عددهای ۱ تا ۸؛ برای آسیب متوسط (مثلاً بعضی
            سلاح‌ها یا جادوها).
          </li>
          <li>
            <b>d10</b> (۱۰ وجهی): عددهای ۱ تا ۱۰؛ برای آسیب‌های خاص و ساختن
            تاس درصدی کاربرد دارد.
          </li>
          <li>
            <b>d12</b> (۱۲ وجهی): عددهای ۱ تا ۱۲؛ کمتر از بقیه استفاده
            می‌شود، ولی بعضی سلاح‌ها یا قابلیت‌ها با d12 رول می‌شوند.
          </li>
          <li>
            <b>d20</b> (۲۰ وجهی): عددهای ۱ تا ۲۰؛ مهم‌ترین تاس بازی برای
            اکثر «چک‌ها»، «حمله‌ها» و «سیو»هاست.
          </li>
          <li>
            <b>d100</b> (تاس درصدی): معمولاً با دو تا d10 ساخته می‌شود و
            نتیجه بین ۱ تا ۱۰۰ می‌دهد؛ برای درصد شانس یا جدول‌های تصادفی
            عالی است.
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold text-foreground">
          عبارت‌هایی مثل 2d6 یا 1d20 یعنی چی؟
        </h3>
        <p>
          وقتی می‌بینی 2d6 یعنی «دو بار تاس ۶ وجهی بریز و با هم جمع کن». یا
          1d20 یعنی «یک بار تاس ۲۰ وجهی بریز».
        </p>
        <ul className="mt-1 list-disc space-y-1 ps-4">
          <li>1d8 یعنی یک عدد بین ۱ تا ۸.</li>
          <li>
            2d6 یعنی دو عدد بین ۱ تا ۶ که با هم جمع می‌شوند (بین ۲ تا ۱۲).
          </li>
          <li>3d4 یعنی سه بار d4 (نتیجه بین ۳ تا ۱۲).</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold text-foreground">
          Modifier یا عدد اضافه/کم چیست؟
        </h3>
        <p>
          گاهی کنار تاس‌ها یک عدد مثبت یا منفی می‌آید، مثلاً 1d20 + 5 یا
          2d6 + 3. یعنی بعد از ریختن تاس‌ها، آن عدد به نتیجه اضافه (یا کم)
          می‌شود. این عدد معمولاً از ویژگی‌های شخصیت (مثل Strength یا
          Dexterity) یا مهارت‌ها می‌آید.
        </p>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold text-foreground">
          d20 دقیقاً کجا استفاده می‌شود؟
        </h3>
        <ul className="list-disc space-y-1 ps-4">
          <li>
            <b>Attack Roll (رول حمله):</b> برای اینکه بفهمیم ضربه به دشمن
            می‌خورد یا نه.
          </li>
          <li>
            <b>Ability Check (چک توانایی):</b> برای کارهایی مثل بالا رفتن از
            دیوار، قانع کردن یک نفر، مخفی‌کاری و…
          </li>
          <li>
            <b>Saving Throw (سیو):</b> برای مقاومت در برابر خطرها مثل جادو،
            سم، تله‌ها و…
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold text-foreground">
          ۱ و ۲۰ روی d20 چه معنی‌ای دارند؟
        </h3>
        <p>
          <b>Natural 20 (۲۰ طبیعی):</b> معمولاً بهترین حالت است و در حمله‌ها
          «کریتیکال» حساب می‌شود. <b>Natural 1 (۱ طبیعی):</b> بدترین حالت و
          در حمله‌ها معمولاً «خطای کامل» محسوب می‌شود.
        </p>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold text-foreground">
          d100 (درصدی) چطور ساخته می‌شود؟
        </h3>
        <p>
          خیلی وقت‌ها d100 را با دو تا d10 می‌سازند: یکی «دهگان» را مشخص
          می‌کند (0,10,20,…,90) و یکی «یکان» را (۰ تا ۹). مثلاً اگر دهگان 70
          و یکان 3 بیاید، نتیجه 73 می‌شود. اگر هر دو ۰ بیایند (00)، معمولاً
          آن را ۱۰۰ حساب می‌کنند.
        </p>
      </div>
    </div>
  )
}
