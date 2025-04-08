import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 60; // Reduced to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let browser = null;
  try {
    // Validate the request data
    let profile;
    try {
      const data = await request.json();
      profile = data.profile;
      
      if (!profile || typeof profile !== 'object') {
        return NextResponse.json(
          { error: 'Valid profile data is required' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('JSON parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request' },
        { status: 400 }
      );
    }

    // Generate HTML content
    const html = generateHTML(profile);
    
    // For local development, return HTML content directly
    if (process.env.NODE_ENV === 'development') {
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'inline',
        },
      });
    }

    // For production (Vercel), use Puppeteer
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--single-process',
        '--no-zygote',
        '--no-first-run',
        '--disable-accelerated-2d-canvas',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set content and wait for network idle
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Generate PDF with optimized settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    // Close browser to free up resources
    await browser.close();

    // Return the PDF
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${profile.fullName || 'profile'}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF generation error:', error);
    
    // Ensure browser is closed even if there's an error
    if (browser) {
      await browser.close().catch(console.error);
    }

    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}

// Improved HTML generation with safer handling of profile data
function generateHTML(profile: any) {
  // Helper function to safely display data
  const safe = (value: any) => {
    if (value === undefined || value === null) return 'N/A';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Safely handle arrays
  const safeArray = (arr: any[] | undefined, mapper: (item: any) => string) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      return 'None listed.';
    }
    return arr.map(mapper).join('');
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
            color: #333;
          }
          .profile-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: #1a56db;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .profile-image {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            margin: 20px auto;
            display: block;
            border: 3px solid #1a56db;
            background-color: #f0f0f0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px;
          }
          .info-item {
            padding: 10px;
            background: #f3f4f6;
            border-radius: 4px;
          }
          .section {
            margin: 20px;
          }
          .section-title {
            color: #1a56db;
            border-bottom: 2px solid #1a56db;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          .list {
            list-style-type: none;
            padding: 0;
          }
          .list-item {
            padding: 8px;
            margin: 5px 0;
            background: #f3f4f6;
            border-radius: 4px;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="profile-container">
          <div class="header">
            <h1>${safe(profile.fullName)}</h1>
            <p>${safe(profile.position)}</p>
          </div>

          ${profile.profileImage ? 
            `<img src="${safe(profile.profileImage)}" alt="Profile" class="profile-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\' viewBox=\\'0 0 120 120\\'%3E%3Crect width=\\'120\\' height=\\'120\\' fill=\\'%23f0f0f0\\' /%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' font-size=\\'12\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\' %3ENo Image%3C/text%3E%3C/svg%3E';this.onerror='';" />` : 
            `<div class="profile-image" style="display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;">No Image</div>`}

          <div class="info-grid">
            <div class="info-item">
              <strong>Date of Birth:</strong> ${safe(profile.dateOfBirth)}
            </div>
            <div class="info-item">
              <strong>Height:</strong> ${profile.height ? `${safe(profile.height)} cm` : 'N/A'}
            </div>
            <div class="info-item">
              <strong>Weight:</strong> ${profile.weight ? `${safe(profile.weight)} kg` : 'N/A'}
            </div>
            <div class="info-item">
              <strong>Nationality:</strong> ${safe(profile.nationality)}
            </div>
            <div class="info-item">
              <strong>Preferred Foot:</strong> ${safe(profile.preferredFoot)}
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Description</h2>
            <p>${safe(profile.description) || 'No description available.'}</p>
          </div>

          <div class="section">
            <h2 class="section-title">Key Strengths</h2>
            <ul class="list">
              ${safeArray(profile.strengths, (strength) => 
                `<li class="list-item">${safe(strength)}</li>`
              )}
            </ul>
          </div>

          <div class="section">
            <h2 class="section-title">Previous Clubs</h2>
            <ul class="list">
              ${safeArray(profile.clubs, (club) => 
                `<li class="list-item">${safe(club?.name || club)}</li>`
              )}
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
}
