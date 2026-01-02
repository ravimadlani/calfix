# Add CalendarZero Favicon for Browser Tabs

## Overview

Add proper favicon configuration so the CalendarZero icon displays in Chrome browser tabs instead of the default browser icon.

## Problem Statement

Currently, when users visit CalendarZero, they see a generic browser icon in their Chrome tab. The site has no favicon configured despite having a logo file (`cz_logo.png`) available.

**Current state:**
- No `<link rel="icon">` tags in `index.html`
- No favicon.ico file
- Only `vite.svg` (default Vite placeholder) in public folder
- `cz_logo.png` exists but is only used in the UI, not as favicon

## Proposed Solution

Add favicon files and HTML link tags following 2025 best practices (Evil Martians minimal approach):

### Files to Create

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 32x32 | Legacy browser fallback |
| `favicon.svg` | scalable | Modern browsers (Chrome, Firefox, Edge) |
| `apple-touch-icon.png` | 180x180 | iOS Safari bookmarks |

### HTML Changes

**File:** `index.html`

Add to `<head>`:
```html
<!-- Favicon -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

## Acceptance Criteria

- [ ] CalendarZero icon appears in Chrome browser tabs
- [ ] Icon displays correctly in Firefox, Safari, Edge
- [ ] iOS users see proper icon when adding to home screen
- [ ] No broken image icons or fallback to default browser icon

## Implementation Steps

1. **Generate favicon files from `cz_logo.png`:**
   - Use [RealFaviconGenerator.net](https://realfavicongenerator.net/) or similar tool
   - Upload `public/cz_logo.png`
   - Download generated favicon package

2. **Add files to `public/` folder:**
   - `favicon.ico` (32x32)
   - `favicon.svg` (if logo has SVG source, otherwise skip)
   - `apple-touch-icon.png` (180x180)

3. **Update `index.html`:**
   - Add favicon link tags to `<head>` section

4. **Remove default Vite icon:**
   - Delete `public/vite.svg` (no longer needed)

5. **Test across browsers:**
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers

## Technical Notes

- Favicons display at 16x16px in browser tabs - keep design simple
- File size: Keep under 10KB for fast loading
- Use absolute paths (`/favicon.ico` not `favicon.ico`)
- Files in `public/` are automatically served at root by Vite

## References

- Current logo: `public/cz_logo.png`
- HTML file: `index.html`
- [Evil Martians Favicon Guide](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
