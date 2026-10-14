export const THEME_KEY = 'cv:theme'

export const THEME_COLORS = { light: '#f9f7f1', dark: '#191713' } as const

/**
 * Runs before first paint (inlined in <head>) so night reading never flashes
 * white. Honors an explicit choice, else the system preference.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');if(t){var c=d?'${THEME_COLORS.dark}':'${THEME_COLORS.light}';var f=function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c)})};f();document.addEventListener('DOMContentLoaded',f)}}catch(e){}})()`
