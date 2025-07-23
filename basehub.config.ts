import { setGlobalConfig } from 'basehub'

// Configure Basehub globally with better error handling
if (process.env.BASEHUB_TOKEN) {
  setGlobalConfig({
    /**
     * Get your token from: https://basehub.com/[your-org]/[your-repo]/settings/api
     */
    token: process.env.BASEHUB_TOKEN,
    
    /**
     * Optional: Enable draft mode for previewing unpublished content
     * Only in development, not during Vercel builds
     */
    draft: process.env.NODE_ENV === 'development' && !process.env.VERCEL,
  })
} else {
  console.warn('⚠️ BASEHUB_TOKEN not found - Basehub features will be disabled')
}