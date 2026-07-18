import { useState, useEffect, useRef, useCallback } from "react"
import TypingBox from "./TypingBox"
import Header from "./Header"
import words from "../Data/words"
import quotes from "../Data/quotes"
import codeSnippets from "../Data/codeSnippets"

// Helper functions for random generation
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateWords(count) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push(getRandom(words))
  }
  return arr
}

function generateQuote(lengthType) {
  let filtered = quotes
  if (lengthType === "short") {
    filtered = quotes.filter(q => q.length < 80)
  } else if (lengthType === "medium") {
    filtered = quotes.filter(q => q.length >= 80 && q.length < 160)
  } else if (lengthType === "long") {
    filtered = quotes.filter(q => q.length >= 160)
  }
  if (filtered.length === 0) filtered = quotes
  return getRandom(filtered).split(" ")
}

function generateCode() {
  return getRandom(codeSnippets).split(" ")
}

const MODE_OPTIONS = [
  { id: "time", label: "time" },
  { id: "words", label: "words" },
  { id: "quote", label: "quote" },
  { id: "code", label: "code" }
]

const SUBMODE_CONFIGS = {
  time: [
    { value: 15, label: "15" },
    { value: 30, label: "30" },
    { value: 60, label: "60" },
    { value: 120, label: "120" }
  ],
  words: [
    { value: 10, label: "10" },
    { value: 25, label: "25" },
    { value: 50, label: "50" },
    { value: 100, label: "100" }
  ],
  quote: [
    { value: "short", label: "short" },
    { value: "medium", label: "medium" },
    { value: "long", label: "long" }
  ],
  code: [
    { value: "all", label: "all" }
  ]
}

