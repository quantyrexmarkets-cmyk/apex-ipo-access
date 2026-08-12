import re

with open('login.html', 'r') as f:
    html = f.read()

new_script = '''<script>
// =====================================================
// Apex IPO Access — LOGIN SCRIPT (MongoDB / ApexAPI)
// =====================================================
(function() {
  function initLogin() {
    var form        = document.getElementById('loginForm');
    var btn         = document.getElementById('loginBtn');
    var errBox      = document.getElementById('formError');
    var emailInput  = document.getElementById('email');
    var passInput   = document.getElementById('password');
    var showToggle  = document.getElementById('showToggle');
    var showText    = document.getElementById('showText');
    var rememberRow = document.getElementById('rememberRow');

    if (!form || !btn) { console.error('Login form elements not found'); return; }

    // Show/hide password
    if (showToggle) {
      showToggle.addEventListener('click', function() {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          if (showText) showText.textContent = 'Hide';
        } else {
          passInput.type = 'password';
          if (showText) showText.textContent = 'Show';
        }
      });
    }

    // Remember-me
    if (rememberRow) {
      rememberRow.addEventListener('click', function() {
        rememberRow.classList.toggle('checked');
      });
      var saved = localStorage.getItem('apex_remember_email');
      if (saved) {
        emailInput.value = saved;
        rememberRow.classList.add('checked');
      }
    }

    // Already logged in? Redirect.
    ApexAPI.auth.check().then(function(user) {
      if (user) {
        if (user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }
    });

    // Form submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      errBox.classList.remove('show');
      errBox.textContent = '';

      var email = emailInput.value.trim();
      var password = passInput.value;

      if (!email || !password) {
        errBox.textContent = 'Please enter your email and password';
        errBox.classList.add('show');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Signing in...';

      ApexAPI.auth.login(email, password)
        .then(function(res) {
          if (rememberRow && rememberRow.classList.contains('checked')) {
            localStorage.setItem('apex_remember_email', email);
          } else {
            localStorage.removeItem('apex_remember_email');
          }

          var user = res.user;
          if (user && user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        })
        .catch(function(err) {
          errBox.textContent = err.message || 'Sign-in failed. Please try again.';
          errBox.classList.add('show');
          btn.disabled = false;
          btn.textContent = 'Log in';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
</script>'''

# Replace the old login script block
# Match from "<script>" containing "Apex IPO Access — LOGIN SCRIPT" to its closing "</script>"
pattern = re.compile(
    r'<script>\s*//\s*=+\s*//\s*Apex IPO Access — LOGIN SCRIPT.*?</script>',
    re.DOTALL
)

new_html, count = pattern.subn(new_script, html)

if count == 0:
    print("❌ Could not find login script block")
else:
    with open('login.html', 'w') as f:
        f.write(new_html)
    print(f"✅ Replaced {count} script block(s)")
