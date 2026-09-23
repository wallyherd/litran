const fs = require('fs');

const inputFile = 'C:\\Users\\walla\\.gemini\\antigravity-ide\\brain\\45d4a4b8-bed8-4af8-a53a-2c98f037135a\\.system_generated\\steps\\976\\output.txt';
const rawText = fs.readFileSync(inputFile, 'utf8');

const startIdx = rawText.indexOf('{\n  "mais_vendidos"');
let data;

for (let endIdx = rawText.length; endIdx > startIdx; endIdx--) {
  if (rawText[endIdx] === '}') {
    try {
      const candidate = rawText.substring(startIdx, endIdx + 1);
      data = JSON.parse(candidate);
      console.log('JSON parsed successfully at endIdx:', endIdx);
      break;
    } catch (e) {
      // Keep searching backwards
    }
  }
}

if (!data) {
  console.error('Could not find valid JSON block');
  process.exit(1);
}

const categoryMap = {
  '367530': 'moda-fitness',
  '409175': 'suplementos',
  '367534': 'muay-thai',
  '367539': 'mma',
  '367542': 'jiu-jitsu',
  '373302': 'camisetas',
  '408793': 'blusas',
  '409277': 'acessorios'
};

const imageBase = 'https://arquivos.facilzap.app.br/';

const processedProducts = [];
const seenIds = new Set();

Object.keys(data).forEach((key) => {
  const items = data[key];
  if (!Array.isArray(items)) return;

  items.forEach((item) => {
    if (!item.id || seenIds.has(item.id)) return;
    seenIds.add(item.id);

    const rawDesc = item.descricao || '';
    const cleanDesc = rawDesc
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const imgs = (item.imagens || [])
      .filter(img => typeof img === 'string' && img.trim().length > 0)
      .map((img) => {
        let cleanUrl = img;
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          cleanUrl = cleanUrl.replace('arquivos-cdn.facilzap.app.br', 'arquivos.facilzap.app.br');
        } else {
          cleanUrl = `${imageBase}${img}`;
        }
        return cleanUrl;
      });

    if (imgs.length === 0) {
      imgs.push('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80');
    }

    let videoUrl = null;
    if (item.video && typeof item.video === 'string') {
      videoUrl = item.video.startsWith('http') ? item.video : `${imageBase}${item.video}`;
    } else if (item.video_externo && typeof item.video_externo === 'string') {
      videoUrl = item.video_externo;
    }

    let catId = item.categoria ? String(item.categoria) : '';
    let categorySlug = categoryMap[catId] || 'moda-fitness';
    
    const nameUpper = (item.nome || '').toUpperCase();

    // Specific category classification rules
    if (nameUpper.includes('BLUSA') || nameUpper.includes('TOP') || nameUpper.includes('CONJUNTO') || nameUpper.includes('LEGGING') || nameUpper.includes('MACAQUINHO') || nameUpper.includes('SHORT')) {
      categorySlug = nameUpper.includes('BLUSA') ? 'blusas' : 'moda-fitness';
    } else if (nameUpper.includes('CREATINA') || nameUpper.includes('CHÁ') || nameUpper.includes('MY SLIM') || nameUpper.includes('SUPLEMENTO') || nameUpper.includes('COFFEE') || nameUpper.includes('GUMMIES')) {
      categorySlug = 'suplementos';
    } else if (nameUpper.includes('MUAY THAI') || nameUpper.includes('LUVA')) {
      categorySlug = 'muay-thai';
    } else if (nameUpper.includes('MMA') || nameUpper.includes('SPRAWL')) {
      categorySlug = 'mma';
    } else if (nameUpper.includes('JIU') || nameUpper.includes('KIMONO')) {
      categorySlug = 'jiu-jitsu';
    } else if (nameUpper.includes('CAMISETA') || nameUpper.includes('CAMISA')) {
      categorySlug = 'camisetas';
    } else if (nameUpper.includes('ÓCULOS') || nameUpper.includes('ACESSÓRIO') || nameUpper.includes('FAIXA')) {
      categorySlug = 'acessorios';
    }

    const varsObj = item.variacoes || {};
    const variations = Object.values(varsObj).map((v, idx) => ({
      id: `v_${v.id || idx}`,
      name: (v.nome || `Opção ${idx + 1}`).trim(),
      price: item.precos_produto?.preco_a_partir?.preco ? parseFloat(item.precos_produto.preco_a_partir.preco) : (item.preco || 99.90),
      sku: item.sku_variacoes?.[v.id] || `${item.sku || 'REF'}-${idx + 1}`
    }));

    const mainPrice = item.precos_produto?.preco_a_partir?.preco 
      ? parseFloat(item.precos_produto.preco_a_partir.preco) 
      : (item.preco || 99.90);

    const origPrice = mainPrice > 50 ? mainPrice + 30 : mainPrice + 20;

    if (nameUpper.includes('BICOLOR SUPLEX POWER')) {
      imgs.unshift('/products/conjunto-bicolor-suplex-power.jpg');
    }

    processedProducts.push({
      id: parseInt(item.id) || item.id,
      name: nameUpper,
      refCode: `Ref: ${item.sku || 'FZ' + item.id}`,
      category: categorySlug,
      subcategory: (item.categoria_nome || 'MODA FITNESS').toUpperCase(),
      price: mainPrice,
      originalPrice: origPrice,
      images: imgs,
      video: videoUrl,
      variations: variations.length > 0 ? variations : [
        { id: 'v1', name: 'TAMANHO ÚNICO', price: mainPrice, sku: `FZ${item.id}-1` }
      ],
      sizes: variations.map(v => v.name),
      tag: item.destaque ? 'Destaque' : 'Novidade',
      rating: 5.0,
      views: item.total_visualizacoes || 777,
      description: cleanDesc || 'Produto oficial LITRAN moda esportiva de alta performance e qualidade superior.'
    });
  });
});

