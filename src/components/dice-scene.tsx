import * as React from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"

import { DIE_SIDES } from "@/lib/dice"
import type { DieType, StageEntry, Variant } from "@/lib/dice"
import { hashString } from "@/lib/hash"

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

interface Palette {
  body: string
  number: string
  accentBody: string
  accentNumber: string
}

const PALETTES: Record<"dark" | "light", Palette> = {
  dark: {
    body: "#c93a30",
    number: "#fdf6ee",
    accentBody: "#a02a22",
    accentNumber: "#fdf6ee",
  },
  light: {
    body: "#bf3b30",
    number: "#fdf6ee",
    accentBody: "#9e2b22",
    accentNumber: "#fdf6ee",
  },
}

const HIGHLIGHT_COLORS = { max: "#ff6b5e", min: "#7f1d16" } as const

/** Direction faces point towards once a die settles (towards the camera). */
const READ_DIR = new THREE.Vector3(0, 0.17, 1).normalize()

/** Exact camera direction — dice straighten up to face this at the end. */
const CAMERA_DIR = new THREE.Vector3(0, 0.9, 7).normalize()

/** Seconds spent straightening to a clean, upright angle after the tumble. */
const STRAIGHTEN_DURATION = 0.35

/** Max angular deviation (deg) for two triangles to count as one face. */
const FACE_CLUSTER_TOLERANCE_DEG = 8

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random helpers (render-safe)                   */
/* ------------------------------------------------------------------ */

function hashRand(seed: number, salt: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)
  h ^= salt * 0xc2b2ae35
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const smoothstep = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Pentagonal trapezohedron (the classic d10 shape) built from 10 planar
 * kite quads. The apex height is derived analytically so every kite is
 * exactly planar.
 */
