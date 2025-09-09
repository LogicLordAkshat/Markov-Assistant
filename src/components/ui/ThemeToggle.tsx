import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ] as const

  return (
    <div className="flex items-center gap-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-xs flex items-center gap-1 ${
            theme === value 
              ? 'bg-white/20 text-white' 
              : 'text-white/70 hover:text-white'
          }`}
          title={`Switch to ${label} theme`}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle
