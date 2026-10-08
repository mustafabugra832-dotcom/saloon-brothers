export async function apiFetch(url, options = {}) {
  const savedUser = localStorage.getItem('saloon_user');
  let userId = '1';
  
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      if (u && u.id) userId = u.id.toString();
    } catch (e) {}
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}
