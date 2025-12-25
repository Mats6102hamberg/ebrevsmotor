#!/usr/bin/env node

/**
 * Candidate Finder - ERS Prospect Discovery
 *
 * Finds potential ERS customers by searching for organizations
 * and extracting contact information from their websites.
 *
 * Usage:
 *   npm run candidates
 *
 * Output:
 *   - data/private/candidates.csv
 *   - data/private/candidates.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();

// Configuration
const CONFIG = {
  googleCSE: {
    apiKey: process.env.GOOGLE_CSE_API_KEY,
    cx: process.env.GOOGLE_CSE_CX,
    enabled: !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX)
  },
  rateLimit: {
    delayMs: parseInt(process.env.CANDIDATE_RATE_LIMIT_MS) || 2000,
    maxRetries: 3
  },
  outputDir: path.join(__dirname, 'data', 'private'),
  fallbackUrlsFile: path.join(__dirname, 'urls.txt'),
  searchTerms: [
    'region it säkerhet kontakt',
    'sjukhus informationssäkerhet kontakt',
    'kommun it-avdelning kontakt'
  ]
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch URL with retry logic (only retry on network errors and 5xx)
 */
async function fetchWithRetry(url, retries = CONFIG.rateLimit.maxRetries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const html = await fetchUrl(url);
      return html;
    } catch (error) {
      const statusMatch = error.message.match(/HTTP (\d+)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;

      // Don't retry on 301/302 (handled by redirect following), 404, or other 4xx
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        throw error; // Non-retryable client error
      }

      // Only retry on network errors (no status code) or 5xx server errors
      console.warn(`⚠️  Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      if (attempt < retries) {
        await sleep(CONFIG.rateLimit.delayMs * attempt); // Exponential backoff
      }
    }
  }
  throw new Error(`Failed after ${retries} attempts`);
}

/**
 * Fetch URL content with redirect following
 */
function fetchUrl(url, redirectCount = 0) {
  const MAX_REDIRECTS = 5;

  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Too many redirects'));
      return;
    }

    const protocol = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ERS-CandidateFinder/1.0; +https://smartflow.se)'
      },
      timeout: 10000
    };

    protocol.get(url, options, (res) => {
      // Follow redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          reject(new Error(`HTTP ${res.statusCode} with no location header`));
          return;
        }

        // Handle relative URLs
        const absoluteUrl = redirectUrl.startsWith('http')
          ? redirectUrl
          : new URL(redirectUrl, url).href;

        // Follow the redirect
        return fetchUrl(absoluteUrl, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => {
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Check robots.txt (simplified check)
 */
async function checkRobotsTxt(baseUrl) {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const robotsTxt = await fetchUrl(robotsUrl);

    // Simple check: if "Disallow: /" for all user agents
    if (robotsTxt.includes('User-agent: *') && robotsTxt.includes('Disallow: /')) {
      console.warn(`⚠️  robots.txt disallows crawling: ${baseUrl}`);
      return false;
    }

    return true;
  } catch (error) {
    // If robots.txt doesn't exist, assume allowed
    return true;
  }
}

/**
 * Search using Google Custom Search API
 */
async function searchGoogleCSE(query) {
  if (!CONFIG.googleCSE.enabled) {
    return [];
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.googleCSE.apiKey}&cx=${CONFIG.googleCSE.cx}&q=${encodeURIComponent(query)}&num=10`;

  try {
    const response = await fetchUrl(url);
    const data = JSON.parse(response);

    if (!data.items) {
      return [];
    }

    return data.items.map(item => ({
      org_name: extractOrgName(item.title),
      website: extractDomain(item.link),
      source_url: item.link,
      snippet: item.snippet
    }));
  } catch (error) {
    console.error(`❌ Google CSE error: ${error.message}`);
    return [];
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return url;
  }
}

/**
 * Extract organization name from title
 */
function extractOrgName(title) {
  // Remove common suffixes
  return title
    .replace(/\s*-\s*Kontakt.*$/i, '')
    .replace(/\s*\|\s*.*$/i, '')
    .replace(/\s*-\s*.*$/i, '')
    .trim();
}

/**
 * Find contact page URLs (prioritize Swedish variants)
 */
function findContactUrls(baseUrl) {
  const commonPaths = [
    '/kontakt',
    '/kontakta-oss',
    '/kontakt-och-oppettider',
    '/kontakta',
    '/contact',
    '/contact-us',
    '/om-oss',
    '/about',
    '/about-us'
  ];

  return commonPaths.map(path => {
    try {
      return new URL(path, baseUrl).href;
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Extract email addresses from HTML
 */
function extractEmails(html) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = html.match(emailRegex) || [];

  // Filter out common noise
  const filtered = matches.filter(email => {
    const lower = email.toLowerCase();
    return !lower.includes('example.com') &&
           !lower.includes('sentry.io') &&
           !lower.includes('schema.org') &&
           !lower.includes('gravatar.com');
  });

  // Remove duplicates
  return [...new Set(filtered)];
}

/**
 * Find contact page and extract email
 */
async function findContactInfo(baseUrl) {
  // Check robots.txt
  const robotsAllowed = await checkRobotsTxt(baseUrl);
  if (!robotsAllowed) {
    return { contact_page_url: null, suggested_email: null, confidence_score: 0 };
  }

  const contactUrls = findContactUrls(baseUrl);

  for (const url of contactUrls) {
    try {
      console.log(`   Checking: ${url}`);
      await sleep(CONFIG.rateLimit.delayMs);

      const html = await fetchWithRetry(url);
      const emails = extractEmails(html);

      if (emails.length > 0) {
        // Prefer info@, kontakt@, or similar
        const preferred = emails.find(e =>
          e.toLowerCase().match(/^(info|kontakt|contact|hej|hello)@/)
        ) || emails[0];

        return {
          contact_page_url: url,
          suggested_email: preferred,
          confidence_score: calculateConfidence(url, preferred, emails.length)
        };
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to fetch ${url}: ${error.message}`);
    }
  }

  return { contact_page_url: null, suggested_email: null, confidence_score: 0 };
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(contactUrl, email, emailCount) {
  let score = 30; // Base score

  // Higher score if found on dedicated contact page
  if (contactUrl.match(/(kontakt|contact)/i)) {
    score += 30;
  }

  // Higher score for professional email prefixes
  if (email.match(/^(info|kontakt|contact)@/i)) {
    score += 20;
  }

  // Lower score if many emails found (less specific)
  if (emailCount > 5) {
    score -= 10;
  }

  // Higher score if domain matches website
  const emailDomain = email.split('@')[1];
  if (contactUrl.includes(emailDomain)) {
    score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Load URLs from fallback file
 */
function loadFallbackUrls() {
  if (!fs.existsSync(CONFIG.fallbackUrlsFile)) {
    console.log(`ℹ️  Creating ${CONFIG.fallbackUrlsFile} template...`);
    fs.writeFileSync(CONFIG.fallbackUrlsFile,
      '# Add one URL per line (websites to check for contact info)\n' +
      '# Example:\n' +
      '# https://example.com\n' +
      '# https://another-example.org\n'
    );
    return [];
  }

  const content = fs.readFileSync(CONFIG.fallbackUrlsFile, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(url => ({
      org_name: extractOrgName(url),
      website: extractDomain(url),
      source_url: url,
      snippet: 'Manual entry from urls.txt'
    }));
}

/**
 * Process candidates
 */
async function processCandidates() {
  console.log('🔍 ERS Candidate Finder\n');

  let candidates = [];

  // Try Google CSE first
  if (CONFIG.googleCSE.enabled) {
    console.log('📡 Using Google Custom Search API...\n');

    for (const term of CONFIG.searchTerms) {
      console.log(`Searching: "${term}"`);
      const results = await searchGoogleCSE(term);
      candidates.push(...results);
      await sleep(CONFIG.rateLimit.delayMs);
    }
  } else {
    console.log('📄 Using fallback mode (urls.txt)...\n');
    console.log('ℹ️  To use Google Custom Search:');
    console.log('   1. Get API key: https://developers.google.com/custom-search/v1/overview');
    console.log('   2. Add to .env: GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX\n');

    candidates = loadFallbackUrls();
  }

  // Remove duplicates by website
  const uniqueCandidates = Array.from(
    new Map(candidates.map(c => [c.website, c])).values()
  );

  console.log(`\nFound ${uniqueCandidates.length} unique candidates\n`);

  // Process each candidate
  const results = [];

  for (let i = 0; i < uniqueCandidates.length; i++) {
    const candidate = uniqueCandidates[i];
    console.log(`\n[${i + 1}/${uniqueCandidates.length}] ${candidate.org_name}`);
    console.log(`   Website: ${candidate.website}`);

    const contactInfo = await findContactInfo(candidate.website);

    const result = {
      org_name: candidate.org_name,
      website: candidate.website,
      source_url: candidate.source_url,
      contact_page_url: contactInfo.contact_page_url || 'NOT_FOUND',
      suggested_email: contactInfo.suggested_email || 'NOT_FOUND',
      confidence_score: contactInfo.confidence_score,
      needs_review: contactInfo.confidence_score < 50 || !contactInfo.suggested_email,
      snippet: candidate.snippet || ''
    };

    results.push(result);

    if (contactInfo.suggested_email) {
      console.log(`   ✅ Email: ${contactInfo.suggested_email} (confidence: ${contactInfo.confidence_score}%)`);
    } else {
      console.log(`   ⚠️  No email found`);
    }
  }

  return results;
}

/**
 * Export to CSV
 */
async function exportToCsv(results) {
  const csvPath = path.join(CONFIG.outputDir, 'candidates.csv');

  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'org_name', title: 'Organization' },
      { id: 'website', title: 'Website' },
      { id: 'source_url', title: 'Source URL' },
      { id: 'contact_page_url', title: 'Contact Page' },
      { id: 'suggested_email', title: 'Email' },
      { id: 'confidence_score', title: 'Confidence' },
      { id: 'needs_review', title: 'Needs Review' },
      { id: 'snippet', title: 'Snippet' }
    ]
  });

  await csvWriter.writeRecords(results);
  console.log(`\n✅ CSV exported: ${csvPath}`);
}

/**
 * Export to JSON
 */
function exportToJson(results) {
  const jsonPath = path.join(CONFIG.outputDir, 'candidates.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✅ JSON exported: ${jsonPath}`);
}

/**
 * Print summary
 */
function printSummary(results) {
  const withEmail = results.filter(r => r.suggested_email !== 'NOT_FOUND');
  const needsReview = results.filter(r => r.needs_review);
  const highConfidence = results.filter(r => r.confidence_score >= 70);

  console.log('\n📊 Summary:');
  console.log(`   Total candidates: ${results.length}`);
  console.log(`   With email: ${withEmail.length}`);
  console.log(`   High confidence (≥70%): ${highConfidence.length}`);
  console.log(`   Needs manual review: ${needsReview.length}`);
}

/**
 * Main
 */
async function main() {
  try {
    const results = await processCandidates();

    if (results.length === 0) {
      console.log('\n⚠️  No candidates found.');
      console.log('ℹ️  Add URLs manually to urls.txt or configure Google CSE API.\n');
      return;
    }

    await exportToCsv(results);
    exportToJson(results);
    printSummary(results);

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processCandidates, exportToCsv, exportToJson };
