import fs from 'fs';
import path from 'path';

const baseDir = './Novos Produtos Litran';
const targetDir = './public/products';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const folders = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

const productImagesMap = {};

for (const folder of folders) {
  const folderPath = path.join(baseDir, folder);
  const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
  const slug = slugify(folder);

  productImagesMap[folder] = [];

  for (const file of files) {
    const srcFile = path.join(folderPath, file);
    const destName = `novo_${slug}_${file}`;
    const destFile = path.join(targetDir, destName);

    fs.copyFileSync(srcFile, destFile);
    productImagesMap[folder].push(`/products/${destName}`);
  }
}

console.log('Copy complete! Product images summary:');
for (const [folder, imgs] of Object.entries(productImagesMap)) {
  console.log(`- ${folder}: ${imgs.length} images copied.`);
}

fs.writeFileSync('./scripts/new_product_images.json', JSON.stringify(productImagesMap, null, 2), 'utf-8');
console.log('Wrote ./scripts/new_product_images.json');
