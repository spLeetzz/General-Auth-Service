function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderLoginPage(params: { error?: string, resume?: string }) {
  const errHtml = params.error ? `<div class="err">${esc(params.error)}</div>` : '';
  const actionPath = params.resume ? `/authorize/login?resume=${encodeURIComponent(params.resume)}` : `/authorize/login`;
  const signupPath = params.resume ? `/authorize/signup?resume=${encodeURIComponent(params.resume)}` : `/authorize/signup`;
  const googlePath = params.resume ? `/authorize/google/init?resume=${encodeURIComponent(params.resume)}` : `/authorize/google/init`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign In</title>
<style>
:root {
  --bg: #020817;
  --card: #020817;
  --text: #f8fafc;
  --muted: #94a3b8;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #cbd5e1;
  --primary: #f8fafc;
  --primary-text: #0f172a;
  --secondary: #1e293b;
  --destructive-bg: rgba(239, 68, 68, 0.1);
  --destructive-text: #ef4444;
  --destructive-border: rgba(239, 68, 68, 0.2);
}
* { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
body {
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  -webkit-font-smoothing: antialiased;
}
.card {
  width: 100%;
  max-width: 380px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
}
.header { text-align: center; margin-bottom: 1.5rem; }
.header h1 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.025em; margin-bottom: 0.35rem; }
.header p { font-size: 0.875rem; color: var(--muted); }
.err { background: var(--destructive-bg); color: var(--destructive-text); border: 1px solid var(--destructive-border); padding: 0.75rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 1.25rem; }
.field { margin-bottom: 1rem; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
input { width: 100%; height: 2.5rem; padding: 0.5rem 0.75rem; background: var(--bg); border: 1px solid var(--input); border-radius: 0.375rem; color: inherit; font-size: 0.875rem; transition: border-color 0.15s, box-shadow 0.15s; }
input:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 2px rgba(203, 213, 225, 0.2); }
.btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 2.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; }
.btn-primary { background: var(--primary); color: var(--primary-text); margin-top: 0.5rem; }
.btn-primary:hover { opacity: 0.9; }
.divider { display: flex; align-items: center; margin: 1.5rem 0; position: relative; }
.divider::before { content: ''; flex: 1; height: 1px; background: var(--border); }
.divider span { padding: 0 0.5rem; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; background: var(--card); }
.divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.btn-outline { background: var(--bg); color: var(--text); border: 1px solid var(--input); gap: 0.5rem; }
.btn-outline:hover { background: var(--secondary); }
.btn-outline svg { width: 18px; height: 18px; flex-shrink: 0; }
.footer { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: var(--muted); }
.footer a { color: var(--text); text-decoration: underline; text-underline-offset: 4px; }
.footer a:hover { color: var(--primary); }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Welcome back</h1>
    <p>Enter your credentials to sign in</p>
  </div>
  ${errHtml}
  <form method="post" action="${actionPath}">
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" required></div>
    <button type="submit" class="btn btn-primary">Sign In</button>
  </form>
  <div class="divider"><span>Or continue with</span></div>
  <button type="button" onclick="fetch('${googlePath}').then(r=>r.json()).then(d=>window.location.href=d.url)" class="btn btn-outline" style="text-decoration:none; width: 100%;">
    <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Google
  </button>
  <div class="footer">Don't have an account? <a href="${signupPath}">Sign up</a></div>
