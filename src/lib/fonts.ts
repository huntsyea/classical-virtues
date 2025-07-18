import { Castoro, Inter } from 'next/font/google'

export const fontHeading = Castoro({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: '400',
  display: 'swap'
})

export const fontBody = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap'
})