console.log(`Extracted ${processedProducts.length} real Litran products with exact categories!`);

const outputCode = `export const STORE_CONFIG = {
  nome: "LITRAN moda esportiva",
  whatsapp: "5566996210809",
  whatsappFormatted: "(66) 99621-0809",
  freteGratisMinimo: 150.00,
  logoQuadrada: "https://arquivos.facilzap.app.br/logos/litran_quadrada_26021744439.png",
  logoHorizontal: "https://arquivos.facilzap.app.br/logos/litran_horizontal_26021744549.png",
  engineProvider: "HDSoluções",
  engineUrl: "https://hdsolucoes.com.br"
};

export const CATEGORIES = [
  { id: "inicio", name: "INÍCIO", icon: "Home", hasSubmenu: false },
  { id: "moda-fitness", name: "MODA FITNESS", icon: "Dumbbell", hasSubmenu: true },
  { id: "suplementos", name: "SUPLEMENTOS", icon: "Zap", hasSubmenu: false },
  { id: "muay-thai", name: "MUAY THAI", icon: "Flame", hasSubmenu: true },
  { id: "mma", name: "MMA", icon: "Swords", hasSubmenu: true },
  { id: "jiu-jitsu", name: "JIU-JITSU", icon: "Shield", hasSubmenu: false },
  { id: "mais-categorias", name: "MAIS CATEGORIAS", icon: "Grid", hasSubmenu: true }
];

export const CATEGORY_CIRCLES = [
  {
    id: "moda-fitness",
    name: "MODA FITNESS",
    image: "/categories/cat-moda-fitness.jpg"
  },
  {
    id: "suplementos",
    name: "SUPLEMENTOS",
    image: "/categories/cat-suplementos.jpg"
  },
  {
    id: "muay-thai",
    name: "MUAY THAI",
    image: "/categories/cat-muay-thai.jpg"
  },
  {
    id: "jiu-jitsu",
    name: "JIU-JITSU",
    image: "/categories/cat-jiu-jitsu.jpg"
  },
  {
    id: "mma",
    name: "MMA",
    image: "https://arquivos.facilzap.app.br/produtos/1774463362_8688399ffcabc6b8495b.webp"
  },
  {
    id: "camisetas",
    name: "CAMISETA",
    image: "https://arquivos.facilzap.app.br/produtos/1775343973_615ffa91e73dd4db872f.webp"
  },
  {
    id: "blusas",
    name: "BLUSA",
    image: "https://arquivos.facilzap.app.br/produtos/1786706473_6938b5e856012860c798.webp"
  },
  {
    id: "acessorios",
    name: "ACESSÓRIOS",
    image: "https://arquivos.facilzap.app.br/produtos/1776817587_41059a42abcff9d7a176.webp"
  }
];

export const STORIES_VIDEOS = [
  {
    id: 1,
    video: "/videos/video1.mp4"
  },
  {
    id: 2,
    video: "/videos/video2.mp4"
  },
  {
    id: 3,
    video: "/videos/video3.mp4"
  },
  {
    id: 4,
    video: "/videos/video4.mp4"
  }
];

export const PRODUCTS = ${JSON.stringify(processedProducts, null, 2)};
`;

fs.writeFileSync('c:\\Users\\walla\\Downloads\\HDSoluçõesMKT\\Litran\\src\\data\\catalogData.js', outputCode, 'utf8');
console.log('Successfully written catalogData.js with exact categories!');
