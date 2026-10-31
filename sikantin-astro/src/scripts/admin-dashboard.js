import { db } from './supabase.js';

const message = document.getElementById('message');
const userModal = document.getElementById('userModal');
const createUserForm = document.getElementById('createUserForm');
const editUserForm = document.getElementById('editUserForm');
const tenantForm = document.getElementById('tenantForm');
const menuForm = document.getElementById('menuForm');
const menuAddonsList = document.getElementById('menuAddonsList');
let adminUser;
let profiles = [];
let tenants = [];
let menuItems = [];

function setMessage(element, text, isError) {
    element.textContent = text;
    element.className = `rounded-lg p-3 text-sm ${isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`;
}

function clearMessage(element) {
    element.textContent = '';
    element.className = 'hidden rounded-lg p-3 text-sm';
}

function appendCell(row, value, className = 'px-5 py-4 text-slate-700') {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
    row.append(cell);
    return cell;
}

function addButton(container, label, action, isDanger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = isDanger
        ? 'rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50'
        : 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50';
    button.addEventListener('click', action);
    container.append(button);
}

function appendActionCell(row, actions) {
    const cell = row.insertCell();
    cell.className = 'flex flex-wrap gap-2 px-5 py-4';
    actions(cell);
}

function setEmptyRow(table, colspan, text) {
    table.replaceChildren();
    const row = table.insertRow();
    const cell = row.insertCell();
    cell.colSpan = colspan;
    cell.className = 'px-5 py-5 text-slate-500';
    cell.textContent = text;
}

function addMenuAddonRow(addon = {}) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-2';

    const id = document.createElement('input');
    id.type = 'hidden';
    id.dataset.addonId = '';
    id.value = addon.id || '';

    const name = document.createElement('input');
    name.type = 'text';
    name.maxLength = 80;
    name.placeholder = 'Nama, mis. Extra telur';
    name.setAttribute('aria-label', 'Nama add-on');
    name.dataset.addonName = '';
    name.value = addon.name || '';
    name.className = 'min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm';

    const price = document.createElement('input');
    price.type = 'number';
    price.min = '0';
    price.step = '1';
    price.placeholder = 'Harga (Rp)';
    price.setAttribute('aria-label', 'Harga add-on');
    price.dataset.addonPrice = '';
    price.value = addon.price ?? '';
    price.className = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Hapus';
    remove.setAttribute('aria-label', 'Hapus add-on');
    remove.className = 'rounded-lg px-2 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50';
    remove.addEventListener('click', () => row.remove());

    row.append(id, name, price, remove);
    menuAddonsList.append(row);
}

function setMenuAddons(addons = []) {
    menuAddonsList.replaceChildren();
    addons.forEach((addon) => addMenuAddonRow(addon));
}

function readMenuAddons() {
    const addons = [];
    for (const row of menuAddonsList.children) {
        const name = row.querySelector('[data-addon-name]').value.trim();
        const rawPrice = row.querySelector('[data-addon-price]').value;
        if (!name && !rawPrice) continue;
        const price = Number(rawPrice);
        if (!name) throw new Error('Nama setiap add-on wajib diisi.');
        if (rawPrice === '') throw new Error(`Harga add-on "${name}" wajib diisi; gunakan 0 jika gratis.`);
        if (!Number.isSafeInteger(price) || price < 0) {
            throw new Error(`Harga add-on "${name}" harus bilangan bulat nol atau lebih.`);
        }
        addons.push({
            id: row.querySelector('[data-addon-id]').value || crypto.randomUUID(),
            name,
            price,
        });
    }
    if (addons.length > 20) throw new Error('Maksimal 20 add-on per menu.');
    return addons;
}

function openDialog(dialog, focusElement) {
    dialog.classList.remove('hidden');
    dialog.classList.add('flex');
    if (focusElement) focusElement.focus();
}

function closeDialog(dialog) {
    dialog.classList.add('hidden');
    dialog.classList.remove('flex');
}

function populateSelect(select, items, placeholder, getValue, getLabel, selectedValue = '') {
    select.replaceChildren(new Option(placeholder, ''));
    items.forEach((item) => select.add(new Option(getLabel(item), getValue(item))));
    select.value = selectedValue || '';
}

