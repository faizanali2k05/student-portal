// ===== GLOBAL STATE =====
let currentUser = null;
let students = [];
let attendanceMap = {}; // { studentId: 'Present' | 'Absent' }
let allRecords = [];
let deleteRecordId = null;
let adminChart = null;

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
function scrollToMarkSection() {
    document.getElementById('markSection').scrollIntoView({ behavior: 'smooth' });
    toggleSidebar();
}

function scrollToRecords() {
    document.getElementById('recordsSection').scrollIntoView({ behavior: 'smooth' });
    toggleSidebar();
}

function scrollToChart() {
    document.getElementById('chartSection').scrollIntoView({ behavior: 'smooth' });
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

        // Check role - only teachers should be here
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

        // Student should be on dashboard page
        if (profile.role !== 'teacher') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Set user info
        const displayName = profile.full_name || currentUser.email;
        document.getElementById('userName').textContent = displayName;
        document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();

        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;

        // Load all data
        await Promise.all([loadStudents(), loadRecords()]);
        await updateAdminStats();
        hideLoader();
    } catch (err) {
        console.error('Init error:', err);
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    }
})();

// ===== LOAD STUDENTS =====
async function loadStudents() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

    if (error) {
        showToast('Failed to load students', 'error');
        return;
    }

    students = data || [];
    renderStudentList();
    populateStudentFilter();
}

// ===== RENDER STUDENT LIST FOR MARKING =====
function renderStudentList() {
    const container = document.getElementById('studentList');

    if (students.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">No students found</div>
        <div class="empty-state-desc">Students will appear here once they sign up.</div>
      </div>
    `;
        return;
    }

    container.innerHTML = students.map(student => {
        const name = student.full_name || 'Unknown';
        const initials = name.charAt(0).toUpperCase();
        const status = attendanceMap[student.id] || '';

        return `
      <div class="student-row" id="row-${student.id}">
        <div class="student-name">
          <div class="avatar">${initials}</div>
          <div>
            <div style="font-weight:500; font-size:14px;">${name}</div>
          </div>
        </div>
        <div class="status-toggle">
          <button class="status-btn ${status === 'Present' ? 'present-active' : ''}"
            onclick="toggleStatus('${student.id}', 'Present')">
            ✅ Present
          </button>
          <button class="status-btn ${status === 'Absent' ? 'absent-active' : ''}"
            onclick="toggleStatus('${student.id}', 'Absent')">
            ❌ Absent
          </button>
        </div>
      </div>
    `;
    }).join('');
}

// ===== TOGGLE STATUS =====
function toggleStatus(studentId, status) {
    attendanceMap[studentId] = status;
    renderStudentList();
}

// ===== SAVE ATTENDANCE =====
async function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;

    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }

    const entries = Object.entries(attendanceMap);

    if (entries.length === 0) {
        showToast('Please mark at least one student', 'error');
        return;
    }

    // Check for existing records on this date and upsert
    const records = entries.map(([student_id, status]) => ({
        student_id,
        date,
        status
    }));

    // First delete existing records for these students on this date
    for (const record of records) {
        await supabase
            .from('attendance')
            .delete()
            .eq('student_id', record.student_id)
            .eq('date', record.date);
    }

    // Insert new records
    const { error } = await supabase
        .from('attendance')
        .insert(records);

    if (error) {
        showToast('Failed to save attendance: ' + error.message, 'error');
        return;
    }

    showToast(`Attendance saved for ${records.length} student(s)!`, 'success');
    attendanceMap = {};
    renderStudentList();
    await loadRecords();
    await updateAdminStats();
}

// ===== POPULATE STUDENT FILTER =====
function populateStudentFilter() {
    const select = document.getElementById('filterStudent');
    // Keep the "All Students" option
    select.innerHTML = '<option value="">All Students</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.full_name || 'Unknown';
        select.appendChild(opt);
    });
}

// ===== LOAD RECORDS =====
async function loadRecords() {
    const studentFilter = document.getElementById('filterStudent').value;
    const monthFilter = document.getElementById('filterMonth').value;

    let query = supabase
        .from('attendance')
        .select('*, profiles(full_name)')
        .order('date', { ascending: false });

    if (studentFilter) {
        query = query.eq('student_id', studentFilter);
    }

    const { data, error } = await query;

    if (error) {
        showToast('Failed to load records', 'error');
        return;
    }

    let records = data || [];

    // Filter by month client-side
    if (monthFilter) {
        records = records.filter(r => r.date.split('-')[1] === monthFilter);
    }

    allRecords = records;
    renderRecords(records);
    renderAdminChart(records);
}

// ===== RENDER RECORDS TABLE =====
function renderRecords(records) {
    const tbody = document.getElementById('recordsBody');

    if (records.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">No records found</div>
            <div class="empty-state-desc">Try adjusting your filters or mark attendance first.</div>
          </div>
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = records.map((row, i) => {
        const date = new Date(row.date);
        const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const studentName = row.profiles?.full_name || 'Unknown';
        const badgeClass = row.status === 'Present' ? 'badge-present' : 'badge-absent';

        return `
      <tr>
        <td style="color: var(--text-muted);">${i + 1}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="avatar" style="width:28px;height:28px;font-size:11px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;">
              ${studentName.charAt(0).toUpperCase()}
            </div>
            ${studentName}
          </div>
        </td>
        <td>${dateStr}</td>
        <td>
          <span class="badge ${badgeClass}">
            <span class="badge-dot"></span>
            ${row.status}
          </span>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="openDeleteModal('${row.id}')" title="Delete">
            🗑️
          </button>
        </td>
      </tr>
    `;
    }).join('');
}

// ===== DELETE MODAL =====
function openDeleteModal(id) {
    deleteRecordId = id;
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    deleteRecordId = null;
    document.getElementById('deleteModal').classList.remove('show');
}

async function confirmDelete() {
    if (!deleteRecordId) return;

    const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', deleteRecordId);

    if (error) {
        showToast('Failed to delete record', 'error');
    } else {
        showToast('Record deleted successfully', 'success');
        await loadRecords();
        await updateAdminStats();
    }

    closeDeleteModal();
}

// ===== UPDATE ADMIN STATS =====
async function updateAdminStats() {
    // Total students
    document.getElementById('totalStudents').textContent = students.length;

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today);

    const todayData = todayRecords || [];
    const presentToday = todayData.filter(d => d.status === 'Present').length;
    const absentToday = todayData.filter(d => d.status === 'Absent').length;

    document.getElementById('presentToday').textContent = presentToday;
    document.getElementById('absentToday').textContent = absentToday;

    // Total records
    const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });

    document.getElementById('totalRecords').textContent = count || 0;
}

// ===== RENDER ADMIN CHART =====
function renderAdminChart(records) {
    const ctx = document.getElementById('adminChart').getContext('2d');

    // Group by month
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    records.forEach(d => {
        const month = parseInt(d.date.split('-')[1]) - 1;
        const key = monthNames[month];
        if (!monthlyData[key]) monthlyData[key] = { present: 0, absent: 0 };
        if (d.status === 'Present') monthlyData[key].present++;
        else monthlyData[key].absent++;
    });

    const labels = Object.keys(monthlyData);
    const presentData = labels.map(l => monthlyData[l].present);
    const absentData = labels.map(l => monthlyData[l].absent);

    if (adminChart) adminChart.destroy();

    adminChart = new Chart(ctx, {
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
                    ticks: { color: '#64748b', font: { family: 'Inter', size: 12 }, stepSize: 1 }
                }
            }
        }
    });
}