function buildTrapezohedron(): THREE.BufferGeometry {
  const s36 = Math.sin(Math.PI / 5)
  const s72 = Math.sin((2 * Math.PI) / 5)
  const ratio = (2 * s36 + s72) / (2 * s36 - s72)
  const z = 0.115
  const h = z * ratio

  const top: [number, number, number] = [0, h, 0]
  const bottom: [number, number, number] = [0, -h, 0]
  const ring = (i: number): [number, number, number] => {
    const angle = (i * Math.PI) / 5
    const y = i % 2 === 0 ? z : -z
    return [Math.cos(angle), y, Math.sin(angle)]
  }

  const positions: number[] = []
  const tri = (
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) => positions.push(...p1, ...p2, ...p3)

  for (let i = 0; i < 5; i++) {
    const u0 = ring((2 * i) % 10)
    const u1 = ring((2 * i + 2) % 10)
    const l = ring((2 * i + 1) % 10)
    tri(top, u0, l)
    tri(top, l, u1)
    tri(bottom, u1, l)
    tri(bottom, l, u0)
  }

  // Guarantee counter-clockwise winding viewed from outside so every
  // clustered face normal points outwards (keeps number planes visible).
  const va = new THREE.Vector3()
  const vb = new THREE.Vector3()
  const vc = new THREE.Vector3()
  const e1 = new THREE.Vector3()
  const e2 = new THREE.Vector3()
  const fn = new THREE.Vector3()
  for (let i = 0; i < positions.length; i += 9) {
    va.set(positions[i], positions[i + 1], positions[i + 2])
    vb.set(positions[i + 3], positions[i + 4], positions[i + 5])
    vc.set(positions[i + 6], positions[i + 7], positions[i + 8])
    e1.subVectors(vb, va)
    e2.subVectors(vc, va)
    fn.crossVectors(e1, e2)
    if (fn.dot(va) < 0 && fn.dot(vc) < 0) {
      const x = positions[i + 3]
      const y = positions[i + 4]
      const zc = positions[i + 5]
      positions[i + 3] = positions[i + 6]
      positions[i + 4] = positions[i + 7]
      positions[i + 5] = positions[i + 8]
      positions[i + 6] = x
      positions[i + 7] = y
      positions[i + 8] = zc
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.computeVertexNormals()
  geometry.center()
  geometry.scale(1.12, 1.12, 1.12)
  return geometry
}

const GEOMETRY_SCALE: Record<string, number> = {
  "tens:d100": 0.82,
  "ones:d100": 0.74,
}

const geometryCache = new Map<string, THREE.BufferGeometry>()

function getDieGeometry(
  variant: Variant,
  type: DieType
): THREE.BufferGeometry {
  const key = `${variant}:${type}`
  const cached = geometryCache.get(key)
  if (cached) return cached

  let geometry: THREE.BufferGeometry
  const shape = variant === "std" ? type : "d10"

  switch (shape) {
    case "d4":
      geometry = new THREE.TetrahedronGeometry(1.25)
      break
    case "d6":
      geometry = new THREE.BoxGeometry(1.45, 1.45, 1.45)
      break
    case "d8":
      geometry = new THREE.OctahedronGeometry(1.2)
      break
    case "d10":
      geometry = buildTrapezohedron()
      break
    case "d12":
      geometry = new THREE.DodecahedronGeometry(1.18)
      break
    default:
      geometry = new THREE.IcosahedronGeometry(1.18)
  }

  const extra = GEOMETRY_SCALE[key]
  if (extra) geometry.scale(extra, extra, extra)

  geometryCache.set(key, geometry)
  return geometry
}

interface FaceInfo {
  normal: THREE.Vector3
  center: THREE.Vector3
  radius: number
}

const faceCache = new Map<string, FaceInfo[]>()

/**
 * Groups triangles into logical faces by clustering normals with an
 * angular tolerance. Callers must not assume faces.length equals the
 * label count, so label lookups stay guarded.
 */
function getFaces(variant: Variant, type: DieType): FaceInfo[] {
  const key = `${variant}:${type}`
  const cached = faceCache.get(key)
  if (cached) return cached

  const geometry = getDieGeometry(variant, type)
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  const pos = g.getAttribute("position")

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const n = new THREE.Vector3()
  const centroid = new THREE.Vector3()
  const minDot = Math.cos(
    THREE.MathUtils.degToRad(FACE_CLUSTER_TOLERANCE_DEG)
  )

  interface Cluster {
    sum: THREE.Vector3
    area: number
    center: THREE.Vector3
  }
  const clusters: Cluster[] = []

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    n.crossVectors(ab, ac)
    const area = n.length()
    if (area === 0) continue
    n.divideScalar(area)

    centroid.copy(a).add(b).add(c).divideScalar(3)

    let cluster: Cluster | undefined
    for (const candidate of clusters) {
      const len = candidate.sum.length()
      if (len > 0 && candidate.sum.dot(n) >= len * minDot) {
        cluster = candidate
        break
      }
    }
    if (!cluster) {
      cluster = {
        sum: new THREE.Vector3(),
        area: 0,
        center: new THREE.Vector3(),
      }
      clusters.push(cluster)
    }
    cluster.sum.add(n)
    cluster.area += area
    cluster.center.addScaledVector(centroid, area)
  }

  const faces: FaceInfo[] = clusters.map((cluster) => {
    const center = cluster.center.divideScalar(cluster.area)
    const normal = cluster.sum.normalize()
    let radius = 0
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i)
      radius = Math.max(radius, a.distanceTo(center))
    }
    return { normal, center, radius }
  })

  faces.sort(
    (f1, f2) =>
      Math.atan2(f1.normal.z, f1.normal.x) -
        Math.atan2(f2.normal.z, f2.normal.x) ||
      f1.normal.y - f2.normal.y
  )

  faceCache.set(key, faces)
  return faces
}

function labelsFor(variant: Variant, type: DieType): string[] {
  if (variant === "tens")
    return Array.from({ length: 10 }, (_, i) => String(i * 10).padStart(2, "0"))
  if (variant === "ones") return Array.from({ length: 10 }, (_, i) => String(i))
  return Array.from({ length: DIE_SIDES[type] }, (_, i) => String(i + 1))
}