function populateMenuCategories(selectedValue = '') {
    const select = document.getElementById('menuCategory');
    const categories = new Set(['Makanan', 'Minuman', 'Snack', 'Paket Hemat']);
    menuItems.forEach((item) => {
        const category = item.kategori?.trim();
        if (category) categories.add(category);
    });
    if (selectedValue && !categories.has(selectedValue)) categories.add(selectedValue);

    select.replaceChildren(new Option('Pilih kategori', ''));
    [...categories].forEach((category) => select.add(new Option(category, category)));
    select.value = selectedValue || '';
}

function renderUsers() {
    const table = document.getElementById('studentsTable');
    if (!profiles.length) {
        setEmptyRow(table, 5, 'Belum ada data user.');
        return;
    }

    table.replaceChildren();
    profiles.forEach((profile) => {
        const row = table.insertRow();
        appendCell(row, profile.nama);
        appendCell(row, profile.nim);
        appendCell(row, profile.no_telepon);
        appendCell(row, profile.peran);
        appendActionCell(row, (actions) => {
            addButton(actions, 'Edit', () => openUserEdit(profile));
            if (profile.peran === 'mahasiswa') {
                addButton(actions, 'Reset Password', () => resetStudentPassword(profile), true);
            }
            if (profile.peran !== 'admin' && profile.id !== adminUser.id) {
                addButton(actions, 'Hapus', () => deleteUser(profile), true);
            }
        });
    });
}

function renderTenants() {
    const table = document.getElementById('tenantsTable');
    if (!tenants.length) {
        setEmptyRow(table, 8, 'Belum ada data tenant.');
        return;
    }

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    table.replaceChildren();
    tenants.forEach((tenant) => {
        const row = table.insertRow();
        appendCell(row, tenant.nama_tenant);
        appendCell(row, tenant.lokasi);
        appendCell(row, tenant.jam_operasional);
        appendCell(row, tenant.no_telepon);
        const qrisCell = row.insertCell();
        qrisCell.className = 'px-5 py-4';
        if (tenant.qris_image_url) {
            const link = document.createElement('a');
            link.href = tenant.qris_image_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Lihat QRIS';
            link.className = 'font-bold text-blue-700 hover:underline';
            qrisCell.append(link);
        } else {
            qrisCell.textContent = '—';
        }
        const owner = profileById.get(tenant.pemilik_id);
        appendCell(row, owner?.nama || tenant.pemilik_id);
        appendCell(row, tenant.status_buka ? 'Buka' : 'Tutup', `px-5 py-4 font-bold ${tenant.status_buka ? 'text-emerald-700' : 'text-slate-500'}`);
        appendActionCell(row, (actions) => {
            addButton(actions, 'Edit', () => openTenantEdit(tenant));
            addButton(actions, 'Hapus', () => deleteTenant(tenant), true);
        });
    });
}

function renderMenus() {
    const table = document.getElementById('menusTable');
    if (!menuItems.length) {
        setEmptyRow(table, 8, 'Belum ada data menu.');
        return;
    }

    const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    table.replaceChildren();
    menuItems.forEach((item) => {
        const row = table.insertRow();
        appendCell(row, item.nama_menu);
        appendCell(row, tenantById.get(item.tenant_id)?.nama_tenant || item.tenant_id);
        appendCell(row, item.kategori);
        appendCell(row, item.harga === null ? '—' : `Rp ${Number(item.harga).toLocaleString('id-ID')}`);
        appendCell(row, item.waktu_persiapan === null ? '—' : `${item.waktu_persiapan} menit`);
        appendCell(row, item.add_ons?.length ? `${item.add_ons.length} pilihan` : '—');
        const photoCell = row.insertCell();
        photoCell.className = 'px-5 py-4';
        if (item.foto_url) {
            const link = document.createElement('a');
            link.href = item.foto_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Lihat foto';
            link.className = 'font-bold text-blue-700 hover:underline';
            photoCell.append(link);
        } else {
            photoCell.textContent = '—';
        }
        appendActionCell(row, (actions) => {
            addButton(actions, 'Edit', () => openMenuEdit(item));
            addButton(actions, 'Hapus', () => deleteMenu(item), true);
        });
    });
}

