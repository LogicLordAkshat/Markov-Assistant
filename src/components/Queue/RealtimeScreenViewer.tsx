import React, { useState, useRef, useCallback, useEffect } from "react"
import { Camera, Square, Play, Pause, Timer, Eye } from "lucide-react"

interface RealtimeScreenViewerProps {
  onFrameCapture: (dataUrl: string) => void
  isVisible: boolean
}

const RealtimeScreenViewer: React.FC<RealtimeScreenViewerProps> = ({
  onFrameCapture,
  isVisible
}) => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [error, setError] = useState<string>("")
  const [captureCount, setCaptureCount] = useState(0)
  const [currentScreenshot, setCurrentScreenshot] = useState<string>("")

  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null)


  // Start automatic screenshot capture
  const startCapture = useCallback(async () => {
    try {
      setError("")
      setCaptureCount(0)
      setIsStreaming(true)
      setIsPaused(false)

      // Take initial screenshot
      await captureScreenshot()

      // Start capturing screenshots every 4 seconds
      captureIntervalRef.current = setInterval(async () => {
        if (!isPaused) {
          await captureScreenshot()
        }
      }, 4000)

    } catch (err: any) {
      console.error("Error starting automatic capture:", err)
      setError(`Failed to start automatic capture: ${err.message || 'Unknown error'}`)
    }
  }, [isPaused])

  // Capture screenshot function
  const captureScreenshot = useCallback(async () => {
    try {
      const result = await window.electronAPI.takeScreenshot()
      if (result && result.preview) {
        setCurrentScreenshot(result.preview)
        setCaptureCount(prev => prev + 1)
        onFrameCapture(result.preview)
      }
    } catch (err) {
      console.error("Error taking screenshot:", err)
    }
  }, [onFrameCapture])

  // Stop automatic capture
  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }

    setIsStreaming(false)
    setIsPaused(false)
    setCaptureCount(0)
  }, [])

  // Manual screenshot capture
  const captureFrame = useCallback(async () => {
    await captureScreenshot()
  }, [captureScreenshot])

  // Toggle pause/resume
  const togglePause = useCallback(() => {
    setIsPaused(!isPaused)
  }, [isPaused])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current)
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="w-full space-y-4">
      {/* Info Text */}
      {!isStreaming && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Click "Start Live View" to begin automatic screenshot capture every 4 seconds.
          </p>
          <p className="text-xs text-gray-500">
            This uses the same screenshot functionality as Cmd+H but automatically captures and analyzes your screen.
          </p>
        </div>
      )}

      {/* Current Screenshot Display */}
      {isStreaming && currentScreenshot && (
        <div className="space-y-2">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Live View Active</span>
            </div>
            <p className="text-xs text-blue-600">
              {isPaused ? "Paused" : "Capturing screenshots every 4 seconds..."}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Screenshots captured: {captureCount}
            </p>
          </div>

          {/* Current Screenshot Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={currentScreenshot}
              alt="Current screen view"
              className="w-full h-48 object-cover"
            />
            <div className="p-2 bg-gray-50 text-xs text-gray-600 text-center">
              Latest screenshot - AI is analyzing this view
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!isStreaming ? (
          <button
            onClick={startCapture}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Timer size={16} />
            Start Live View
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={togglePause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={captureFrame}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Camera size={16} />
              Capture Now
            </button>
            <button
              onClick={stopCapture}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Square size={16} />
              Stop Live View
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Status */}
      {isStreaming && (
        <div className="text-sm text-gray-600">
          {isPaused ? "Live view paused" : "Live view active - capturing screenshots every 4 seconds"}
        </div>
      )}
    </div>
  )
}

export default RealtimeScreenViewer
