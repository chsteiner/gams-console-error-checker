/**
 * GAMS Console Error Checker
 *
 * A comprehensive tool for crawling GAMS (Geisteswissenschaftliches Asset Management System)
 * projects at gams.uni-graz.at and detecting console errors, 404 resources, and broken links.
 *
 * This tool understands GAMS URL patterns:
 * - context:[project-id] - Context pages
 * - o:[project-id] - Object pages
 *
 * Reports are saved to the /reports directory.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function crawlForErrors(startUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const visited = new Set();
  const errorsFound = [];
  const toVisit = [{ url: startUrl, foundOn: 'START' }];
  const urlSources = new Map(); // Track where each URL was found
  const brokenLinks = []; // Track 404 and other HTTP errors
  const resourceErrors = []; // Track 404 resource loading errors
  let currentPageUrl = ''; // Track which page we're currently on

  // Extract the context identifier from the starting URL
  const startUrlObj = new URL(startUrl);
  const domain = startUrlObj.origin;

  // Extract context identifier (e.g., "context:lidal" from the URL)
  const contextMatch = startUrl.match(/context:([^\/\?#]+)/);
  const projectId = contextMatch ? contextMatch[1] : null;

  // Build list of patterns to match (both context: and o: prefixes)
  const allowedPatterns = [];
  if (projectId) {
    allowedPatterns.push(`context:${projectId}`);
    allowedPatterns.push(`o:${projectId}`);
  }

  console.log(`Crawling URLs containing: ${allowedPatterns.join(' OR ')}\n`);

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errorsFound.push({
        url: currentPageUrl || page.url(),
        error: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Listen for page errors (uncaught exceptions)
  page.on('pageerror', error => {
    errorsFound.push({
      url: currentPageUrl || page.url(),
      error: `PAGE ERROR: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  });

  // Listen for all responses to catch 404 resource errors
  page.on('response', response => {
    const status = response.status();
    const resourceUrl = response.url();

    // Only track 404s, and only for resources on the same domain
    if (status === 404 && resourceUrl.startsWith(domain)) {
      // Check if it matches our project patterns (context:lidal or o:lidal)
      const matchesPattern = allowedPatterns.length === 0 ||
                            allowedPatterns.some(pattern => resourceUrl.includes(pattern));

      if (matchesPattern) {
        console.error(`  ❌ 404 Resource: ${resourceUrl}`);
        resourceErrors.push({
          resourceUrl: resourceUrl,
          pageUrl: currentPageUrl,
          status: 404,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Function to check if URL should be crawled
  function shouldCrawl(url) {
    // Must be same domain
    if (!url.startsWith(domain)) return false;

    // If we have allowed patterns, URL must contain at least one of them
    if (allowedPatterns.length > 0) {
      const matchesPattern = allowedPatterns.some(pattern => url.includes(pattern));
      if (!matchesPattern) return false;
    }

    return true;
  }

  // Process URLs from the queue
  while (toVisit.length > 0) {
    const { url, foundOn } = toVisit.shift();

    // Skip if already visited or not within scope
    if (visited.has(url) || !shouldCrawl(url)) {
      continue;
    }

    visited.add(url);
    urlSources.set(url, foundOn);
    currentPageUrl = url; // Set current page for error tracking
    console.log(`Checking [${visited.size}]: ${url}`);

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Check HTTP status
      const status = response.status();
      if (status === 404) {
        console.error(`  ❌ 404 Not Found: ${url}`);
        brokenLinks.push({
          url: url,
          foundOn: foundOn,
          status: 404,
          error: 'Page not found'
        });
      } else if (status >= 400) {
        console.error(`  ⚠️  HTTP ${status}: ${url}`);
        brokenLinks.push({
          url: url,
          foundOn: foundOn,
          status: status,
          error: `HTTP error ${status}`
        });
      }

      // Wait a bit for any delayed errors
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get all links on this page (only if page loaded successfully)
      if (status < 400) {
        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href && !href.includes('#') && !href.includes('javascript:'));
        });

        // Add new links to the queue
        for (const link of links) {
          if (!visited.has(link) && shouldCrawl(link)) {
            toVisit.push({ url: link, foundOn: url });
          }
        }
      }

    } catch (error) {
      console.error(`Failed to load ${url}: ${error.message}`);
      brokenLinks.push({
        url: url,
        foundOn: foundOn,
        status: 'ERROR',
        error: error.message
      });
    }
  }
  await browser.close();

  return {
    visited: Array.from(visited),
    errors: errorsFound,
    urlSources: Object.fromEntries(urlSources),
    brokenLinks: brokenLinks,
    resourceErrors: resourceErrors
  };
}

function generateReport(results, startUrl) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportsDir = path.join(__dirname, 'reports');

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFileName = `report-${timestamp}.json`;
  const reportFilePath = path.join(reportsDir, reportFileName);

  const report = {
    startUrl,
    timestamp: new Date().toISOString(),
    summary: {
      pagesChecked: results.visited.length,
      consoleErrorsFound: results.errors.length,
      brokenLinksFound: results.brokenLinks.length,
      resource404sFound: results.resourceErrors.length
    },
    visitedPages: results.visited,
    consoleErrors: results.errors,
    brokenLinks: results.brokenLinks,
    resource404s: results.resourceErrors,
    urlSources: results.urlSources
  };

  // Save JSON report
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));

  // Generate human-readable report
  const txtFileName = `report-${timestamp}.txt`;
  const txtFilePath = path.join(reportsDir, txtFileName);

  let txtReport = '=== WEBSITE CONSOLE ERROR CHECK REPORT ===\n\n';
  txtReport += `Start URL: ${startUrl}\n`;
  txtReport += `Timestamp: ${new Date().toISOString()}\n`;
  txtReport += `Pages checked: ${results.visited.length}\n`;
  txtReport += `Console errors found: ${results.errors.length}\n`;
  txtReport += `Broken links found: ${results.brokenLinks.length}\n`;
  txtReport += `404 Resources found: ${results.resourceErrors.length}\n\n`;

  txtReport += '--- VISITED PAGES ---\n';
  results.visited.forEach((url, i) => {
    const foundOn = results.urlSources[url] || 'UNKNOWN';
    txtReport += `${i + 1}. ${url}\n`;
    txtReport += `   Found on: ${foundOn}\n`;
  });

  txtReport += '\n--- 404 RESOURCE ERRORS (Images, Scripts, etc.) ---\n';
  if (results.resourceErrors.length > 0) {
    results.resourceErrors.forEach((err, i) => {
      txtReport += `\n${i + 1}. ${err.resourceUrl}\n`;
      txtReport += `   Found on page: ${err.pageUrl}\n`;
      txtReport += `   Time: ${err.timestamp}\n`;
    });
  } else {
    txtReport += 'No 404 resource errors found!\n';
  }

  txtReport += '\n--- BROKEN LINKS (404 & HTTP ERRORS) ---\n';
  if (results.brokenLinks.length > 0) {
    results.brokenLinks.forEach((link, i) => {
      txtReport += `\n${i + 1}. ${link.url}\n`;
      txtReport += `   Status: ${link.status}\n`;
      txtReport += `   Error: ${link.error}\n`;
      txtReport += `   Found on: ${link.foundOn}\n`;
    });
  } else {
    txtReport += 'No broken links found!\n';
  }

  txtReport += '\n--- CONSOLE ERRORS ---\n';
  if (results.errors.length > 0) {
    results.errors.forEach((err, i) => {
      txtReport += `\n${i + 1}. URL: ${err.url}\n`;
      txtReport += `   Time: ${err.timestamp}\n`;
      txtReport += `   Error: ${err.error}\n`;
    });
  } else {
    txtReport += 'No console errors found!\n';
  }

  fs.writeFileSync(txtFilePath, txtReport);

  return { jsonPath: reportFilePath, txtPath: txtFilePath };
}

// Run it
const startUrl = 'https://gams.uni-graz.at/context:lidal';
crawlForErrors(startUrl)
  .then(results => {
    console.log('\n=== CRAWL COMPLETE ===');
    console.log(`Pages checked: ${results.visited.length}`);
    console.log(`404 Resources found: ${results.resourceErrors.length}`);
    console.log(`Console errors found: ${results.errors.length}`);
    console.log(`Broken links found: ${results.brokenLinks.length}\n`);

    if (results.resourceErrors.length > 0) {
      console.log('404 RESOURCE ERRORS:');
      results.resourceErrors.slice(0, 20).forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.resourceUrl}`);
        console.log(`   Found on: ${err.pageUrl}`);
      });
      if (results.resourceErrors.length > 20) {
        console.log(`\n... and ${results.resourceErrors.length - 20} more 404 resources`);
      }
      console.log('');
    }

    if (results.brokenLinks.length > 0) {
      console.log('BROKEN LINKS:');
      results.brokenLinks.forEach((link, i) => {
        console.log(`\n${i + 1}. ${link.url}`);
        console.log(`   Status: ${link.status}`);
        console.log(`   Found on: ${link.foundOn}`);
      });
      console.log('');
    }

    if (results.errors.length > 0) {
      console.log('CONSOLE ERRORS:');
      results.errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.url}`);
        console.log(`   ${err.error}`);
      });
    } else {
      console.log('✓ No console errors found!');
    }

    // Generate reports
    const reportPaths = generateReport(results, startUrl);
    console.log('\n=== REPORTS GENERATED ===');
    console.log(`JSON report: ${reportPaths.jsonPath}`);
    console.log(`Text report: ${reportPaths.txtPath}`);
  })
  .catch(console.error);