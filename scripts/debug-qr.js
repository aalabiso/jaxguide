const fs = require('fs');
const path = require('path');

async function main() {
    const projectRoot = path.join(__dirname, '..');
    const puppeteer = require('puppeteer-core');
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const htmlFile = path.join(projectRoot, 'print-sources', 'main-guide.html');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });

    const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // Check all images
    const imgInfo = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        return Array.from(imgs).map(img => ({
            src: img.src.substring(0, 120),
            alt: img.alt,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            offsetWidth: img.offsetWidth,
            offsetHeight: img.offsetHeight,
            display: getComputedStyle(img).display,
            visibility: getComputedStyle(img).visibility,
            opacity: getComputedStyle(img).opacity,
            parentDisplay: getComputedStyle(img.parentElement).display,
            parentVisibility: getComputedStyle(img.parentElement).visibility,
            // Check bounding rect
            rect: JSON.parse(JSON.stringify(img.getBoundingClientRect()))
        }));
    });

    // Check cover page CSS background
    const coverInfo = await page.evaluate(() => {
        const cover = document.querySelector('.cover-page');
        if (!cover) return 'No .cover-page found';
        const cs = getComputedStyle(cover);
        return {
            backgroundImage: cs.backgroundImage.substring(0, 200),
            backgroundColor: cs.backgroundColor,
            webkitPrintColorAdjust: cs.webkitPrintColorAdjust,
            printColorAdjust: cs.printColorAdjust,
            width: cover.offsetWidth,
            height: cover.offsetHeight,
            overflow: cs.overflow
        };
    });

    // Check QR row
    const qrInfo = await page.evaluate(() => {
        const row = document.querySelector('.cover-qr-row');
        if (!row) return 'No .cover-qr-row found';
        const rect = row.getBoundingClientRect();
        return {
            display: getComputedStyle(row).display,
            visibility: getComputedStyle(row).visibility,
            rect: JSON.parse(JSON.stringify(rect)),
            overflow: getComputedStyle(row.closest('.cover-page')).overflow,
            pageHeight: row.closest('.cover-page')?.offsetHeight
        };
    });

    // Emulate print media and take screenshot
    await page.emulateMediaType('print');
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot in print mode
    await page.screenshot({
        path: path.join(projectRoot, 'cover-print-mode.png'),
        clip: { x: 0, y: 0, width: 816, height: 1056 }
    });

    // Generate a small test PDF of just the first page
    await page.pdf({
        path: path.join(projectRoot, 'test-cover-only.pdf'),
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        pageRanges: '1',
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    const output = JSON.stringify({
        images: imgInfo.filter(i => i.alt.includes('QR')),
        coverInfo,
        qrSection: qrInfo
    }, null, 2);
    fs.writeFileSync(path.join(projectRoot, 'qr-debug.json'), output);

    await browser.close();
    console.log('Debug complete. Check qr-debug.json, cover-print-mode.png, and test-cover-only.pdf');
}

main().catch(err => {
    console.error(err);
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\aalab\\OneDrive\\Desktop\\Jax Guide\\qr-debug.json',
        JSON.stringify({error: err.message, stack: err.stack}));
});
