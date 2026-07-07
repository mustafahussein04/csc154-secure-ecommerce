document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  try {
    const body = {
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
    };
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    showMessage(msg, `Welcome back, ${data.role}. Redirecting…`);
    setTimeout(() => window.location.href = '/products.html', 600);
  } catch (err) {
    showMessage(msg, err.message, true);
  }
});
