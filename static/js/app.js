/* ── State ──────────────────────────────────────────────────────────────────── */
let categories = [];
let locations = [];

/* ── Init ───────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadDashboard();
    loadFilters();
});

/* ── Tabs ───────────────────────────────────────────────────────────────────── */
function initTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');

            if (target === 'dashboard') loadDashboard();
            if (target === 'assets') loadAssets();
            if (target === 'categories') loadCategories();
            if (target === 'locations') loadLocations();
        });
    });

    // Asset search & filters
    document.getElementById('asset-search').addEventListener('input', debounce(loadAssets, 300));
    document.getElementById('filter-status').addEventListener('change', loadAssets);
    document.getElementById('filter-category').addEventListener('change', loadAssets);
    document.getElementById('filter-location').addEventListener('change', loadAssets);
}

/* ── Dashboard ─────────────────────────────────────────────────────────────── */
async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();

        document.getElementById('stat-total').textContent = data.total || 0;
        document.getElementById('stat-available').textContent = data.by_status.available || 0;
        document.getElementById('stat-in-use').textContent = data.by_status.in_use || 0;
        document.getElementById('stat-broken').textContent =
            (data.by_status.broken || 0) + (data.by_status.repair || 0);

        // Kategooriad
        const catList = document.getElementById('dash-categories');
        catList.innerHTML = data.by_category.map(cat => `
            <div class="cat-row">
                <div class="cat-left">
                    <i class="fa-solid fa-${cat.icon || 'box'} cat-icon"></i>
                    <span class="cat-name">${escHtml(cat.name)}</span>
                </div>
                <span class="cat-count">${cat.c || 0}</span>
            </div>
        `).join('');

        // Viimased
        const recent = document.getElementById('dash-recent');
        recent.innerHTML = data.recent.map(item => `
            <div class="recent-item" onclick="goToAsset(${item.id})">
                <div class="recent-dot dot-${escHtml(item.status)}"></div>
                <span class="recent-name">${escHtml(item.name)}</span>
                <span class="recent-time">${relativeTime(item.updated_at)}</span>
            </div>
        `).join('') || '<p class="text-muted">Ühtegi varat pole veel lisatud.</p>';

    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

function goToAsset(id) {
    document.querySelector('[data-tab="assets"]').click();
    // Pärast tab vahetust laadi ja keri alla
    setTimeout(() => {
        const rows = document.querySelectorAll('#assets-tbody tr[data-id]');
        rows.forEach(row => {
            if (parseInt(row.dataset.id) === id) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.style.background = '#eff6ff';
                setTimeout(() => row.style.background = '', 2000);
            }
        });
    }, 200);
}

/* ── Assets ─────────────────────────────────────────────────────────────────── */
async function loadAssets() {
    const params = new URLSearchParams();
    const s = document.getElementById('asset-search').value.trim();
    const status = document.getElementById('filter-status').value;
    const cat = document.getElementById('filter-category').value;
    const loc = document.getElementById('filter-location').value;

    if (s) params.set('search', s);
    if (status) params.set('status', status);
    if (cat) params.set('category_id', cat);
    if (loc) params.set('location_id', loc);

    try {
        const res = await fetch('/api/assets?' + params);
        const assets = await res.json();
        renderAssets(assets);
    } catch (e) {
        console.error('Assets error:', e);
    }
}

