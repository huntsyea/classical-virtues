import { createHash } from 'node:crypto'
import { AUDIO_ELEMENT_ID } from '@/components/narration-store'
import { themeInitScript } from '@/components/theme'

/**
 * Inline script for story pages: a Listen tap that lands before the page has
 * hydrated still works, natively and inside the gesture (as iOS requires).
 *
 * - Must render after the Listen control, so the <audio> element exists.
 * - Toggles: a second tap pauses. Each event it handles is stamped
 *   (`__cvEarly`), so React's replay of the same click during hydration is
 *   ignored by the control and never toggles a second time.
 * - Shows its state without touching React's DOM: it sets `data-cv-early` on
 *   <html> ("loading" until sound starts, then "playing", or "paused"), and
 *   `data-cv-resume` when a saved position exists; CSS swaps the labels in
 *   the Listen button (see `.listen-early-*` in globals.css). <html> already
 *   allows hydration mismatches, so React never fights the script.
 * - Resumes from the saved position (read only; it never writes one).
 * - Sets Media Session title and artwork, so the lock screen is never bare.
 * - Removes itself when the Listen control hydrates (`__cvEarlyOff`).
 *
 * Server-only module (it hashes with node:crypto); import it from server
 * components only.
 */
export const earlyListenScript = `(function(){var d=document,r=d.documentElement,a=d.getElementById('${AUDIO_ELEMENT_ID}');if(!a)return;function pos(){try{return parseFloat(localStorage.getItem('cv:audio-position:'+a.getAttribute('src')))||0}catch(_){return 0}}if(pos()>3)r.setAttribute('data-cv-resume','');function h(e){var t=e.target,b=t&&t.closest&&t.closest('[data-listen-button]');if(!b)return;e.__cvEarly=1;if(!a.paused){a.pause();r.setAttribute('data-cv-early','paused');return}var s=pos();if(s>3){var k=function(){if(s<a.duration-3)a.currentTime=s};if(a.readyState>0)k();else a.addEventListener('loadedmetadata',k,{once:true})}try{if('mediaSession'in navigator&&window.MediaMetadata){var m=b.getAttribute('data-art');navigator.mediaSession.metadata=new MediaMetadata({title:b.getAttribute('data-title')||'',artist:'Classical Virtues',artwork:m?[{src:m,sizes:'512x512'}]:[]})}}catch(_){}r.setAttribute('data-cv-early','loading');a.addEventListener('playing',function(){if(r.getAttribute('data-cv-early')==='loading')r.setAttribute('data-cv-early','playing')},{once:true});var p=a.play();if(p&&p.catch)p.catch(function(){if(r.getAttribute('data-cv-early')==='loading')r.removeAttribute('data-cv-early')})}d.addEventListener('click',h,true);window.__cvEarlyOff=function(){d.removeEventListener('click',h,true)}})()`

/**
 * Content Security Policy: the site's own inline scripts are this one and the
 * theme bootstrap (src/components/theme.ts). When a CSP header is added
 * (next.config headers or a proxy), allow them by hash, not 'unsafe-inline':
 *
 *   script-src 'self' ${inlineScriptHashes.map((h) => `'${h}'`).join(' ')}
 *
 * The hashes are computed from the exact strings the pages render, at build
 * time, so they can never drift. (Next's own runtime scripts need their nonce
 * or 'strict-dynamic' as described in the Next CSP guide.)
 */
const sha256 = (source: string) => `sha256-${createHash('sha256').update(source).digest('base64')}`

export const earlyListenScriptHash = sha256(earlyListenScript)
export const themeInitScriptHash = sha256(themeInitScript)
export const inlineScriptHashes = [themeInitScriptHash, earlyListenScriptHash] as const
