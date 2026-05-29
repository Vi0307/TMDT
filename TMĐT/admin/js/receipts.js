const API_URL = 'http://localhost:3005/api/admin/receipts';

const receiptTableBody = document.getElementById('receiptTableBody');
const searchInput = document.getElementById('searchInput');

// Lấy danh sách phiếu nhập
async function loadReceipts(search = '') {
    receiptTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#A0AEC0;">Đang tải...</td></tr>`;
    try {
        const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
            renderTable(json.data);
        } else {
            receiptTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:40px;">Lỗi: ${json.message}</td></tr>`;
        }
    } catch (err) {
        console.error('loadReceipts error:', err);
        receiptTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;padding:40px;">Không thể kết nối server. (${err.message})</td></tr>`;
    }
}

// Lấy danh sách nhà cung cấp cho dropdown
async function fetchSuppliers() {
    try {
        const res = await fetch(`${API_URL}/suppliers`);
        const json = await res.json();
        return json.success ? json.data : [];
    } catch {
        return [];
    }
}

// Lấy sản phẩm theo NCC (lọc theo danh mục NCC cung cấp)
async function fetchProductsBySupplier(maNCC) {
    if (!maNCC) return [];
    try {
        const res  = await fetch(`${API_URL}/suppliers/${maNCC}/products`);
        const json = await res.json();
        return json.success ? json.data : [];
    } catch {
        return [];
    }
}

// Tạo HTML options cho dropdown sản phẩm của nhà cung cấp
function buildProductOptions(products) {
    if (!products || products.length === 0)
        return `<option value="">-- Chưa có sản phẩm --</option>`;

    // Trả về trực tiếp các tùy chọn sản phẩm (không gộp nhóm danh mục hay dòng trống)
    return products.map(p =>
        `<option value="${p.maSanPham}">${p.tenSanPham}</option>`
    ).join('');
}

// Xử lý khi đổi NCC → cập nhật dropdown sản phẩm và tự động chọn sản phẩm & điền thông tin
async function onNccChange(maNCC) {
    const spEl = document.getElementById('swal-sp');
    const slEl = document.getElementById('swal-sl');
    const giaEl = document.getElementById('swal-gia');
    if (!spEl) return;

    if (!maNCC) {
        spEl.innerHTML = `<option value="">-- Chọn NCC trước --</option>`;
        spEl.disabled = true;
        window._currentNccProducts = [];
        if (slEl) slEl.value = '';
        if (giaEl) giaEl.value = '';
        return;
    }

    spEl.innerHTML = `<option value="">Đang tải...</option>`;
    spEl.disabled = true;

    const products = await fetchProductsBySupplier(maNCC);
    window._currentNccProducts = products;
    spEl.innerHTML = buildProductOptions(products);
    spEl.disabled = false;

    // Tự động chọn sản phẩm đầu tiên của NCC và điền thông tin giá gợi ý
    if (products && products.length > 0) {
        spEl.value = products[0].maSanPham;
        if (slEl) slEl.value = 1; // Mặc định số lượng nhập là 1
        if (giaEl && products[0].giaBan) {
            // Giá nhập gợi ý = 70% giá bán lẻ, làm tròn đến hàng nghìn
            const recommendedGia = Math.round((products[0].giaBan * 0.7) / 1000) * 1000;
            giaEl.value = recommendedGia;
        }
    } else {
        if (slEl) slEl.value = '';
        if (giaEl) giaEl.value = '';
    }
}

// Xử lý khi thay đổi sản phẩm trên dropdown → cập nhật lại giá nhập tự động theo sản phẩm mới chọn
function onProductChange(maSanPham) {
    const giaEl = document.getElementById('swal-gia');
    if (!giaEl) return;

    if (!maSanPham) {
        giaEl.value = '';
        return;
    }

    const products = window._currentNccProducts || [];
    const product = products.find(p => p.maSanPham === maSanPham);
    if (product && product.giaBan) {
        const recommendedGia = Math.round((product.giaBan * 0.7) / 1000) * 1000;
        giaEl.value = recommendedGia;
    } else {
        giaEl.value = '';
    }
}

