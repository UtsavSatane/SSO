import { useRef, useEffect, useState, useLayoutEffect } from "react"
import useAudioSynth from "../Hooks/useAudioSynth"

function TypingBox({
  wordList,
  typedWords,
  currentWordIndex,
  currentInput,
  soundEnabled,
  onChar,
  onSpace,
  onBackspacePrevWord,
  onRestart,
  testActive,
  ghostPosition,
  onFocusCheck
}) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const activeWordRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [caretPos, setCaretPos] = useState({ left: 0, top: 0, height: 24 })
  const [ghostCaretPos, setGhostCaretPos] = useState(null)
  const { playClick } = useAudioSynth()

  // Focus the input on mount or container click
  const focusInput = () => {
    if (onFocusCheck && onFocusCheck()) return;
    inputRef.current?.focus()
    setIsFocused(true)
  }

  useEffect(() => {
    focusInput()
  }, [])

  // Update caret position
  const updateCaretPosition = () => {
    const container = containerRef.current
    if (!container) return

    const target = container.querySelector(".caret-target")
    const targetEnd = container.querySelector(".caret-target-end")
    const activeWord = activeWordRef.current

    let left = 0
    let top = 0
    let height = 28

    const containerRect = container.getBoundingClientRect()

    if (target) {
      const rect = target.getBoundingClientRect()
      left = rect.left - containerRect.left + container.scrollLeft
      top = rect.top - containerRect.top + container.scrollTop
      height = rect.height
    } else if (targetEnd) {
      const rect = targetEnd.getBoundingClientRect()
      left = rect.right - containerRect.left + container.scrollLeft
      top = rect.top - containerRect.top + container.scrollTop
      height = rect.height
    } else if (activeWord) {
      const rect = activeWord.getBoundingClientRect()
      left = rect.left - containerRect.left + container.scrollLeft
      top = rect.top - containerRect.top + container.scrollTop
      height = rect.height
    }

    setCaretPos({ left, top, height })
  }

  // Update ghost caret position
  const updateGhostCaretPosition = () => {
    const container = containerRef.current
    if (!container) return

    const target = container.querySelector(".ghost-caret-target")
    const targetEnd = container.querySelector(".ghost-caret-target-end")

    let left = 0
    let top = 0
    let height = 28

    const containerRect = container.getBoundingClientRect()

    if (target) {
      const rect = target.getBoundingClientRect()
      left = rect.left - containerRect.left + container.scrollLeft
      top = rect.top - containerRect.top + container.scrollTop
      height = rect.height
    } else if (targetEnd) {
      const rect = targetEnd.getBoundingClientRect()
      left = rect.right - containerRect.left + container.scrollLeft
      top = rect.top - containerRect.top + container.scrollTop
      height = rect.height
    } else {
      setGhostCaretPos(null)
      return
    }

    setGhostCaretPos({ left, top, height })
  }

  useLayoutEffect(() => {
    updateCaretPosition()
  }, [currentInput, currentWordIndex, wordList])

  useLayoutEffect(() => {
    updateGhostCaretPosition()
  }, [ghostPosition, wordList])

  // Recalculate caret on window resize
  useEffect(() => {
    const handleResize = () => {
      updateCaretPosition()
      updateGhostCaretPosition()
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [currentInput, currentWordIndex, ghostPosition])

  // Scroll active word into view (centered vertically inside typing box)
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const activeWord = activeWordRef.current
      const container = containerRef.current
      const offsetTop = activeWord.offsetTop
      const lineHeight = activeWord.offsetHeight || 38

      if (offsetTop > lineHeight) {
        container.scrollTo({
          top: offsetTop - lineHeight,
          behavior: "smooth"
        })
      } else {
        container.scrollTo({
          top: 0,
          behavior: "smooth"
        })
      }
    }
  }, [currentWordIndex])

  // Handle typing inputs
  const handleInputChange = (e) => {
    const value = e.target.value

    if (soundEnabled) {
      playClick()
    }

    if (value.endsWith(" ")) {
      // Space pressed (word complete)
      const wordText = value.slice(0, -1)
      onSpace(wordText)
    } else {
      // Normal character typing
      onChar(value)
    }
  }

  // Handle keys (backspace, restart, focus)
  const handleKeyDown = (e) => {
    if (e.key === "Backspace" && currentInput === "") {
      e.preventDefault()
      if (soundEnabled) {
        playClick()
      }
      onBackspacePrevWord()
    } else if (e.key === "Tab") {
      e.preventDefault()
      onRestart()
    }
  }

  return (
    <div
      onClick={focusInput}
      className="relative w-full py-6 px-1 transition-all duration-300 min-h-[148px]"
      style={{
        backgroundColor: "transparent",
        cursor: "text"
      }}
    >
      {/* Click to Focus Overlay */}
      {!isFocused && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl z-20 backdrop-blur-[3px] transition-all duration-300"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
        >
          <div className="text-center font-medium select-none pointer-events-none" style={{ color: "var(--main-color)" }}>
            <span className="animate-pulse">🖱️ Click here or press any key to focus</span>
          </div>
        </div>
      )}

      {/* Hidden input field for capturing keystrokes */}
      <input
        ref={inputRef}
        type="text"
        value={currentInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        style={{
          position: "absolute",
          opacity: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          cursor: "default",
          zIndex: -1
        }}
      />

      {/* Words Container */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden select-none relative"
        style={{
          height: "114px", // exactly 3 lines of 38px height each
          filter: isFocused ? "none" : "blur(2px)",
          transition: "filter 0.2s ease"
        }}
      >
        {/* Smooth Moving Caret */}
        <div
          className={`caret ${!testActive ? "animate-blink" : ""}`}
          style={{
            position: "absolute",
            left: `${caretPos.left}px`,
            top: `${caretPos.top}px`,
            height: `${caretPos.height}px`,
            width: "2.5px",
            backgroundColor: "var(--main-color)",
            transition: "left 0.08s cubic-bezier(0.1, 0.9, 0.2, 1), top 0.08s ease, height 0.08s ease",
            opacity: isFocused ? 1 : 0,
            zIndex: 10,
            boxShadow: "0 0 8px var(--main-color)"
          }}
        />

        {/* Faded Ghost/Pace Caret */}
        {isFocused && ghostCaretPos && (
          <div
            className="ghost-caret"
            style={{
              position: "absolute",
              left: `${ghostCaretPos.left}px`,
              top: `${ghostCaretPos.top}px`,
              height: `${ghostCaretPos.height}px`,
              width: "2.5px",
              backgroundColor: "var(--main-color)",
              opacity: 0.35,
              transition: "left 0.12s linear, top 0.12s ease, height 0.12s ease",
              pointerEvents: "none",
              zIndex: 9
            }}
          />
        )}

        <div className="flex flex-wrap w-full" style={{ gap: "0.6em 0.8em" }}>
          {wordList.map((word, wIdx) => {
            const isWordActive = wIdx === currentWordIndex
            const isWordTyped = wIdx < currentWordIndex
            const typedVal = isWordActive ? currentInput : (typedWords[wIdx] || "")
            const hasErrors = isWordTyped && typedVal !== word
            
            // Limit chars count to render extra characters
            const charsToShow = Math.max(word.length, typedVal.length)

            // Cap the ghost position to the last word
            let activeGhostWIdx = ghostPosition?.wIdx
            let activeGhostCIdx = ghostPosition?.cIdx
            if (ghostPosition && activeGhostWIdx >= wordList.length) {
              activeGhostWIdx = wordList.length - 1
              activeGhostCIdx = wordList[wordList.length - 1].length
            }

            return (
              <div
                key={wIdx}
                ref={isWordActive ? activeWordRef : null}
                className={`word flex flex-wrap text-2xl relative ${isWordActive ? "active" : ""} ${hasErrors ? "border-b-2 border-dashed border-red-500 pb-0.5" : ""}`}
                style={{
                  lineHeight: "1.5",
                  fontFamily: "var(--font-mono)",
                  paddingBottom: "2px"
                }}
              >
                {Array.from({ length: charsToShow }).map((_, cIdx) => {
                  const targetChar = word[cIdx]
                  const typedChar = typedVal[cIdx]

                  let status = "idle"
                  if (cIdx < typedVal.length) {
                    if (cIdx < word.length) {
                      status = typedChar === targetChar ? "correct" : "incorrect"
                    } else {
                      status = "extra"
                    }
                  } else if (isWordTyped && cIdx < word.length) {
                    status = "missed"
                  }

                  let color = "var(--sub-color)"
                  if (status === "correct") color = "var(--text-color)"
                  if (status === "incorrect") color = "var(--error-color)"
                  if (status === "extra") color = "var(--error-extra-color)"
                  if (status === "missed") color = "var(--error-color)"

                  const isCaretHere = isWordActive && cIdx === currentInput.length
                  const isCaretAtEnd = isWordActive && cIdx === charsToShow - 1 && currentInput.length >= charsToShow

                  const isGhostCaretHere = ghostPosition && activeGhostWIdx === wIdx && cIdx === activeGhostCIdx
                  const isGhostCaretAtEnd = ghostPosition && activeGhostWIdx === wIdx && cIdx === charsToShow - 1 && activeGhostCIdx >= charsToShow

                  let className = "char"
                  if (isCaretHere) className += " caret-target"
                  if (isCaretAtEnd) className += " caret-target-end"
                  if (isGhostCaretHere) className += " ghost-caret-target"
                  if (isGhostCaretAtEnd) className += " ghost-caret-target-end"

                  return (
                    <span
                      key={cIdx}
                      className={className}
                      style={{ color }}
                    >
                      {targetChar || typedChar}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TypingBox