import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router'
import { DesignSystem } from './app/pages/DesignSystem'
import { ThemeContext, useThemeState } from './app/Root'
import './styles/index.css'

// Mirrors what Root.tsx provides for the real app: same theme state/toggle
// logic, same .dark class scoping. Needed here because this standalone entry
// renders DesignSystem directly, without Root, so nothing else supplies it.
function StandaloneThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeState()
  return (
    <ThemeContext.Provider value={theme}>
      <div className={theme.isDark ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/design-system']}>
      <StandaloneThemeProvider>
        <Routes>
          <Route path="/design-system" element={<DesignSystem />} />
        </Routes>
      </StandaloneThemeProvider>
    </MemoryRouter>
  </StrictMode>,
)