function renderAssets(assets) {
    const tbody = document.getElementById('assets-tbody');
    if (!assets.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Ühtegi varat ei leitud.</td></tr>';
        return;
    }

    tbody.innerHTML = assets.map(a => `
        <tr data-id="${a.id}">
            <td><strong>${escHtml(a.name)}</strong></td>
            <td><span class="font-mono">${escHtml(a.serial_number || '—')}</span></td>
            <td>
                <span style="color:var(--text-muted);font-size:12px;">
                    <i class="fa-solid fa-${a.category_icon || 'box'}"></i> ${escHtml(a.category_name || '—')}
                </span>
            </td>
            <td>${statusBadge(a.status)}</td>
            <td>
                <div style="font-size:12px;color:var(--text-muted);">
                    ${a.assigned_to ? `<div><i class="fa-solid fa-user"></i> ${escHtml(a.assigned_to)}</div>` : ''}
                    ${a.location_name ? `<div><i class="fa-solid fa-location-dot"></i> ${escHtml(a.location_name)}</div>` : ''}
                </div>
            </td>
            <td style="font-size:12px;color:var(--text-muted);">
                ${a.manufacturer ? escHtml(a.manufacturer) : ''}${a.manufacturer && a.model ? ' / ' : ''}${a.model || ''}
            </td>
            <td class="text-right">${a.purchase_price ? a.purchase_price.toFixed(2) + ' €' : '—'}</td>
            <td>
                ${a.warranty_until ? `<span style="font-size:12px;color:${isExpired(a.warranty_until) ? 'var(--danger)' : 'var(--text-muted)'};">
                    ${a.warranty_until}
                    ${isExpired(a.warranty_until) ? ' <i class="fa-solid fa-circle-exclamation" title="Garantii aegunud"></i>' : ''}
                </span>` : '—'}
            </td>
            <td>
                <div class="actions">
                    <button class="btn-icon" title="Muuda" onclick='editAsset(${JSON.stringify(escapeObj(a))})'>
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon danger" title="Kustuta" onclick="deleteAsset(${a.id}, '${escHtml(a.name)}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/* ── Categories ──────────────────────────────────────────────────────────────── */
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        categories = await res.json();
        const tbody = document.getElementById('categories-tbody');
        if (!categories.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-row">Kategooriaid pole.</td></tr>';
            return;
        }
        tbody.innerHTML = categories.map(c => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fa-solid fa-${c.icon || 'box'}" style="color:var(--primary);width:20px;text-align:center;"></i>
                        ${escHtml(c.name)}
                    </div>
                </td>
                <td><code style="font-size:11px;">${escHtml(c.icon || 'box')}</code></td>
                <td>
                    <div class="actions">
                        <button class="btn-icon danger" title="Kustuta" onclick="deleteCategory(${c.id}, '${escHtml(c.name)}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Categories error:', e);
    }
}

/* ── Locations ──────────────────────────────────────────────────────────────── */
async function loadLocations() {
    try {
        const res = await fetch('/api/locations');
        locations = await res.json();
        const tbody = document.getElementById('locations-tbody');
        if (!locations.length) {
            tbody.innerHTML = '<tr><td colspan="2" class="empty-row">Asukohti pole.</td></tr>';
            return;
        }
        tbody.innerHTML = locations.map(l => `
            <tr>
                <td><i class="fa-solid fa-location-dot" style="color:var(--text-muted);margin-right:8px;"></i>${escHtml(l.name)}</td>
                <td>
                    <div class="actions">
                        <button class="btn-icon danger" title="Kustuta" onclick="deleteLocation(${l.id}, '${escHtml(l.name)}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Locations error:', e);
    }
}

/* ── Filters (populate dropdowns) ────────────────────────────────────────── */
async function loadFilters() {
    try {
        const [catRes, locRes] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/locations')
        ]);
        categories = await catRes.json();
        locations = await locRes.json();

        const catSel = document.getElementById('filter-category');
        const locSel = document.getElementById('filter-location');
        const modalCat = document.getElementById('asset-category');
        const modalLoc = document.getElementById('asset-location');

        const catOptions = categories.map(c =>
            `<option value="${c.id}">${escHtml(c.name)}</option>`
        ).join('');
        const locOptions = locations.map(l =>
            `<option value="${l.id}">${escHtml(l.name)}</option>`
        ).join('');

        catSel.innerHTML = '<option value="">Kõik kategooriad</option>' + catOptions;
        locSel.innerHTML = '<option value="">Kõik asukohad</option>' + locOptions;
        modalCat.innerHTML = '<option value="">— vali —</option>' + catOptions;
        modalLoc.innerHTML = '<option value="">— vali —</option>' + locOptions;

    } catch (e) {
        console.error('Filters error:', e);
    }
}

/* ── Asset Modal ────────────────────────────────────────────────────────────── */
function openAssetModal(data = null) {
    const modal = document.getElementById('asset-modal');
    const form = document.getElementById('asset-form');
    const title = document.getElementById('asset-modal-title');

    // Lae kategooriad/lokatsioonid kui neid veel pole
    if (!categories.length || !locations.length) loadFilters();

    form.reset();
    document.getElementById('asset-id').value = '';
    document.getElementById('asset-status').value = 'available';

    if (data) {
        title.textContent = 'Muuda vara';
        document.getElementById('asset-id').value = data.id || '';
        document.getElementById('asset-name').value = data.name || '';
        document.getElementById('asset-serial').value = data.serial_number || '';
        document.getElementById('asset-category').value = data.category_id || '';
        document.getElementById('asset-status').value = data.status || 'available';
        document.getElementById('asset-location').value = data.location_id || '';
        document.getElementById('asset-assigned').value = data.assigned_to || '';
        document.getElementById('asset-assigned-date').value = data.assigned_date || '';
        document.getElementById('asset-manufacturer').value = data.manufacturer || '';
        document.getElementById('asset-model').value = data.model || '';
        document.getElementById('asset-purchase-date').value = data.purchase_date || '';
        document.getElementById('asset-price').value = data.purchase_price || '';
        document.getElementById('asset-warranty').value = data.warranty_until || '';
        document.getElementById('asset-notes').value = data.notes || '';
    } else {
        title.textContent = 'Lisa vara';
    }

    modal.classList.add('open');
}

function closeAssetModal() {
    document.getElementById('asset-modal').classList.remove('open');
}

function editAsset(data) {
    openAssetModal(data);
}

