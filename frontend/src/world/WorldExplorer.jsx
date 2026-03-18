import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useAmbientAudio } from '../hooks/useAmbientAudio'
import { useReducedMotion } from '../hooks/useReducedMotion'

function terrainColor(sentiment) {
  if (sentiment === 'NEGATIVE') return '#e36a48'
  if (sentiment === 'POSITIVE') return '#5ad495'
  return '#76bcd9'
}

function formationPosition(item) {
  const x = (Number(item.lon || 0) / 180) * 55
  const z = (Number(item.lat || 0) / 90) * 55
  return [x, z]
}

function TerrainMesh() {
  const geom = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(150, 150, 70, 70)
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const d = Math.sqrt(x * x + y * y)
      const ripple = Math.sin(d * 0.25) * 1.1
      const wave = Math.cos(x * 0.1) * 0.8 + Math.sin(y * 0.12) * 0.8
      pos.setZ(i, ripple + wave)
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  return (
    <mesh geometry={geom} rotation-x={-Math.PI / 2} receiveShadow>
      <meshStandardMaterial color="#24444e" roughness={0.92} metalness={0.05} />
    </mesh>
  )
}

function FormationMeshes({ formations }) {
  const meadows = useMemo(
    () => formations.filter((f) => f.sentiment_label === 'POSITIVE').slice(0, 220),
    [formations]
  )
  const negatives = useMemo(
    () => formations.filter((f) => f.sentiment_label === 'NEGATIVE').slice(0, 220),
    [formations]
  )
  const neutral = useMemo(
    () =>
      formations
        .filter((f) => f.sentiment_label !== 'POSITIVE' && f.sentiment_label !== 'NEGATIVE')
        .slice(0, 220),
    [formations]
  )

  return (
    <>
      <InstancedFormationGroup items={meadows} color="#5ad495" />
      <InstancedFormationGroup items={negatives} color="#e36a48" />
      <InstancedFormationGroup items={neutral} color="#76bcd9" />
      {formations.slice(0, 220).map((item) => {
        const [x, z] = formationPosition(item)
        const h = Math.max(2, Math.min(24, Number(item.elevation || 10) * 0.18))
        return (
          <mesh key={`light-${item.id || `${x}-${z}`}`} position={[x, h + 0.22, z]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#d8fbff" emissive="#98fbff" emissiveIntensity={0.72} />
          </mesh>
        )
      })}
    </>
  )
}

function InstancedFormationGroup({ items, color }) {
  const ref = useRef()
  const temp = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!ref.current) return
    items.forEach((item, i) => {
      const [x, z] = formationPosition(item)
      const h = Math.max(2, Math.min(24, Number(item.elevation || 10) * 0.18))
      const r = Math.max(0.8, Math.min(4, h * 0.18))
      temp.position.set(x, h / 2, z)
      temp.scale.set(r, h, r)
      temp.updateMatrix()
      ref.current.setMatrixAt(i, temp.matrix)
    })
    ref.current.count = items.length
    ref.current.instanceMatrix.needsUpdate = true
  }, [items, temp])

  if (!items.length) return null

  return (
    <instancedMesh ref={ref} args={[null, null, items.length]} castShadow>
      <cylinderGeometry args={[0.65, 1, 1, 10]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.12} />
    </instancedMesh>
  )
}

function AtmosphereController({ lightRef, reducedMotion, mood }) {
  const { scene } = useThree()

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime * (mood === 'pulse' ? 0.18 : 0.08)
    const hue = mood === 'pulse' ? 0.57 + Math.sin(t) * 0.03 : 0.56 + Math.sin(t) * 0.012
    const sat = mood === 'pulse' ? 0.48 : 0.38
    const lum = 0.17 + (mood === 'pulse' ? Math.sin(t * 1.2) * 0.03 : Math.sin(t * 0.5) * 0.01)
    const nextColor = new THREE.Color().setHSL(hue, sat, lum)

    scene.fog.color.copy(nextColor)
    scene.background = nextColor

    if (lightRef.current) {
      lightRef.current.intensity = mood === 'pulse' ? 1.25 + Math.sin(t * 1.7) * 0.22 : 1.0 + Math.sin(t * 0.8) * 0.07
    }
  })

  return null
}

function AtmosphereParticles({ reducedMotion }) {
  const pointsRef = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(1200)
    for (let i = 0; i < 400; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 160
      arr[i * 3 + 1] = Math.random() * 42 + 6
      arr[i * 3 + 2] = (Math.random() - 0.5) * 160
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (reducedMotion || !pointsRef.current) return
    pointsRef.current.rotation.y = clock.elapsedTime * 0.02
  })

  if (reducedMotion) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.45} color="#8fd0e4" transparent opacity={0.26} />
    </points>
  )
}

function PlayerController({ bounds = 65, isMobile = false, mobileMove = { x: 0, z: 0 } }) {
  const { camera } = useThree()
  const keys = useRef({})

  useEffect(() => {
    const onDown = (event) => {
      keys.current[event.code] = true
    }
    const onUp = (event) => {
      keys.current[event.code] = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useFrame((_, delta) => {
    const state = keys.current
    const keyboardX = (state.KeyD ? 1 : 0) - (state.KeyA ? 1 : 0)
    const keyboardZ = (state.KeyW ? 1 : 0) - (state.KeyS ? 1 : 0)

    const inputX = keyboardX + Number(mobileMove.x || 0)
    const inputZ = keyboardZ + Number(mobileMove.z || 0)
    const speed = state.ShiftLeft ? 20 : (isMobile ? 8 : 11)

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    const move = new THREE.Vector3()

    if (inputZ > 0) move.add(forward)
    if (inputZ < 0) move.sub(forward)
    if (inputX > 0) move.add(right)
    if (inputX < 0) move.sub(right)

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta)
      camera.position.add(move)
    }

    camera.position.y = isMobile ? 4 : 3
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -bounds, bounds)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -bounds, bounds)
  })

  if (isMobile) return null
  return <PointerLockControls />
}

