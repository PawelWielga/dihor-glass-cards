const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distFile = path.join(rootDir, 'dist', 'dihor-glass-cards.js');
const docsDir = path.join(rootDir, 'docs');
const targetFile = path.join(docsDir, 'dihor-glass-cards.js');
const cardsSourceDir = path.join(rootDir, 'src', 'cards');
const sharedStylesDir = path.join(rootDir, 'src', 'shared', 'styles');
const cardsTargetDir = path.join(docsDir, 'cards');
const packageJson = require(path.join(rootDir, 'package.json'));

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDirectory(source, target) {
  ensureDirectory(target);
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${sourcePath} -> ${targetPath}`);
  }
}

ensureDirectory(docsDir);

if (fs.existsSync(cardsTargetDir)) {
  fs.rmSync(cardsTargetDir, { recursive: true, force: true });
}
ensureDirectory(cardsTargetDir);

if (fs.existsSync(distFile)) {
  fs.copyFileSync(distFile, targetFile);
  console.log('Copied dist/dihor-glass-cards.js -> docs/');
} else {
  console.warn("dist/dihor-glass-cards.js not found. Run 'npm run build' first.");
}

const manifestPath = path.join(cardsSourceDir, 'cards-docs.json');
if (fs.existsSync(manifestPath)) {
  fs.copyFileSync(manifestPath, path.join(cardsTargetDir, 'cards-docs.json'));
  console.log(`Copied ${manifestPath} -> ${path.join(cardsTargetDir, 'cards-docs.json')}`);
} else {
  console.warn(`Missing cards manifest: ${manifestPath}`);
}

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : [];

for (const card of manifest) {
  const folder = card.folder;
  const css = card.preview && card.preview.css;
  if (!folder || !css) continue;

  const sourceCss = path.join(cardsSourceDir, folder, css);
  const targetDir = path.join(cardsTargetDir, folder);
  const targetCss = path.join(targetDir, css);
  ensureDirectory(targetDir);

  if (fs.existsSync(sourceCss)) {
    fs.copyFileSync(sourceCss, targetCss);
    console.log(`Copied ${sourceCss} -> ${targetCss}`);
  } else {
    console.warn(`Missing card preview css: ${sourceCss}`);
  }
}

for (const styleName of ['theme.css', 'core.css', 'font.css']) {
  const sourcePath = path.join(sharedStylesDir, styleName);
  const targetPath = path.join(cardsTargetDir, styleName);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${sourcePath} -> ${targetPath}`);
  } else {
    console.warn(`Missing shared style: ${sourcePath}`);
  }
}

const versionInfo = {
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(docsDir, 'version.json'),
  JSON.stringify(versionInfo, null, 2) + '\n'
);
console.log(`Wrote version.json (v${versionInfo.version})`);

fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