/* ------------------------------------------------------------------ */
/* Number textures                                                     */
/* ------------------------------------------------------------------ */

const textureCache = new Map<string, THREE.CanvasTexture>()

function getNumberTexture(label: string, color: string): THREE.CanvasTexture {
  const key = `${label}|${color}`
  const cached = textureCache.get(key)
  if (cached) return cached

  const size = 192
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  const px = label.length >= 3 ? 76 : label.length === 2 ? 96 : 112
  ctx.font = `800 ${px}px "Vazirmatn Variable", ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = color
  ctx.fillText(label, size / 2, size / 2 + px * 0.06)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  textureCache.set(key, texture)
  return texture
}

/** The settled result number is drawn in this colour on the die face. */
export const RESULT_NUMBER_COLOR = "#e02020"

/* ------------------------------------------------------------------ */
/* Scene pieces                                                        */
/* ------------------------------------------------------------------ */

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const tmpDelta = new THREE.Quaternion()
const tmpQuat = new THREE.Quaternion()

function NumberPlane({
  face,
  label,
  color,
}: {
  face: FaceInfo
  label?: string
  color: string
}) {
  const quaternion = React.useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(Z_AXIS, face.normal),
    [face]
  )
  const position = React.useMemo(
    () => face.center.clone().multiplyScalar(1.035),
    [face]
  )
  const texture = React.useMemo(
    () => (label ? getNumberTexture(label, color) : null),
    [label, color]
  )

  if (!texture || !label) return null

  const size = THREE.MathUtils.clamp(face.radius * 1.15, 0.3, 1.15)

  return (
    <mesh position={position} quaternion={quaternion} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  )
}

interface DieBodyProps {
  entry: StageEntry
  slot: THREE.Vector3
  /** Flight origin — kept inside the viewport by the layout pass. */
  spawn: THREE.Vector3
  scale: number
  palette: Palette
  revealed: boolean
  mode: "static" | "roll"
  phase: number
  /** Changes on every roll so the tumble timeline restarts. */
  runId: number
  /** Tumble duration in seconds (user-configurable). */
  duration: number
}

function DieBody({
  entry,
  slot,
  spawn,
  scale,
  palette,
  revealed,
  mode,
  phase,
  runId,
  duration,
}: DieBodyProps) {
  const idHash = React.useMemo(
    () => hashString(`${entry.key}:${runId}`),
    [entry.key, runId]
  )

  const labels = React.useMemo(
    () => labelsFor(entry.variant, entry.type),
    [entry.variant, entry.type]
  )
  const faces = React.useMemo(
    () => getFaces(entry.variant, entry.type),
    [entry.variant, entry.type]
  )
  const geometry = React.useMemo(
    () => getDieGeometry(entry.variant, entry.type),
    [entry.variant, entry.type]
  )

  const staticQuat = React.useMemo(
    () =>
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          hashRand(idHash, 41) * 0.9 - 0.45,
          hashRand(idHash, 43) * Math.PI * 2,
          hashRand(idHash, 47) * 0.6 - 0.3
        )
      ),
    [idHash]
  )

  const labelIndex = Math.max(labels.indexOf(entry.label), 0)
  const face = faces[labelIndex % faces.length]

  const finalQuat = React.useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(face.normal, READ_DIR)
    const twist = new THREE.Quaternion().setFromAxisAngle(
      READ_DIR,
      hashRand(idHash, 11) * Math.PI * 2
    )
    return twist.multiply(q)
  }, [face, idHash])

  /** Perfectly frontal, zero-roll orientation the die straightens into. */
  const straightQuat = React.useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(face.normal, CAMERA_DIR),
    [face]
  )

  const spinAxis = React.useMemo(() => {
    const v = new THREE.Vector3(
      hashRand(idHash, 13) - 0.5,
      hashRand(idHash, 17) - 0.5,
      hashRand(idHash, 19) - 0.5
    )
    return v.normalize()
  }, [idHash])

  const initialQuat = React.useMemo(
    () =>
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          hashRand(idHash, 23) * Math.PI * 2,
          hashRand(idHash, 29) * Math.PI * 2,
          hashRand(idHash, 31) * Math.PI * 2
        )
      ),
    [idHash]
  )

  const groupRef = React.useRef<THREE.Group>(null!)
  const materialRef = React.useRef<THREE.MeshStandardMaterial>(null!)
  const anim = React.useRef({ started: false, t0: 0 })

  // A new roll must restart the tumble timeline even though the die
  // component instance (and its refs) survive between rolls.
  React.useEffect(() => {
    anim.current.started = false
    anim.current.t0 = 0
  }, [runId])

  const isAccent = entry.variant !== "std" || entry.type === "d20"
  const bodyColor = isAccent ? palette.accentBody : palette.body
  const numberColor = isAccent ? palette.accentNumber : palette.number
  const hlColor =
    entry.highlight === "max"
      ? HIGHLIGHT_COLORS.max
      : entry.highlight === "min"
        ? HIGHLIGHT_COLORS.min
        : "#000000"

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const t = state.clock.elapsedTime
    const g = groupRef.current

    if (mode === "static") {
      g.position.set(slot.x, slot.y + Math.sin(t * 1.5 + phase) * 0.04, slot.z)
      g.quaternion.slerp(staticQuat, Math.min(1, dt * 5))
      if (materialRef.current) materialRef.current.emissiveIntensity = 0
      return
    }

    if (!anim.current.started) {
      anim.current.started = true
      anim.current.t0 = t
    }

    const elapsed = t - anim.current.t0
    const u = THREE.MathUtils.clamp(elapsed / duration, 0, 1)

    if (u < 1) {
      const easeOut = 1 - Math.pow(1 - Math.min(u * 1.25, 1), 3)
      const bounce =
        Math.abs(Math.sin(u * Math.PI * 3)) * Math.exp(-1.8 * u) * 0.35

      g.position.set(
        THREE.MathUtils.lerp(spawn.x, slot.x, easeOut),
        THREE.MathUtils.lerp(spawn.y, slot.y, easeOut) + bounce,
        THREE.MathUtils.lerp(spawn.z, slot.z, easeOut)
      )

      tmpDelta.setFromAxisAngle(spinAxis, 30 * Math.pow(1 - u, 1.5) * dt)
      g.quaternion.multiply(tmpDelta)
      const pull = Math.pow(smoothstep((u - 0.45) / 0.55), 2) * 0.3
      g.quaternion.slerp(finalQuat, pull)
    } else {
      // Settled: straighten up from the random twist to a clean frontal
      // angle so the number reads perfectly straight.
      const v = THREE.MathUtils.clamp(
        (elapsed - duration) / STRAIGHTEN_DURATION,
        0,
        1
      )
      const ease = smoothstep(v)
      tmpQuat.copy(finalQuat).slerp(straightQuat, ease)
      g.quaternion.copy(tmpQuat)
      g.position.set(
        slot.x,
        slot.y + Math.sin(t * 1.6 + phase) * 0.02 * (1 - ease),
        slot.z
      )
    }

    const mat = materialRef.current
    if (mat) {
      const target =
        revealed && entry.highlight && u >= 1
          ? 0.22 + 0.18 * Math.sin(t * 6 + phase)
          : 0
      mat.emissiveIntensity +=
        (target - mat.emissiveIntensity) * Math.min(1, dt * 8)
    }
  })

  // The settled result face is simply drawn in red — same number, same
  // size, no overlay and no animation.
  const showRedResult = mode === "roll" && revealed

  return (
    <group
      ref={groupRef}
      position={mode === "static" ? slot : spawn}
      quaternion={mode === "static" ? staticQuat : initialQuat}
      scale={scale}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial
          ref={materialRef}
          color={bodyColor}
          emissive={hlColor}
          emissiveIntensity={0}
          roughness={0.28}
          metalness={0.08}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      {faces.map((f, i) => (
        <NumberPlane
          key={i}
          face={f}
          label={labels[i]}
          color={
            showRedResult && i === labelIndex
              ? RESULT_NUMBER_COLOR
              : numberColor
          }
        />
      ))}
    </group>
  )
}

interface SceneContentsProps {
  entries: StageEntry[]
  palette: Palette
  revealed: boolean
  mode: "static" | "roll"
  runId: number
  duration: number
}

/**
 * Lays dice out on a wrap-grid sized against the live viewport so every
 * die always fits on screen — one die sits dead center.
 */
function SceneContents({
  entries,
  palette,
  revealed,
  mode,
  runId,
  duration,
}: SceneContentsProps) {
  const viewport = useThree((state) => state.viewport)

  const layout = React.useMemo(() => {
    const n = Math.max(entries.length, 1)
    const aspect = Math.max(viewport.width / viewport.height, 0.1)
    let cols = Math.max(1, Math.round(Math.sqrt(n * aspect)))
    cols = Math.min(cols, n)
    const rows = Math.ceil(n / cols)

    const maxW = viewport.width * 0.82
    const maxH = viewport.height * 0.86
    const cell = Math.min(maxW / cols, maxH / rows, 2.15)
    const scale = THREE.MathUtils.clamp(cell / 2.2, 0.24, 1)

    // Flight origins hug each slot but stay well inside the frustum so
    // dice never fly in from off-screen on wide or tall viewports.
    const maxRadius = Math.min(cell * 0.85, viewport.width * 0.28)
    const dropHeight = Math.min(cell * 0.9, viewport.height * 0.34)

    const slots: THREE.Vector3[] = []
    const spawns: THREE.Vector3[] = []
    entries.forEach((entry, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const slot = new THREE.Vector3(
        (col - (cols - 1) / 2) * cell,
        ((rows - 1) / 2 - row) * cell,
        0
      )
      slots.push(slot)

      const seed = hashString(`${entry.key}:${runId}`)
      const angle = ((seed % 3600) / 3600) * Math.PI * 2
      spawns.push(
        new THREE.Vector3(
          slot.x + Math.cos(angle) * maxRadius,
          slot.y + dropHeight,
          slot.z + Math.sin(angle) * maxRadius * 0.5
        )
      )
    })
    return { slots, spawns, scale }
  }, [entries, runId, viewport])

  return (
    <>
      <hemisphereLight args={["#ffffff", palette.body, 0.95]} />
      <directionalLight position={[3.5, 5, 4]} intensity={1.7} />
      <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#9db8ff" />
      <pointLight position={[0, 0.5, 3]} intensity={0.35} />

      {entries.map((entry, i) => (
        <DieBody
          key={entry.key}
          entry={entry}
          slot={layout.slots[i]}
          spawn={layout.spawns[i]}
          scale={layout.scale}
          palette={palette}
          revealed={revealed}
          mode={mode}
          phase={(hashString(entry.key) % 628) / 100}
          runId={runId}
          duration={duration}
        />
      ))}
    </>
  )
}

export interface DiceStageProps {
  entries: StageEntry[]
  revealed: boolean
  theme: "dark" | "light"
  mode: "static" | "roll"
  runId: number
  /** Tumble duration in seconds (default 2s). */
  duration?: number
}

export function DiceStage({
  entries,
  revealed,
  theme,
  mode,
  runId,
  duration = 2,
}: DiceStageProps) {
  const palette = PALETTES[theme]

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.9, 7], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
      }}
    >
      <SceneContents
        entries={entries}
        palette={palette}
        revealed={revealed}
        mode={mode}
        runId={runId}
        duration={duration}
      />
    </Canvas>
  )
}
