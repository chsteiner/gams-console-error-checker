# Website Console Error Checker

A comprehensive Puppeteer-based tool for crawling websites and detecting console errors, 404 resource errors, and broken links. Originally developed to check GAMS (Geisteswissenschaftliches Asset Management System) projects for errors.

## Features

- **Smart URL Crawling**: Automatically discovers and crawls all pages within a website or project
- **GAMS Project Support**: Built-in support for GAMS projects (handles both `context:` and `o:` URL patterns)
- **404 Resource Detection**: Captures failed resource loads (images, scripts, AJAX calls)
- **Console Error Tracking**: Monitors browser console for JavaScript errors
- **Broken Link Detection**: Identifies pages that return HTTP errors
- **Source Tracking**: Records exactly where each URL was found
- **Detailed Reports**: Generates both JSON and human-readable text reports

## Installation

```bash
npm install
```

This will install the required dependency: `puppeteer`

## Usage

### Main Crawler Script

Check an entire website or GAMS project:

```bash
node check-with-puppeteer.js
```

By default, it crawls `https://gams.uni-graz.at/context:lidal`. To change the target URL, edit line 220 in [check-with-puppeteer.js](check-with-puppeteer.js):

```javascript
const startUrl = 'https://your-website-url.com';
```

The script will:
1. Crawl all pages within the same project/domain
2. Monitor for console errors
3. Track 404 resource loading errors
4. Identify broken links
5. Generate comprehensive reports in the `/reports` directory

### Utility Scripts

#### Find Link Source
Find where a specific URL is linked from:

```bash
node find-link-source.js [page-url] [target-url]
```

Example:
```bash
node find-link-source.js "https://example.com" "broken-link"
```

#### Deep Search
Search for URLs in page HTML, scripts, and data attributes:

```bash
node deep-search.js [page-url] [search-term]
```

Example:
```bash
node deep-search.js "https://example.com" "o:lidal."
```

#### Find Truncated URLs
Detect 404 errors and match them with working truncated versions:

```bash
node find-truncated-urls.js [page-url]
```

#### Quick Console Check
Quick check for console errors and network failures on a single page:

```bash
node quick-console-check.js [page-url]
```

## Reports

Reports are automatically generated in the `/reports` directory with timestamps:

### JSON Report (`report-YYYY-MM-DDTHH-MM-SS-MSSSZ.json`)
Structured data including:
- Summary statistics
- List of all visited pages
- Console errors with timestamps
- 404 resource errors with source pages
- Broken links with HTTP status codes
- URL source tracking

### Text Report (`report-YYYY-MM-DDTHH-MM-SS-MSSSZ.txt`)
Human-readable format with:
- Executive summary
- Visited pages list
- 404 resource errors section
- Broken links section
- Console errors section

## How It Works

### URL Filtering for GAMS Projects

The crawler intelligently filters URLs based on project identifiers:

1. Extracts the project ID from the starting URL (e.g., `context:lidal` → `lidal`)
2. Crawls all URLs containing either:
   - `context:[project-id]` (context pages)
   - `o:[project-id]` (object pages)

This ensures the crawler stays within the project boundaries and doesn't crawl the entire domain.

### Error Detection

**404 Resource Errors**: Captured via Puppeteer's `response` event listener, tracking any resource that fails to load with a 404 status.

**Console Errors**: Monitored via Puppeteer's `console` and `pageerror` events, capturing JavaScript errors as they occur.

**Broken Links**: Detected by checking HTTP status codes when navigating to each discovered URL.

### Source Tracking

Every URL is tracked with metadata about where it was discovered, making it easy to trace broken links back to their source pages.

## Development History

This tool was developed to solve a specific problem: finding the source of 404 errors on a GAMS website where URLs had been truncated due to character limits (e.g., `statue-hl-antonius-franziskanerplatz-graz` → `statue-hl-antonius-franziskanerplatz-gra`).

### Key Challenges Solved

1. **Character Limit Truncation**: Some URLs were shortened, creating 404 errors for old references
2. **Browser Cache Issues**: Initial 404 errors were cached in the browser from previous versions
3. **Resource vs Link Errors**: Distinguished between failed resource loads and broken clickable links
4. **Source Attribution**: Added tracking to show exactly where each error originated

### Evolution

The script evolved through several iterations:

1. **v1**: Basic crawling with console error detection
2. **v2**: Added proper URL filtering for GAMS projects (context: and o: patterns)
3. **v3**: Added source tracking to record where each URL was found
4. **v4**: Added 404 resource detection via network monitoring
5. **v5**: Separated resource errors from broken links in reports
6. **Final**: Added comprehensive reporting and utility scripts

## Technical Details

- **Engine**: Node.js with Puppeteer (headless Chrome)
- **Timeout**: 30 seconds per page (configurable)
- **Wait Strategy**: `networkidle0` ensures all network requests complete
- **Delay**: 1 second pause after page load to catch delayed errors

## Example Output

```
=== CRAWL COMPLETE ===
Pages checked: 915
404 Resources found: 0
Console errors found: 0
Broken links found: 0

✓ No console errors found!

=== REPORTS GENERATED ===
JSON report: c:\...\reports\report-2025-10-29T10-50-44-237Z.json
Text report: c:\...\reports\report-2025-10-29T10-50-44-237Z.txt
```

## License

MIT

## Created With

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
