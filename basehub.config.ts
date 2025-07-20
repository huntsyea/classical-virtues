import { setGlobalConfig } from 'basehub'

// Configure Basehub globally
setGlobalConfig({
  /**
   * Get your token from: https://basehub.com/[your-org]/[your-repo]/settings/api
   */
  token: process.env.BASEHUB_TOKEN,
  
  /**
   * Optional: Enable draft mode for previewing unpublished content
   */
  draft: process.env.NODE_ENV === 'development',
})
  