// The locked house illustration style, read off the published catalog
// (backups/basehub/latest.json): Androcles, The Woodcutter's Axe, The Boy and
// the Filberts, Dietrich Bonhoeffer. All are 3:2 landscape oil paintings in a
// 19th-century academic manner with a warm earth palette, directional light,
// one clear human subject, and no text. Every generated illustration gets this
// block appended to the draft's scene-specific `imagePrompt`, so a new story
// cannot drift into cartoon, photo, or poster looks.
//
// Change this only as a deliberate brand decision, then regenerate any image
// whose look should follow.

export const HOUSE_STYLE_VERSION = 1

export const HOUSE_STYLE = `House style (locked, applies to the whole image):
An original oil painting in the manner of 19th-century European academic and genre painting.
Visible, confident brushwork and canvas texture; painterly edges, not airbrushed or digital-smooth.
Warm earth palette: umber, ochre, sienna, olive, muted terracotta, with deep warm shadows; restrained, never saturated.
One clear directional light source (window, lamp, candle, or low sun) with soft chiaroscuro modelling faces and hands.
Figures are dignified and believable, with readable faces in three-quarter view; children look like real children, not cartoons.
Period-true clothing, objects, and setting for the story; nothing modern.
Calm, storybook-classic mood suitable for a family anthology read at bedtime; no gore, no menace beyond what the tale requires.
3:2 landscape composition with the subject slightly off center and quiet space around it.
No text, lettering, signatures, captions, borders, frames, or watermarks.`

export function composeImagePrompt(scenePrompt) {
  return `${scenePrompt.trim()}\n\n${HOUSE_STYLE}`
}
