import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCTS } from '../src/data/catalogData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function parseVariation(vName) {
  let clean = vName.trim();
  let size = '';
  let color = clean;

  const sizeMatch = clean.match(/(?:TAM(?:ANHO)?\s*)?(PP|P|M|G|GG|XG|XXG|XGG|G1|G2|G3|38|40|42|44|46|48|10|12|14|16|OZ\s*\d+|\d+\s*OZ|ÚNICO|UN)$/i);
  if (sizeMatch) {
    size = sizeMatch[1].toUpperCase();
    color = clean.substring(0, sizeMatch.index).replace(/TAM(?:ANHO)?\s*$/i, '').trim();
  }
  
  const ozMatch = clean.match(/(\d+\s*OZ)/i);
  if (ozMatch && !size) {
    size = ozMatch[1].toUpperCase();
    color = clean.replace(ozMatch[0], '').trim();
  }

  if (!color && size) color = 'Padrão';
  if (!size) size = 'Único';
  
  return { color: color.replace(/\s+/g, ' ').trim(), size: size.replace(/\s+/g, ' ').trim(), raw: vName };
}

let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo Completo de Produtos - LITRAN</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 36px 24px;
      border-radius: 16px;
      margin-bottom: 32px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .header p {
      margin: 0;
      color: #94a3b8;
      font-size: 15px;
    }
    .badge-count {
      display: inline-block;
      margin-top: 12px;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(96, 165, 250, 0.3);
      padding: 4px 14px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 13px;
    }
    .product-list {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .product-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      display: flex;
      flex-direction: row;
      page-break-inside: avoid;
    }
    @media (max-width: 720px) {
      .product-card {
        flex-direction: column;
      }
    }
    .product-image-container {
      width: 300px;
      min-width: 300px;
      background-color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      border-right: 1px solid #f1f5f9;
    }
    @media (max-width: 720px) {
      .product-image-container {
        width: 100%;
        min-width: unset;
        border-right: none;
        border-bottom: 1px solid #f1f5f9;
      }
    }
    .product-image {
      width: 100%;
      height: 280px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      background-color: #e2e8f0;
    }
    .product-info {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .badge-category {
      display: inline-block;
      background-color: #eff6ff;
      color: #2563eb;
      font-weight: 700;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .product-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      line-height: 1.3;
    }
    .product-meta {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .price-box {
      margin-bottom: 14px;
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .price-current {
      font-size: 24px;
      font-weight: 800;
      color: #15803d;
    }
    .price-original {
      font-size: 15px;
      text-decoration: line-through;
      color: #94a3b8;
    }
    .description-box {
      background-color: #f8fafc;
      padding: 12px 14px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 16px;
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
    }
    .attributes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .attr-box {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 10px 12px;
      border-radius: 8px;
    }
    .attr-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .attr-value {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .variations-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
    }
    .variations-table th {
      background: #f1f5f9;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      color: #475569;
      border-radius: 4px 4px 0 0;
    }
    .variations-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .variations-table tr:last-child td {
      border-bottom: none;
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
      transition: transform 0.2s, background 0.2s;
      z-index: 1000;
    }
    .print-btn:hover {
      background: #1d4ed8;
      transform: translateY(-2px);
    }
    @media print {
      .print-btn { display: none; }
      body { background: white; padding: 0; }
      .product-card { box-shadow: none; border: 1px solid #cbd5e1; margin-bottom: 20px; }
      .header { box-shadow: none; }
    }
  </style>
</head>
<body>

  <button class="print-btn" onclick="window.print()">🖨️ Salvar em PDF / Imprimir</button>

  <div class="container">
    <div class="header">
      <h1>LITRAN - Catálogo de Produtos</h1>
      <p>Documento oficial com imagens embutidas, variações de cores, tamanhos e preços para Marketplace</p>
      <div class="badge-count">Total: ${PRODUCTS.length} Produtos Cadastrados</div>
    </div>

    <div class="product-list">
`;

let markdownDoc = `# Catálogo Completo de Produtos - LITRAN Moda Esportiva\n\n`;
markdownDoc += `> Documento com fotos, descrições completas, variações de cores, tamanhos e preços.\n`;
markdownDoc += `> Total de Produtos: ${PRODUCTS.length}\n\n---\n\n`;

for (let i = 0; i < PRODUCTS.length; i++) {
  const p = PRODUCTS[i];
  let base64Img = '';
  let localImgPath = '';
  
  if (p.images && p.images[0]) {
    const relativePath = p.images[0].replace(/^\//, '');
    const absolutePath = path.join(rootDir, 'public', relativePath);
    if (fs.existsSync(absolutePath)) {
      const fileData = fs.readFileSync(absolutePath);
      const ext = path.extname(absolutePath).replace('.', '') || 'webp';
      base64Img = `data:image/${ext};base64,${fileData.toString('base64')}`;
      localImgPath = absolutePath;
    }
  }

  const rawVars = p.variations || [];
  const parsedVars = rawVars.map(v => {
    const parsed = parseVariation(v.name);
    return {
      ...parsed,
      id: v.id,
      sku: v.sku,
      price: v.price || p.price
    };
  });

  const colorsSet = new Set();
  const sizesSet = new Set();
  parsedVars.forEach(pv => {
    if (pv.color && pv.color !== 'Padrão') colorsSet.add(pv.color);
    if (pv.size) sizesSet.add(pv.size);
  });

  const colorsStr = colorsSet.size > 0 ? Array.from(colorsSet).join(', ') : 'Padrão / Única';
  const sizesStr = sizesSet.size > 0 ? Array.from(sizesSet).join(', ') : 'Tamanho Único';

  html += `
    <div class="product-card">
      <div class="product-image-container">
        ${base64Img ? `<img class="product-image" src="${base64Img}" alt="${p.name}" />` : `<div style="padding: 40px; color: #94a3b8;">Sem foto</div>`}
      </div>
      <div class="product-info">
        <div>
          <span class="badge-category">${p.category || 'Geral'}${p.subcategory ? ' • ' + p.subcategory : ''}</span>
          <h2 class="product-title">${i + 1}. ${p.name}</h2>
          <div class="product-meta">
            <span><strong>ID:</strong> ${p.id}</span> | 
            <span><strong>Referência:</strong> ${p.refCode || 'N/A'}</span>
          </div>

          <div class="price-box">
            <span class="price-current">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
            ${p.originalPrice ? `<span class="price-original">R$ ${p.originalPrice.toFixed(2).replace('.', ',')}</span>` : ''}
          </div>

          <div class="description-box">
            <strong>Descrição:</strong><br>
            ${p.description || 'Sem descrição detalhada.'}
          </div>

          <div class="attributes">
            <div class="attr-box">
              <div class="attr-label">🎨 Variações de Cores</div>
              <div class="attr-value">${colorsStr}</div>
            </div>
            <div class="attr-box">
              <div class="attr-label">📏 Variações de Tamanho</div>
              <div class="attr-value">${sizesStr}</div>
            </div>
          </div>
        </div>

        ${parsedVars.length > 0 ? `
        <div>
          <strong style="font-size: 11px; text-transform: uppercase; color: #64748b;">Grade de SKUs / Variações:</strong>
          <table class="variations-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Variação</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              ${parsedVars.map(v => `
                <tr>
                  <td><code>${v.sku || '-'}</code></td>
                  <td>${v.raw}</td>
                  <td>R$ ${(v.price || p.price).toFixed(2).replace('.', ',')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  // Markdown entry with rendered embedded image
  markdownDoc += `## ${i + 1}. ${p.name}\n\n`;
  if (base64Img) {
    markdownDoc += `<img src="${base64Img}" alt="${p.name}" width="300" style="border-radius: 8px; margin-bottom: 12px;" />\n\n`;
  }
  markdownDoc += `- **ID do Produto**: \`${p.id}\`\n`;
  markdownDoc += `- **Referência**: ${p.refCode || 'N/A'}\n`;
  markdownDoc += `- **Categoria**: ${p.category}${p.subcategory ? ' (' + p.subcategory + ')' : ''}\n`;
  markdownDoc += `- **Preço**: R$ ${p.price.toFixed(2).replace('.', ',')}${p.originalPrice ? ' (Original: R$ ' + p.originalPrice.toFixed(2).replace('.', ',') + ')' : ''}\n`;
  markdownDoc += `- **Variações de Cores**: ${colorsStr}\n`;
  markdownDoc += `- **Variações de Tamanho**: ${sizesStr}\n`;
  markdownDoc += `- **Descrição**:\n  > ${p.description || 'Sem descrição.'}\n\n`;

  if (parsedVars.length > 0) {
    markdownDoc += `### Grade de Variações / SKUs:\n\n`;
    markdownDoc += `| SKU | Variação | Preço |\n`;
    markdownDoc += `| --- | --- | --- |\n`;
    parsedVars.forEach(v => {
      markdownDoc += `| \`${v.sku || '-'}\` | ${v.raw} | R$ ${(v.price || p.price).toFixed(2).replace('.', ',')} |\n`;
    });
    markdownDoc += `\n`;
  }
  markdownDoc += `---\n\n`;
}

html += `
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(rootDir, 'PRODUTOS_LITRAN_CATALOGO.html'), html, 'utf8');
fs.writeFileSync(path.join(rootDir, 'PRODUTOS_LITRAN.md'), markdownDoc, 'utf8');
console.log('✅ Catálogo HTML e Markdown gerados com sucesso!');
