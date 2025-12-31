const COUNTRIES = {
  TR: { name: "Türkiye", currency: "TRY", symbol: "₺", warehouse: "Türkiye" },
  DE: { name: "Almanya", currency: "EUR", symbol: "€", warehouse: "Almanya" },
  FR: { name: "Fransa", currency: "EUR", symbol: "€", warehouse: "Almanya" },
  UK: { name: "İngiltere", currency: "GBP", symbol: "£", warehouse: "Almanya" },
  RU: { name: "Rusya", currency: "RUB", symbol: "₽", warehouse: "Almanya" },
};

const DEFAULT_PRODUCTS = [
  { id:"p1", name:"Alltayf Ürün 1", tag:"Market",
    price:{TRY:990, EUR:35, GBP:31, RUB:3200},
    stock:{TR:8, DE:3, FR:4, UK:5, RU:2}
  },
  { id:"p2", name:"Alltayf Ürün 2", tag:"Market",
    price:{TRY:1250, EUR:42, GBP:38, RUB:3900},
    stock:{TR:2, DE:1, FR:0, UK:2, RU:3}
  },
  { id:"p3", name:"Alltayf Ürün 3", tag:"Market",
    price:{TRY:1490, EUR:52, GBP:47, RUB:4600},
    stock:{TR:6, DE:2, FR:1, UK:3, RU:1}
  },
  { id:"p4", name:"Alltayf Ürün 4", tag:"Market",
    price:{TRY:790, EUR:27, GBP:25, RUB:2400},
    stock:{TR:10, DE:0, FR:2, UK:1, RU:0}
  },
  { id:"p5", name:"Alltayf Ürün 5", tag:"Market",
    price:{TRY:1890, EUR:69, GBP:62, RUB:6100},
    stock:{TR:1, DE:2, FR:3, UK:0, RU:0}
  },
  { id:"p6", name:"Alltayf Ürün 6", tag:"Market",
    price:{TRY:1090, EUR:39, GBP:36, RUB:3500},
    stock:{TR:4, DE:2, FR:0, UK:2, RU:1}
  },
];

const LS_KEY = "alltayf_market_v2";

const $ = (id) => document.getElementById(id);

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { country:"DE", products: DEFAULT_PRODUCTS, orders: [] };
    const s = JSON.parse(raw);
    if(!s?.products || !s?.orders) return { country:"DE", products: DEFAULT_PRODUCTS, orders: [] };
    return s;
  }catch{
    return { country:"DE", products: DEFAULT_PRODUCTS, orders: [] };
  }
}
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

let state = loadState();

function money(countryCode, value){
  return `${COUNTRIES[countryCode].symbol}${value}`;
}
function getPrice(p, c){
  const cur = COUNTRIES[c].currency;
  return p.price[cur] ?? p.price.EUR ?? 0;
}
function getStock(p, c){
  return p.stock[c] ?? 0;
}
function setStock(pid, c, n){
  const p = state.products.find(x => x.id === pid);
  if(!p) return;
  p.stock[c] = Math.max(0, n);
  saveState();
}

function totalStockCountry(c){
  return state.products.reduce((sum,p)=> sum + (p.stock[c] ?? 0), 0);
}
function totalsAll(){
  const totals = {};
  for(const code of Object.keys(COUNTRIES)) totals[code]=0;
  for(const p of state.products){
    for(const code of Object.keys(COUNTRIES)){
      totals[code] += (p.stock[code] ?? 0);
    }
  }
  return totals;
}
function makeId(){
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random()*999).toString().padStart(3,"0");
  return `#${t}-${r}`;
}

