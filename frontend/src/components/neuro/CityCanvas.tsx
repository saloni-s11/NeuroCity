/**
 * CityCanvas.tsx — Neon Smart-City Night Visualization
 *
 * Design language: cyberpunk-meets-GIS. Dark ocean-floor city base with glowing
 * hexagonal district platforms, procedural glass towers of three architectural
 * archetypes, animated data-stream roads, per-layer atmospheric halos, and a
 * starfield backdrop.
 *
 * All geometry is procedural — zero external assets.
 * Interaction: OrbitControls (drag/pan/zoom), click to select district.
 */

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text, GradientTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Sector } from "@/types/city";
import { getSectorStatus } from "@/types/city";

// ─── Public API ───────────────────────────────────────────────────────────────

export type LayerId =
  | "traffic"
  | "pollution"
  | "infrastructure"
  | "population"
  | "utilities";

export interface CityCanvasProps {
  sectors: Sector[];
  layer: LayerId;
  selectedId: string | null;
  focusedId: string | null;
  onSelect: (sectorId: string) => void;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

// Hexagonal grid layout — flat-top hex, radius R
const HEX_R = 11; // outer radius (centre to corner)
const HEX_COLS = 3;

function hexPosition(i: number): [number, number, number] {
  const col  = i % HEX_COLS;
  const row  = Math.floor(i / HEX_COLS);
  const xSpacing = HEX_R * 1.85;
  const zSpacing = HEX_R * 1.65;
  const xOffset  = row % 2 === 1 ? xSpacing * 0.5 : 0; // stagger alternate rows
  const totalCols = HEX_COLS;
  const cx = (col - (totalCols - 1) / 2) * xSpacing + xOffset;
  const cz = (row - 0.5) * zSpacing;
  return [cx, 0, cz];
}

// ─── Deterministic RNG ────────────────────────────────────────────────────────

function rng(seed: string, idx: number): number {
  let h = 0xdeadbeef;
  const s = seed + String(idx);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

// ─── Colour palette ───────────────────────────────────────────────────────────

// Each layer maps to a neon accent colour
const LAYER_NEON: Record<LayerId, number> = {
  traffic:        0xff4d6a, // neon coral-red
  pollution:      0xb0ff4d, // acid green
  infrastructure: 0x4dfff3, // cyan
  population:     0xe04dff, // violet
  utilities:      0xffc14d, // amber-gold
};

function heatColor(t: number, invert = false): THREE.Color {
  const v = invert ? 1 - t : t;
  const lo = new THREE.Color(0x00ffaa); // vivid teal-green
  const mid = new THREE.Color(0xffe600); // vivid yellow
  const hi  = new THREE.Color(0xff2255); // vivid red
  const c   = new THREE.Color();
  if (v < 0.5) c.lerpColors(lo, mid, v * 2);
  else         c.lerpColors(mid, hi, (v - 0.5) * 2);
  return c;
}

function getLayerColor(layer: LayerId, sector: Sector): THREE.Color {
  switch (layer) {
    case "traffic":        return heatColor(sector.traffic / 100);
    case "pollution":      return heatColor(Math.min(1, sector.aqi / 300));
    case "infrastructure": return heatColor(sector.infrastructure_health / 100, true);
    case "population":     return heatColor(Math.min(1, sector.population / 140000));
    case "utilities":      return heatColor(Math.min(1, sector.energy_usage / 100));
  }
}

function getStatusColor(sector: Sector): THREE.Color {
  const s = getSectorStatus(sector);
  if (s === "Healthy")  return new THREE.Color(0x00ffaa);
  if (s === "Warning")  return new THREE.Color(0xffe600);
  return new THREE.Color(0xff2255);
}

// ─── Hexagon geometry helper ──────────────────────────────────────────────────

function hexagonShape(r: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// ─── Building specs ───────────────────────────────────────────────────────────

interface TowerSpec {
  x: number; z: number;
  w: number; d: number; h: number;
  type: "box" | "tapered" | "setback"; // architectural archetype
}

function generateTowers(sector: Sector): TowerSpec[] {
  const count  = 4 + Math.round((sector.population / 140000) * 12); // 4–16
  const maxH   = 2 + (sector.infrastructure_health / 100) * 12;      // 2–14
  const inner  = HEX_R * 0.78;
  const specs: TowerSpec[] = [];

  const archetypes: TowerSpec["type"][] = ["box", "tapered", "setback"];

  for (let i = 0; i < count; i++) {
    const rx = rng(sector.sector_id + "x", i);
    const rz = rng(sector.sector_id + "z", i);
    const rw = rng(sector.sector_id + "w", i);
    const rd = rng(sector.sector_id + "d", i);
    const rh = rng(sector.sector_id + "h", i);
    const rt = rng(sector.sector_id + "t", i);

    const w = 0.7 + rw * 1.6;
    const d = 0.7 + rd * 1.6;
    const h = 0.8 + rh * maxH;

    // place within hex inner circle
    const angle = rng(sector.sector_id + "a", i) * Math.PI * 2;
    const radius = rng(sector.sector_id + "r", i) * inner;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    specs.push({
      x, z, w, d, h,
      type: archetypes[Math.floor(rt * 3)],
    });
  }
  return specs;
}

// ─── Road segments ────────────────────────────────────────────────────────────

function hexEdgeRoads(r: number): Array<[THREE.Vector3, THREE.Vector3]> {
  const segs: Array<[THREE.Vector3, THREE.Vector3]> = [];
  // Spoke roads from centre to each hex vertex
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = r * 0.85 * Math.cos(a);
    const z = r * 0.85 * Math.sin(a);
    segs.push([new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(x, 0.06, z)]);
  }
  // Ring road at 55% radius
  const rr = r * 0.55;
  for (let i = 0; i < 6; i++) {
    const a0 = (Math.PI / 3) * i - Math.PI / 6;
    const a1 = (Math.PI / 3) * (i + 1) - Math.PI / 6;
    segs.push([
      new THREE.Vector3(rr * Math.cos(a0), 0.06, rr * Math.sin(a0)),
      new THREE.Vector3(rr * Math.cos(a1), 0.06, rr * Math.sin(a1)),
    ]);
  }
  return segs;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Glowing hexagonal platform */
function HexPlatform({
  r, color, selected, focused, onClick,
}: {
  r: number; color: THREE.Color; selected: boolean; focused: boolean;
  onClick: () => void;
}) {
  const platformRef = useRef<THREE.Mesh>(null!);
  const rimRef      = useRef<THREE.Mesh>(null!);
  const t           = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    if (rimRef.current) {
      const mat = rimRef.current.material as THREE.MeshBasicMaterial;
      const base = selected ? 1.0 : focused ? 0.85 : 0.45;
      mat.opacity = base + Math.sin(t.current * 2.5) * (focused ? 0.3 : 0.08);
    }
    if (platformRef.current) {
      const mat = platformRef.current.material as THREE.MeshStandardMaterial;
      const tgt = selected || focused ? 0.75 : 0.3;
      mat.opacity += (tgt - mat.opacity) * 0.08;
    }
  });

  const shape    = useMemo(() => hexagonShape(r), [r]);
  const extruded = useMemo(() => new THREE.ExtrudeGeometry(shape, {
    depth: 0.18, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2,
  }), [shape]);

  const rimShape = useMemo(() => {
    const outer = hexagonShape(r + 0.22);
    const inner = hexagonShape(r - 0.05);
    outer.holes.push(inner);
    return outer;
  }, [r]);
  const rimGeom = useMemo(() => new THREE.ShapeGeometry(rimShape), [rimShape]);

  return (
    <group rotation={[0, 0, 0]}>
      {/* Platform body */}
      <mesh
        ref={platformRef}
        geometry={extruded}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          transparent opacity={0.3}
          roughness={0.3} metalness={0.7}
          emissive={color} emissiveIntensity={0.15}
        />
      </mesh>

      {/* Glowing rim */}
      <mesh
        ref={rimRef}
        geometry={rimGeom}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.2, 0]}
      >
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Invisible large click target over the whole hex */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <circleGeometry args={[r * 0.95, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Glowing road network */
function RoadNetwork({ color }: { color: THREE.Color }) {
  const geom = useMemo(() => {
    const segs = hexEdgeRoads(HEX_R);
    const pts: number[] = [];
    for (const [a, b] of segs) {
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={color} transparent opacity={0.65} linewidth={1} />
    </lineSegments>
  );
}

/** Animated data-stream particle flowing along a road spoke */
function DataStream({ color, spoke }: { color: THREE.Color; spoke: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const angle = (Math.PI / 3) * spoke - Math.PI / 6;
  const endX  = HEX_R * 0.82 * Math.cos(angle);
  const endZ  = HEX_R * 0.82 * Math.sin(angle);
  const speed = 0.6 + spoke * 0.07;
  const offset = spoke * 0.28;

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime * speed + offset) % 1);
    ref.current.position.set(endX * t, 0.18, endZ * t);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.sin(t * Math.PI) * 0.9;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

/** Single tower with one of three architectural archetypes */
function Tower({
  spec, color, selected,
}: {
  spec: TowerSpec; color: THREE.Color; selected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Window glow flicker
  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = (selected ? 0.7 : 0.35) +
      Math.sin(state.clock.elapsedTime * 1.2 + spec.x) * 0.08;
  });

  const { x, z, w, d, h, type } = spec;

  if (type === "tapered") {
    // Pyramid-tapered tower: wide base, narrow top
    const geom = useMemo(() => {
      const g = new THREE.CylinderGeometry(w * 0.25, w * 0.55, h, 4);
      return g;
    }, [w, h]);
    return (
      <mesh ref={meshRef} geometry={geom} position={[x, h / 2, z]} castShadow>
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.35}
          roughness={0.2} metalness={0.8} transparent opacity={0.92}
        />
      </mesh>
    );
  }

  if (type === "setback") {
    // Two-tier setback tower
    return (
      <group position={[x, 0, z]}>
        <mesh ref={meshRef} position={[0, h * 0.3, 0]} castShadow>
          <boxGeometry args={[w, h * 0.6, d]} />
          <meshStandardMaterial
            color={color} emissive={color} emissiveIntensity={0.35}
            roughness={0.15} metalness={0.85} transparent opacity={0.9}
          />
        </mesh>
        <mesh position={[0, h * 0.78, 0]} castShadow>
          <boxGeometry args={[w * 0.55, h * 0.45, d * 0.55]} />
          <meshStandardMaterial
            color={color} emissive={color} emissiveIntensity={0.5}
            roughness={0.1} metalness={0.9} transparent opacity={0.88}
          />
        </mesh>
      </group>
    );
  }

  // Default: simple box tower
  return (
    <mesh ref={meshRef} position={[x, h / 2, z]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color} emissive={color} emissiveIntensity={selected ? 0.7 : 0.35}
        roughness={0.2} metalness={0.8} transparent opacity={0.9}
      />
    </mesh>
  );
}

/** Atmospheric halo dome above a district */
function AtmosphericHalo({
  color, intensity,
}: {
  color: THREE.Color; intensity: number; // 0–1
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      intensity * 0.18 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 5, 0]}>
      <sphereGeometry args={[HEX_R * 0.9, 16, 16]} />
      <meshBasicMaterial
        color={color} transparent opacity={intensity * 0.18}
        depthWrite={false} side={THREE.BackSide}
      />
    </mesh>
  );
}

/** Floating district name + ID */
function DistrictLabel({ name, id, h, selected }: {
  name: string; id: string; h: number; selected: boolean;
}) {
  return (
    <group position={[0, h + 1.4, 0]}>
      <Text fontSize={0.72} color={selected ? "#ffffff" : "#e2e8f0"}
        anchorX="center" anchorY="bottom"
        outlineWidth={0.07} outlineColor="#000814">
        {name}
      </Text>
      <Text position={[0, -0.85, 0]} fontSize={0.42}
        color={selected ? "#93c5fd" : "#64748b"}
        anchorX="center" anchorY="bottom"
        outlineWidth={0.04} outlineColor="#000814">
        {id}
      </Text>
    </group>
  );
}

// ─── Single District ──────────────────────────────────────────────────────────

function District({
  sector, layer, position, selected, focused, onSelect,
}: {
  sector: Sector; layer: LayerId;
  position: [number, number, number];
  selected: boolean; focused: boolean;
  onSelect: (id: string) => void;
}) {
  const lColor  = useMemo(() => getLayerColor(layer, sector), [layer, sector.sector_id]);
  const sColor  = useMemo(() => getStatusColor(sector),       [sector.sector_id]);
  const towers  = useMemo(() => generateTowers(sector),       [sector.sector_id]);
  const maxH    = towers.reduce((m, t) => Math.max(m, t.h), 0);

  // Atmospheric halo intensity driven by layer metric
  const haloIntensity = useMemo(() => {
    switch (layer) {
      case "pollution":      return Math.min(1, sector.aqi / 250);
      case "traffic":        return Math.min(1, sector.traffic / 100);
      case "infrastructure": return 1 - sector.infrastructure_health / 100;
      case "population":     return Math.min(1, sector.population / 140000);
      case "utilities":      return Math.min(1, sector.energy_usage / 100);
    }
  }, [layer, sector.sector_id]);

  const rimColor  = selected || focused ? new THREE.Color(0xffffff) : lColor;

  return (
    <group position={position}>
      <HexPlatform
        r={HEX_R} color={lColor}
        selected={selected} focused={focused}
        onClick={() => onSelect(sector.sector_id)}
      />

      <RoadNetwork color={lColor.clone().multiplyScalar(1.6)} />

      {/* Animated data streams on 3 spokes */}
      {[0, 2, 4].map((spoke) => (
        <DataStream key={spoke} color={lColor} spoke={spoke} />
      ))}

      <AtmosphericHalo color={lColor} intensity={haloIntensity} />

      {towers.map((spec, i) => (
        <Tower key={i} spec={spec} color={lColor} selected={selected || focused} />
      ))}

      <DistrictLabel name={sector.sector_name} id={sector.sector_id}
        h={maxH} selected={selected || focused} />
    </group>
  );
}

// ─── City base plane + grid ───────────────────────────────────────────────────

function CityFloor({ extent }: { extent: number }) {
  const geom = useMemo(() => {
    const step = 3;
    const half = extent / 2;
    const pts: number[] = [];
    for (let v = -half; v <= half; v += step) {
      pts.push(-half, 0.01, v,  half, 0.01, v);
      pts.push(v, 0.01, -half,  v, 0.01, half);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [extent]);

  return (
    <>
      {/* Dark ocean base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[extent, extent]} />
        <meshStandardMaterial color={0x060d1a} roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Neon grid */}
      <lineSegments geometry={geom}>
        <lineBasicMaterial color={0x0a2040} transparent opacity={0.7} />
      </lineSegments>
    </>
  );
}

// ─── Camera focus ─────────────────────────────────────────────────────────────

function CameraFocuser({
  target, active,
}: {
  target: [number, number, number] | null; active: boolean;
}) {
  const { camera } = useThree();
  useEffect(() => {
    if (!active || !target) return;
    const [tx, , tz] = target;
    camera.position.set(tx + 2, 20, tz + 20);
    (camera as THREE.PerspectiveCamera).lookAt(new THREE.Vector3(tx, 0, tz));
  }, [target, active]);
  return null;
}

// ─── Ambient city glow on the floor ──────────────────────────────────────────

function FloorGlow({ sectors, layer }: { sectors: Sector[]; layer: LayerId }) {
  // One large point light per district, coloured by its layer metric
  return (
    <>
      {sectors.map((s, i) => {
        const pos = hexPosition(i);
        const col = getLayerColor(layer, s);
        return (
          <pointLight
            key={s.sector_id}
            position={[pos[0], 0.5, pos[2]]}
            color={col}
            intensity={12}
            distance={HEX_R * 1.6}
            decay={2}
          />
        );
      })}
    </>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function CityScene({
  sectors, layer, selectedId, focusedId, onSelect,
}: {
  sectors: Sector[]; layer: LayerId;
  selectedId: string | null; focusedId: string | null;
  onSelect: (id: string) => void;
}) {
  const positions = useMemo(
    () => sectors.map((_, i) => hexPosition(i)),
    [sectors.length],
  );

  const extent = HEX_COLS * HEX_R * 3 + 30;

  const focusTarget = useMemo<[number, number, number] | null>(() => {
    if (!focusedId) return null;
    const idx = sectors.findIndex((s) => s.sector_id === focusedId);
    return idx >= 0 ? positions[idx] : null;
  }, [focusedId, sectors, positions]);

  return (
    <>
      {/* ── Lighting ── */}
      {/* Very low ambient — the neon lights do the work */}
      <ambientLight intensity={0.12} color={0x0a1830} />
      {/* Moon-like cool key light */}
      <directionalLight
        position={[30, 60, 20]} intensity={0.7} color={0xc8d8ff}
        castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-near={1} shadow-camera-far={120}
        shadow-camera-left={-60} shadow-camera-right={60}
        shadow-camera-top={60} shadow-camera-bottom={-60}
      />
      {/* Soft fill to keep back faces legible */}
      <directionalLight position={[-20, 15, -30]} intensity={0.25} color={0x6080c0} />

      {/* ── Background ── */}
      <Stars radius={120} depth={40} count={2500} factor={3} fade speed={0.4} />
      {/* Deep space colour wash */}
      <color attach="background" args={["#020b18"]} />
      <fog attach="fog" args={["#020b18", 55, 120]} />

      {/* ── City floor ── */}
      <CityFloor extent={extent} />
      <FloorGlow sectors={sectors} layer={layer} />

      {/* ── Districts ── */}
      {sectors.map((s, i) => (
        <District
          key={s.sector_id}
          sector={s}
          layer={layer}
          position={positions[i]}
          selected={selectedId === s.sector_id}
          focused={focusedId === s.sector_id}
          onSelect={onSelect}
        />
      ))}

      {/* ── Interaction ── */}
      <CameraFocuser target={focusTarget} active={focusedId !== null} />
      <OrbitControls
        enablePan enableZoom enableRotate
        minDistance={8} maxDistance={90}
        maxPolarAngle={Math.PI / 2.1}
        makeDefault
      />
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function CityCanvas({ sectors, layer, selectedId, focusedId, onSelect }: CityCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 32, 38], fov: 42 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
    >
      <CityScene
        sectors={sectors}
        layer={layer}
        selectedId={selectedId}
        focusedId={focusedId}
        onSelect={onSelect}
      />
    </Canvas>
  );
}
