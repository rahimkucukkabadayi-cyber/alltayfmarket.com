/* ALLTAYF Market — Fatura -> Stok Demo (localStorage)
   - Ülke bazlı stok
   - Fatura metninden ürün satırı okuma (AI yok, kural var)
   - Ürün eşleştirme: SKU varsa SKU, yoksa isim üzerinden
*/

const LS_KEY = "alltayf_market_invoice_demo_v1";

const COUNTRIES = {
  TR: { name: "Türkiye", currency: "TRY", symbol: "₺", warehouse: "Türkiye" },
  DE: { name: "Almanya", currency: "EUR", symbol: "€", warehouse: "Almanya" },
  FR: { name: "Fransa",  currency: "EUR", symbol: "€", warehouse: "Almanya" }, // depo yine Almanya varsayımı
  RU: { name: "Rusya",   currency: "RUB", symbol: "₽", warehouse: "Almanya" },
  UK: { name: "İngiltere",currency:"GBP", symbol: "£", warehouse: "Almanya" },
};

const DEFAULT_PRODUCTS = [
  { sku: "A-100", name: "Alltayf Ürün 1", basePrice: { TRY: 990, EUR: 35, GBP: 31, RUB: 3200 }, stock: { TR: 0, DE: 0, FR: 0, RU: 0, UK: 0 } },
  { sku: "A-200", name: "Alltayf Ürün 2", basePrice: { TRY: 1250, EUR: 42, GBP: 38, RUB: 3900 }, stock: { TR: 0, DE: 0, FR: 0, RU: 0, UK: 0 } },
  { sku: "A-300", name: "Alltayf Ürün 3", basePrice: { TRY: 1490, EUR: 52, GBP: 47, RUB: 4600 }, stock: { TR: 0, DE: 0, FR: 0, RU: 0, UK: 0 } },
];

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { country:"DE", products: structuredClone(DEFAULT_PRODUCTS), logs: [], parsedDraft: null };
    const parsed = JSON.parse(raw);
    if(!parsed?.products || !parsed?.country) throw new Error("bad schema");
    return { country: parsed.country, products: parsed.products, logs: parsed.logs || [], parsedDraft: null };
  }catch{
    return { country:"DE", products: structuredClone(DEFAULT_PRODUCTS), logs: [], parsedDraft: null };
  }
}
function saveState(){
  const toSave = { country: state.country, products: state.products, logs: state.logs };
  localStorage.setItem(LS_KEY, JSON.stringify(toSave));
}

let state = loadState();

/* DOM */
const elCountry = document.getElementById("countrySelect");
const elGrid = document.getElementById("productsGrid");
const elSummaryRow = document.getElementById("summaryRow");
const pillCurrency = document.getElementById("pillCurrency");
const pillWarehouse = document.getElementById("pillWarehouse");
const pillTotal = document.getElementById("pillTotalStock");

const elInvoice = document.getElementById("invoiceInput");
const btnParse = document.getElementById("btnParse");
const btnApply = document.getElementById("btnApply");
const btnReset = document.getElementById("btnReset");
const elPreview = document.getElementById("preview");

const btnOrders = document.getElementById("btnOrders");
const modal = document.getElementById("ordersModal");
const ordersList = document.getElementById("ordersList");

const btnWhatsapp = document.getElementById("btnWhatsapp");
btnWhatsapp.href = "https://wa.me/?text=" + encodeURIComponent("Merhaba, ALLTAYF Market hakkında bilgi almak istiyorum.");

elCountry.value = state.country;