function render(){
  const c = state.country;
  $("country").value = c;

  $("metaCurrency").textContent = `Para Birimi: ${COUNTRIES[c].symbol}`;
  $("metaWarehouse").textContent = `Depo: ${COUNTRIES[c].warehouse}`;
  $("metaStock").textContent = `Toplam Stok: ${totalStockCountry(c)}`;

  $("btnWhatsApp").href = `https://wa.me/?text=${encodeURIComponent("Merhaba, ALLTAYF Market hakkında bilgi almak istiyorum.")}`;

  // Cards
  const grid = $("grid");
  grid.innerHTML = "";

  for(const p of state.products){
    const price = getPrice(p,c);
    const stock = getStock(p,c);
    const isOut = stock <= 0;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-inner">
        <div class="badges">
          <span class="badge">${p.tag} • ${COUNTRIES[c].name}</span>
          <span class="badge">${isOut ? "Stok Yok" : "Stok Var"}</span>
        </div>
        <div class="thumb"></div>
        <div class="title">${p.name}</div>
        <div class="kv">
          <span>Fiyat: <b>${money(c, price)}</b></span>
          <span>Stok: <b>${stock}</b></span>
        </div>
        <div class="actions">
          <button class="btn ${isOut ? "ghost" : "primary"}" data-buy="${p.id}" ${isOut ? "disabled" : ""}>
            ${isOut ? "Stok Yok" : "Satın Al"}
          </button>
          <button class="btn ghost" data-plus="${p.id}">+ Stok</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }

  // Summary
  const row = $("summaryRow");
  row.innerHTML = "";
  const totals = totalsAll();
  for(const code of Object.keys(COUNTRIES)){
    const d = document.createElement("div");
    d.className = "chip";
    d.textContent = `${COUNTRIES[code].name}: ${totals[code]} adet`;
    row.appendChild(d);
  }

  renderOrders();
}

function buy(pid){
  const c = state.country;
  const p = state.products.find(x=>x.id===pid);
  if(!p) return;

  const stock = getStock(p,c);
  if(stock <= 0) return;

  setStock(pid,c,stock-1);

  state.orders.push({
    id: makeId(),
    country: c,
    productId: pid,
    productName: p.name,
    priceText: money(c, getPrice(p,c)),
    status: "Ödendi",
    createdAt: Date.now()
  });

  saveState();
  render();
}

function plusStock(pid){
  const c = state.country;
  const p = state.products.find(x=>x.id===pid);
  if(!p) return;
  setStock(pid,c,getStock(p,c)+1);
  render();
}

function renderOrders(){
  const box = $("orders");
  box.innerHTML = "";

  if(state.orders.length === 0){
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = "Henüz sipariş yok.";
    box.appendChild(div);
    return;
  }

  for(const o of [...state.orders].reverse()){
    const el = document.createElement("div");
    el.className = "order";
    el.innerHTML = `
      <div class="left">
        <div class="id">${o.id}</div>
        <div class="sub">${COUNTRIES[o.country].name} • ${o.productName} • ${o.priceText} • ${o.status}</div>
      </div>
      <button class="btn ghost" data-cancel="${o.id}">İptal</button>
    `;
    box.appendChild(el);
  }
}

function cancelOrder(orderId){
  const o = state.orders.find(x=>x.id===orderId);
  if(!o) return;

  // stok geri ekle
  const p = state.products.find(x=>x.id===o.productId);
  if(p){
    const current = getStock(p, o.country);
    setStock(o.productId, o.country, current + 1);
  }

  // siparişi listeden kaldır (demo)
  state.orders = state.orders.filter(x=>x.id!==orderId);
  saveState();
  render();
}

// Events
$("country").addEventListener("change", () => {
  state.country = $("country").value;
  saveState();
  render();
});

document.addEventListener("click", (e) => {
  const t = e.target;

  if(t?.dataset?.buy) buy(t.dataset.buy);
  if(t?.dataset?.plus) plusStock(t.dataset.plus);

  if(t === $("btnOrders")) $("ordersModal").showModal();

  if(t?.dataset?.cancel) cancelOrder(t.dataset.cancel);

  if(t === $("btnClearOrders")){
    e.preventDefault();
    state.orders = [];
    saveState();
    render();
  }
});

render();
