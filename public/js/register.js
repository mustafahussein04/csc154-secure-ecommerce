document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  try {
    const body = {
      username: document.getElementById('username').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      role: document.getElementById('role').value
    };
    const data = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    showMessage(msg, `Registered as ${data.role}. Redirecting…`);
    setTimeout(() => window.location.href = '/products.html', 800);
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});
