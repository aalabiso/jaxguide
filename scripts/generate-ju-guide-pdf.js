const fs = require('fs');
const path = require('path');

async function main() {
    const projectRoot = path.join(__dirname, '..');
    let puppeteer;
    try { puppeteer = require('puppeteer-core'); } catch (e) {
        try { puppeteer = require('puppeteer'); } catch (e2) { console.error('No puppeteer found'); process.exit(1); }
    }
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const htmlFile = path.join(projectRoot, 'print-sources', 'ju-student-guide-august.html');
    const pdfFile = path.join(projectRoot, 'print-sources', 'JU-Student-Guide-August-2026.pdf');
    const publicPdf = path.join(projectRoot, 'public', 'JU-Student-Guide-August-2026.pdf');

    console.log('Generating JU Student Guide PDF...');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });

    const htmlContent = fs.readFileSync(htmlFile, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.pdf({
        path: pdfFile,
        width: '8.5in',
        height: '11in',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    const stats = fs.statSync(pdfFile);
    console.log(`PDF generated: ${Math.round(stats.size / 1024)}KB`);

    fs.copyFileSync(pdfFile, publicPdf);
    console.log('Copied to public/');
    console.log('Done!');

    await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
