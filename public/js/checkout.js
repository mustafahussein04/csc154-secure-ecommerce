const cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');
document.getElementById('cart-summary').textContent =
  cart.length ? `${cart.length} item(s) in cart, ready to review.` : 'Cart is empty — add items from the Products page.';

document.getElementById('place-order-btn').addEventListener('click', async () => {
  const msg = document.getElementById('msg');
  if (cart.length === 0) return showMessage(msg, 'Cart is empty.', true);
  try {
    const data = await apiFetch('/api/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: cart })
    });
    showMessage(msg, `Order #${data.orderId} placed successfully.`);
    localStorage.removeItem('demo_cart');
    document.getElementById('cart-summary').textContent = 'Cart is empty — add items from the Products page.';
    loadOrders();
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});

async function loadOrders() {
  const list = document.getElementById('orders-list');
  try {
    const orders = await apiFetch('/api/cart/orders');
    list.innerHTML = orders.length
      ? orders.map(o => `
          <div class="order-row">
            <span class="oid">#${o.id}</span>
            <span class="badge">${o.status}</span>
            <span class="ototal">$${(o.total_cents / 100).toFixed(2)}</span>
          </div>`).join('')
      : '<p class="muted" style="margin:0;">No orders yet.</p>';
  } catch (err) {
    list.innerHTML = '<p class="muted" style="margin:0;">Log in to view your orders.</p>';
  }
}
loadOrders();
