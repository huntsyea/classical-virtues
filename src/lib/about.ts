import { basehub } from 'basehub'
import type { AboutSingleton } from '../../basehub-types'
import '../../basehub.config' // Import the config to ensure it's loaded

// Use BaseHub's generated types for full type safety
export type About = AboutSingleton

// Fetch the about page content with proper BaseHub caching
export async function getAboutPage(): Promise<About | null> {
  try {
    // Use BaseHub's recommended query method (draft config handled in basehub.config.ts)
    const data = await basehub().query({
      about: {
        _title: true,
        subtitle: true,
        content: {
          markdown: true,
        },
      },
    })

    return data.about as About
  } catch (error) {
    console.error('Error fetching about page from Basehub:', error)
    return null
  }
}
