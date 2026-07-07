const grid = document.getElementById('product-grid');
const cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');

function renderProducts(products) {
  grid.innerHTML = '';
  if (products.length === 0) {
    grid.innerHTML = '<p class="muted">No products match your search.</p>';
    return;
  }
  for (const p of products) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <h4>${escapeHtml(p.name)}</h4>
      <p class="desc">${escapeHtml(p.description || '')}</p>
      <div class="price-row">
        <span class="price">$${(p.price_cents / 100).toFixed(2)}</span>
        <span class="stock">stock: ${p.stock}</span>
      </div>
      <button data-id="${p.id}" class="add-cart-btn secondary">Add to cart</button>
    `;
    grid.appendChild(card);
  }
  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.push({ productId: parseInt(btn.dataset.id), quantity: 1 });
      localStorage.setItem('demo_cart', JSON.stringify(cart));
      btn.textContent = 'Added ✓';
    });
  });
}

async function loadProducts(q = '') {
  const url = q ? `/api/products?q=${encodeURIComponent(q)}` : '/api/products';
  const products = await apiFetch(url);
  renderProducts(products);
}

document.getElementById('search').addEventListener('input', (e) => loadProducts(e.target.value));
loadProducts();

apiFetch('/api/auth/me').then(session => {
  if (['merchant', 'sysadmin', 'webadmin'].includes(session.role)) {
    document.getElementById('merchant-panel').style.display = 'block';
  }
}).catch(() => {});

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('add-msg');
  try {
    const body = {
      name: document.getElementById('p-name').value,
      description: document.getElementById('p-desc').value,
      price_cents: parseInt(document.getElementById('p-price').value, 10),
      stock: parseInt(document.getElementById('p-stock').value, 10)
    };
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(body) });
    showMessage(msg, 'Product added.');
    loadProducts();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});
