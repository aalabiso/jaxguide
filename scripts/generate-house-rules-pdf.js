const fs = require('fs');
const path = require('path');

async function main() {
    const projectRoot = path.join(__dirname, '..');

    let puppeteer;
    try { puppeteer = require('puppeteer-core'); } catch (e) {
        try { puppeteer = require('puppeteer'); } catch (e2) { console.error('No puppeteer found'); process.exit(1); }
    }

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const htmlFile = path.join(projectRoot, 'house-rules', 'house-rules.html');
    const pdfFile = path.join(projectRoot, 'house-rules', 'Jacksonville-House-Rules.pdf');

    console.log('Generating House Rules PDF...');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });

    const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.pdf({
        path: pdfFile,
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    const stats = fs.statSync(pdfFile);
    console.log(`PDF generated: ${(stats.size / 1024).toFixed(0)}KB`);

    await browser.close();
    console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
