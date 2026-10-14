// Run with: node --experimental-strip-types --test src/components/typography.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { smartQuotes } from './typography.ts'

const cases = [
  [`The Woodcutter's Axe`, `The Woodcutter’s Axe`],
  [`"Why do you grieve?" he asked.`, `“Why do you grieve?” he asked.`],
  [`Androcles' surprise`, `Androcles’ surprise`],
  [`'Tis the season`, `’Tis the season`],
  [`He said, "'Twas brillig."`, `He said, “’Twas brillig.”`],
  [`rock 'n' roll`, `rock ’n’ roll`],
  [`the '90s`, `the ’90s`],
  [`'10 men came,' she said.`, `‘10 men came,’ she said.`],
  [`'Em, come here,' said Ma.`, `‘Em, come here,’ said Ma.`],
  [`give 'em a chance`, `give ’em a chance`],
  [`'N-no,' he stammered.`, `‘N-no,’ he stammered.`],
  [`"'Hello,' he said"`, `“‘Hello,’ he said”`],
  [`'Nay,' said the king.`, `‘Nay,’ said the king.`],
  [`sleep 'til dawn`, `sleep ’til dawn`],
  [`'neath the stars`, `’neath the stars`],
  [`"'round the fire," she said.`, `“’round the fire,” she said.`],
  [`'Round and round,' she sang`, `‘Round and round,’ she sang`],
]

for (const [input, expected] of cases) {
  test(JSON.stringify(input), () => assert.equal(smartQuotes(input), expected))
}
