function exportCSV(data) {
    // Use allRecords from admin.js if no data passed
    const records = data || allRecords || [];

    if (records.length === 0) {
        showToast('No records to export', 'error');
        return;
    }

    const rows = [
        ['#', 'Student', 'Date', 'Status'],
        ...records.map((d, i) => [
            i + 1,
            d.profiles?.full_name || 'Unknown',
            d.date,
            d.status
        ])
    ];

    const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('CSV exported successfully!', 'success');
}
