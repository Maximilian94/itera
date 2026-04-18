import { StrictMode, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import colors from 'tailwindcss/colors'
import { converter, formatHex } from 'culori'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'
import { useAuth } from '@clerk/clerk-react'
import { setApiTokenGetter } from '@/lib/api'
import { analytics } from '@/lib/analytics'
import { ClerkWrapper, useClerkAuth } from '@/auth/clerk'

analytics.init()


const toHex = (color: string) => formatHex(converter('rgb')(color))

const darkTheme = createTheme({
  typography: {
    fontFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif',
  },
  palette: {
    primary: {
      main: toHex(colors.cyan[600]) ?? '',
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Tailwind rounded-lg (0.5rem)
        },
      },
    },
  },
})

// Create a new router instance (auth is injected via RouterProvider below)
const router = createRouter({
  routeTree,
  context: { auth: undefined! },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

router.subscribe('onResolved', () => {
  analytics.pageview()
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const queryClient = new QueryClient()


const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

function InnerApp() {
  const auth = useClerkAuth()
  const { getToken } = useAuth()
  // Set token getter during render so it's available before any child fetches (useEffect runs too late)
  setApiTokenGetter(getToken)

  const identifiedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (auth.isLoading) return
    const userId = auth.user?.id ?? null
    if (userId && identifiedUserIdRef.current !== userId) {
      analytics.identify(userId, {
        email: auth.user?.emailAddresses?.[0]?.emailAddress,
        name: [auth.user?.firstName, auth.user?.lastName]
          .filter(Boolean)
          .join(' '),
      })
      identifiedUserIdRef.current = userId
    } else if (!userId && identifiedUserIdRef.current) {
      analytics.reset()
      identifiedUserIdRef.current = null
    }
  }, [auth.isLoading, auth.user])

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    )
  }

  return <RouterProvider router={router} context={{ auth }} />
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={darkTheme}>
          <ClerkWrapper>
            <InnerApp />
          </ClerkWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
