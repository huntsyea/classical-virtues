# Contributing to Classical Virtues

Thank you for your interest in contributing to Classical Virtues! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/classical-virtues.git
   cd classical-virtues
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Code Standards

### Code Style
- Use TypeScript for all new files
- Follow the existing code style (ESLint configuration)
- Use Prettier for code formatting
- Follow naming conventions:
  - Components: PascalCase
  - Functions: camelCase
  - Files: kebab-case for components, camelCase for utilities

### Commit Messages
Use conventional commits format:
```
type(scope): description

Examples:
feat(stories): add new virtue story
fix(audio): resolve playback issue
docs(readme): update setup instructions
```

### File Organization
```
src/
├── app/           # Next.js app router
├── components/    # Reusable UI components
├── lib/           # Utility functions
├── stories/       # MDX virtue stories
└── types/         # TypeScript definitions
```

## Adding New Stories

1. Create a new MDX file in `src/stories/`
2. Use the following frontmatter template:
   ```yaml
   ---
   title: 'Story Title'
   virtue: 'Virtue Name'
   image: '/path-to-image.jpg'
   summary: 'Brief summary of the story'
   virtue-description: 'Description of the virtue'
   audioUrl: 'https://audio-url.mp3' # Optional
   ---
   ```

3. Add the story content in MDX format
4. Place associated images in the `public/` directory

## Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, documented code
   - Follow the existing patterns
   - Add appropriate error handling

3. **Test Your Changes**
   ```bash
   npm run lint
   npm run build
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use the provided PR template
   - Include screenshots for UI changes
   - Link related issues

## Code Review Process

1. All changes must be reviewed by at least one maintainer
2. CI/CD checks must pass
3. No merge conflicts
4. Follow the project's coding standards

## Testing

While we don't have comprehensive tests yet, please:
- Test your changes manually
- Check that the build completes successfully
- Verify that linting passes
- Test in multiple browsers if UI changes are made

## Issues and Bugs

When reporting issues:
1. Use the issue template
2. Include steps to reproduce
3. Provide environment information
4. Include screenshots if relevant

## Questions?

If you have questions about contributing:
- Check existing issues and discussions
- Create a new issue with the "question" label
- Reach out to maintainers

Thank you for contributing to Classical Virtues!