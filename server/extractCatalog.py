import json
import os

input_file = r"C:\Users\walla\.gemini\antigravity-ide\brain\45d4a4b8-bed8-4af8-a53a-2c98f037135a\.system_generated\steps\976\output.txt"

with open(input_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Filter out non-json lines
json_lines = []
recording = False
for line in lines:
    if line.strip().startswith("{"):
        recording = True
    if recording:
        json_lines.append(line)
        if line.strip() == "}":
            break

json_str = "".join(json_lines)
data = json.loads(json_str)

category_map = {
    '367530': 'moda-fitness',
    '409175': 'suplementos',
    '367534': 'muay-thai',
    '367539': 'mma',
    '367542': 'jiu-jitsu',
    '373302': 'camisetas',
    '408793': 'blusas',
    '409277': 'acessorios'
}

image_base = "https://arquivos-cdn.facilzap.app.br/"

processed_products = []
seen_ids = set()

for key, items in data.items():
    if not isinstance(items, list):
        continue
    for item in items:
        p_id = item.get("id")
        if not p_id or p_id in seen_ids:
            continue
        seen_ids.add(p_id)

        raw_desc = item.get("descricao") or ""
        import re
        clean_desc = re.sub(r'<[^>]*>', ' ', raw_desc)
        clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()

        raw_imgs = item.get("imagens") or []
        imgs = []
        for img in raw_imgs:
            if img.startswith("http"):
                imgs.append(img)
            else:
                imgs.append(f"{image_base}{img}?width=800&height=1000&quality=85&format=webp")
        
        if not imgs:
            imgs.append("https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80")

        cat_id = str(item.get("categoria") or "")
        category_slug = category_map.get(cat_id, "moda-fitness")
        
        name_upper = (item.get("nome") or "").upper()
        if "CREATINA" in name_upper or "CHÁ" in name_upper or "SLIM" in name_upper or "SUPLEMENTO" in name_upper:
            category_slug = "suplementos"
        elif "MUAY THAI" in name_upper or "LUVA" in name_upper:
            category_slug = "muay-thai"
        elif "MMA" in name_upper or "SPRAWL" in name_upper:
            category_slug = "mma"
        elif "JIU" in name_upper or "KIMONO" in name_upper:
            category_slug = "jiu-jitsu"
        elif "CAMISETA" in name_upper or "CAMISA" in name_upper:
            category_slug = "camisetas"
        elif "BLUSA" in name_upper or "TOP" in name_upper or "CONJUNTO" in name_upper or "LEGGING" in name_upper:
            if category_slug != "suplementos":
                category_slug = "moda-fitness"
        elif "ÓCULOS" in name_upper or "ACESSÓRIO" in name_upper:
            category_slug = "acessorios"

        vars_obj = item.get("variacoes") or {}
        variations = []
        if isinstance(vars_obj, dict):
            for idx, (v_key, v) in enumerate(vars_obj.items()):
                v_name = (v.get("nome") or f"Opção {idx + 1}").strip()
                v_price = item.get("preco") or 99.90
                try:
                    v_price = float(item.get("precos_produto", {}).get("preco_a_partir", {}).get("preco", v_price))
                except:
                    pass
                variations.append({
                    "id": f"v_{v.get('id', idx)}",
                    "name": v_name,
                    "price": v_price,
                    "sku": item.get("sku_variacoes", {}).get(v_key, f"{item.get('sku', 'REF')}-{idx+1}")
                })

        main_price = 99.90
        try:
            main_price = float(item.get("precos_produto", {}).get("preco_a_partir", {}).get("preco", item.get("preco", 99.90)))
        except:
            pass

        orig_price = main_price + 30 if main_price > 50 else main_price + 20

        if "BICOLOR SUPLEX POWER" in name_upper:
            imgs.insert(0, "/products/conjunto-bicolor-suplex-power.jpg")

        processed_products.append({
            "id": int(p_id) if str(p_id).isdigit() else p_id,
            "name": name_upper,
            "refCode": f"Ref: {item.get('sku') or ('FZ' + str(p_id))}",
            "category": category_slug,
            "subcategory": (item.get("categoria_nome") or "MODA FITNESS").upper(),
            "price": main_price,
            "originalPrice": orig_price,
            "images": imgs,
            "variations": variations if variations else [
                {"id": "v1", "name": "TAMANHO ÚNICO", "price": main_price, "sku": f"FZ{p_id}-1"}
            ],
            "sizes": [v["name"] for v in variations] if variations else ["Único"],
            "tag": "Destaque" if item.get("destaque") else "Novidade",
            "rating": 5.0,
            "views": item.get("total_visualizacoes") or 777,
            "description": clean_desc or "Produto oficial LITRAN moda esportiva de alta performance e qualidade superior."
        })

print(f"Extracted {len(processed_products)} real Litran products!")

output_code = f"""export const STORE_CONFIG = {{
  nome: "LITRAN moda esportiva",
  whatsapp: "5566996210809",
  whatsappFormatted: "(66) 99621-0809",
  freteGratisMinimo: 150.00,
  logoQuadrada: "https://arquivos.facilzap.app.br/logos/litran_quadrada_26021744439.png",
  logoHorizontal: "https://arquivos.facilzap.app.br/logos/litran_horizontal_26021744549.png",
  engineProvider: "HDSoluções",
  engineUrl: "https://hdsolucoes.com.br"
}};

export const CATEGORIES = [
  {{ id: "inicio", name: "INÍCIO", icon: "Home", hasSubmenu: false }},
  {{ id: "moda-fitness", name: "MODA FITNESS", icon: "Dumbbell", hasSubmenu: true }},
  {{ id: "suplementos", name: "SUPLEMENTOS", icon: "Zap", hasSubmenu: false }},
  {{ id: "muay-thai", name: "MUAY THAI", icon: "Flame", hasSubmenu: true }},
  {{ id: "mma", name: "MMA", icon: "Swords", hasSubmenu: true }},
  {{ id: "jiu-jitsu", name: "JIU-JITSU", icon: "Shield", hasSubmenu: false }},
  {{ id: "mais-categorias", name: "MAIS CATEGORIAS", icon: "Grid", hasSubmenu: true }}
];

export const CATEGORY_CIRCLES = [
  {{
    id: "moda-fitness",
    name: "MODA FITNESS",
    image: "/categories/cat-moda-fitness.jpg"
  }},
  {{
    id: "suplementos",
    name: "SUPLEMENTOS",
    image: "/categories/cat-suplementos.jpg"
  }},
  {{
    id: "muay-thai",
    name: "MUAY THAI",
    image: "/categories/cat-muay-thai.jpg"
  }},
  {{
    id: "jiu-jitsu",
    name: "JIU-JITSU",
    image: "/categories/cat-jiu-jitsu.jpg"
  }},
  {{
    id: "mma",
    name: "MMA",
    image: "https://arquivos-cdn.facilzap.app.br/produtos/1774463362_8688399ffcabc6b8495b.webp?width=400&height=400"
  }},
  {{
    id: "camisetas",
    name: "CAMISETA",
    image: "https://arquivos-cdn.facilzap.app.br/produtos/1775343973_615ffa91e73dd4db872f.webp?width=400&height=400"
  }},
  {{
    id: "blusas",
    name: "BLUSA",
    image: "https://arquivos-cdn.facilzap.app.br/produtos/1786706473_6938b5e856012860c798.webp?width=400&height=400"
  }},
  {{
    id: "acessorios",
    name: "ACESSÓRIOS",
    image: "https://arquivos-cdn.facilzap.app.br/produtos/1776817587_41059a42abcff9d7a176.webp?width=400&height=400"
  }}
];

export const STORIES_VIDEOS = [
  {{
    id: 1,
    video: "/videos/video1.mp4"
  }},
  {{
    id: 2,
    video: "/videos/video2.mp4"
  }},
  {{
    id: 3,
    video: "/videos/video3.mp4"
  }},
  {{
    id: 4,
    video: "/videos/video4.mp4"
  }}
];

export const PRODUCTS = {json.dumps(processed_products, indent=2, ensure_ascii=False)};
"""

with open(r"c:\Users\walla\Downloads\HDSoluçõesMKT\Litran\src\data\catalogData.js", "w", encoding="utf-8") as f:
    f.write(output_code)

print("Successfully written catalogData.js with Python!")