// Render bảng
function renderTable(data) {
    receiptTableBody.innerHTML = '';

    if (data.length === 0) {
        receiptTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#A0AEC0;">Không tìm thấy phiếu nhập nào.</td></tr>`;
        return;
    }

    data.forEach((r, index) => {
        const ngay     = r.ngayNhap ? new Date(r.ngayNhap).toLocaleDateString('vi-VN') : '';
        const tongTien = r.tongTien != null
            ? Number(r.tongTien).toLocaleString('vi-VN') + ' đ'
            : '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${r.maPhieuNhap}</strong></td>
            <td>
                <div style="font-weight:600;color:#2D3748;">${r.tenNCC || r.maNCC}</div>
            </td>
            <td>
                <div class="contact-info">
                    <div class="contact-info-item"><i class="ph ph-calendar-blank"></i> ${ngay}</div>
                </div>
            </td>
            <td><strong style="color:#2D6A4F;">${tongTien}</strong></td>
            <td class="actions">
                <button class="btn-action" onclick="viewDetails(${r.maPhieuNhap})" title="Xem chi tiết"
                    style="background:#EBF8FF;color:#2B6CB0;border:1px solid #BEE3F8;">
                    <i class="ph ph-list-bullets"></i>
                </button>
                <button class="btn-action btn-edit" onclick="editReceipt(${r.maPhieuNhap})" title="Sửa thông tin">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteReceipt(${r.maPhieuNhap})" title="Xóa phiếu nhập">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        receiptTableBody.appendChild(tr);
    });
}

// Xem chi tiết phiếu nhập
async function viewDetails(id) {
    try {
        const res  = await fetch(`${API_URL}/${id}/details`);
        const json = await res.json();

        if (!json.success) {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
            return;
        }

        const d = json.data;
        const ngay = d.ngayNhap ? new Date(d.ngayNhap).toLocaleDateString('vi-VN') : '—';
        const tongTien = d.tongTien != null
            ? Number(d.tongTien).toLocaleString('vi-VN') + ' đ'
            : '—';

        // Render danh sách sản phẩm trong phiếu
        let chiTietHtml = '';
        if (d.chiTiet && d.chiTiet.length > 0) {
            const rows = d.chiTiet.map(item => {
                const gia      = Number(item.giaNhap).toLocaleString('vi-VN') + ' đ';
                const thanh    = Number(item.thanhTien).toLocaleString('vi-VN') + ' đ';
                return `
                    <tr style="border-bottom:1px solid #EDF2F7;">
                        <td style="padding:10px 8px;font-weight:600;color:#2D3748;">${item.maSanPham}</td>
                        <td style="padding:10px 8px;">${item.tenSanPham}</td>
                        <td style="padding:10px 8px;text-align:center;">${item.soLuong}</td>
                        <td style="padding:10px 8px;text-align:right;">${gia}</td>
                        <td style="padding:10px 8px;text-align:right;font-weight:600;color:#2D6A4F;">${thanh}</td>
                    </tr>
                `;
            }).join('');

            chiTietHtml = `
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
                    <thead>
                        <tr style="background:#F7FAFC;border-bottom:2px solid #E2E8F0;">
                            <th style="padding:8px;text-align:left;color:#718096;">Mã SP</th>
                            <th style="padding:8px;text-align:left;color:#718096;">Tên sản phẩm</th>
                            <th style="padding:8px;text-align:center;color:#718096;">SL</th>
                            <th style="padding:8px;text-align:right;color:#718096;">Giá nhập</th>
                            <th style="padding:8px;text-align:right;color:#718096;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr style="background:#F7FAFC;border-top:2px solid #E2E8F0;">
                            <td colspan="4" style="padding:10px 8px;font-weight:700;color:#2D3748;text-align:right;">Tổng cộng:</td>
                            <td style="padding:10px 8px;font-weight:700;color:#2D6A4F;text-align:right;">${tongTien}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        } else {
            chiTietHtml = `<p style="color:#A0AEC0;text-align:center;padding:20px;">Chưa có sản phẩm trong phiếu nhập này.</p>`;
        }

        Swal.fire({
            title: `Chi tiết phiếu nhập #${id}`,
            width: 750,
            html: `
                <div style="text-align:left;">
                    <!-- Thông tin phiếu -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F7FAFC;border-radius:8px;padding:14px;margin-bottom:16px;">
                        <div>
                            <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Nhà cung cấp</div>
                            <div style="font-weight:600;color:#2D3748;">${d.tenNCC || '—'}</div>
                            ${d.sdtNCC ? `<div style="font-size:12px;color:#718096;margin-top:2px;"><i class="ph ph-phone"></i> ${d.sdtNCC}</div>` : ''}
                            ${d.emailNCC ? `<div style="font-size:12px;color:#718096;"><i class="ph ph-envelope"></i> ${d.emailNCC}</div>` : ''}
                        </div>
                        <div>
                            <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Ngày nhập</div>
                            <div style="font-weight:600;color:#2D3748;">${ngay}</div>
                            ${d.ghiChu ? `<div style="font-size:12px;color:#718096;margin-top:4px;">Ghi chú: ${d.ghiChu}</div>` : ''}
                        </div>
                    </div>

                    <!-- Danh sách sản phẩm -->
                    <div style="font-size:13px;font-weight:600;color:#4A5568;margin-bottom:6px;">
                        <i class="ph ph-package"></i> Danh sách sản phẩm (${d.chiTiet ? d.chiTiet.length : 0} mặt hàng)
                    </div>
                    ${chiTietHtml}
                </div>
            `,
            confirmButtonColor: '#5C4033',
            confirmButtonText: 'Đóng',
            showClass: { popup: 'animate__animated animate__fadeInDown' }
        });
    } catch (err) {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải chi tiết phiếu nhập.', icon: 'error' });
    }
}

