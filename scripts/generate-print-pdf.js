const fs = require('fs');
const path = require('path');

async function main() {
    const projectRoot = path.join(__dirname, '..');
    const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

    log('Starting Print PDF generation...');

    let puppeteer;
    try {
        puppeteer = require('puppeteer-core');
    } catch (e) {
        try { puppeteer = require('puppeteer'); } catch (e2) {
            log('ERROR: Neither puppeteer-core nor puppeteer found.');
            process.exit(1);
        }
    }

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const htmlFile = path.join(projectRoot, 'print-sources', 'main-guide.html');
    const pdfFile = path.join(projectRoot, 'public', 'Jacksonville-Guide.pdf');

    log(`HTML source: ${htmlFile}`);
    log(`PDF output: ${pdfFile}`);

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });

    const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
    log(`Loading: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const imageCount = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        const loaded = Array.from(imgs).filter(img => img.complete && img.naturalWidth > 0).length;
        return { total: imgs.length, loaded };
    });
    log(`Images: ${imageCount.loaded}/${imageCount.total} loaded`);

    const pageCount = await page.evaluate(() => {
        return document.querySelectorAll('.page, .cover-page').length;
    });
    log(`Page divs found: ${pageCount}`);

    await page.pdf({
        path: pdfFile,
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    const stats = fs.statSync(pdfFile);
    log(`PDF generated: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

    await browser.close();
    log('Done!');
}

main().catch(err => {
    console.error(`FATAL: ${err.message}\n${err.stack}`);
    process.exit(1);
});