async function loadAdminData() {
    const [profilesResult, tenantsResult, menusResult] = await Promise.all([
        db.from('profiles').select('id, nama, nim, no_telepon, peran').order('nama'),
        db.from('tenants').select('id, nama_tenant, lokasi, jam_operasional, jam_buka, jam_tutup, no_telepon, qris_image_url, pemilik_id, status_buka').order('nama_tenant'),
        db.from('menu_items').select('id, tenant_id, nama_menu, kategori, harga, waktu_persiapan, foto_url, tersedia, add_ons').order('nama_menu')
    ]);

    const errors = [];
    if (profilesResult.error) errors.push(`Gagal memuat user: ${profilesResult.error.message}`);
    else profiles = profilesResult.data;
    if (tenantsResult.error) errors.push(`Gagal memuat tenant: ${tenantsResult.error.message}`);
    else tenants = tenantsResult.data;
    if (menusResult.error) errors.push(`Gagal memuat menu: ${menusResult.error.message}`);
    else menuItems = menusResult.data;

    document.getElementById('studentCount').textContent = profilesResult.error
        ? '—'
        : String(profiles.filter((profile) => profile.peran === 'mahasiswa').length);
    document.getElementById('tenantCount').textContent = tenantsResult.error ? '—' : String(tenants.length);
    document.getElementById('openTenantCount').textContent = tenantsResult.error
        ? '—'
        : String(tenants.filter((tenant) => tenant.status_buka).length);

    if (!profilesResult.error) renderUsers();
    if (!tenantsResult.error) renderTenants();
    if (!menusResult.error) renderMenus();
    populateSelect(
        document.getElementById('tenantOwner'),
        profiles.filter((profile) => profile.peran === 'pemilik_tenant'),
        'Pilih pemilik',
        (profile) => profile.id,
        (profile) => profile.nama || profile.id
    );
    populateSelect(
        document.getElementById('menuTenant'),
        tenants,
        'Pilih tenant',
        (tenant) => tenant.id,
        (tenant) => tenant.nama_tenant
    );
    if (errors.length) setMessage(message, errors.join(' '), true);
}

async function initialize() {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) {
        setMessage(message, `Gagal memeriksa sesi: ${sessionError.message}`, true);
        return;
    }
    if (!session) {
        window.location.replace('/');
        return;
    }

    const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('id, peran')
        .eq('id', session.user.id)
        .single();
    if (profileError) {
        setMessage(message, `Gagal memuat profil: ${profileError.message}`, true);
        return;
    }
    if (profile.peran !== 'admin') {
        setMessage(message, 'Halaman ini hanya untuk akun admin.', true);
        window.setTimeout(() => window.location.replace('/'), 1500);
        return;
    }
    adminUser = session.user;
    clearMessage(message);
    await loadAdminData();
}

function updateNewUserRoleFields() {
    const isTenant = document.getElementById('newUserRole').value === 'pemilik_tenant';
    const identifier = document.getElementById('userIdentifier');
    const phoneField = document.getElementById('newUserPhoneField');
    const nameField = document.getElementById('newUserNameField');
    const passwordField = document.getElementById('newUserPasswordField');
    const passwordInput = document.getElementById('newUserPassword');
    document.getElementById('userIdentifierLabel').firstChild.textContent = isTenant ? 'Email' : 'NIM';
    document.getElementById('identifierHelp').textContent = isTenant
        ? 'Pemilik tenant login menggunakan email ini.'
        : 'Akun mahasiswa login menggunakan NIM. Password awal sama dengan NIM dan wajib diganti setelah login.';
    identifier.type = isTenant ? 'email' : 'text';
    identifier.inputMode = isTenant ? 'email' : 'numeric';
    if (isTenant) identifier.removeAttribute('pattern');
    else identifier.pattern = '[0-9]{6,20}';
    identifier.placeholder = isTenant ? 'nama@email.com' : '';
    identifier.value = '';
    nameField.classList.toggle('hidden', isTenant);
    nameField.classList.toggle('block', !isTenant);
    document.getElementById('newUserName').required = !isTenant;
    passwordField.classList.toggle('hidden', !isTenant);
    passwordField.classList.toggle('block', isTenant);
    passwordInput.required = isTenant;
    passwordInput.disabled = !isTenant;
    passwordInput.value = '';
    phoneField.classList.toggle('hidden', !isTenant);
    document.getElementById('newUserPhone').disabled = !isTenant;
}