// Tạo HTML dropdown NCC kèm thông tin sản phẩm cung cấp
function buildSupplierOptions(suppliers, selectedId = null) {
    return suppliers.map(s => {
        const label = s.tenSanPhamCungCap ? `${s.tenNCC} - ${s.tenSanPhamCungCap}` : s.tenNCC;
        return `<option value="${s.maNCC}" ${s.maNCC == selectedId ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

// Thêm phiếu nhập
async function addReceipt() {
    const suppliers = await fetchSuppliers();
    if (suppliers.length === 0) {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải danh sách nhà cung cấp.', icon: 'error' });
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: 'Thêm phiếu nhập mới',
        width: 1000,
        html: `
            <div style="text-align:left;display:flex;flex-direction:column;gap:16px;padding:4px 0;">
                <!-- NCC & Ngày & Ghi chú -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                            Nhà cung cấp <span style="color:#E53E3E">*</span>
                        </label>
                        <select id="swal-ncc" class="swal2-input"
                            style="width:100%;margin:0;box-sizing:border-box;border-radius:8px;height:42px;font-size:14px;"
                            onchange="onNccChange(this.value)">
                            <option value="">-- Chọn NCC --</option>
                            ${buildSupplierOptions(suppliers)}
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                            Ngày nhập <span style="color:#E53E3E">*</span>
                        </label>
                        <input id="swal-date" type="date" class="swal2-input"
                            style="width:100%;margin:0;box-sizing:border-box;border-radius:8px;height:42px;font-size:14px;"
                            value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:6px;">Ghi chú</label>
                        <input id="swal-note" type="text" class="swal2-input" placeholder="Ghi chú (tuỳ chọn)"
                            style="width:100%;margin:0;box-sizing:border-box;border-radius:8px;height:42px;font-size:14px;">
                    </div>
                </div>

                <!-- Thêm sản phẩm -->
                <div>
                    <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Chi tiết sản phẩm
                    </label>
                    <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;">
                        <select id="swal-sp" class="swal2-input"
                            style="margin:0;box-sizing:border-box;border-radius:8px;height:38px;font-size:13px;"
                            onchange="onProductChange(this.value)" disabled>
                            <option value="">-- Chọn NCC trước --</option>
                        </select>
                        <input id="swal-sl" type="number" min="1" placeholder="Số lượng"
                            class="swal2-input" style="margin:0;box-sizing:border-box;border-radius:8px;height:38px;font-size:13px;">
                        <input id="swal-gia" type="number" min="0" placeholder="Giá nhập (đ)"
                            class="swal2-input" style="margin:0;box-sizing:border-box;border-radius:8px;height:38px;font-size:13px;">
                        <button type="button" onclick="addProductRow()"
                            style="height:38px;padding:0 14px;background:#5C4033;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">
                            + Thêm
                        </button>
                    </div>

                    <!-- Bảng sản phẩm đã thêm -->
                    <div id="product-rows" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;min-height:40px;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#F7FAFC;">
                                    <th style="padding:8px 10px;text-align:left;color:#718096;font-weight:600;">Sản phẩm</th>
                                    <th style="padding:8px 10px;text-align:center;color:#718096;font-weight:600;">SL</th>
                                    <th style="padding:8px 10px;text-align:right;color:#718096;font-weight:600;">Giá nhập</th>
                                    <th style="padding:8px 10px;text-align:right;color:#718096;font-weight:600;">Thành tiền</th>
                                    <th style="padding:8px 10px;"></th>
                                </tr>
                            </thead>
                            <tbody id="product-tbody">
                                <tr id="empty-row">
                                    <td colspan="5" style="padding:16px;text-align:center;color:#A0AEC0;font-style:italic;">
                                        Chưa có sản phẩm nào
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Tổng tiền -->
                    <div style="text-align:right;margin-top:10px;font-size:14px;font-weight:700;color:#2D6A4F;">
                        Tổng tiền: <span id="tong-tien-display">0 đ</span>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#5C4033',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Tạo phiếu nhập',
        cancelButtonText: 'Hủy bỏ',
        didOpen: () => {
            window._receiptItems = [];
        },
        preConfirm: () => {
            const maNCC    = document.getElementById('swal-ncc').value;
            const ngayNhap = document.getElementById('swal-date').value;
            const ghiChu   = document.getElementById('swal-note').value.trim();
            if (!maNCC)    return Swal.showValidationMessage('Bạn cần chọn nhà cung cấp!');
            if (!ngayNhap) return Swal.showValidationMessage('Bạn cần chọn ngày nhập!');
            return {
                maNCC:    parseInt(maNCC),
                ngayNhap,
                ghiChu:   ghiChu || null,
                chiTiet:  window._receiptItems || []
            };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({
                title: 'Thành công!',
                text: `Đã tạo phiếu nhập #${json.maPhieuNhap} với ${formValues.chiTiet.length} sản phẩm.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            loadReceipts(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Thêm dòng sản phẩm vào bảng trong popup
function addProductRow() {
    const spEl  = document.getElementById('swal-sp');
    const slEl  = document.getElementById('swal-sl');
    const giaEl = document.getElementById('swal-gia');

    const maSanPham  = spEl.value;
    const tenSanPham = spEl.options[spEl.selectedIndex]?.text || '';
    const soLuong    = parseInt(slEl.value);
    const giaNhap    = parseFloat(giaEl.value);

    if (!maSanPham)        { alert('Vui lòng chọn sản phẩm!'); return; }
    if (!soLuong || soLuong < 1) { alert('Số lượng phải >= 1!'); return; }
    if (!giaNhap || giaNhap < 0) { alert('Giá nhập không hợp lệ!'); return; }

    // Kiểm tra trùng
    if (!window._receiptItems) window._receiptItems = [];
    const existing = window._receiptItems.find(i => i.maSanPham === maSanPham);
    if (existing) { alert('Sản phẩm này đã được thêm!'); return; }

    window._receiptItems.push({ maSanPham, tenSanPham, soLuong, giaNhap });

    // Xóa dòng "chưa có sản phẩm"
    const emptyRow = document.getElementById('empty-row');
    if (emptyRow) emptyRow.remove();

    // Thêm dòng vào bảng
    const tbody = document.getElementById('product-tbody');
    const thanhTien = soLuong * giaNhap;
    const tr = document.createElement('tr');
    tr.id = `row-${maSanPham}`;
    tr.style.borderTop = '1px solid #EDF2F7';
    tr.innerHTML = `
        <td style="padding:8px 10px;">${tenSanPham.split(' (')[0]}</td>
        <td style="padding:8px 10px;text-align:center;">${soLuong}</td>
        <td style="padding:8px 10px;text-align:right;">${giaNhap.toLocaleString('vi-VN')} đ</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:#2D6A4F;">${thanhTien.toLocaleString('vi-VN')} đ</td>
        <td style="padding:8px 10px;text-align:center;">
            <button type="button" onclick="removeProductRow('${maSanPham}')"
                style="background:none;border:none;cursor:pointer;color:#E53E3E;font-size:16px;">✕</button>
        </td>
    `;
    tbody.appendChild(tr);

    // Cập nhật tổng tiền
    updateTongTien();

    // Reset input sản phẩm
    spEl.value  = '';
    slEl.value  = '';
    giaEl.value = '';

    // Khóa trường nhà cung cấp để tránh chọn sai NCC khác
    const nccEl = document.getElementById('swal-ncc');
    if (nccEl) {
        nccEl.disabled = true;
    }
}

// Xóa dòng sản phẩm khỏi bảng
function removeProductRow(maSanPham) {
    window._receiptItems = (window._receiptItems || []).filter(i => i.maSanPham !== maSanPham);
    const row = document.getElementById(`row-${maSanPham}`);
    if (row) row.remove();

    // Nếu hết sản phẩm → hiện lại dòng trống và mở khóa chọn nhà cung cấp
    if (window._receiptItems.length === 0) {
        const tbody = document.getElementById('product-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr id="empty-row">
                    <td colspan="5" style="padding:16px;text-align:center;color:#A0AEC0;font-style:italic;">
                        Chưa có sản phẩm nào
                    </td>
                </tr>
            `;
        }
        const nccEl = document.getElementById('swal-ncc');
        if (nccEl) {
            nccEl.disabled = false;
        }
    }
    updateTongTien();
}

// Cập nhật hiển thị tổng tiền
function updateTongTien() {
    const total = (window._receiptItems || []).reduce((sum, i) => sum + i.soLuong * i.giaNhap, 0);
    const el = document.getElementById('tong-tien-display');
    if (el) el.textContent = total.toLocaleString('vi-VN') + ' đ';
}

// Sửa phiếu nhập
async function editReceipt(id) {
    // Load song song: suppliers + chi tiết phiếu nhập
    const [suppliers, detailRes] = await Promise.all([
        fetchSuppliers(),
        fetch(`${API_URL}/${id}/details`).then(r => r.json()).catch(() => ({ success: false }))
    ]);

    if (suppliers.length === 0) {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải danh sách nhà cung cấp.', icon: 'error' });
        return;
    }
    if (!detailRes.success) {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể tải chi tiết phiếu nhập.', icon: 'error' });
        return;
    }

    const d = detailRes.data;
    const currentNCC  = d.maNCC;
    const currentDate = d.ngayNhap ? d.ngayNhap.split('T')[0] : '';
    const currentNote = d.ghiChu || '';

    // Lấy sản phẩm theo NCC hiện tại
    const products = await fetchProductsBySupplier(currentNCC);
    const productOptions = buildProductOptions(products);

    const { value: formValues } = await Swal.fire({
        title: `Sửa phiếu nhập #${id}`,
        width: 1000,
        html: `
            <div style="text-align:left;display:flex;flex-direction:column;gap:16px;padding:4px 0;">
                <!-- NCC, Ngày, Ghi chú -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                            Nhà cung cấp <span style="color:#E53E3E">*</span>
                        </label>
                        <select id="swal-ncc" class="swal2-input"
                            style="width:100%;margin:0;box-sizing:border-box;border-radius:8px;height:42px;font-size:14px;"
                            onchange="onNccChange(this.value)">
                            ${buildSupplierOptions(suppliers, currentNCC)}
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:6px;">
                            Ngày nhập <span style="color:#E53E3E">*</span>
                        </label>
                        <input id="swal-date" type="date" class="swal2-input"
                            style="width:100%;margin:0;box-sizing:border-box;border-radius:8px;height:42px;font-size:14px;"
                            value="${currentDate}">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:6px;">Ghi chú</label>
                        <input id="swal-note" type="text" class="swal2-input" placeholder="Ghi chú (tuỳ chọn)"
                            style="width:100%;margin:0;box-sizing:border-box;border-radius:8px;height:42px;font-size:14px;"
                            value="${currentNote}">
                    </div>
                </div>

                <!-- Thêm sản phẩm -->
                <div>
                    <label style="display:block;font-size:13px;font-weight:600;color:#2D3748;margin-bottom:8px;">
                        Chi tiết sản phẩm
                    </label>
                    <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;">
                        <select id="swal-sp" class="swal2-input"
                            style="margin:0;box-sizing:border-box;border-radius:8px;height:38px;font-size:13px;"
                            onchange="onProductChange(this.value)">
                            ${productOptions}
                        </select>
                        <input id="swal-sl" type="number" min="1" placeholder="Số lượng"
                            class="swal2-input" style="margin:0;box-sizing:border-box;border-radius:8px;height:38px;font-size:13px;">
                        <input id="swal-gia" type="number" min="0" placeholder="Giá nhập (đ)"
                            class="swal2-input" style="margin:0;box-sizing:border-box;border-radius:8px;height:38px;font-size:13px;">
                        <button type="button" onclick="addProductRow()"
                            style="height:38px;padding:0 14px;background:#5C4033;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">
                            + Thêm
                        </button>
                    </div>

                    <div id="product-rows" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;min-height:40px;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#F7FAFC;">
                                    <th style="padding:8px 10px;text-align:left;color:#718096;font-weight:600;">Sản phẩm</th>
                                    <th style="padding:8px 10px;text-align:center;color:#718096;font-weight:600;">SL</th>
                                    <th style="padding:8px 10px;text-align:right;color:#718096;font-weight:600;">Giá nhập</th>
                                    <th style="padding:8px 10px;text-align:right;color:#718096;font-weight:600;">Thành tiền</th>
                                    <th style="padding:8px 10px;"></th>
                                </tr>
                            </thead>
                            <tbody id="product-tbody">
                                <tr id="empty-row">
                                    <td colspan="5" style="padding:16px;text-align:center;color:#A0AEC0;font-style:italic;">Chưa có sản phẩm nào</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="text-align:right;margin-top:10px;font-size:14px;font-weight:700;color:#2D6A4F;">
                        Tổng tiền: <span id="tong-tien-display">0 đ</span>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#3182CE',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy bỏ',
        didOpen: () => {
            window._receiptItems = [];
            window._currentNccProducts = products;
            if (d.chiTiet && d.chiTiet.length > 0) {
                d.chiTiet.forEach(item => {
                    window._receiptItems.push({
                        maSanPham:  String(item.maSanPham),
                        tenSanPham: item.tenSanPham,
                        soLuong:    item.soLuong,
                        giaNhap:    item.giaNhap
                    });

                    const emptyRow = document.getElementById('empty-row');
                    if (emptyRow) emptyRow.remove();

                    const tbody = document.getElementById('product-tbody');
                    const thanhTien = item.soLuong * item.giaNhap;
                    const tr = document.createElement('tr');
                    tr.id = `row-${item.maSanPham}`;
                    tr.style.borderTop = '1px solid #EDF2F7';
                    tr.innerHTML = `
                        <td style="padding:8px 10px;">${item.tenSanPham}</td>
                        <td style="padding:8px 10px;text-align:center;">${item.soLuong}</td>
                        <td style="padding:8px 10px;text-align:right;">${Number(item.giaNhap).toLocaleString('vi-VN')} đ</td>
                        <td style="padding:8px 10px;text-align:right;font-weight:600;color:#2D6A4F;">${thanhTien.toLocaleString('vi-VN')} đ</td>
                        <td style="padding:8px 10px;text-align:center;">
                            <button type="button" onclick="removeProductRow('${item.maSanPham}')"
                                style="background:none;border:none;cursor:pointer;color:#E53E3E;font-size:16px;">✕</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                updateTongTien();
            }
        },
        preConfirm: () => {
            const maNCC    = document.getElementById('swal-ncc').value;
            const ngayNhap = document.getElementById('swal-date').value;
            const ghiChu   = document.getElementById('swal-note').value.trim();
            if (!maNCC)    return Swal.showValidationMessage('Bạn cần chọn nhà cung cấp!');
            if (!ngayNhap) return Swal.showValidationMessage('Bạn cần chọn ngày nhập!');
            return {
                maNCC:    parseInt(maNCC),
                ngayNhap,
                ghiChu:   ghiChu || null,
                chiTiet:  window._receiptItems || []
            };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ title: 'Đã cập nhật!', text: 'Thông tin phiếu nhập đã được lưu lại.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadReceipts(searchInput.value);
        } else {
            Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
        }
    } catch {
        Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
    }
}

// Xóa phiếu nhập
function deleteReceipt(id) {
    Swal.fire({
        title: 'Xóa phiếu nhập?',
        text: `Phiếu nhập #${id} và chi tiết sẽ bị xóa vĩnh viễn!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy bỏ'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ title: 'Đã xóa!', text: 'Phiếu nhập đã bị xóa khỏi hệ thống.', icon: 'success', timer: 1500, showConfirmButton: false });
                loadReceipts(searchInput.value);
            } else {
                Swal.fire({ title: 'Lỗi!', text: json.message, icon: 'error' });
            }
        } catch {
            Swal.fire({ title: 'Lỗi!', text: 'Không thể kết nối server.', icon: 'error' });
        }
    });
}

// Đăng xuất
function confirmLogout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: 'Bạn có muốn đăng xuất khỏi phiên làm việc này?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#E53E3E',
        cancelButtonColor: '#A0AEC0',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('adminToken');
            sessionStorage.clear();
            window.location.href = '../../fe/dangnhap.html';
        }
    });
}

// Tìm kiếm debounce
let searchTimeout;
searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadReceipts(this.value), 300);
});

document.addEventListener('DOMContentLoaded', () => loadReceipts());
