import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Card = {
  id: string
  value: string
  image: string
  isMatched: boolean
  isFlipped: boolean
}

type Mode = {
  label: string
  pairs: number
  columns: number
}

import ink1 from './assets/cards/ink-1.png'
import ink2 from './assets/cards/ink-2.png'
import ink3 from './assets/cards/ink-3.png'
import ink4 from './assets/cards/ink-4.png'
import ink5 from './assets/cards/ink-5.png'
import ink6 from './assets/cards/ink-6.png'
import ink7 from './assets/cards/ink-7.png'
import ink8 from './assets/cards/ink-8.png'

const SYMBOLS = [
  { id: 'ink-1', label: 'Ink 1', image: ink1 },
  { id: 'ink-2', label: 'Ink 2', image: ink2 },
  { id: 'ink-3', label: 'Ink 3', image: ink3 },
  { id: 'ink-4', label: 'Ink 4', image: ink4 },
  { id: 'ink-5', label: 'Ink 5', image: ink5 },
  { id: 'ink-6', label: 'Ink 6', image: ink6 },
  { id: 'ink-7', label: 'Ink 7', image: ink7 },
  { id: 'ink-8', label: 'Ink 8', image: ink8 }
]

const MODES: Mode[] = [{ label: '4×4 (8 pairs)', pairs: 8, columns: 4 }]

const createDeck = (pairs: number): Card[] => {
  const picks = SYMBOLS.slice(0, pairs)
  const cards = [...picks, ...picks].map((value, index) => ({
    id: `${value.id}-${index}-${crypto.randomUUID()}`,
    value: value.label,
    image: value.image,
    isMatched: false,
    isFlipped: false
  }))

  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }

  return cards
}

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getBestKey = (pairs: number, metric: 'time' | 'moves') =>
  `matchPairs.best.${pairs}.${metric}`