function openUserEdit(profile) {
    editUserForm.reset();
    clearMessage(document.getElementById('userEditMessage'));
    document.getElementById('editUserId').value = profile.id;
    document.getElementById('editUserName').value = profile.nama || '';
    document.getElementById('editUserPhone').value = profile.no_telepon || '';
    document.getElementById('editUserNim').value = profile.nim || '';
    document.getElementById('editUserNimField').classList.toggle('hidden', profile.peran !== 'mahasiswa');
    openDialog(document.getElementById('userEditModal'), document.getElementById('editUserName'));
}

function openTenantCreate() {
    tenantForm.reset();
    document.getElementById('tenantId').value = '';
    document.getElementById('tenantModalTitle').textContent = 'Tambah Tenant';
    document.getElementById('tenantQrisHelp').textContent = 'Format PNG, JPEG, atau WebP, maksimal 5 MB.';
    clearMessage(document.getElementById('tenantModalMessage'));
    populateSelect(
        document.getElementById('tenantOwner'),
        profiles.filter((profile) => profile.peran === 'pemilik_tenant'),
        'Pilih pemilik',
        (profile) => profile.id,
        (profile) => profile.nama || profile.id
    );
    openDialog(document.getElementById('tenantModal'), document.getElementById('tenantName'));
}

function openTenantEdit(tenant) {
    tenantForm.reset();
    clearMessage(document.getElementById('tenantModalMessage'));
    document.getElementById('tenantId').value = tenant.id;
    document.getElementById('tenantModalTitle').textContent = 'Edit Tenant';
    document.getElementById('tenantName').value = tenant.nama_tenant || '';
    document.getElementById('tenantLocation').value = tenant.lokasi || '';
    document.getElementById('tenantHours').value = tenant.jam_operasional || '';
    document.getElementById('tenantOpenTime').value = tenant.jam_buka || '';
    document.getElementById('tenantCloseTime').value = tenant.jam_tutup || '';
    document.getElementById('tenantPhone').value = tenant.no_telepon || '';
    document.getElementById('tenantQrisHelp').textContent = tenant.qris_image_url
        ? 'QRIS sudah tersimpan. Pilih file baru jika ingin menggantinya.'
        : 'Format PNG, JPEG, atau WebP, maksimal 5 MB.';
    populateSelect(
        document.getElementById('tenantOwner'),
        profiles.filter((profile) => profile.peran === 'pemilik_tenant'),
        'Pilih pemilik',
        (profile) => profile.id,
        (profile) => profile.nama || profile.id,
        tenant.pemilik_id
    );
    if (tenant.pemilik_id && !profiles.some((profile) => profile.id === tenant.pemilik_id)) {
        document.getElementById('tenantOwner').add(new Option('Pemilik tidak ditemukan', tenant.pemilik_id));
        document.getElementById('tenantOwner').value = tenant.pemilik_id;
    }
    openDialog(document.getElementById('tenantModal'), document.getElementById('tenantName'));
}

function openMenuCreate() {
    menuForm.reset();
    setMenuAddons();
    populateMenuCategories();
    document.getElementById('menuId').value = '';
    document.getElementById('menuModalTitle').textContent = 'Tambah Menu';
    document.getElementById('menuPhotoHelp').textContent = 'Format PNG, JPEG, atau WebP, maksimal 5 MB.';
    clearMessage(document.getElementById('menuModalMessage'));
    populateSelect(
        document.getElementById('menuTenant'),
        tenants,
        'Pilih tenant',
        (tenant) => tenant.id,
        (tenant) => tenant.nama_tenant
    );
    openDialog(document.getElementById('menuModal'), document.getElementById('menuTenant'));
}

