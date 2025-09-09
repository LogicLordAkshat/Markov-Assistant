import React from "react"

interface FormattedMessageProps {
  text: string
  role: "user" | "gemini"
}

const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, role }) => {
  // Function to format the text with basic markdown-like formatting
  const formatText = (text: string) => {
    // Split by double newlines to create paragraphs
    const paragraphs = text.split('\n\n')
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      // Skip empty paragraphs
      if (paragraph.trim() === '') return null
      
      // Check if this is a list item (starts with -, *, or number)
      const isListItem = /^[\s]*[-*•]\s/.test(paragraph) || /^[\s]*\d+\.\s/.test(paragraph)
      
      if (isListItem) {
        // Split by single newlines for list items
        const lines = paragraph.split('\n')
        return (
          <ul key={paragraphIndex} className="list-disc list-inside space-y-1 my-2">
            {lines.map((line, lineIndex) => {
              const trimmedLine = line.trim()
              if (trimmedLine === '') return null
              
              // Remove list markers
              const cleanLine = trimmedLine.replace(/^[\s]*[-*•]\s/, '').replace(/^[\s]*\d+\.\s/, '')
              
              return (
                <li key={lineIndex} className="text-sm leading-relaxed">
                  {formatInlineText(cleanLine)}
                </li>
              )
            })}
          </ul>
        )
      } else {
        // Regular paragraph
        return (
          <p key={paragraphIndex} className="text-sm leading-relaxed my-2">
            {formatInlineText(paragraph)}
          </p>
        )
      }
    }).filter(Boolean)
  }

  // Function to format inline text (bold, italic, code)
  const formatInlineText = (text: string) => {
    // Split by ** for bold text
    const parts = text.split(/(\*\*.*?\*\*)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        return (
          <strong key={index} className="font-semibold text-white/90">
            {part.slice(2, -2)}
          </strong>
        )
      } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        // Italic text
        return (
          <em key={index} className="italic text-white/80">
            {part.slice(1, -1)}
          </em>
        )
      } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        // Code text
        return (
          <code key={index} className="bg-white/20 px-1 py-0.5 rounded text-xs font-mono text-white/90">
            {part.slice(1, -1)}
          </code>
        )
      } else {
        // Regular text
        return <span key={index}>{part}</span>
      }
    })
  }

  // For user messages, keep it simple
  if (role === "user") {
    return <span className="text-sm leading-relaxed">{text}</span>
  }

  // For AI messages, apply formatting
  return (
    <div className="space-y-1">
      {formatText(text)}
    </div>
  )
}

export default FormattedMessage

