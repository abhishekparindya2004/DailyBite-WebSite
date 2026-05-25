/* app.js — DailyBite (front-end demo)
   Works with: index.html, menu.html, deals.html, cart.html, admin.html
   Data is stored in localStorage (products, cart, orders, announcements, admin session)
   Local images only — online image URLs are blocked in admin
*/

(() => {
  "use strict";

  // ---------- Storage helpers ----------
  const DB = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    del(key) {
      localStorage.removeItem(key);
    },
  };

  const KEYS = {
    products: "db_products",
    cart: "db_cart",
    orders: "db_orders",
    announcements: "db_announcements",
    adminSession: "db_admin_session",
  };

  // ---------- Seed data ----------
  const DEFAULT_PRODUCTS = [
    {
      id: "p1",
      name: "Classic Cheese Pizza",
      cat: "Pizza",
      price: 1890,
      badge: "Best Seller",
      img: "images/classic Cheese Pizza.jpeg"
    },
    {
      id: "p2",
      name: "Pepperoni Pizza",
      cat: "Pizza",
      price: 2290,
      badge: "Hot Deal",
      img: "images/pepperoni pizza.jpeg"
    },
    {
      id: "p3",
      name: "Chicken Burger",
      cat: "Burgers",
      price: 1290,
      badge: "New",
      img: "images/chicken Burger.png"
    },
    {
      id: "p4",
      name: "Crispy Fries",
      cat: "Sides",
      price: 690,
      badge: "Crunchy",
      img: "images/crispy-fries.jpeg"
    },
    {
      id: "p5",
      name: "Chicken Kottu",
      cat: "Sri Lankan",
      price: 1590,
      badge: "Local Fav",
      img: "images/chicken Kottu.jpeg"
    },
    {
      id: "p6",
      name: "Seafood Fried Rice",
      cat: "Sri Lankan",
      price: 1790,
      badge: "Chef Pick",
      img: "images/seafood Fried Rice.png"
    },
    {
      id: "p7",
      name: "Chocolate Brownie",
      cat: "Desserts",
      price: 890,
      badge: "Sweet",
      img: "images/chocolate Brownie.jpeg"
    },
    {
      id: "p8",
      name: "Iced Lemon Tea",
      cat: "Drinks",
      price: 490,
      badge: "Fresh",
      img: "images/iced Lemon Tea.png"
    },
  ];

  function seedIfEmpty() {
    const products = DB.get(KEYS.products, null);
    if (!Array.isArray(products) || products.length === 0) {
      DB.set(KEYS.products, DEFAULT_PRODUCTS);
    }

    const cart = DB.get(KEYS.cart, null);
    if (!cart || typeof cart !== "object") DB.set(KEYS.cart, { items: [] });

    const orders = DB.get(KEYS.orders, null);
    if (!Array.isArray(orders)) DB.set(KEYS.orders, []);

    const anns = DB.get(KEYS.announcements, null);
    if (!Array.isArray(anns) || anns.length === 0) {
      DB.set(KEYS.announcements, [
        {
          id: "a1",
          title: "Welcome to DailyBite!",
          msg: "Order in seconds — checkout is demo (no payments).",
          ts: Date.now(),
        },
      ]);
    }
  }

  seedIfEmpty();

  // ---------- Utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK")}`;

  const uid = (prefix = "id") =>
    `${prefix}_${Math.random().toString(16).slice(2, 8)}_${Date.now().toString(16)}`;

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nowLabel(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  }

  function isOnlineImagePath(path) {
    const value = String(path || "").trim().toLowerCase();
    return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//");
  }



  // ---------- Global state getters ----------
  function getProducts() {
    const p = DB.get(KEYS.products, []);
    return Array.isArray(p) ? p : [];
  }

  function setProducts(list) {
    DB.set(KEYS.products, list);
  }

  function getCart() {
    const c = DB.get(KEYS.cart, { items: [] });
    if (!c || typeof c !== "object") return { items: [] };
    if (!Array.isArray(c.items)) c.items = [];
    return c;
  }

  function setCart(cart) {
    DB.set(KEYS.cart, cart);
    updateCartCountUI();
  }

  function cartCount() {
    const c = getCart();
    return c.items.reduce((sum, it) => sum + (it.qty || 0), 0);
  }

  function getOrders() {
    const o = DB.get(KEYS.orders, []);
    return Array.isArray(o) ? o : [];
  }

  function setOrders(list) {
    DB.set(KEYS.orders, list);
  }

  function getAnnouncements() {
    const a = DB.get(KEYS.announcements, []);
    return Array.isArray(a) ? a : [];
  }

  function setAnnouncements(list) {
    DB.set(KEYS.announcements, list);
  }

  // ---------- Toast ----------
  function ensureToast() {
    let t = $(".toast");
    if (t) return t;

    t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<div class="t" id="toastTitle"></div><div class="m" id="toastMsg"></div>`;
    document.body.appendChild(t);
    return t;
  }

  let toastTimer = null;
  function toast(title, msg, ms = 2800) {
    const t = ensureToast();
    $("#toastTitle", t).textContent = title || "Notice";
    $("#toastMsg", t).textContent = msg || "";
    t.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  function maybeShowAnnouncement() {
    try {
      const anns = getAnnouncements();
      if (!anns.length) return;
      const newest = anns.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
      const seenKey = "db_seen_announcement";
      const seen = sessionStorage.getItem(seenKey);
      if (seen === String(newest.id)) return;
      sessionStorage.setItem(seenKey, String(newest.id));
      toast(newest.title, newest.msg, 3200);
    } catch {
      // ignore
    }
  }

function addToCart(productId){
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(item => item.id === productId);

  if(existing){
    existing.qty += 1;
  }else{
    cart.push({
      id: productId,
      qty: 1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  alert("Item added to cart");
}
document.addEventListener("click", function(e){

  if(e.target.matches("[data-add]")){

    const productId = e.target.getAttribute("data-add");

    addToCart(productId);

  }

});
  // ---------- Global UI bindings ----------
  function updateCartCountUI() {
    const n = cartCount();
    $$("#cartCount").forEach((el) => (el.textContent = String(n)));
  }

  function bindAddButtons(root = document) {
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (!btn) return;
      const id = btn.getAttribute("data-add");
      addToCart(id, 1);
    });
  }

  // ---------- Mobile nav ----------
  function setupMobileNav() {
    const hamburger = $("#hamburger");
    if (!hamburger) return;

    const existing = $(".mobile-drawer");
    if (existing) return;

    const drawer = document.createElement("div");
    drawer.className = "mobile-drawer";
    drawer.style.display = "none";

    const nav = $(".nav");
    const links = nav ? nav.innerHTML : `
      <a href="index.html">Home</a>
      <a href="menu.html">Menu</a>
      <a href="deals.html">Deals</a>
      <a href="cart.html">Cart</a>
      <a href="admin.html">Admin</a>
    `;

    drawer.innerHTML = `
      <div class="drawer-panel" style="
        position:absolute; right:16px; top:16px;
        width:min(360px, calc(100% - 32px));
        background:#fff; border:1px solid rgba(2,6,23,.10);
        border-radius:18px; padding:12px; box-shadow: 0 20px 40px rgba(2,6,23,.25);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:6px 6px 10px">
          <strong style="font-size:14px">Menu</strong>
          <button id="drawerClose" class="icon-btn" aria-label="Close" title="Close" style="width:40px;height:40px">✕</button>
        </div>
        <div class="drawer-links" style="display:flex; flex-direction:column; gap:8px; padding:6px">
          ${links}
        </div>
      </div>
    `;

    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) hide();
    });

    function show() {
      drawer.style.position = "fixed";
      drawer.style.inset = "0";
      drawer.style.background = "rgba(2,6,23,.45)";
      drawer.style.backdropFilter = "blur(3px)";
      drawer.style.zIndex = "999";
      drawer.style.display = "block";
      document.body.style.overflow = "hidden";
    }

    function hide() {
      drawer.style.display = "none";
      document.body.style.overflow = "";
    }

    document.body.appendChild(drawer);

    hamburger.addEventListener("click", show);
    $("#drawerClose", drawer)?.addEventListener("click", hide);
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", hide));
  }

  // ---------- Product card templates ----------
  function productCard(p) {
    const imgPath = safeImagePath(p.img);

    return `
      <div class="product">
        <div class="img">
          <img src="${escapeHtml(imgPath)}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="body">
          <div class="tag"><span>${escapeHtml(p.cat)}</span><span>${escapeHtml(p.badge || "Popular")}</span></div>
          <div style="font-weight:900">${escapeHtml(p.name)}</div>
          <div style="color:var(--muted); font-weight:600; font-size:13px">Freshly prepared • Delivery &amp; pickup</div>
          <div class="price-row">
            <div class="price">${money(p.price)}</div>
            <button class="add" data-add="${escapeHtml(p.id)}">Add</button>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Home page rendering ----------
  function renderHome() {
    const featuredGrid = $("#featuredGrid");
    const trendingGrid = $("#trendingGrid");
    if (!featuredGrid && !trendingGrid) return;

    const products = getProducts();

    if (featuredGrid) {
      const featured = products.slice(0, 4);
      featuredGrid.innerHTML = featured.map(productCard).join("");
    }

    if (trendingGrid) {
      const trending = products.slice(Math.max(0, products.length - 4));
      trendingGrid.innerHTML = trending.map(productCard).join("");
    }
  }

  // ---------- Menu page rendering ----------
  function renderMenu() {
    const grid = $("#menuGrid");
    if (!grid) return;

    const products = getProducts();
    let currentFilter = "All";

    function draw() {
      const list =
        currentFilter === "All" ? products : products.filter((p) => p.cat === currentFilter);

      grid.innerHTML =
        list.map(productCard).join("") ||
        `
        <div class="card" style="padding:16px; grid-column: 1/-1">
          <strong>No items</strong>
          <div style="color:var(--muted); font-weight:700; margin-top:6px">Try another category.</div>
        </div>
      `;
    }

    $$(".filters [data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".filters .chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.getAttribute("data-filter") || "All";
        draw();
      });
    });

    draw();
  }

  // ---------- Deals page rendering ----------
  function renderDeals() {
    const grid = $("#dealsGrid");
    if (!grid) return;

    const products = getProducts();
    grid.innerHTML = products.map(productCard).join("");
  }

  // ---------- Cart page rendering ----------
  function renderCart() {
    const root = $("#cartRoot");
    if (!root) return;

    const products = getProducts();
    const c = getCart();
    const items = c.items
      .map((it) => {
        const p = products.find((x) => x.id === it.id);
        if (!p) return null;
        return { ...it, p, line: (it.qty || 0) * (p.price || 0) };
      })
      .filter(Boolean);

    const subtotal = items.reduce((s, r) => s + r.line, 0);
    const delivery = subtotal > 0 ? 0 : 0;
    const total = subtotal + delivery;

    const cartHtml =
      items.length === 0
        ? `
      <div class="cart">
        <div class="row head">
          <div>Item</div><div>Price</div><div>Qty</div><div></div>
        </div>
        <div class="row">
          <div style="grid-column:1/-1;color:var(--muted);font-weight:800">
            Your cart is empty. Go to Menu and add something 🔥
          </div>
        </div>
      </div>
    `
        : `
      <div class="cart">
        <div class="row head">
          <div>Item</div><div>Price</div><div>Qty</div><div></div>
        </div>
        ${items
          .map((r) => {
            const imgPath = safeImagePath(r.p.img);
            return `
          <div class="row" data-row="${escapeHtml(r.id)}">
            <div style="display:flex; gap:12px; align-items:center">
              <div style="width:56px; height:42px; border-radius:12px; overflow:hidden; background:#eee; flex-shrink:0;">
                <img src="${escapeHtml(imgPath)}" alt="${escapeHtml(r.p.name)}" style="width:100%; height:100%; object-fit:cover; display:block;">
              </div>
              <div>
                <div style="font-weight:900">${escapeHtml(r.p.name)}</div>
                <div style="font-size:12px; color:var(--muted); font-weight:700">${escapeHtml(r.p.cat)} • ${escapeHtml(r.p.badge || "")}</div>
              </div>
            </div>
            <div style="font-weight:900">${money(r.p.price)}</div>
            <div class="qty">
              <button type="button" data-dec="${escapeHtml(r.id)}">−</button>
              <span>${Number(r.qty || 1)}</span>
              <button type="button" data-inc="${escapeHtml(r.id)}">+</button>
            </div>
            <button class="remove" type="button" data-remove="${escapeHtml(r.id)}">Remove</button>
          </div>
        `;
          })
          .join("")}
      </div>
    `;

    const summaryHtml = `
      <div class="cart-summary">
        <div class="summary">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:900;font-size:16px">Summary</div>
            <div class="pill">Demo Checkout</div>
          </div>
          <div class="line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
          <div class="line"><span>Delivery</span><strong>${money(delivery)}</strong></div>
          <div class="line total"><span><strong>Total</strong></span><strong>${money(total)}</strong></div>
          <div class="actions" style="margin-top:12px">
            <button class="primary" id="checkoutBtn" ${items.length ? "" : "disabled"}>Place Order</button>
            ${items.length ? `<button class="chip" id="clearCartBtn" type="button">Clear Cart</button>` : ""}
          </div>
          <div style="margin-top:10px;color:var(--muted);font-size:12px;font-weight:700">
            Orders are stored locally in your browser (localStorage).
          </div>
        </div>
      </div>
    `;

    root.innerHTML = `<div class="cartWrap">${cartHtml}${summaryHtml}</div>`;
  }

  function bindCartActions() {
    const root = $("#cartRoot");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("click", (e) => {
      const incBtn = e.target.closest("[data-inc]");
      const decBtn = e.target.closest("[data-dec]");
      const remBtn = e.target.closest("[data-remove]");

      if (incBtn) {
        incQty(incBtn.getAttribute("data-inc"));
        return;
      }

      if (decBtn) {
        decQty(decBtn.getAttribute("data-dec"));
        return;
      }

      if (remBtn) {
        removeFromCart(remBtn.getAttribute("data-remove"));
        return;
      }

      if (e.target && e.target.id === "clearCartBtn") {
        clearCart();
        renderCart();
        toast("Cart cleared", "Your cart is now empty.");
        return;
      }

      if (e.target && e.target.id === "checkoutBtn") {
        placeOrderFromCart();
      }
    });

    root.dataset.bound = "true";
  }

  function placeOrderFromCart() {
    const products = getProducts();
    const c = getCart();
    if (!c.items.length) return;

    const lines = c.items
      .map((it) => {
        const p = products.find((x) => x.id === it.id);
        if (!p) return null;
        return { id: p.id, name: p.name, price: p.price, qty: it.qty, img: p.img };
      })
      .filter(Boolean);

    const total = lines.reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0);

    const orders = getOrders();
    const order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      ts: Date.now(),
      status: "Pending",
      items: lines,
      total,
    };

    orders.unshift(order);
    setOrders(orders);

    clearCart();
    renderCart();
    toast("Order placed!", `${order.id} • ${money(order.total)}`);
  }

  // ---------- Admin auth ----------
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "admin123";
  const ADMIN_SESSION_HOURS = 8;

  function getAdminSession() {
    const s = DB.get(KEYS.adminSession, null);
    if (!s || typeof s !== "object") return null;
    if (!s.expiresAt) return null;
    if (Date.now() > s.expiresAt) return null;
    return s;
  }

  function setAdminSession() {
    const expiresAt = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
    DB.set(KEYS.adminSession, { user: ADMIN_USER, expiresAt });
  }

  function clearAdminSession() {
    DB.del(KEYS.adminSession);
  }

  // ---------- Admin page rendering ----------
  function setupAdmin() {
    const page = document.body?.getAttribute("data-page");
    if (page !== "admin") return;

    const loginView = $("#adminLoginView");
    const appView = $("#adminAppView");
    const loginForm = $("#adminLoginForm");
    const logoutBtn = $("#adminLogoutBtn");

    function showLogin() {
      if (loginView) loginView.style.display = "block";
      if (appView) appView.style.display = "none";
    }

    function showApp() {
      if (loginView) loginView.style.display = "none";
      if (appView) appView.style.display = "block";
    }

    if (!getAdminSession()) showLogin();
    else showApp();

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = ($("#adminUser")?.value || "").trim();
        const p = ($("#adminPass")?.value || "").trim();

        if (u === ADMIN_USER && p === ADMIN_PASS) {
          setAdminSession();
          showApp();
          toast("Welcome Admin", "Session started.");
          renderAdminAll();
        } else {
          toast("Login failed", "Check username/password (hint shown above).");
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        clearAdminSession();
        showLogin();
        toast("Logged out", "Admin session ended.");
      });
    }

    $$("[data-admin-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$("[data-admin-tab]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.getAttribute("data-admin-tab");

        $$("[data-admin-panel]").forEach((p) => (p.style.display = "none"));
        const panel = $(`[data-admin-panel="${tab}"]`);
        if (panel) panel.style.display = "block";
      });
    });

    const productForm = $("#productForm");
    if (productForm) {
      productForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const id = ($("#p_id")?.value || "").trim();
        const name = ($("#p_name")?.value || "").trim();
        const cat = ($("#p_cat")?.value || "").trim() || "Other";
        const price = Number(($("#p_price")?.value || "").trim() || 0);
        const badge = ($("#p_badge")?.value || "").trim() || "Popular";
        const img = ($("#p_img")?.value || "").trim();

        if (!name || !price) {
          toast("Missing fields", "Name and Price are required.");
          return;
        }

        if (img && isOnlineImagePath(img)) {
          toast("Invalid image", "Use only local image paths like images/photo.png");
          return;
        }

        const products = getProducts();

        if (id) {
          const idx = products.findIndex((p) => p.id === id);
          if (idx >= 0) {
            products[idx] = { ...products[idx], name, cat, price, badge, img };
            setProducts(products);
            toast("Updated", `${name} updated.`);
          }
        } else {
          const newId = `p${Math.max(0, ...products.map((p) => Number(String(p.id).replace("p", "")) || 0)) + 1}`;
          products.push({ id: newId, name, cat, price, badge, img });
          setProducts(products);
          toast("Created", `${name} added as ${newId}.`);
        }

        productForm.reset();
        if ($("#p_id")) $("#p_id").value = "";
        renderAdminProducts();
        renderHome();
        renderMenu();
        renderDeals();
      });
    }

    const annForm = $("#announcementForm");
    if (annForm) {
      annForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const title = ($("#a_title")?.value || "").trim();
        const msg = ($("#a_msg")?.value || "").trim();

        if (!title || !msg) {
          toast("Missing fields", "Title and Message required.");
          return;
        }

        const anns = getAnnouncements();
        const a = { id: uid("a"), title, msg, ts: Date.now() };
        anns.unshift(a);
        setAnnouncements(anns);

        annForm.reset();
        renderAdminAnnouncements();
        toast(title, msg, 3500);
      });
    }

    document.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit]");
      if (editBtn) {
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const id = editBtn.getAttribute("data-edit");
        const p = getProducts().find((x) => x.id === id);
        if (!p) return;

        if ($("#p_id")) $("#p_id").value = p.id;
        if ($("#p_name")) $("#p_name").value = p.name;
        if ($("#p_cat")) $("#p_cat").value = p.cat;
        if ($("#p_price")) $("#p_price").value = p.price;
        if ($("#p_badge")) $("#p_badge").value = p.badge || "";
        if ($("#p_img")) $("#p_img").value = p.img || "";
        toast("Edit mode", `Editing ${p.id}`);
        return;
      }

      const delBtn = e.target.closest("[data-del]");
      if (delBtn) {
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const id = delBtn.getAttribute("data-del");
        const products = getProducts().filter((p) => p.id !== id);
        setProducts(products);

        const c = getCart();
        c.items = c.items.filter((it) => it.id !== id);
        setCart(c);

        toast("Deleted", `${id} removed.`);
        renderAdminProducts();
        renderHome();
        renderMenu();
        renderDeals();
        renderCart();
        return;
      }

      const ordSet = e.target.closest("[data-ord-status]");
      if (ordSet) {
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const id = ordSet.getAttribute("data-ord-id");
        const status = ordSet.getAttribute("data-ord-status");
        const orders = getOrders();
        const o = orders.find((x) => x.id === id);

        if (o) {
          o.status = status;
          setOrders(orders);
          toast("Order updated", `${id} → ${status}`);
          renderAdminOrders();
        }
        return;
      }

      const ordDel = e.target.closest("[data-ord-del]");
      if (ordDel) {
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const id = ordDel.getAttribute("data-ord-del");
        const orders = getOrders().filter((o) => o.id !== id);
        setOrders(orders);
        toast("Order removed", `${id} deleted.`);
        renderAdminOrders();
        return;
      }

      const annDel = e.target.closest("[data-ann-del]");
      if (annDel) {
        if (!getAdminSession()) {
          toast("Admin required", "Please login again.");
          return;
        }

        const id = annDel.getAttribute("data-ann-del");
        const anns = getAnnouncements().filter((a) => a.id !== id);
        setAnnouncements(anns);
        toast("Deleted", "Notification removed.");
        renderAdminAnnouncements();
      }
    });

    renderAdminAll();
  }

  function renderAdminAll() {
    if (document.body?.getAttribute("data-page") !== "admin") return;
    if (!getAdminSession()) return;

    renderAdminProducts();
    renderAdminOrders();
    renderAdminAnnouncements();
  }

  function renderAdminProducts() {
    const tbody = $("#prodTbody");
    if (!tbody) return;

    const products = getProducts();
    tbody.innerHTML = products
      .map(
        (p) => `
      <tr>
        <td><strong>${escapeHtml(p.id)}</strong></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.cat)}</td>
        <td>${money(p.price)}</td>
        <td>${escapeHtml(p.badge || "")}</td>
        <td>
          <button class="chip" data-edit="${escapeHtml(p.id)}">Edit</button>
          <button class="chip" style="border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.08); color: var(--hot)" data-del="${escapeHtml(p.id)}">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function renderAdminOrders() {
    const tbody = $("#ordTbody");
    if (!tbody) return;

    const orders = getOrders();
    if (!orders.length) {
      tbody.innerHTML = `
        <tr><td colspan="6" style="color:var(--muted); font-weight:800; padding:14px">
          No orders yet. Go to Cart → Place Order (demo).
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = orders
      .map((o) => {
        const itemsCount = (o.items || []).reduce((s, it) => s + (it.qty || 0), 0);
        return `
        <tr>
          <td><strong>${escapeHtml(o.id)}</strong></td>
          <td>${escapeHtml(nowLabel(o.ts))}</td>
          <td>${itemsCount} item(s)</td>
          <td>${money(o.total)}</td>
          <td><span class="pill">${escapeHtml(o.status || "Pending")}</span></td>
          <td style="display:flex; gap:8px; flex-wrap:wrap">
            <button class="chip" data-ord-id="${escapeHtml(o.id)}" data-ord-status="Pending">Pending</button>
            <button class="chip" data-ord-id="${escapeHtml(o.id)}" data-ord-status="Preparing">Preparing</button>
            <button class="chip" data-ord-id="${escapeHtml(o.id)}" data-ord-status="Delivered">Delivered</button>
            <button class="chip" style="border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.08); color: var(--hot)" data-ord-del="${escapeHtml(o.id)}">Delete</button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function renderAdminAnnouncements() {
    const tbody = $("#annTbody");
    if (!tbody) return;

    const anns = getAnnouncements();
    if (!anns.length) {
      tbody.innerHTML = `
        <tr><td colspan="3" style="color:var(--muted); font-weight:800; padding:14px">
          No notifications yet.
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = anns
      .map(
        (a) => `
      <tr>
        <td>
          <strong>${escapeHtml(a.title)}</strong>
          <div style="color:var(--muted);font-weight:600;font-size:12px;margin-top:4px">${escapeHtml(a.msg)}</div>
        </td>
        <td>${escapeHtml(nowLabel(a.ts))}</td>
        <td>
          <button class="chip" style="border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.08); color: var(--hot)" data-ann-del="${escapeHtml(a.id)}">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // ---------- Init ----------
  function init() {
    updateCartCountUI();
    bindAddButtons(document);
    setupMobileNav();
    maybeShowAnnouncement();

    const page = document.body?.getAttribute("data-page") || "";

    renderHome();
    renderMenu();
    renderDeals();
    renderCart();
    bindCartActions();
    setupAdmin();

    window.addEventListener("storage", () => {
      updateCartCountUI();
      renderHome();
      renderMenu();
      renderDeals();
      renderCart();
      if (page === "admin") renderAdminAll();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();