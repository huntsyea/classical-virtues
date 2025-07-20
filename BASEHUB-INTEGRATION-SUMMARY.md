# Basehub Integration Summary

## What Has Been Done

I've prepared your Classical Virtues project to work with Basehub CMS while maintaining backward compatibility with your existing MDX files. Here's what was implemented:

### 1. Configuration Files
- **`basehub.config.ts`** - Set up global Basehub configuration
- **`basehub-types.d.ts`** - Type definitions (will be updated after schema setup)
- **`.env.example`** - Example environment variables needed

### 2. New Library Files
- **`src/lib/basehub.ts`** - Basehub client and API functions to fetch stories
- **`src/lib/stories.ts`** - Unified story interface that works with both MDX and Basehub

### 3. Updated Pages
- **`src/app/stories/page.tsx`** - Stories listing page now uses the unified interface
- **`src/app/stories/[slug]/page.tsx`** - Individual story pages support both sources

### 4. Package Updates
- Added `basehub` script to `package.json` for type generation
- Basehub package already installed (v9.2.3)

## How It Works

The system now follows this priority:
1. If `BASEHUB_TOKEN` is set, it tries to fetch from Basehub
2. If Basehub fails or returns no data, it falls back to MDX files
3. This ensures your site works during the transition

## Next Steps for You

1. **Set up Basehub Repository**
   - Go to [basehub.com](https://basehub.com) and create a repository
   - Follow the schema setup in `BASEHUB-SETUP.md`

2. **Create Your Schema**
   - Create a `stories` collection with all required fields
   - Import your existing 3 stories into Basehub

3. **Configure Environment**
   - Create `.env.local` file
   - Add your `BASEHUB_TOKEN` from Basehub settings

4. **Generate Types**
   ```bash
   pnpm basehub
   ```

5. **Test Locally**
   ```bash
   pnpm dev
   ```

## Current Story Data

Your repository currently has 3 stories in MDX format:
- Androcles and the Lion (Kindness)
- David and Mephibosheth (Kindness)  
- George Washington and the Cherry Tree (Courage)

These will continue to work until you migrate them to Basehub.

## Benefits After Migration

- Edit stories without code changes
- Rich text editor with better formatting
- Version control for content
- Draft/preview functionality
- Potential for user-generated content
- Better SEO with structured data
- Analytics on content performance

## Troubleshooting

If you see TypeScript errors:
- The errors in `src/lib/basehub.ts` are expected until you run `pnpm basehub` after setting up your schema
- The system will still work using MDX files as fallback

If stories don't load from Basehub:
- Check your `.env.local` file has the correct token
- Verify your schema matches the expected structure
- Check the browser console for specific error messages

## Files to Remove After Full Migration

Once you're confident with Basehub:
1. `src/lib/posts.ts` - Old MDX loading logic
2. `src/stories/*.mdx` - Individual story files
3. MDX-related dependencies from `package.json`

But keep them until you're fully migrated! 