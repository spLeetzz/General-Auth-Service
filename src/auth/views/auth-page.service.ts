function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderLoginPage(params: { error?: string }) {
  const errHtml = params.error ? `<div class="err">${esc(params.error)}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign In</title>
<style>
*{box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0b0f19;color:#e8ecf1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#131a2b;padding:2rem;border-radius:10px;width:100%;max-width:360px}
h1{margin:0 0 1.25rem;font-size:1.3rem;text-align:center}
.err{background:#3b0b0b;color:#ffb3b3;padding:.6rem .8rem;border-radius:6px;font-size:.9rem;margin-bottom:1rem;min-height:2.4rem}
.field{margin-bottom:.9rem}
label{display:block;font-size:.82rem;margin-bottom:.3rem;color:#94a3b8}
input{width:100%;padding:.6rem .75rem;background:#0b0f19;border:1px solid #2a324a;border-radius:6px;color:inherit;font-size:1rem}
input:focus{outline:none;border-color:#4f8cff}
button{width:100%;padding:.7rem;background:#4f8cff;border:none;border-radius:6px;color:#fff;font-size:1rem;cursor:pointer;margin-top:.3rem}
button:hover{background:#3b75e0}
.link{text-align:center;margin-top:1rem;font-size:.9rem;color:#94a3b8}
.link a{color:#4f8cff;text-decoration:none}
.divider{display:flex;align-items:center;gap:.75rem;margin:1.2rem 0;color:#94a3b8;font-size:.82rem}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:#2a324a}
.btn-google{width:100%;padding:.7rem;background:#fff;border:none;border-radius:6px;color:#222;font-size:.95rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:background .15s}
.btn-google:hover{background:#f0f0f0}
.btn-google svg{width:18px;height:18px}
</style>
</head>
<body>
<div class="card">
  <h1>Sign In</h1>
  ${errHtml}
  <form method="post" action="/authorize/login">
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" minlength="8" required></div>
    <button type="submit">Continue</button>
  </form>
  <div class="divider">or</div>
  <a href="/authorize/google" class="btn-google">
    <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Sign in with Google
  </a>
  <div class="link">No account? <a href="/authorize/signup">Sign up</a></div>
</div>
</body>
</html>`;
}

export function renderSignupPage(params: { error?: string }) {
  const errHtml = params.error ? `<div class="err">${esc(params.error)}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign Up</title>
<style>
*{box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0b0f19;color:#e8ecf1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#131a2b;padding:2rem;border-radius:10px;width:100%;max-width:360px}
h1{margin:0 0 1.25rem;font-size:1.3rem;text-align:center}
.err{background:#3b0b0b;color:#ffb3b3;padding:.6rem .8rem;border-radius:6px;font-size:.9rem;margin-bottom:1rem;min-height:2.4rem}
.field{margin-bottom:.9rem}
label{display:block;font-size:.82rem;margin-bottom:.3rem;color:#94a3b8}
input{width:100%;padding:.6rem .75rem;background:#0b0f19;border:1px solid #2a324a;border-radius:6px;color:inherit;font-size:1rem}
input:focus{outline:none;border-color:#4f8cff}
button{width:100%;padding:.7rem;background:#4f8cff;border:none;border-radius:6px;color:#fff;font-size:1rem;cursor:pointer;margin-top:.3rem}
button:hover{background:#3b75e0}
.link{text-align:center;margin-top:1rem;font-size:.9rem;color:#94a3b8}
.link a{color:#4f8cff;text-decoration:none}
.divider{display:flex;align-items:center;gap:.75rem;margin:1.2rem 0;color:#94a3b8;font-size:.82rem}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:#2a324a}
.btn-google{width:100%;padding:.7rem;background:#fff;border:none;border-radius:6px;color:#222;font-size:.95rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:background .15s}
.btn-google:hover{background:#f0f0f0}
.btn-google svg{width:18px;height:18px}
</style>
</head>
<body>
<div class="card">
  <h1>Sign Up</h1>
  ${errHtml}
  <form method="post" action="/authorize/signup">
    <div class="field"><label for="firstName">First name</label><input id="firstName" name="firstName" type="text" required></div>
    <div class="field"><label for="lastName">Last name (optional)</label><input id="lastName" name="lastName" type="text"></div>
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" minlength="8" required></div>
    <button type="submit">Create account</button>
  </form>
  <div class="divider">or</div>
  <a href="/authorize/google" class="btn-google">
    <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Sign up with Google
  </a>
  <div class="link">Have an account? <a href="/authorize/login">Sign in</a></div>
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