</div>
</body>
</html>`;
}

export function renderSignupPage(params: { error?: string, resume?: string }) {
  const errHtml = params.error ? `<div class="err">${esc(params.error)}</div>` : '';
  const actionPath = params.resume ? `/authorize/signup?resume=${encodeURIComponent(params.resume)}` : `/authorize/signup`;
  const loginPath = params.resume ? `/authorize/login?resume=${encodeURIComponent(params.resume)}` : `/authorize/login`;
  const googlePath = params.resume ? `/authorize/google/init?resume=${encodeURIComponent(params.resume)}` : `/authorize/google/init`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign Up</title>
<style>
:root {
  --bg: #020817;
  --card: #020817;
  --text: #f8fafc;
  --muted: #94a3b8;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #cbd5e1;
  --primary: #f8fafc;
  --primary-text: #0f172a;
  --secondary: #1e293b;
  --destructive-bg: rgba(239, 68, 68, 0.1);
  --destructive-text: #ef4444;
  --destructive-border: rgba(239, 68, 68, 0.2);
}
* { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
body {
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  -webkit-font-smoothing: antialiased;
}
.card {
  width: 100%;
  max-width: 380px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
}
.header { text-align: center; margin-bottom: 1.5rem; }
.header h1 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.025em; margin-bottom: 0.35rem; }
.header p { font-size: 0.875rem; color: var(--muted); }
.err { background: var(--destructive-bg); color: var(--destructive-text); border: 1px solid var(--destructive-border); padding: 0.75rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 1.25rem; }
.field { margin-bottom: 1rem; }
.row { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
.row .field { flex: 1; margin-bottom: 0; }
label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
input { width: 100%; height: 2.5rem; padding: 0.5rem 0.75rem; background: var(--bg); border: 1px solid var(--input); border-radius: 0.375rem; color: inherit; font-size: 0.875rem; transition: border-color 0.15s, box-shadow 0.15s; }
input:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 2px rgba(203, 213, 225, 0.2); }
.btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 2.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; }
.btn-primary { background: var(--primary); color: var(--primary-text); margin-top: 0.5rem; }
.btn-primary:hover { opacity: 0.9; }
.divider { display: flex; align-items: center; margin: 1.5rem 0; position: relative; }
.divider::before { content: ''; flex: 1; height: 1px; background: var(--border); }
.divider span { padding: 0 0.5rem; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; background: var(--card); }
.divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.btn-outline { background: var(--bg); color: var(--text); border: 1px solid var(--input); gap: 0.5rem; }
.btn-outline:hover { background: var(--secondary); }
.btn-outline svg { width: 18px; height: 18px; flex-shrink: 0; }
.footer { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: var(--muted); }
.footer a { color: var(--text); text-decoration: underline; text-underline-offset: 4px; }
.footer a:hover { color: var(--primary); }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Create an account</h1>
    <p>Enter your information to get started</p>
  </div>
  ${errHtml}
  <form method="post" action="${actionPath}">
    <div class="row">
      <div class="field"><label for="firstName">First name</label><input id="firstName" name="firstName" type="text" required></div>
      <div class="field"><label for="lastName">Last name</label><input id="lastName" name="lastName" type="text"></div>
    </div>
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" minlength="8" required></div>
    <button type="submit" class="btn btn-primary">Sign Up</button>
  </form>
  <div class="divider"><span>Or continue with</span></div>
  <button type="button" onclick="fetch('${googlePath}').then(r=>r.json()).then(d=>window.location.href=d.url)" class="btn btn-outline" style="text-decoration:none; width: 100%;">
    <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Google
  </button>
  <div class="footer">Already have an account? <a href="${loginPath}">Sign in</a></div>
</div>
</body>
</html>`;
}

export function renderErrorPage(params: { statusCode: number; statusText: string; errorName: string; errorMessage: string; }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Error ${params.statusCode} (${esc(params.statusText)})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: arial, sans-serif; background-color: #fff; color: #222; padding: 20px; }
    h1 { font-size: 20px; font-weight: normal; margin-bottom: 15px; }
    p { margin-bottom: 10px; font-size: 14px; line-height: 1.4; }
    .error-details { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #3c4043; margin-top: 20px; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <h1><b>${params.statusCode}.</b> <ins>That's an error.</ins></h1>
  <p>The server cannot process the request because it is malformed. It should not be retried.</p>
  <div class="error-details"><b>Error: ${esc(params.errorName)}</b><br><br>${esc(params.errorMessage)}</div>
</body>
</html>`;
}

export function renderSuccessPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Login Success</title>
</head>
<body>
  <p>Logging you in...</p>
  <script>
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      localStorage.setItem("auth_token", token);
    }
    // clear token from URL and go to dashboard
    window.location.href = "/dashboard/";
  </script>
</body>
</html>`;
}