function App() {
  const mode = MODES[0]
  const [deck, setDeck] = useState<Card[]>(() => createDeck(MODES[0].pairs))
  const [firstPick, setFirstPick] = useState<Card | null>(null)
  const [secondPick, setSecondPick] = useState<Card | null>(null)
  const [moves, setMoves] = useState(0)
  const [lockBoard, setLockBoard] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [bestMoves, setBestMoves] = useState<number | null>(null)
  const [bestTime, setBestTime] = useState<number | null>(null)
  const [phase, setPhase] = useState<'idle' | 'preview' | 'countdown' | 'playing' | 'won'>(
    'idle'
  )
  const [countdown, setCountdown] = useState(3)
  const timeoutsRef = useRef<number[]>([])

  const matches = useMemo(
    () => deck.filter((card) => card.isMatched).length / 2,
    [deck]
  )

  const totalPairs = mode.pairs
  const gameWon = matches === totalPairs && deck.length > 0
  const isPlaying = phase === 'playing'

  useEffect(() => {
    const storedMoves = localStorage.getItem(getBestKey(mode.pairs, 'moves'))
    const storedTime = localStorage.getItem(getBestKey(mode.pairs, 'time'))
    setBestMoves(storedMoves ? Number(storedMoves) : null)
    setBestTime(storedTime ? Number(storedTime) : null)
  }, [mode.pairs])

  useEffect(() => {
    if (!startedAt || gameWon) return
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [startedAt, gameWon])

  useEffect(() => {
    if (!gameWon) return
    setPhase('won')
    if (bestMoves === null || moves < bestMoves) {
      localStorage.setItem(getBestKey(mode.pairs, 'moves'), String(moves))
      setBestMoves(moves)
    }
    if (bestTime === null || elapsed < bestTime) {
      localStorage.setItem(getBestKey(mode.pairs, 'time'), String(elapsed))
      setBestTime(elapsed)
    }
  }, [gameWon, moves, elapsed, bestMoves, bestTime, mode.pairs])

  useEffect(() => {
    if (!firstPick || !secondPick) return
    setLockBoard(true)
    const isMatch = firstPick.value === secondPick.value

    window.setTimeout(() => {
      setDeck((prev) =>
        prev.map((card) => {
          if (card.id === firstPick.id || card.id === secondPick.id) {
            return {
              ...card,
              isMatched: isMatch ? true : card.isMatched,
              isFlipped: isMatch ? true : false
            }
          }
          return card
        })
      )

      setFirstPick(null)
      setSecondPick(null)
      setLockBoard(false)
      setMoves((prev) => prev + 1)
    }, isMatch ? 300 : 700)
  }, [firstPick, secondPick])

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    timeoutsRef.current = []
  }

  const handlePlay = () => {
    clearTimers()
    const freshDeck = createDeck(mode.pairs)
    setDeck(freshDeck)
    setFirstPick(null)
    setSecondPick(null)
    setMoves(0)
    setLockBoard(true)
    setStartedAt(null)
    setElapsed(0)
    setPhase('preview')
    setCountdown(3)

    const stagger = 80
    freshDeck.forEach((card, index) => {
      const id = window.setTimeout(() => {
        setDeck((prev) =>
          prev.map((item) =>
            item.id === card.id ? { ...item, isFlipped: true } : item
          )
        )
      }, index * stagger)
      timeoutsRef.current.push(id)
    })

    const revealDuration = freshDeck.length * stagger + 300
    const countdownStartId = window.setTimeout(() => {
      setPhase('countdown')
      setCountdown(3)
      const tickIds = [1, 2].map((step) =>
        window.setTimeout(() => {
          setCountdown(3 - step)
        }, step * 1000)
      )
      timeoutsRef.current.push(...tickIds)

      const startId = window.setTimeout(() => {
        setDeck((prev) =>
          prev.map((item) => ({
            ...item,
            isFlipped: item.isMatched ? true : false
          }))
        )
        setPhase('playing')
        setLockBoard(false)
        setStartedAt(Date.now())
        setCountdown(0)
      }, 3000)
      timeoutsRef.current.push(startId)
    }, revealDuration)
    timeoutsRef.current.push(countdownStartId)
  }

  const handleFlip = (card: Card) => {
    if (phase !== 'playing' || lockBoard || card.isFlipped || card.isMatched)
      return

    setDeck((prev) =>
      prev.map((item) =>
        item.id === card.id ? { ...item, isFlipped: true } : item
      )
    )

    if (!firstPick) {
      setFirstPick({ ...card, isFlipped: true })
    } else if (!secondPick) {
      setSecondPick({ ...card, isFlipped: true })
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Tattoo Match Pairs</h1>
        </div>
        <div className="credits">
          <a
            href="https://www.instagram.com/atelieetattooart/"
            target="_blank"
            rel="noreferrer"
            className="app__link"
          >
            ✒️ by Eden
          </a>
          <a
            href="https://vitam.me/"
            target="_blank"
            rel="noreferrer"
            className="app__link"
          >
            🛠️ by Vitam
          </a>
        </div>
      </header>

      <section className="controls">
        <button className="button" onClick={handlePlay}>
          {isPlaying ? 'Restart' : 'Play'}
        </button>
        <div className="controls__stats">
          <div className="stat">
            <span className="stat__label">Time</span>
            <span className="stat__value">{formatTime(elapsed)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Moves</span>
            <span className="stat__value">{moves}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Matched</span>
            <span className="stat__value">
              {matches}/{totalPairs}
            </span>
          </div>
        </div>
        <div className="controls__best">
          <div>
            <span className="controls__label">Best time</span>
            <span className="controls__value">
              {bestTime === null ? '—' : formatTime(bestTime)}
            </span>
          </div>
          <div>
            <span className="controls__label">Best moves</span>
            <span className="controls__value">
              {bestMoves ?? '—'}
            </span>
          </div>
        </div>
      </section>

      <section
        className="board"
        style={{ gridTemplateColumns: `repeat(${mode.columns}, minmax(0, 1fr))` }}
      >
        {phase === 'countdown' && (
          <div className="countdown" aria-live="polite">
            {countdown}
          </div>
        )}
        {deck.map((card) => (
          <button
            key={card.id}
            className={`card ${card.isFlipped || card.isMatched ? 'card--flipped' : ''}`}
            onClick={() => handleFlip(card)}
            aria-label="Flip card"
          >
            <span className="card__face card__face--front">
              <img
                src={card.image}
                alt={card.value}
                className="card__image"
              />
            </span>
            <span className="card__face card__face--back">✒️</span>
          </button>
        ))}
      </section>

    </div>
  )
}

export default App
