# GAMS Console Error Checker

A comprehensive Puppeteer-based tool specifically designed for crawling GAMS (Geisteswissenschaftliches Asset Management System) projects at gams.uni-graz.at and detecting console errors, 404 resource errors, and broken links.

## Quick Start

```bash
npm install
node check-with-puppeteer.js
```

## Features

- 🔍 **Smart URL Crawling** - Automatically discovers and crawls all pages
- 🎯 **GAMS Project Support** - Built-in support for GAMS projects
- ❌ **404 Detection** - Captures failed resource loads
- 🐛 **Console Errors** - Monitors browser console for JavaScript errors
- 🔗 **Broken Links** - Identifies pages that return HTTP errors
- 📊 **Detailed Reports** - JSON and text reports with full tracking

## Documentation

See [CLAUDE.md](CLAUDE.md) for complete documentation, usage examples, and development history.

## Output

Reports are generated in the `/reports` directory:
- `report-[timestamp].json` - Structured data
- `report-[timestamp].txt` - Human-readable format

## Configuration

Edit line 220 in `check-with-puppeteer.js` to change the target URL:

```javascript
const startUrl = 'https://your-website-url.com';
```

## License

MIT

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
