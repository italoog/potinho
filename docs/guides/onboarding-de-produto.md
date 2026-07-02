# Guia: Onboarding de Produto (3MF → Loja)

Como transformar um projeto do Bambu Studio em um produto personalizável no Forja3D.
**Nenhum código novo é necessário** — apenas conversão de asset + configuração de schema (PRD §12).

## Pré-requisitos do 3MF
1. Projeto salvo no Bambu Studio **montado** (o script usa a seção `<assemble>` do 3MF)
2. Texto personalizável criado com o **Text Tool** do Bambu (vira *negative part* — é assim que o script descobre a âncora, a fonte e o tamanho)
3. Cada parte que o cliente pode colorir deve ser um **objeto/parte separada**

## Passo a passo

### 1. Converter o 3MF em GLB
```bash
cd web
npx tsx scripts/convert-3mf-to-glb.ts "caminho/do/arquivo.3mf" public/models/<slug-do-produto> <ref-da-variante>
# ex.: npx tsx scripts/convert-3mf-to-glb.ts ../assets/models/comedouro-pet/15cm.3mf public/models/comedouro-pet 15cm
```
Saídas: `<ref>.glb` (malhas `base_mesh`, `bowl_mesh`, `part_N`… + node `name_slot`) e `asset-manifest.json`.

O script:
- usa a visão **montada** (não a de impressão), converte mm/Z-up → m/Y-up
- exclui a parte negativa do texto (o nome é renderizado dinamicamente na web)
- deriva a âncora do texto real de exemplo (posição, normal para fora, caixa de tamanho)
- comprime com quantização + meshopt (o comedouro ficou em 0,33 MB)

### 2. Guardar o 3MF de produção
Mover o original para `assets/models/<slug>/<ref>.3mf` — ele NUNCA é alterado; é o arquivo que o Épico 5 usará como base.

### 3. Fonte do texto
- A fonte de **produção** é a do Text Tool (ex.: Impact) — registrada no manifest para o Épico 5.
- A fonte **web** precisa de licença livre. Se a fonte de produção não for redistribuível (caso da Impact, fonte do sistema), escolha uma aproximação no Google Fonts (usamos **Anton**) e coloque o `.ttf` em `web/public/fonts/`.
- O visualizador mostra o disclaimer "representação aproximada" (mitigação do risco #2 do PRD).
- **Fidelidade máxima:** se possível, troque a fonte do Text Tool no próprio 3MF para a mesma fonte livre da web — aí tela e impressão ficam idênticas.

### 4. Cadastrar o produto (schema)
Criar o produto com `param_schema` apontando para os nomes das malhas do GLB:
- `text` → `anchor: "name_slot"`, `font` = fonte web
- `color` → `targets: ["base_mesh"]`, `["bowl_mesh"]`, `["name_text"]` (nome dinâmico)
- `select` (tamanho) → `variantRef` = ref da variante (um GLB por variante)

Referência viva: `web/src/db/seed-data.ts` (comedouro-pet).

### 5. Validar
```bash
npm run test   # inclui validação do GLB (nodes, tamanho, manifest)
```
E abrir a página do produto no navegador — girar, personalizar, conferir âncora do nome.

## Variantes de tamanho
Cada tamanho = um 3MF exportado do Bambu → um GLB (`15cm.glb`, `20cm.glb`…) + entrada em `variants[]` do produto com `variantRef` correspondente no parâmetro `select`.