function openMenuEdit(item) {
    menuForm.reset();
    setMenuAddons(item.add_ons || []);
    populateMenuCategories(item.kategori || '');
    clearMessage(document.getElementById('menuModalMessage'));
    document.getElementById('menuId').value = item.id;
    document.getElementById('menuModalTitle').textContent = 'Edit Menu';
    document.getElementById('menuName').value = item.nama_menu || '';
    document.getElementById('menuPrice').value = item.harga ?? '';
    document.getElementById('menuPreparation').value = item.waktu_persiapan ?? 0;
    document.getElementById('menuPhotoHelp').textContent = item.foto_url
        ? 'Foto sudah tersimpan. Pilih file baru jika ingin menggantinya.'
        : 'Format PNG, JPEG, atau WebP, maksimal 5 MB.';
    populateSelect(
        document.getElementById('menuTenant'),
        tenants,
        'Pilih tenant',
        (tenant) => tenant.id,
        (tenant) => tenant.nama_tenant,
        item.tenant_id
    );
    openDialog(document.getElementById('menuModal'), document.getElementById('menuTenant'));
}

function validateImage(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        throw new Error('Gunakan gambar PNG, JPEG, atau WebP.');
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.');
}

async function uploadImage(bucket, recordId, file) {
    if (!file) return null;
    validateImage(file);
    const extensionByType = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const path = `${adminUser.id}/${recordId}/${crypto.randomUUID()}.${extensionByType[file.type]}`;
    const { data, error } = await db.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
    });
    if (error) throw new Error(`Gagal mengunggah gambar: ${error.message}`);
    const { data: publicUrl } = db.storage.from(bucket).getPublicUrl(data.path);
    if (!publicUrl?.publicUrl) throw new Error('URL gambar yang diunggah tidak tersedia.');
    return { path: data.path, url: publicUrl.publicUrl };
}

async function removeImage(bucket, imageUrl) {
    if (!imageUrl) return null;
    let url;
    try {
        url = new URL(imageUrl);
    } catch {
        return null;
    }
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    let path;
    try {
        path = encodedPath.split('/').map(decodeURIComponent).join('/');
    } catch {
        return new Error('URL gambar lama tidak dapat dibaca untuk dibersihkan.');
    }
    const { error } = await db.storage.from(bucket).remove([path]);
    return error ? new Error(`Gagal menghapus gambar lama: ${error.message}`) : null;
}

async function deleteUser(profile) {
    if (profile.peran === 'admin' || profile.id === adminUser.id) {
        setMessage(message, 'Akun admin atau akun yang sedang digunakan tidak dapat dihapus.', true);
        return;
    }
    if (!window.confirm(`Hapus akun ${profile.nama || profile.id}? Tindakan ini tidak dapat dibatalkan.`)) return;
    const { data, error } = await db.functions.invoke('manage-user', {
        body: { action: 'delete', user_id: profile.id }
    });
    if (error || data?.error) {
        setMessage(message, `User gagal dihapus: ${error?.message || data.error}`, true);
        return;
    }
    setMessage(message, data?.message || 'User berhasil dihapus.', false);
    await loadAdminData();
}

async function resetStudentPassword(profile) {
    if (profile.peran !== 'mahasiswa') return;
    if (!window.confirm(`Reset password ${profile.nama || profile.nim}? Password akan diatur menjadi NIM dan wajib diganti setelah login.`)) return;
    const { data, error } = await db.functions.invoke('admin-reset-password', {
        body: { user_id: profile.id }
    });
    if (error || data?.error) {
        setMessage(message, `Reset password gagal: ${error?.message || data.error}`, true);
        return;
    }
    setMessage(message, `Password ${profile.nama || profile.nim} berhasil diatur menjadi NIM (${data.password}). Mahasiswa wajib menggantinya setelah login.`, false);
}

async function deleteTenant(tenant) {
    if (!window.confirm(`Hapus tenant "${tenant.nama_tenant}"? Tenant yang masih dipakai menu atau transaksi tidak dapat dihapus.`)) return;
    const { error } = await db.from('tenants').delete().eq('id', tenant.id);
    if (error) {
        setMessage(message, `Tenant gagal dihapus: ${error.message}`, true);
        return;
    }
    const cleanupError = await removeImage('qris-images', tenant.qris_image_url);
    setMessage(message, cleanupError ? `Tenant terhapus, tetapi ${cleanupError.message}` : 'Tenant berhasil dihapus.', Boolean(cleanupError));
    await loadAdminData();
}