function TouchPad({ onChange }) {
  function setDir(x, z) {
    onChange({ x, z })
  }

  return (
    <div className="touch-pad">
      <button
        type="button"
        className="touch-btn"
        onTouchStart={() => setDir(0, 1)}
        onTouchEnd={() => setDir(0, 0)}
        onMouseDown={() => setDir(0, 1)}
        onMouseUp={() => setDir(0, 0)}
      >
        ?
      </button>
      <div className="touch-row">
        <button
          type="button"
          className="touch-btn"
          onTouchStart={() => setDir(-1, 0)}
          onTouchEnd={() => setDir(0, 0)}
          onMouseDown={() => setDir(-1, 0)}
          onMouseUp={() => setDir(0, 0)}
        >
          ?
        </button>
        <button
          type="button"
          className="touch-btn"
          onTouchStart={() => setDir(1, 0)}
          onTouchEnd={() => setDir(0, 0)}
          onMouseDown={() => setDir(1, 0)}
          onMouseUp={() => setDir(0, 0)}
        >
          ?
        </button>
      </div>
      <button
        type="button"
        className="touch-btn"
        onTouchStart={() => setDir(0, -1)}
        onTouchEnd={() => setDir(0, 0)}
        onMouseDown={() => setDir(0, -1)}
        onMouseUp={() => setDir(0, 0)}
      >
        ?
      </button>
    </div>
  )
}

function MiniMap({ formations }) {
  return (
    <div className="minimap">
      <div className="minimap-grid" />
      {formations.slice(0, 250).map((item) => {
        const x = ((Number(item.lon || 0) + 180) / 360) * 100
        const y = ((Number(item.lat || 0) + 90) / 180) * 100
        return (
          <span
            key={`map-${item.id || `${x}-${y}`}`}
            className="minimap-dot"
            style={{ left: `${x}%`, top: `${100 - y}%`, background: terrainColor(item.sentiment_label) }}
          />
        )
      })}
    </div>
  )
}

export default function WorldExplorer({ formations, unreadCount, realtimeStatus, isMobile = false }) {
  const [hintVisible, setHintVisible] = useState(true)
  const [mood, setMood] = useState('calm')
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [mobileMove, setMobileMove] = useState({ x: 0, z: 0 })
  const reducedMotion = useReducedMotion()
  const cappedFormations = useMemo(() => formations.slice(0, isMobile ? 280 : 660), [formations, isMobile])
  const sunlightRef = useRef(null)
  const { supported: audioSupported } = useAmbientAudio({ enabled: audioEnabled, mood })

  useEffect(() => {
    if (reducedMotion) {
      setMood('calm')
    }
  }, [reducedMotion])

  return (
    <div className="world-shell">
      <Canvas shadows dpr={isMobile ? [0.8, 1.1] : [1, 1.5]} camera={{ position: [0, isMobile ? 4 : 3, isMobile ? 20 : 16], fov: isMobile ? 68 : 63 }}>
        <color attach="background" args={['#0b1f26']} />
        <fog attach="fog" args={['#0b1f26', 20, 125]} />
        <ambientLight intensity={0.45} />
        <directionalLight
          ref={sunlightRef}
          position={[25, 34, 10]}
          intensity={1.05}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <Sky distance={450000} sunPosition={[1, 0.22, 0.04]} inclination={0.56} azimuth={0.1} turbidity={9.5} />
        <AtmosphereParticles reducedMotion={reducedMotion} />
        <AtmosphereController lightRef={sunlightRef} reducedMotion={reducedMotion} mood={mood} />
        <TerrainMesh />
        <FormationMeshes formations={cappedFormations} />
        <PlayerController isMobile={isMobile} mobileMove={mobileMove} />
        {isMobile ? <OrbitControls enablePan={false} enableZoom={true} maxPolarAngle={1.45} minDistance={8} maxDistance={34} /> : null}
      </Canvas>

      <div className="world-overlay">
        <div className="world-chip">Realtime: {realtimeStatus}</div>
        <div className="world-chip">Unread: {unreadCount}</div>
        <div className="world-chip">Formations: {cappedFormations.length}</div>
        <div className="world-chip">Motion: {reducedMotion ? 'Reduced' : 'Full'}</div>
      </div>

      <div className="world-controls">
        <button
          className="btn world-mini-btn"
          type="button"
          onClick={() => setMood((prev) => (prev === 'calm' ? 'pulse' : 'calm'))}
          disabled={reducedMotion}
        >
          Mood: {mood}
        </button>
        <button
          className="btn world-mini-btn"
          type="button"
          onClick={() => setAudioEnabled((prev) => !prev)}
          disabled={!audioSupported}
        >
          Ambient Audio: {audioEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {hintVisible ? (
        <button className="world-hint" type="button" onClick={() => setHintVisible(false)}>
          {isMobile ? 'Use touch arrows + drag to explore on mobile.' : 'Click scene to lock cursor, then use WASD + Shift to explore.'}
        </button>
      ) : null}

      {isMobile ? <TouchPad onChange={setMobileMove} /> : null}

      <MiniMap formations={cappedFormations} />
    </div>
  )
}
