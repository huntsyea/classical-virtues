# Basehub Setup Guide for Classical Virtues

This guide will help you set up Basehub CMS to manage your stories dynamically.

## 1. Create Your Basehub Repository

1. Go to [basehub.com](https://basehub.com) and sign up/login
2. Create a new repository for your project
3. Name it something like "classical-virtues-content"

## 2. Set Up Your Schema

In your Basehub repository, create the following schema structure:

### Stories Collection
Create a collection called `stories` with these fields:

1. **title** (Text)
   - Required: Yes
   - Description: The title of the story

2. **virtue** (Text)
   - Required: Yes
   - Description: The virtue this story teaches (e.g., "Kindness", "Courage")

3. **image** (Image)
   - Required: Yes
   - Description: Hero image for the story

4. **summary** (Text - Long)
   - Required: Yes
   - Description: Brief summary of the story

5. **virtueDescription** (Text - Long)
   - Required: Yes
   - Description: The moral lesson of the story

6. **audioUrl** (Text)
   - Required: No
   - Description: URL to the audio narration of the story

7. **content** (Rich Text)
   - Required: Yes
   - Description: The full story content

## 3. Import Your Existing Stories

You'll need to manually add your existing stories to Basehub:

### Story 1: Androcles and the Lion
- **title**: Androcles and the Lion
- **virtue**: Kindness
- **image**: Upload the `/public/kindness.png` image
- **summary**: A timeless story showing how even small acts of compassion can create bonds that transcend fear and danger.
- **virtueDescription**: Kindness, even in the smallest acts, can forge unbreakable bonds. When we show compassion, it can return to us in unexpected and powerful ways.
- **audioUrl**: https://uwtnsddmmzdh3fod.public.blob.vercel-storage.com/androcles-and-the-lion-B1zl2JfuSe8KymwZJihbEPqZwirOVZ.mp3
- **content**: [Copy the story content from the MDX file]

### Story 2: David and Mephibosheth
- **title**: David and Mephibosheth
- **virtue**: Kindness
- **image**: Upload the `/public/david.png` image
- **summary**: [Copy from MDX file]
- **virtueDescription**: [Copy from MDX file]
- **audioUrl**: [Copy from MDX file if available]
- **content**: [Copy the story content from the MDX file]

### Story 3: George Washington and the Cherry Tree
- **title**: George Washington and the Cherry Tree
- **virtue**: Courage
- **image**: Upload the `/public/george.png` image
- **summary**: [Copy from MDX file]
- **virtueDescription**: [Copy from MDX file]
- **audioUrl**: [Copy from MDX file if available]
- **content**: [Copy the story content from the MDX file]

## 4. Get Your API Token

1. In your Basehub repository, go to Settings → API
2. Create a new API token with read permissions
3. Copy the token

## 5. Configure Your Environment

Create a `.env.local` file in your project root:

```env
BASEHUB_TOKEN=your_token_here
```

## 6. Generate Types

After setting up your schema in Basehub, run:

```bash
pnpm basehub
```

This will update the `basehub-types.d.ts` file with your schema types.

## 7. Update Your Code

The code has been prepared to use Basehub instead of MDX files. Once you complete the steps above:

1. The stories page will automatically fetch from Basehub
2. Individual story pages will use Basehub content
3. You can manage all stories through the Basehub dashboard

## Next Steps

1. Complete the Basehub setup as described above
2. Run `pnpm basehub` to generate the correct types
3. Test the integration locally
4. Deploy your changes

## Benefits of Using Basehub

- **No Code Changes**: Update stories without deploying
- **Rich Editor**: Better content editing experience
- **Version Control**: Track changes to your content
- **Draft Mode**: Preview changes before publishing
- **API Access**: Programmatic access to your content
- **Search**: Built-in search capabilities
- **Analytics**: Track content performance 