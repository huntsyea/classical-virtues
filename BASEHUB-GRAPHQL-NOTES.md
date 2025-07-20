# Basehub GraphQL Schema Notes

## Key Differences from Standard GraphQL

### 1. System Fields Use Underscores
Basehub uses underscore prefixes for system-managed fields:
- `_id` - Unique identifier
- `_title` - Display title (NOT `title`)
- `_slug` - URL-friendly identifier
- `_sys` - System metadata
- `_analyticsKey` - Analytics tracking
- `_dashboardUrl` - Link to Basehub dashboard

### 2. Collection Query Structure
Collections in Basehub have a specific structure:
```graphql
query {
  collectionName {
    items {        # Array of all items
      # fields
    }
    item {         # Single item (first match)
      # fields
    }
  }
}
```

### 3. Arguments Placement
Arguments for filtering/pagination go at the COLLECTION level, not on the items field:
```graphql
# ✅ CORRECT
stories {
  __args: {
    first: 10,
    filter: { ... }
  }
  items {
    _title
  }
}

# ❌ INCORRECT
stories {
  items(first: 10) {  # This will error!
    _title
  }
}
```

### 4. No Direct Filtering by Field
Basehub doesn't support direct field filtering in the GraphQL query. Instead:
- Fetch all items (or use pagination with `first`)
- Filter in JavaScript using array methods

Example:
```javascript
const story = data.stories.items.find(item => item._slug === slug)
```

### 5. Content Rich Text Fields
Rich text fields have multiple formats available:
```graphql
content {
  markdown    # Markdown format
  plainText   # Plain text (for word count, etc.)
  html        # HTML format
  readingTime # Estimated reading time in minutes
}
```

## Common Errors and Solutions

### Error: "Cannot query field 'title'"
**Solution:** Use `_title` instead

### Error: "Unknown argument 'filter' on field 'Stories.items'"
**Solution:** Move arguments to the collection level using `__args`

### Error: "Unknown argument 'first' on field 'Stories.items'"
**Solution:** Same as above - use `__args` at collection level

## Example Working Query
```javascript
const data = await basehub().query({
  stories: {
    __args: {
      first: 100,  // Pagination at collection level
    },
    items: {
      _id: true,
      _slug: true,
      _title: true,  // System field with underscore
      virtue: true,   // Custom fields don't have underscore
      image: {
        url: true,
        alt: true,
      },
      content: {
        markdown: true,
        plainText: true,
        readingTime: true,
      },
    },
  },
})
``` 