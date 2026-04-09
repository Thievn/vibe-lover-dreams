const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync(path.resolve('.env'), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx);
      let val = line.slice(idx + 1);
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      return [key, val];
    })
);

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('missing supabase env', !!url, !!key);
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  const email = 'thievnsden@gmail.com';
  const password = 'TestPassword123!';

  console.log('Testing sign-in with', email);
  const login = await supabase.auth.signInWithPassword({ email, password });
  console.log('login error:', login.error ? login.error.message : null);
  console.log('login session present:', !!login.data.session);

  console.log('Testing sign-up with', email);
  const signup = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: 'http://localhost:4173/auth' },
  });
  console.log('signup error:', signup.error ? signup.error.message : null);
  console.log('signup session present:', !!signup.data.session);
  console.log('signup user present:', !!signup.data.user);
})();
