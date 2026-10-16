# Provenance and public-domain checks

The page prints `Source: <value>` under the story and puts it in Article JSON-LD,
so a wrong source is a public error. `writing.md`: provenance is accurate, or the
uncertainty is cut.

## Verify the text

1. **Find the oldest form you can read.** Name the author or tradition, the date,
   and the passage: Plutarch, *Life of Aristides* 7; Genesis 8:6-13; Aesop as
   collected by Townsend (1867). A story with no traceable old form is a modern
   story and needs its modern author named.
2. **Read a public-domain edition yourself.** Good sources: Project Gutenberg,
   Wikisource, the Perseus Digital Library (older Loeb and Dryden/Clough
   translations), the King James Version, Baldwin's *Fifty Famous Stories Retold*
   (1896, Gutenberg #18442), the McGuffey Readers, Andrew Lang's colored Fairy
   Books, Joseph Jacobs's *The Fables of Aesop* (1894). Record the edition in the
   brief.
3. **Confirm the public-domain basis.** In the United States, works published
   before 1929 are public domain, as are ancient texts in any wording you write
   yourself. A modern translation or retelling is copyrighted even when its source
   is ancient: Hersholt's Andersen (1949), current Penguin and Oxford translations,
   modern picture books, and Bennett's own introductions and adaptations in *The
   Book of Virtues* (1993). Use those only to learn what exists, then retell from
   the old text. The KJV is public domain in the US and under Crown patent in the
   UK; retelling and short quotation are fine for this site.
4. **List the departures.** Famous versions often add what the old text lacks. Say
   which form you are retelling. Known traps:
   - The cherry tree comes from Mason Locke Weems (1806), not from Washington's
     life. Treat it as a tale.
   - Bruce and the spider is a legend first printed by Sir Walter Scott (1828).
   - Pandora had a jar (*pithos*) in Hesiod; the box is Erasmus's mistranslation,
     and the tapping voice of Hope is Hawthorne's (1851).
   - The boy with his finger in the dike is Mary Mapes Dodge's invention in *Hans
     Brinker* (1865), not a Dutch folk tale.
   - Aesop's closing morals are later additions by collectors; they belong in
     `virtueDescription`, never in the body.
   - Midas's daughter Marygold is Hawthorne's (1851), not Ovid's.
5. **Choose one governing text.** When versions differ, name the edition the
   draft is faithful to, event for event; the others inform only the departures
   list. Prefer the version that reads best aloud and keeps the tale's set pieces,
   provided it is public domain. A detail found only in the governing text
   (Baldwin's "half of all your gold") may be told, but `source` names that text.
   The editor's blind comparison will set the draft against this same text.

   The governing passage ends where the tale's payoff ends. If the source runs on
   past it into material a bedtime reader cannot carry (an execution of families,
   a long decree), stop before it and list the omitted verses under Departures;
   never alter what happens inside the passage to soften it. The editor checks
   the boundary, because `source.txt` is also the text the blind judge sees.

   When the governing text is in a register no parent reads unaltered to a
   six-year-old (the KJV, a Victorian translation of Plutarch), also name a
   **bedtime rival**: the best public-domain telling written for children over the
   same span. Save it as `rival.txt`; the draft must beat it blind too.
6. **Separate history from legend.** For real people, keep only events and words
   a source records. An anecdote that is probably apocryphal can still be told as
   a tale, but the source note says whose tale it is, and nothing in the summary or
   reflection asserts it as fact.

## Source note style

Short attribution, not a citation. No URL, no edition detail (that lives in the
brief).

| Kind | Pattern | Example |
| --- | --- | --- |
| Fable | `From Aesop's Fables` | From Aesop's Fables |
| Scripture | `Retold from <Book> <chapter>` | Retold from Genesis 8 |
| Classical history | `From Plutarch's Life of <name>` | From Plutarch's Life of Aristides |
| Literary tale | `After <author>, <work> (<year>)` | After Nathaniel Hawthorne, A Wonder-Book (1851) |
| Legend | `A <place> legend, first printed by <author> (<year>)` | A Scottish legend, first printed by Sir Walter Scott (1828) |
| Collected retelling | `As told by <collector>, <work> (<year>)` | As told by James Baldwin, Fifty Famous Stories Retold (1896) |
| Collector's version of an older legend | `An old <place> legend, as told by <collector> (<year>)` | An old Italian legend, as told by James Baldwin (1896) |

If you cannot fill a pattern truthfully, leave `source` as the most general true
statement (`A traditional tale`) and record the open question in the brief for
the editor of record.