async function deleteMenu(item) {
    if (!window.confirm(`Hapus menu "${item.nama_menu}"?`)) return;
    const { error } = await db.from('menu_items').delete().eq('id', item.id);
    if (error) {
        setMessage(message, `Menu gagal dihapus: ${error.message}`, true);
        return;
    }
    const cleanupError = await removeImage('menu-images', item.foto_url);
    setMessage(message, cleanupError ? `Menu terhapus, tetapi ${cleanupError.message}` : 'Menu berhasil dihapus.', Boolean(cleanupError));
    await loadAdminData();
}

document.getElementById('addUserButton').addEventListener('click', () => {
    createUserForm.reset();
    updateNewUserRoleFields();
    clearMessage(document.getElementById('modalMessage'));
    openDialog(userModal, document.getElementById('newUserRole'));
});
document.getElementById('closeUserModalButton').addEventListener('click', () => closeDialog(userModal));
document.getElementById('cancelUserButton').addEventListener('click', () => closeDialog(userModal));
document.getElementById('newUserRole').addEventListener('change', updateNewUserRoleFields);
document.getElementById('addTenantButton').addEventListener('click', openTenantCreate);
document.getElementById('addMenuButton').addEventListener('click', openMenuCreate);
document.getElementById('addMenuAddonButton').addEventListener('click', () => addMenuAddonRow());
document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.closeModal)));
});
document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeDialog(dialog);
    });
});
document.querySelectorAll('[data-admin-nav]').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelectorAll('[data-admin-nav]').forEach((navLink) => navLink.classList.toggle('is-active', navLink === link));
        document.getElementById('adminSidebar').classList.add('-translate-x-full');
        document.getElementById('adminOverlay').classList.add('hidden');
        document.getElementById('adminMenuButton').setAttribute('aria-expanded', 'false');
    });
});
document.getElementById('adminMenuButton').addEventListener('click', () => {
    const sidebar = document.getElementById('adminSidebar');
    const isOpen = sidebar.classList.toggle('-translate-x-full') === false;
    document.getElementById('adminOverlay').classList.toggle('hidden', !isOpen);
    document.getElementById('adminMenuButton').setAttribute('aria-expanded', String(isOpen));
});
document.getElementById('adminOverlay').addEventListener('click', () => {
    document.getElementById('adminSidebar').classList.add('-translate-x-full');
    document.getElementById('adminOverlay').classList.add('hidden');
    document.getElementById('adminMenuButton').setAttribute('aria-expanded', 'false');
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        document.querySelectorAll('[role="dialog"]:not(.hidden)').forEach(closeDialog);
    }
});

createUserForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!adminUser) return;
    const formData = new FormData(createUserForm);
    const peran = formData.get('peran');
    const identifier = String(formData.get('identifier') || '').trim();
    const body = { peran };
    if (peran === 'mahasiswa') {
        body.nim = identifier;
        body.nama = String(formData.get('nama') || '').trim();
    }
    else {
        body.email = identifier;
        body.no_telepon = String(formData.get('no_telepon') || '').trim();
        body.password = formData.get('password');
    }
    const submitButton = document.getElementById('createUserSubmit');
    submitButton.disabled = true;
    try {
        const { data, error } = await db.functions.invoke('create-user', { body });
        if (error || data?.error || data?.success === false) {
            setMessage(document.getElementById('modalMessage'), `User gagal dibuat: ${error?.message || data?.error || 'Edge Function menolak permintaan.'}`, true);
            return;
        }
        const modalMessage = document.getElementById('modalMessage');
        if (peran === 'mahasiswa') {
            setMessage(
                modalMessage,
                'Mahasiswa berhasil didaftarkan. Password awal sama dengan NIM; minta mahasiswa menggantinya setelah login.',
                false
            );
        } else {
            setMessage(modalMessage, data?.message || 'User berhasil dibuat.', false);
        }
        await loadAdminData();
    } catch (error) {
        setMessage(document.getElementById('modalMessage'), `User gagal dibuat: ${error.message}`, true);
    } finally {
        submitButton.disabled = false;
    }
});

editUserForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const profile = profiles.find((item) => item.id === document.getElementById('editUserId').value);
    if (!profile) {
        setMessage(document.getElementById('userEditMessage'), 'User tidak ditemukan. Muat ulang halaman dan coba lagi.', true);
        return;
    }
    const values = new FormData(editUserForm);
    const update = {
        nama: String(values.get('nama') || '').trim(),
        no_telepon: String(values.get('no_telepon') || '').trim()
    };
    if (profile.peran === 'mahasiswa') update.nim = String(values.get('nim') || '').trim();
    const submitButton = document.getElementById('editUserSubmit');
    submitButton.disabled = true;
    try {
        const { error } = await db.from('profiles').update(update).eq('id', profile.id);
        if (error) {
            setMessage(document.getElementById('userEditMessage'), `User gagal diperbarui: ${error.message}`, true);
            return;
        }
        closeDialog(document.getElementById('userEditModal'));
        setMessage(message, 'Profil user berhasil diperbarui.', false);
        await loadAdminData();
    } catch (error) {
        setMessage(document.getElementById('userEditMessage'), `User gagal diperbarui: ${error.message}`, true);
    } finally {
        submitButton.disabled = false;
    }
});

tenantForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(tenantForm);
    const id = String(values.get('id') || '');
    const file = document.getElementById('tenantQris').files[0];
    const submitButton = document.getElementById('tenantSubmit');
    submitButton.disabled = true;
    let uploadedImage = null;
    let createdTenantId = null;
    try {
        validateImage(file);
        const fields = {
            nama_tenant: String(values.get('nama_tenant') || '').trim(),
            lokasi: String(values.get('lokasi') || '').trim(),
            no_telepon: String(values.get('no_telepon') || '').trim(),
            pemilik_id: String(values.get('pemilik_id') || '')
        };
        const jamBuka = String(values.get('jam_buka') || '').trim();
        const jamTutup = String(values.get('jam_tutup') || '').trim();
        if (Boolean(jamBuka) !== Boolean(jamTutup)) {
            throw new Error('Isi jam buka dan jam tutup, atau kosongkan keduanya.');
        }
        if (jamBuka && jamBuka === jamTutup) {
            throw new Error('Jam buka dan jam tutup tidak boleh sama.');
        }
        fields.jam_buka = jamBuka || null;
        fields.jam_tutup = jamTutup || null;
        fields.jam_operasional = jamBuka ? `${jamBuka} - ${jamTutup}` : '';
        fields.override_until = null;
        let tenantId = id;
        if (id) {
            if (file) {
                uploadedImage = await uploadImage('qris-images', id, file);
                fields.qris_image_url = uploadedImage.url;
            }
            const { error } = await db.from('tenants').update(fields).eq('id', id);
            if (error) throw new Error(`Tenant gagal diperbarui: ${error.message}`);
        } else {
            const { data, error } = await db.from('tenants').insert({ ...fields, status_buka: false }).select('id').single();
            if (error) throw new Error(`Tenant gagal dibuat: ${error.message}`);
            tenantId = data.id;
            createdTenantId = tenantId;
            if (file) {
                uploadedImage = await uploadImage('qris-images', tenantId, file);
                const { error: imageError } = await db.from('tenants').update({ qris_image_url: uploadedImage.url }).eq('id', tenantId);
                if (imageError) throw new Error(`URL QRIS gagal disimpan: ${imageError.message}`);
            }
        }
        const oldImage = id ? tenants.find((tenant) => tenant.id === id)?.qris_image_url : null;
        const cleanupError = uploadedImage && oldImage ? await removeImage('qris-images', oldImage) : null;
        closeDialog(document.getElementById('tenantModal'));
        setMessage(message, cleanupError ? `Tenant tersimpan, tetapi ${cleanupError.message}` : `Tenant berhasil ${id ? 'diperbarui' : 'ditambahkan'}.`, Boolean(cleanupError));
        await loadAdminData();
    } catch (error) {
        const cleanupMessages = [];
        if (createdTenantId) {
            const { error: deleteError } = await db.from('tenants').delete().eq('id', createdTenantId);
            if (deleteError) cleanupMessages.push(`Tenant baru gagal dibatalkan: ${deleteError.message}`);
        }
        if (uploadedImage) {
            const { error: cleanupError } = await db.storage.from('qris-images').remove([uploadedImage.path]);
            if (cleanupError) cleanupMessages.push(`Gambar gagal dibersihkan: ${cleanupError.message}`);
        }
        setMessage(document.getElementById('tenantModalMessage'), [error.message, ...cleanupMessages].join(' '), true);
    } finally {
        submitButton.disabled = false;
    }
});

menuForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(menuForm);
    const id = String(values.get('id') || '');
    const file = document.getElementById('menuPhoto').files[0];
    const submitButton = document.getElementById('menuSubmit');
    submitButton.disabled = true;
    let uploadedImage = null;
    let createdMenuId = null;
    try {
        validateImage(file);
        const fields = {
            tenant_id: String(values.get('tenant_id') || ''),
            nama_menu: String(values.get('nama_menu') || '').trim(),
            kategori: String(values.get('kategori') || '').trim(),
            harga: Number(values.get('harga')),
            waktu_persiapan: Number(values.get('waktu_persiapan')),
            add_ons: readMenuAddons()
        };
        if (!Number.isSafeInteger(fields.harga) || fields.harga < 0) throw new Error('Harga harus berupa bilangan bulat yang valid.');
        if (!Number.isSafeInteger(fields.waktu_persiapan) || fields.waktu_persiapan < 0 || fields.waktu_persiapan > 1440) {
            throw new Error('Waktu persiapan harus antara 0 sampai 1440 menit.');
        }
        if (id) {
            if (file) {
                uploadedImage = await uploadImage('menu-images', id, file);
                fields.foto_url = uploadedImage.url;
            }
            const { error } = await db.from('menu_items').update(fields).eq('id', id);
            if (error) throw new Error(`Menu gagal diperbarui: ${error.message}`);
        } else {
            const { data, error } = await db.from('menu_items').insert({ ...fields, tersedia: true }).select('id').single();
            if (error) throw new Error(`Menu gagal dibuat: ${error.message}`);
            createdMenuId = data.id;
            if (file) {
                uploadedImage = await uploadImage('menu-images', data.id, file);
                const { error: imageError } = await db.from('menu_items').update({ foto_url: uploadedImage.url }).eq('id', data.id);
                if (imageError) throw new Error(`URL foto gagal disimpan: ${imageError.message}`);
            }
        }
        const oldImage = id ? menuItems.find((item) => item.id === id)?.foto_url : null;
        const cleanupError = uploadedImage && oldImage ? await removeImage('menu-images', oldImage) : null;
        closeDialog(document.getElementById('menuModal'));
        setMessage(message, cleanupError ? `Menu tersimpan, tetapi ${cleanupError.message}` : `Menu berhasil ${id ? 'diperbarui' : 'ditambahkan'}.`, Boolean(cleanupError));
        await loadAdminData();
    } catch (error) {
        const cleanupMessages = [];
        if (createdMenuId) {
            const { error: deleteError } = await db.from('menu_items').delete().eq('id', createdMenuId);
            if (deleteError) cleanupMessages.push(`Menu baru gagal dibatalkan: ${deleteError.message}`);
        }
        if (uploadedImage) {
            const { error: cleanupError } = await db.storage.from('menu-images').remove([uploadedImage.path]);
            if (cleanupError) cleanupMessages.push(`Gambar gagal dibersihkan: ${cleanupError.message}`);
        }
        setMessage(document.getElementById('menuModalMessage'), [error.message, ...cleanupMessages].join(' '), true);
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById('logoutButton').addEventListener('click', async () => {
    const { error } = await db.auth.signOut();
    if (error) {
        setMessage(message, `Gagal logout: ${error.message}`, true);
        return;
    }
    window.location.replace('/');
});

initialize();