/* Helpers */
function money(symbol, n){
  const val = (typeof n === "number" && isFinite(n)) ? n : 0;
  return `${symbol}${val}`;
}
function getPrice(p){
  const cur = COUNTRIES[state.country].currency;
  return p.basePrice?.[cur] ?? p.basePrice?.EUR ?? 0;
}
function getStock(p, code){ return (p.stock?.[code] ?? 0); }
function setStock(p, code, newVal){
  if(!p.stock) p.stock = { TR:0, DE:0, FR:0, RU:0, UK:0 };
  p.stock[code] = Math.max(0, Number(newVal || 0));
}
function totalStockForCountry(code){
  return state.products.reduce((sum,p)=>sum + (getStock(p, code) || 0), 0);
}
function totalStockAll(){
  const codes = Object.keys(COUNTRIES);
  const totals = {};
  for(const c of codes) totals[c] = 0;
  for(const p of state.products){
    for(const c of codes) totals[c] += (getStock(p,c) || 0);
  }
  return totals;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* Render */
function render(){
  const meta = COUNTRIES[state.country];
  pillCurrency.textContent = meta.symbol;
  pillWarehouse.textContent = meta.warehouse;
  pillTotal.textContent = String(totalStockForCountry(state.country));

  // cards
  elGrid.innerHTML = "";
  for(const p of state.products){
    const stock = getStock(p, state.country);
    const disabled = stock <= 0;
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="badges">
        <span class="badge">Market · ${meta.name}</span>
        <span class="badge ${disabled ? "no" : "ok"}">${disabled ? "Stok Yok" : "Stok Var"}</span>
      </div>
      <div class="thumb"></div>
      <h3 class="title">${escapeHtml(p.name)}</h3>
      <div class="meta">
        <div>SKU: <b>${escapeHtml(p.sku || "-")}</b></div>
        <div>Fiyat: <b>${money(meta.symbol, getPrice(p))}</b></div>
        <div>Stok: <b>${stock}</b></div>
      </div>
      <div class="card-actions">
        <button class="btn ${disabled ? "" : "primary"}" data-buy="${escapeHtml(p.sku || p.name)}" ${disabled ? "disabled" : ""}>Satın Al</button>
        <button class="btn ghost" data-add="${escapeHtml(p.sku || p.name)}">+ Stok</button>
      </div>
    `;
    elGrid.appendChild(card);
  }

  // summary
  const totals = totalStockAll();
  elSummaryRow.innerHTML = "";
  for(const code of Object.keys(COUNTRIES)){
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = `${COUNTRIES[code].name}: ${totals[code]} adet`;
    elSummaryRow.appendChild(chip);
  }

  // bind card actions (simple demo)
  elGrid.querySelectorAll("[data-buy]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.getAttribute("data-buy");
      const p = findProduct(key);
      if(!p) return;
      const before = getStock(p, state.country);
      if(before <= 0) return;
      setStock(p, state.country, before - 1);
      state.logs.unshift({
        at: new Date().toISOString(),
        type: "SALE",
        country: state.country,
        sku: p.sku || "",
        name: p.name,
        qty: 1
      });
      saveState();
      render();
    });
  });

  elGrid.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.getAttribute("data-add");
      const p = findProduct(key);
      if(!p) return;
      const before = getStock(p, state.country);
      setStock(p, state.country, before + 1);
      state.logs.unshift({
        at: new Date().toISOString(),
        type: "MANUAL_ADD",
        country: state.country,
        sku: p.sku || "",
        name: p.name,
        qty: 1
      });
      saveState();
      render();
    });
  });

  // modal content
  renderLogs();
}

function renderLogs(){
  ordersList.innerHTML = "";
  if(!state.logs.length){
    ordersList.innerHTML = `<div class="muted">Henüz kayıt yok.</div>`;
    return;
  }
  for(const l of state.logs.slice(0, 50)){
    const c = COUNTRIES[l.country]?.name || l.country;
    const item = document.createElement("div");
    item.className = "order";
    item.innerHTML = `
      <div><b>${l.type}</b> · ${escapeHtml(c)} · <b>${escapeHtml(l.name)}</b> (${escapeHtml(l.sku||"-")})</div>
      <div class="row">
        <span>Adet: <b>${l.qty}</b></span>
        <span>Zaman: <b>${new Date(l.at).toLocaleString()}</b></span>
      </div>
    `;
    ordersList.appendChild(item);
  }
}

/* Product find/match */
function normalize(s){
  return String(s || "").toLowerCase().replace(/\s+/g," ").trim();
}
function findProduct(key){
  // key can be SKU or name
  const k = normalize(key);
  return state.products.find(p => normalize(p.sku) === k) || state.products.find(p => normalize(p.name) === k) || null;
}

/* Invoice parsing
   Accepts lines like:
   SKU: A-100 | Ürün: Alltayf Ürün 1 | Adet: 2 | Fiyat: 45
   or:
   A-100; Alltayf Ürün 1; 2; 45
   or:
   A-100 Alltayf Ürün 1 x2 45
*/
function parseInvoice(text){
  const lines = String(text || "").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const items = [];

  for(const line of lines){
    // Try pipe format
    let sku = "", name = "", qty = 0, price = null;

    if(line.includes("|")){
      const parts = line.split("|").map(p=>p.trim());
      for(const part of parts){
        const p = part.toLowerCase();
        if(p.startsWith("sku")) sku = part.split(":").slice(1).join(":").trim();
        else if(p.startsWith("ürün") || p.startsWith("urun") || p.startsWith("product")) name = part.split(":").slice(1).join(":").trim();
        else if(p.startsWith("adet") || p.startsWith("qty") || p.startsWith("miktar")) qty = Number(part.split(":").slice(1).join(":").trim());
        else if(p.startsWith("fiyat") || p.startsWith("price")) price = Number(part.split(":").slice(1).join(":").trim());
      }
    } else if(line.includes(";")){
      // semicolon CSV: sku; name; qty; price
      const parts = line.split(";").map(p=>p.trim());
      sku = parts[0] || "";
      name = parts[1] || "";
      qty = Number(parts[2] || 0);
      price = parts[3] != null ? Number(parts[3]) : null;
    } else {
      // loose: try "x2" qty
      const mQty = line.match(/x\s*(\d+)/i);
      if(mQty) qty = Number(mQty[1] || 0);
      // sku = first token like A-100
      const mSku = line.match(/^([A-Z0-9]+[-_][A-Z0-9]+)\b/i);
      if(mSku) sku = mSku[1];
      // price = last number
      const mPrice = line.match(/(\d+(?:[.,]\d+)?)\s*$/);
      if(mPrice) price = Number(String(mPrice[1]).replace(",", "."));
      // name = remove sku, qty, price fragments
      name = line
        .replace(mSku?.[0] || "", "")
        .replace(mQty?.[0] || "", "")
        .replace(mPrice?.[0] || "", "")
        .replace(/[-|]+/g," ")
        .trim();
    }

    if(!isFinite(qty) || qty <= 0) qty = 0;

    // minimal validity: must have name or sku and qty>0
    if(qty > 0 && (sku || name)){
      items.push({ sku: sku.trim(), name: name.trim() || "(İsimsiz)", qty, price: (price!=null && isFinite(price)) ? price : null, raw: line });
    }
  }

  return items;
}

function draftApply(items){
  // For each item: match existing product by SKU first; if not found create
  const code = state.country;
  const cur = COUNTRIES[code].currency;

  const created = [];
  const updated = [];

  for(const it of items){
    let p = null;
    if(it.sku) p = state.products.find(x => normalize(x.sku) === normalize(it.sku));
    if(!p && it.name) p = state.products.find(x => normalize(x.name) === normalize(it.name));

    if(!p){
      // create new product
      const newSku = it.sku || `NEW-${Date.now().toString(36).toUpperCase()}`;
      p = {
        sku: newSku,
        name: it.name || "Yeni Ürün",
        basePrice: { TRY: 0, EUR: 0, GBP: 0, RUB: 0 },
        stock: { TR:0, DE:0, FR:0, RU:0, UK:0 }
      };
      if(it.price != null){
        // if current currency is known, set that
        p.basePrice[cur] = it.price;
      }
      state.products.unshift(p);
      created.push({ sku: p.sku, name: p.name, qty: it.qty });
    } else {
      // update price optionally
      if(it.price != null && p.basePrice){
        p.basePrice[cur] = it.price;
      }
      updated.push({ sku: p.sku, name: p.name, qty: it.qty });
    }

    const before = getStock(p, code);
    setStock(p, code, before + it.qty);
    state.logs.unshift({
      at: new Date().toISOString(),
      type: "INVOICE_ADD",
      country: code,
      sku: p.sku || "",
      name: p.name,
      qty: it.qty
    });
  }

  saveState();
  return { created, updated };
}

/* Events */
elCountry.addEventListener("change", ()=>{
  state.country = elCountry.value;
  saveState();
  render();
});

btnParse.addEventListener("click", ()=>{
  const items = parseInvoice(elInvoice.value);
  state.parsedDraft = items;

  if(!items.length){
    elPreview.innerHTML = `<div class="muted">Hiç satır okunamadı. Format örneğini kullan.</div>`;
    btnApply.disabled = true;
    return;
  }

  const list = items.map((it, i)=>`
    <div class="order">
      <div><b>${i+1}.</b> ${escapeHtml(it.name)} ${it.sku ? `(<b>${escapeHtml(it.sku)}</b>)` : ""}</div>
      <div class="row">
        <span>Adet: <b>${it.qty}</b></span>
        <span>Fiyat: <b>${it.price != null ? it.price : "-"}</b></span>
      </div>
      <div class="row"><span class="muted">Kaynak: ${escapeHtml(it.raw)}</span></div>
    </div>
  `).join("");

  elPreview.innerHTML = `
    <div class="muted">Okunan satırlar (ülke: <b>${escapeHtml(COUNTRIES[state.country].name)}</b>)</div>
    <div style="margin-top:10px">${list}</div>
  `;
  btnApply.disabled = false;
});

btnApply.addEventListener("click", ()=>{
  const items = state.parsedDraft || [];
  if(!items.length) return;

  const res = draftApply(items);

  elPreview.innerHTML = `
    <div class="muted"><b>Stoğa eklendi ✅</b></div>
    <div style="margin-top:10px" class="row">
      <span>Yeni ürün: <b>${res.created.length}</b></span>
      <span>Güncellenen: <b>${res.updated.length}</b></span>
    </div>
    <div class="muted" style="margin-top:10px">İstersen ülke seçimini değiştirip stokların ayrı kaldığını gör.</div>
  `;
  state.parsedDraft = null;
  btnApply.disabled = true;
  elInvoice.value = "";
  render();
});

btnReset.addEventListener("click", ()=>{
  if(!confirm("Tüm veriler (ürünler, stoklar, log) sıfırlansın mı?")) return;
  localStorage.removeItem(LS_KEY);
  state = loadState();
  elCountry.value = state.country;
  elInvoice.value = "";
  elPreview.innerHTML = `<div class="muted">Önizleme burada görünecek…</div>`;
  btnApply.disabled = true;
  render();
});

btnOrders.addEventListener("click", ()=>{
  modal.setAttribute("aria-hidden","false");
  renderLogs();
});

modal.addEventListener("click", (e)=>{
  const t = e.target;
  if(t?.dataset?.close === "1"){
    modal.setAttribute("aria-hidden","true");
  }
});

/* Initial demo invoice sample */
elInvoice.value = `SKU: A-100 | Ürün: Alltayf Ürün 1 | Adet: 2 | Fiyat: 45
SKU: A-200 | Ürün: Alltayf Ürün 2 | Adet: 3 | Fiyat: 37
SKU: A-999 | Ürün: Yeni Ürün Deneme | Adet: 4 | Fiyat: 19`;

render();
