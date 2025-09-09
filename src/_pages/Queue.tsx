import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import RealtimeScreenViewer from "../components/Queue/RealtimeScreenViewer"
import FormattedMessage from "../components/Queue/FormattedMessage"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import QueueCommands from "../components/Queue/QueueCommands"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}

const Queue: React.FC<QueueProps> = ({ setView }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{role: "user"|"gemini", text: string}[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isRealtimeViewOpen, setIsRealtimeViewOpen] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  const barRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["screenshots"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    setChatMessages((msgs) => [...msgs, { role: "user", text: chatInput }])
    setChatLoading(true)
    setChatInput("")
    // Auto-scroll after adding user message
    setTimeout(scrollToBottom, 50)
    try {
      const response = await window.electronAPI.invoke("gemini-chat", chatInput)
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: response }])
    } catch (err) {
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error: " + String(err) }])
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
      // Auto-scroll after assistant response
      setTimeout(scrollToBottom, 50)
    }
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()


    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue")
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  // Seamless screenshot-to-LLM flow
  useEffect(() => {
    // Listen for screenshot taken event
    const unsubscribe = window.electronAPI.onScreenshotTaken(async (data) => {
      // Refetch screenshots to update the queue
      await refetch();
      // Show loading in chat
      setChatLoading(true);
      try {
        // Get the latest screenshot path
        const latest = data?.path || (Array.isArray(data) && data.length > 0 && data[data.length - 1]?.path);
        if (latest) {
          // Call the LLM to process the screenshot
          const response = await window.electronAPI.invoke("analyze-image-file", latest);
          setChatMessages((msgs) => [...msgs, { role: "gemini", text: response.text }]);
        }
      } catch (err) {
        setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error: " + String(err) }]);
      } finally {
        setChatLoading(false);
      }
    });
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [refetch]);

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen)
  }

  const handleRealtimeViewToggle = () => {
    setIsRealtimeViewOpen(!isRealtimeViewOpen)
  }

  const handleAudioResult = (result: string) => {
    setChatMessages((msgs) => [...msgs, { role: "gemini", text: result }])
    // Auto-scroll after audio result
    setTimeout(scrollToBottom, 50)
  }

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, chatLoading])

  // Auto-scroll when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isChatOpen])

  const handleRealtimeFrameCapture = async (dataUrl: string) => {
    try {
      setChatLoading(true)
      // For Live View, we'll take a screenshot and analyze it using the working method
      const result = await window.electronAPI.takeScreenshot()
      if (result && result.path) {
        const response = await window.electronAPI.invoke("analyze-image-file", result.path)
        setChatMessages((msgs) => [...msgs, { role: "gemini", text: response.text }])
      }
    } catch (err) {
      console.error("Error analyzing live frame:", err)
      setChatMessages((msgs) => [...msgs, { role: "gemini", text: "Error analyzing live frame: " + String(err) }])
    } finally {
      setChatLoading(false)
    }
  }


  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        width: "100%",
        pointerEvents: "auto"
      }}
      className="select-none"
    >
      <div className="bg-transparent w-full">
        <div className="px-2 py-1">
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>
          <div className="w-fit">
            <QueueCommands
              screenshots={screenshots}
              onTooltipVisibilityChange={handleTooltipVisibilityChange}
              onChatToggle={handleChatToggle}
              onRealtimeViewToggle={handleRealtimeViewToggle}
              onAudioResult={handleAudioResult}
            />
          </div>
          {/* Conditional Chat Interface */}
          {isChatOpen && (
            <div className="mt-4 w-full mx-auto liquid-glass chat-container p-4 flex flex-col">
            <div 
              ref={chatMessagesRef}
              className="flex-1 overflow-y-auto mb-3 p-4 rounded-lg bg-white/10 backdrop-blur-md max-h-80 min-h-[120px] glass-content border border-white/20 shadow-lg"
            >
              {chatMessages.length === 0 ? (
                <div className="text-sm text-white/80 text-center mt-8">
                  💬 Chat with Markov Assistant
                  <br />
                  <span className="text-xs text-white/60">Take a screenshot (Cmd+H) for automatic analysis</span>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`w-full flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}
                  >
                    <div
                      className={`${
                        msg.role === "user" 
                          ? "message-bubble-user ml-12" 
                          : "message-bubble-assistant mr-12"
                      }`}
                      style={{ wordBreak: "break-word", lineHeight: "1.4" }}
                    >
                      <FormattedMessage text={msg.text} role={msg.role} />
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start mb-3">
                  <div className="message-bubble-assistant mr-12">
                    <span className="inline-flex items-center">
                      <div className="premium-loading">
                        <div className="premium-loading-dot"></div>
                        <div className="premium-loading-dot"></div>
                        <div className="premium-loading-dot"></div>
                      </div>
                      <span className="ml-2">Markov Assistant is thinking...</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
            <form
              className="flex gap-2 items-center glass-content"
              onSubmit={e => {
                e.preventDefault();
                handleChatSend();
              }}
            >
              <input
                ref={chatInputRef}
                className="premium-input flex-1 text-gray-800 placeholder-gray-500 text-xs"
                placeholder="Type your message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button
                type="submit"
                className="premium-button p-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={chatLoading || !chatInput.trim()}
                tabIndex={-1}
                aria-label="Send"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-7.5-15-7.5v6l10 1.5-10 1.5v6z" />
                </svg>
              </button>
            </form>
          </div>
          )}

          {/* Real-time Screen Viewer */}
          {isRealtimeViewOpen && (
            <div className="mt-4 w-full mx-auto liquid-glass p-4">
              <RealtimeScreenViewer
                onFrameCapture={handleRealtimeFrameCapture}
                isVisible={isRealtimeViewOpen}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Queue