function RaceScreen({ theme, setTheme, font, setFont, soundEnabled, setSoundEnabled, onFinish, repeatWordList, repeatHistory, clearRepeat, currentUser, onProfileClick, mode, setMode, submode, setSubmode }) {
  // Test Settings are now passed as props from parent to prevent resetting on screen navigation
  
  // Test States
  const [wordList, setWordList] = useState([])
  const [typedWords, setTypedWords] = useState([])
  const [currentInput, setCurrentInput] = useState("")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [secElapsed, setSecElapsed] = useState(0)
  
  // Theme and Font dropdown states and refs
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false)
  const themeMenuRef = useRef(null)
  const fontMenuRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false)
      }
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target)) {
        setIsFontMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Graph tracking
  const chartDataRef = useRef([])
  const errorCountThisSec = useRef(0)
  
  // Keystrokes stats
  const totalKeystrokes = useRef(0)
  const correctKeystrokes = useRef(0)
  const timerRef = useRef(null)
  const timerStartedRef = useRef(false)
  const stateRef = useRef({ typedWords: [], currentWordIndex: 0, currentInput: "" })

  // Ghost caret playback state & refs
  const testStartTimeRef = useRef(null)
  const keystrokeHistoryRef = useRef([])
  const ghostTimerRef = useRef(null)
  const [ghostPosition, setGhostPosition] = useState(null)

  // Helper to record typing progress for repeat ghost playback
  const recordProgress = (customInput = null, customWordIdx = null) => {
    if (!testStartTimeRef.current) return
    const elapsed = Date.now() - testStartTimeRef.current
    const activeIdx = customWordIdx !== null ? customWordIdx : stateRef.current.currentWordIndex
    const activeInput = customInput !== null ? customInput : stateRef.current.currentInput
    keystrokeHistoryRef.current.push({
      time: elapsed,
      wIdx: activeIdx,
      cIdx: activeInput.length
    })
  }

  // Sync stateRef on state updates
  useEffect(() => {
    stateRef.current = { typedWords, currentWordIndex, currentInput }
  }, [typedWords, currentWordIndex, currentInput])

  // Initialize word list based on active configurations
  const initializeTest = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = null
    if (ghostTimerRef.current) {
      clearInterval(ghostTimerRef.current)
      ghostTimerRef.current = null
    }
    setGhostPosition(null)
    timerStartedRef.current = false
    
    setStarted(false)
    setFinished(false)
    setSecElapsed(0)
    chartDataRef.current = []
    setCurrentInput("")
    setTypedWords([])
    setCurrentWordIndex(0)

    stateRef.current = { typedWords: [], currentWordIndex: 0, currentInput: "" }
    
    totalKeystrokes.current = 0
    correctKeystrokes.current = 0
    errorCountThisSec.current = 0
    testStartTimeRef.current = null
    keystrokeHistoryRef.current = []

    let list = []
    if (repeatWordList && repeatWordList.length > 0) {
      list = [...repeatWordList]
    } else {
      if (mode === "time") {
        // time mode generates 200 words (more than enough for 2 min test)
        list = generateWords(200)
      } else if (mode === "words") {
        list = generateWords(parseInt(submode) || 50)
      } else if (mode === "quote") {
        list = generateQuote(submode)
      } else if (mode === "code") {
        list = generateCode()
      }
    }
    setWordList(list)
  }, [mode, submode, repeatWordList])

  // Sync test initializers
  useEffect(() => {
    initializeTest()
  }, [initializeTest])

  // Clean up timers
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (ghostTimerRef.current) {
        clearInterval(ghostTimerRef.current)
      }
    }
  }, [])

  // Start the ticking interval
  const startTimer = () => {
    setStarted(true)
    testStartTimeRef.current = Date.now()
    
    timerRef.current = setInterval(() => {
      setSecElapsed(prev => {
        const nextSec = prev + 1
        
        // Calculate correct characters so far using stateRef
        let correctChars = 0
        const { typedWords: activeTyped, currentWordIndex: activeIdx, currentInput: activeInput } = stateRef.current
        
        // Correct characters from completed words
        activeTyped.forEach((typedW, idx) => {
          const targetW = wordList[idx]
          if (!targetW) return
          for (let i = 0; i < typedW.length; i++) {
            if (typedW[i] === targetW[i]) correctChars++
          }
          // Add 1 character count for spacing if word typed matches target exactly
          if (typedW === targetW) correctChars++
        })
        
        // Correct characters from active typing word
        const activeTarget = wordList[activeIdx] || ""
        for (let i = 0; i < activeInput.length; i++) {
          if (activeInput[i] === activeTarget[i]) correctChars++
        }

        const minutes = nextSec / 60
        const currentWpm = minutes > 0 ? Math.round((correctChars / 5) / minutes) : 0
        const currentRawWpm = minutes > 0 ? Math.round((totalKeystrokes.current / 5) / minutes) : 0
        
        const errors = errorCountThisSec.current
        errorCountThisSec.current = 0

        // Append to chart points
        chartDataRef.current.push({
          sec: nextSec,
          wpm: currentWpm,
          rawWpm: currentRawWpm,
          errors
        })

        // Time limit reached
        if (mode === "time" && nextSec >= parseInt(submode)) {
          clearInterval(timerRef.current)
          handleTestFinished(nextSec, correctChars)
          return nextSec
        }

        return nextSec
      })
    }, 1000)

    // Ghost/pace caret playback loop
    if (repeatHistory && repeatHistory.length > 0) {
      clearInterval(ghostTimerRef.current)
      ghostTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - testStartTimeRef.current
        let match = null
        for (let i = 0; i < repeatHistory.length; i++) {
          if (repeatHistory[i].time <= elapsed) {
            match = repeatHistory[i]
          } else {
            break
          }
        }
        if (match) {
          setGhostPosition({ wIdx: match.wIdx, cIdx: match.cIdx })
        }
      }, 30)
    }
  }

  // Trigger test completion
  const handleTestFinished = (finalTime, finalCorrectChars) => {
    setFinished(true)
    clearInterval(timerRef.current)
    if (ghostTimerRef.current) {
      clearInterval(ghostTimerRef.current)
      ghostTimerRef.current = null
    }
    setGhostPosition(null)

    // Calculate final metrics
    const finalSecs = finalTime || secElapsed || 1
    const minutes = finalSecs / 60
    const finalWpm = Math.round((finalCorrectChars / 5) / minutes)
    const finalRawWpm = Math.round((totalKeystrokes.current / 5) / minutes)
    const finalAccuracy = totalKeystrokes.current > 0
      ? Math.round((correctKeystrokes.current / totalKeystrokes.current) * 100)
      : 100

    // Calculate consistency based on second-by-second WPM values
    let finalConsistency = 80 // fallback
    if (chartDataRef.current.length > 1) {
      const wpms = chartDataRef.current.map(c => c.wpm)
      const avgWpm = wpms.reduce((a, b) => a + b, 0) / wpms.length
      
      if (avgWpm > 0) {
        // Standard Deviation
        const squaredDiffs = wpms.map(w => Math.pow(w - avgWpm, 2))
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
        const stdDev = Math.sqrt(variance)
        
        finalConsistency = Math.max(0, Math.min(100, Math.round(100 - (stdDev / avgWpm) * 100)))
      }
    }

    // Key metrics detail
    let correctKeys = correctKeystrokes.current
    let incorrectKeys = totalKeystrokes.current - correctKeystrokes.current
    let extraKeys = 0
    let missedKeys = 0

    // Sum missed keys for remaining words if finished early
    if (mode !== "time") {
      wordList.forEach((w, idx) => {
        if (idx > currentWordIndex) {
          missedKeys += w.length + 1 // word length plus space
        }
      })
    }

    onFinish({
      wpm: finalWpm,
      rawWpm: finalRawWpm,
      accuracy: finalAccuracy,
      time: finalSecs,
      consistency: finalConsistency,
      mode,
      submode,
      wordList,
      keystrokeHistory: keystrokeHistoryRef.current,
      chartData: chartDataRef.current.length > 0 ? chartDataRef.current : [{ sec: 1, wpm: finalWpm, rawWpm: finalRawWpm, errors: 0 }],
      keyStats: {
        correct: correctKeys,
        incorrect: incorrectKeys,
        extra: extraKeys,
        missed: missedKeys
      }
    })
  }

  // Intercept character updates
  const handleChar = (value) => {
    if (finished) return

    // Start timer on first keypress
    if (!timerStartedRef.current) {
      timerStartedRef.current = true
      testStartTimeRef.current = Date.now()
      startTimer()
    }

    // Evaluate accuracy & keystrokes
    if (value.length > currentInput.length) {
      const addedChar = value[value.length - 1]
      const targetWord = wordList[currentWordIndex] || ""
      const targetChar = targetWord[value.length - 1]

      totalKeystrokes.current += 1
      if (targetChar !== undefined && addedChar === targetChar) {
        correctKeystrokes.current += 1
      } else {
        errorCountThisSec.current += 1
      }
    }

    setCurrentInput(value)
    stateRef.current.currentInput = value
    recordProgress(value, currentWordIndex)
  }

  // Intercept Spacebar submissions
  const handleSpace = (wordText) => {
    if (finished) return

    // Increment keystroke (for spacebar)
    totalKeystrokes.current += 1
    const targetWord = wordList[currentWordIndex] || ""
    if (wordText === targetWord) {
      correctKeystrokes.current += 1
    } else {
      errorCountThisSec.current += 1
    }

    const nextTypedWords = [...typedWords, wordText]
    setTypedWords(nextTypedWords)
    setCurrentInput("")

    stateRef.current.typedWords = nextTypedWords
    stateRef.current.currentInput = ""

    // Last word check (for word-count modes)
    if (mode !== "time" && currentWordIndex === wordList.length - 1) {
      // Calculate correct chars
      let correctChars = 0
      nextTypedWords.forEach((typedW, idx) => {
        const targetW = wordList[idx]
        if (!targetW) return
        for (let i = 0; i < typedW.length; i++) {
          if (typedW[i] === targetW[i]) correctChars++
        }
        if (typedW === targetW) correctChars++
      })

      handleTestFinished(secElapsed || 1, correctChars)
      recordProgress("", currentWordIndex)
    } else {
      setCurrentWordIndex(prev => {
        const next = prev + 1
        stateRef.current.currentWordIndex = next
        recordProgress("", next)
        return next
      })
    }
  }

  // Intercept backspacing into previous word
  const handleBackspacePrevWord = () => {
    if (finished || currentWordIndex === 0) return

    const prevWordIndex = currentWordIndex - 1
    const prevTypedWord = typedWords[prevWordIndex] || ""
    
    // Remove last word from history
    const nextTypedWords = typedWords.slice(0, -1)
    setTypedWords(nextTypedWords)
    
    setCurrentWordIndex(prevWordIndex)
    setCurrentInput(prevTypedWord)

    stateRef.current.typedWords = nextTypedWords
    stateRef.current.currentWordIndex = prevWordIndex
    stateRef.current.currentInput = prevTypedWord

    recordProgress(prevTypedWord, prevWordIndex)
  }

  // Handle global key restarting (Tab)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault()
        initializeTest()
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [initializeTest])

  // Calculate live countdown/progress
  const getProgressLabel = () => {
    if (mode === "time") {
      const left = Math.max(0, parseInt(submode) - secElapsed)
      return `${left}s`
    } else {
      return `${currentWordIndex}/${wordList.length}`
    }
  }

  // Handle Mode configurations
  const changeMode = (newMode) => {
    if (clearRepeat) clearRepeat()
    setMode(newMode)
    const defaultSub = SUBMODE_CONFIGS[newMode][1]?.value || SUBMODE_CONFIGS[newMode][0].value
    setSubmode(defaultSub)
  }

  const changeSubmode = (newSubmode) => {
    if (clearRepeat) clearRepeat()
    setSubmode(newSubmode)
  }

  const THEMES = [
    { id: "carbon", name: "Carbon", bg: "#323437", main: "#e2b714" },
    { id: "dracula", name: "Dracula", bg: "#282a36", main: "#bd93f9" },
    { id: "cyberpunk", name: "Cyberpunk", bg: "#14171c", main: "#00e5ff" },
    { id: "nord", name: "Nord", bg: "#2e3440", main: "#88c0d0" },
    { id: "sakura", name: "Sakura", bg: "#f0e4e4", main: "#e05a47" },
    { id: "matrix", name: "Matrix", bg: "#000000", main: "#15ff00" },
    { id: "mocha", name: "Mocha", bg: "#1e1e2e", main: "#cba6f7" },
    { id: "ocean", name: "Ocean Breeze", bg: "#0b0f19", main: "#00d2ff" },
    { id: "botanical", name: "Botanical", bg: "#1e2322", main: "#7b9c91" },
    { id: "sepia", name: "Sepia", bg: "#fbf8f3", main: "#8c6239" }
  ]

  const FONTS = [
    { id: "jetbrains-mono", name: "JetBrains Mono", family: "'JetBrains Mono', monospace", category: "mono" },
    { id: "fira-code", name: "Fira Code", family: "'Fira Code', monospace", category: "mono" },
    { id: "source-code-pro", name: "Source Code Pro", family: "'Source Code Pro', monospace", category: "mono" },
    { id: "roboto-mono", name: "Roboto Mono", family: "'Roboto Mono', monospace", category: "mono" },
    { id: "inconsolata", name: "Inconsolata", family: "'Inconsolata', monospace", category: "mono" },
    { id: "ibm-plex-mono", name: "IBM Plex Mono", family: "'IBM Plex Mono', monospace", category: "mono" },
    { id: "share-tech-mono", name: "Share Tech Mono", family: "'Share Tech Mono', monospace", category: "mono" },
    { id: "anonymous-pro", name: "Anonymous Pro", family: "'Anonymous Pro', monospace", category: "mono" },
    { id: "courier-prime", name: "Courier Prime", family: "'Courier Prime', monospace", category: "mono" },
    { id: "space-mono", name: "Space Mono", family: "'Space Mono', monospace", category: "mono" },
    { id: "red-hat-mono", name: "Red Hat Mono", family: "'Red Hat Mono', monospace", category: "mono" },
    { id: "outfit", name: "Outfit", family: "'Outfit', sans-serif", category: "sans" },
    { id: "inter", name: "Inter", family: "'Inter', sans-serif", category: "sans" },
    { id: "lexend-deca", name: "Lexend Deca", family: "'Lexend Deca', sans-serif", category: "sans" },
    { id: "playfair-display", name: "Playfair Display", family: "'Playfair Display', serif", category: "serif" }
  ]

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col justify-between items-center min-h-screen">
      {/* Top Navbar */}
      <Header
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        currentUser={currentUser}
        onProfileClick={onProfileClick}
        started={started}
        finished={finished}
      />

      {/* Main Container */}
      <main className="w-full flex flex-col items-center flex-1 justify-center my-6 max-w-5xl">
        {/* Configuration Pills Bar */}
        <div
          className="flex gap-4 p-2.5 px-4 rounded-xl mb-8 text-sm font-mono select-none transition-all duration-300 w-fit"
          style={{
            backgroundColor: "var(--sub-alt-color)",
            opacity: started && !finished ? 0.05 : 1,
            pointerEvents: started && !finished ? "none" : "auto",
            transform: started && !finished ? "translateY(-10px)" : "none"
          }}
        >
          {/* Mode List */}
          <div className="flex gap-3">
            {MODE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => changeMode(opt.id)}
                className="hover:text-[var(--text-color)] transition-colors lowercase"
                style={{ color: mode === opt.id ? "var(--main-color)" : "var(--sub-color)" }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-[1.5px] self-stretch my-0.5 bg-[var(--sub-color)] opacity-20" />

          {/* Submode Modifiers */}
          <div className="flex gap-3">
            {SUBMODE_CONFIGS[mode].map(opt => (
              <button
                key={opt.value}
                onClick={() => changeSubmode(opt.value)}
                className="hover:text-[var(--text-color)] transition-colors"
                style={{ color: submode === opt.value ? "var(--main-color)" : "var(--sub-color)" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live minimalistic HUD */}
        <div 
          className="w-full flex justify-between items-end mb-3 font-mono transition-opacity duration-300"
          style={{ opacity: started && !finished ? 0.8 : 0 }}
        >
          <div className="text-3xl font-semibold" style={{ color: "var(--main-color)" }}>
            {getProgressLabel()}
          </div>
          {started && (
            <div className="text-xs" style={{ color: "var(--sub-color)" }}>
              focus mode active
            </div>
          )}
        </div>

        {/* Main Typing Input Component */}
        <TypingBox
          wordList={wordList}
          typedWords={typedWords}
          currentWordIndex={currentWordIndex}
          currentInput={currentInput}
          soundEnabled={soundEnabled}
          onChar={handleChar}
          onSpace={handleSpace}
          onBackspacePrevWord={handleBackspacePrevWord}
          onRestart={initializeTest}
          testActive={started && !finished}
          ghostPosition={ghostPosition}
        />

        {/* Bottom Controls / Reset */}
        <div className="flex flex-col items-center mt-6">
          <button
            onClick={initializeTest}
            className="flex flex-col items-center gap-1.5 focus:outline-none transition-colors duration-200"
            style={{ color: "var(--sub-color)" }}
            onMouseOver={e => e.currentTarget.style.color = "var(--text-color)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--sub-color)"}
          >
            <svg
              className="w-5 h-5 hover:rotate-180 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            <span className="text-[10px] font-mono tracking-wider opacity-60">
              RESTART (TAB)
            </span>
          </button>
        </div>
      </main>

      {/* Footer / Theme / Font Selector */}
      <footer 
        className="w-full flex flex-col sm:flex-row gap-4 justify-between items-center mt-6 transition-opacity duration-300 text-xs font-mono"
        style={{ opacity: started && !finished ? 0.15 : 1 }}
      >
        <div className="flex gap-1.5 select-none" style={{ color: "var(--sub-color)" }}>
          <span>tab + enter</span>
          <span>•</span>
          <span>restart</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Font select block */}
          <div className="relative" ref={fontMenuRef}>
            <button
              onClick={() => {
                setIsFontMenuOpen(!isFontMenuOpen)
                setIsThemeMenuOpen(false)
              }}
              className="flex items-center gap-2 hover:text-[var(--text-color)] transition-colors focus:outline-none py-1 px-2 rounded-lg font-medium"
              style={{ color: isFontMenuOpen ? "var(--text-color)" : "var(--sub-color)" }}
            >
              <span>🔤</span>
              <span className="font-semibold uppercase tracking-wider text-xs">fonts</span>
            </button>
            
            {isFontMenuOpen && (
              <div 
                className="absolute bottom-full right-0 mb-3 p-1.5 rounded-xl border flex flex-col min-w-[190px] max-h-[280px] overflow-y-auto shadow-xl z-50 transition-all duration-200"
                style={{ 
                  backgroundColor: "var(--sub-alt-color)", 
                  borderColor: "var(--sub-color)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div 
                  className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest border-b select-none mb-1 text-center sticky top-0 z-10"
                  style={{ 
                    color: "var(--sub-color)",
                    backgroundColor: "var(--sub-alt-color)",
                    borderColor: "var(--sub-color)",
                    borderBottomWidth: "1px"
                  }}
                >
                  Select Font
                </div>
                {FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFont(f.id)
                      setIsFontMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:text-[var(--text-color)] hover:bg-[var(--bg-color)] transition-colors capitalize text-xs flex justify-between items-center"
                    style={{ 
                      color: font === f.id ? "var(--main-color)" : "var(--sub-color)",
                      fontFamily: f.family
                    }}
                  >
                    <span className="font-medium">{f.name}</span>
                    <span className="text-[8px] opacity-60 uppercase tracking-widest px-1 py-0.5 rounded bg-[var(--bg-color)] border border-[var(--sub-color)] border-opacity-10 ml-2">
                      {f.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme select block */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => {
                setIsThemeMenuOpen(!isThemeMenuOpen)
                setIsFontMenuOpen(false)
              }}
              className="flex items-center gap-2 hover:text-[var(--text-color)] transition-colors focus:outline-none py-1 px-2 rounded-lg font-medium"
              style={{ color: isThemeMenuOpen ? "var(--text-color)" : "var(--sub-color)" }}
            >
              <span>🎨</span>
              <span className="font-semibold uppercase tracking-wider text-xs">themes</span>
            </button>
            
            {isThemeMenuOpen && (
              <div 
                className="absolute bottom-full right-0 mb-3 p-1.5 rounded-xl border flex flex-col min-w-[140px] shadow-xl z-50 transition-all duration-200"
                style={{ 
                  backgroundColor: "var(--sub-alt-color)", 
                  borderColor: "var(--sub-color)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div 
                  className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest border-b select-none mb-1 text-center"
                  style={{ 
                    color: "var(--sub-color)",
                    borderColor: "var(--sub-alt-color)"
                  }}
                >
                  Select Theme
                </div>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id)
                      setIsThemeMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:text-[var(--text-color)] hover:bg-[var(--bg-color)] transition-colors capitalize text-xs flex justify-between items-center"
                    style={{ color: theme === t.id ? "var(--main-color)" : "var(--sub-color)" }}
                  >
                    <span className="font-medium">{t.name}</span>
                    <div className="flex gap-1 items-center ml-4">
                      <span 
                        className="w-2.5 h-2.5 rounded-full border border-opacity-50" 
                        style={{ 
                          backgroundColor: t.bg, 
                          borderColor: theme === t.id ? "var(--main-color)" : "var(--sub-color)"
                        }} 
                      />
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: t.main }} 
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default RaceScreen