async function saveAsset(e) {
    e.preventDefault();
    const id = document.getElementById('asset-id').value;
    const body = {
        name: document.getElementById('asset-name').value,
        serial_number: document.getElementById('asset-serial').value || null,
        category_id: document.getElementById('asset-category').value || null,
        status: document.getElementById('asset-status').value,
        location_id: document.getElementById('asset-location').value || null,
        assigned_to: document.getElementById('asset-assigned').value || null,
        assigned_date: document.getElementById('asset-assigned-date').value || null,
        manufacturer: document.getElementById('asset-manufacturer').value || null,
        model: document.getElementById('asset-model').value || null,
        purchase_date: document.getElementById('asset-purchase-date').value || null,
        purchase_price: parseFloat(document.getElementById('asset-price').value) || null,
        warranty_until: document.getElementById('asset-warranty').value || null,
        notes: document.getElementById('asset-notes').value || null,
    };

    try {
        const url = id ? `/api/assets/${id}` : '/api/assets';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Viga salvestamisel');
        }

        closeAssetModal();
        toast(id ? 'Vara uuendatud!' : 'Vara lisatud!', 'success');
        loadAssets();
        loadDashboard();

    } catch (e) {
        toast(e.message, 'error');
    }
}

async function deleteAsset(id, name) {
    if (!confirm(`Kas kustutame "${name}"?`)) return;
    try {
        const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Viga kustutamisel');
        toast('Vara kustutatud.', 'success');
        loadAssets();
        loadDashboard();
    } catch (e) {
        toast(e.message, 'error');
    }
}

/* ── Category Modal ──────────────────────────────────────────────────────────── */
function openCategoryModal(data = null) {
    const modal = document.getElementById('category-modal');
    document.getElementById('category-id').value = '';
    document.getElementById('category-name').value = '';
    document.getElementById('category-icon').value = 'box';

    if (data) {
        document.getElementById('category-modal-title').textContent = 'Muuda kategooria';
        document.getElementById('category-id').value = data.id || '';
        document.getElementById('category-name').value = data.name || '';
        document.getElementById('category-icon').value = data.icon || 'box';
    } else {
        document.getElementById('category-modal-title').textContent = 'Lisa kategooria';
    }

    modal.classList.add('open');
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('open');
}

async function saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const body = {
        name: document.getElementById('category-name').value.trim(),
        icon: document.getElementById('category-icon').value.trim() || 'box',
    };

    try {
        const url = id ? `/api/categories/${id}` : '/api/categories';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Viga salvestamisel');
        }
        closeCategoryModal();
        toast(id ? 'Kategooria uuendatud!' : 'Kategooria lisatud!', 'success');
        loadCategories();
        loadFilters();

    } catch (e) {
        toast(e.message, 'error');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Kustuta kategooria "${name}"?`)) return;
    try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Viga kustutamisel');
        toast('Kategooria kustutatud.', 'success');
        loadCategories();
    } catch (e) {
        toast(e.message, 'error');
    }
}

/* ── Location Modal ─────────────────────────────────────────────────────────── */
function openLocationModal(data = null) {
    const modal = document.getElementById('location-modal');
    document.getElementById('location-id').value = '';
    document.getElementById('location-name').value = '';

    if (data) {
        document.getElementById('location-modal-title').textContent = 'Muuda asukoht';
        document.getElementById('location-id').value = data.id || '';
        document.getElementById('location-name').value = data.name || '';
    } else {
        document.getElementById('location-modal-title').textContent = 'Lisa asukoht';
    }

    modal.classList.add('open');
}

function closeLocationModal() {
    document.getElementById('location-modal').classList.remove('open');
}

async function saveLocation(e) {
    e.preventDefault();
    const name = document.getElementById('location-name').value.trim();
    if (!name) return;

    try {
        const res = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Viga salvestamisel');
        }
        closeLocationModal();
        toast('Asukoht lisatud!', 'success');
        loadLocations();
        loadFilters();

    } catch (e) {
        toast(e.message, 'error');
    }
}

async function deleteLocation(id, name) {
    if (!confirm(`Kustuta asukoht "${name}"?`)) return;
    try {
        const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Viga kustutamisel');
        toast('Asukoht kustutatud.', 'success');
        loadLocations();
    } catch (e) {
        toast(e.message, 'error');
    }
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function statusBadge(status) {
    const labels = {
        available: 'Saadaval',
        in_use: 'Kasutuses',
        broken: 'Rikkis',
        repair: 'Remondil',
        retired: 'Retireeritud',
    };
    return `<span class="status-badge badge-${status}">
        <span class="status-dot"></span>
        ${labels[status] || status}
    </span>`;
}

function isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

function relativeTime(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just';
    if (mins < 60) return `${mins} min tagasi`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h tagasi`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} päev tagasi`;
    return isoStr.slice(0, 10);
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeObj(obj) {
    const escaped = {};
    for (const [k, v] of Object.entries(obj)) {
        escaped[k] = (typeof v === 'string') ? v.replace(/'/g, "\\'") : v;
    }
    return escaped;
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    setTimeout(() => { el.classList.remove('show'); }, 3000);
}

// Sulge modal klahviga Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeAssetModal();
        closeCategoryModal();
        closeLocationModal();
    }
});
