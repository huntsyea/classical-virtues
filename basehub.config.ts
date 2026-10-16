import { setGlobalConfig } from 'basehub'

// The SDK reads BASEHUB_TOKEN on its own; setting it globally keeps scripts and
// route handlers explicit. Draft content is handled by the SDK: it queries
// drafts automatically in `next dev` and whenever Next.js Draft Mode is on
// (toggled by Basehub's `<Toolbar />`, mounted in the root layout), so no
// `draft` flag is set here.
if (process.env.BASEHUB_TOKEN) {
  setGlobalConfig({
    /**
     * Get your token from: https://basehub.com/[your-org]/[your-repo]/settings/api
     */
    token: process.env.BASEHUB_TOKEN,
  })
} else if (typeof window === 'undefined' && !(globalThis as { __cvBasehubWarned?: boolean }).__cvBasehubWarned) {
  ;(globalThis as { __cvBasehubWarned?: boolean }).__cvBasehubWarned = true
  console.warn('⚠️ BASEHUB_TOKEN not found - Basehub features will be disabled')
}
