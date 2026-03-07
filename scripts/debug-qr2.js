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

    // Check exact positions
    const debug = await page.evaluate(() => {
        const cover = document.querySelector('.cover-page');
        const qrRow = document.querySelector('.cover-qr-row');
        const qrImgs = document.querySelectorAll('.cover-qr img');

        const coverRect = cover.getBoundingClientRect();
        const qrRowRect = qrRow.getBoundingClientRect();

        const imgRects = Array.from(qrImgs).map(img => ({
            rect: JSON.parse(JSON.stringify(img.getBoundingClientRect())),
            src: img.src.split('/').pop(),
            complete: img.complete,
            naturalWidth: img.naturalWidth
        }));

        // Check if QR row bottom exceeds cover page bottom
        return {
            coverPageHeight: coverRect.height,
            coverPageBottom: coverRect.bottom,
            qrRowTop: qrRowRect.top,
            qrRowBottom: qrRowRect.bottom,
            qrRowHeight: qrRowRect.height,
            overflowing: qrRowRect.bottom > coverRect.bottom,
            overflowBy: qrRowRect.bottom - coverRect.bottom,
            totalContentHeight: cover.scrollHeight,
            images: imgRects,
            // All children of cover and their bottom positions
            children: Array.from(cover.children).map(child => ({
                className: child.className,
                bottom: child.getBoundingClientRect().bottom,
                height: child.getBoundingClientRect().height
            }))
        };
    });

    fs.writeFileSync(
        path.join(projectRoot, 'qr-debug2.json'),
        JSON.stringify(debug, null, 2)
    );

    await browser.close();
    console.log('Done');
}

main().catch(err => {
    console.error(err.message);
});
