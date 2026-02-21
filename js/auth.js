// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== HIDE LOADER =====
function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
    }
}

// ===== CHECK SESSION ON LOAD =====
(async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // User is logged in, check role and redirect
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            // If profile doesn't exist, sign out and show login
            if (!profile) {
                await supabase.auth.signOut();
                hideLoader();
                return;
            }

            if (profile.role === 'teacher') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            return;
        }
    } catch (err) {
        console.error('Session check error:', err);
        await supabase.auth.signOut();
    }
    hideLoader();
})();

// ===== TAB SWITCHING =====
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const footer = document.getElementById('authFooter');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');

    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        footer.innerHTML = `Don't have an account? <a href="#" onclick="switchTab('signup')">Sign up</a>`;
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        footer.innerHTML = `Already have an account? <a href="#" onclick="switchTab('login')">Login</a>`;
    }
}

// ===== LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.classList.remove('show');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        // Get user profile to determine role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        showToast('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            if (profile.role === 'teacher') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }, 800);

    } catch (err) {
        errorMsg.textContent = err.message || 'Login failed. Please try again.';
        errorMsg.classList.add('show');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ===== SIGNUP =====
async function handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');

    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) throw error;

        // Update profile name if user was created
        if (data.user) {
            await supabase
                .from('profiles')
                .update({ full_name: name })
                .eq('id', data.user.id);
        }

        successMsg.textContent = '🎉 Account created successfully! You can now login.';
        successMsg.classList.add('show');
        showToast('Account created! Please log in.', 'success');

        // Switch to login tab after short delay
        setTimeout(() => switchTab('login'), 2000);

    } catch (err) {
        errorMsg.textContent = err.message || 'Signup failed. Please try again.';
        errorMsg.classList.add('show');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}
