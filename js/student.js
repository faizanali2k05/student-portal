// ===== GLOBAL STATE =====
let currentUser = null;
let allAttendance = [];
let attendanceChart = null;

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

// ===== MOBILE SIDEBAR =====
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

// ===== SCROLL HELPERS =====
function scrollToChart() {
    document.getElementById('chartCard').scrollIntoView({ behavior: 'smooth' });
    toggleSidebar();
}

function scrollToTable() {
    document.getElementById('tableCard').scrollIntoView({ behavior: 'smooth' });
    toggleSidebar();
}

// ===== LOGOUT =====
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// ===== INIT =====
(async function init() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = session.user;

        // Check role - only students should be here
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        // No profile found — sign out and go to login
        if (!profile) {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        // Teacher should be on admin page
        if (profile.role === 'teacher') {
            window.location.href = 'admin.html';
            return;
        }

        // Set user info in sidebar
        const displayName = profile.full_name || currentUser.email;
        document.getElementById('userName').textContent = displayName;
        document.getElementById('greetName').textContent = displayName.split(' ')[0].split('@')[0];
        document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();

        // Load attendance data
        await loadAttendance();
        hideLoader();
    } catch (err) {
        console.error('Init error:', err);
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    }
})();

// ===== LOAD ATTENDANCE =====
async function loadAttendance() {
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', currentUser.id)
        .order('date', { ascending: false });

    if (error) {
        showToast('Failed to load attendance data', 'error');
        return;
    }

    allAttendance = data || [];
    updateStats(allAttendance);
    renderTable(allAttendance);
    renderChart(allAttendance);
}

// ===== UPDATE STATS =====
function updateStats(data) {
    const total = data.length;
    const present = data.filter(d => d.status === 'Present').length;
    const absent = data.filter(d => d.status === 'Absent').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    animateValue('totalDays', total);
    animateValue('presentDays', present);
    animateValue('absentDays', absent);
    document.getElementById('percentage').textContent = pct + '%';

    // Update circle
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference - (pct / 100) * circumference;
    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 300);
    document.getElementById('circlePercent').textContent = pct + '%';

    // Update progress bar
    document.getElementById('progressBar').style.width = pct + '%';

    // Change color based on percentage
    const progressBar = document.getElementById('progressBar');
    progressBar.classList.remove('green', 'red', 'purple');
    if (pct >= 75) {
        progressBar.classList.add('green');
    } else if (pct >= 50) {
        progressBar.classList.add('purple');
    } else {
        progressBar.classList.add('red');
    }
}

// ===== ANIMATE VALUE =====
function animateValue(elementId, endValue) {
    const el = document.getElementById(elementId);
    const duration = 800;
    const start = parseInt(el.textContent) || 0;
    const increment = (endValue - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= endValue) || (increment < 0 && current <= endValue) || increment === 0) {
            clearInterval(timer);
            el.textContent = endValue;
        } else {
            el.textContent = Math.round(current);
        }
    }, 16);
}

// ===== RENDER TABLE =====
function renderTable(data) {
    const tbody = document.getElementById('attendanceBody');

    if (data.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">No records found</div>
            <div class="empty-state-desc">Your attendance records will appear here once your teacher marks them.</div>
          </div>
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = data.map((row, i) => {
        const date = new Date(row.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const badgeClass = row.status === 'Present' ? 'badge-present' : 'badge-absent';

        return `
      <tr>
        <td style="color: var(--text-muted);">${i + 1}</td>
        <td>${dateStr}</td>
        <td style="color: var(--text-secondary);">${dayName}</td>
        <td>
          <span class="badge ${badgeClass}">
            <span class="badge-dot"></span>
            ${row.status}
          </span>
        </td>
      </tr>
    `;
    }).join('');
}

// ===== FILTER BY MONTH =====
function filterByMonth() {
    const month = document.getElementById('monthFilter').value;

    if (!month) {
        renderTable(allAttendance);
        updateStats(allAttendance);
        renderChart(allAttendance);
        return;
    }

    const filtered = allAttendance.filter(d => {
        const m = d.date.split('-')[1];
        return m === month;
    });

    renderTable(filtered);
    updateStats(filtered);
}

// ===== RENDER CHART =====
function renderChart(data) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');

    // Group by month
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    data.forEach(d => {
        const month = parseInt(d.date.split('-')[1]) - 1;
        const key = monthNames[month];
        if (!monthlyData[key]) monthlyData[key] = { present: 0, absent: 0 };
        if (d.status === 'Present') monthlyData[key].present++;
        else monthlyData[key].absent++;
    });

    const labels = Object.keys(monthlyData);
    const presentData = labels.map(l => monthlyData[l].present);
    const absentData = labels.map(l => monthlyData[l].absent);

    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 12 },
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 12 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Inter', size: 12 },
                        stepSize: 1
                    }
                }
            }
        }
    });
}
