const API_URL = 'http://localhost:3005/api/admin/reports';

// Lưu trữ các thực thể biểu đồ để vẽ lại khi thay đổi bộ lọc
let revenueChartInstance = null;
let categoryChartInstance = null;

// Lấy tham chiếu các DOM Elements
const kpiRevenue = document.getElementById('kpiRevenue');
const kpiExpense = document.getElementById('kpiExpense');
const kpiProfit = document.getElementById('kpiProfit');
const kpiOrders = document.getElementById('kpiOrders');
const kpiCustomers = document.getElementById('kpiCustomers');
const kpiProducts = document.getElementById('kpiProducts');

const topProductsBody = document.getElementById('topProductsBody');
const lowStockBody = document.getElementById('lowStockBody');
const lowStockCount = document.getElementById('lowStockCount');

const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const btnApplyFilter = document.getElementById('btnApplyFilter');

// Định dạng tiền tệ VND
function formatVND(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value).replace(/\s/g, ''); // Xóa khoảng trắng thừa
}

// Tính toán ngày tháng cho các Preset nhanh
function getPresetDateRange(preset) {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'today':
            // Hôm nay 00:00:00 -> 23:59:59
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            // Tuần này bắt đầu từ thứ 2
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 0 là Chủ Nhật
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            break;
        case 'month':
            // Từ ngày 1 đầu tháng này
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'all':
        default:
            // Không có khoảng lọc
            return { startDate: '', endDate: '' };
    }

    // Format sang dạng YYYY-MM-DD local
    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    return {
        startDate: formatDate(start),
        endDate: formatDate(end)
    };
}

// Gọi API và render báo cáo
async function loadReportData(startDate = '', endDate = '') {
    // Hiển thị trạng thái Loading trên biểu đồ
    showLoadingState();

    try {
        let url = API_URL;
        const params = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (json.success) {
            const data = json.data;
            renderKPIs(data.summary);
            renderRevenueChart(data.revenueChart);
            renderCategoryChart(data.categoryChart);
            renderTopProducts(data.topProducts);
            renderLowStock(data.lowStock);
        } else {
            Swal.fire({
                title: 'Lỗi tải dữ liệu!',
                text: json.message || 'Không thể tính toán số liệu thống kê.',
                icon: 'error'
            });
        }
    } catch (err) {
        console.error('loadReportData error:', err);
        Swal.fire({
            title: 'Lỗi kết nối!',
            text: 'Không thể kết nối tới server để tải báo cáo. Hãy đảm bảo backend đang hoạt động.',
            icon: 'error'
        });
    } finally {
        hideLoadingState();
    }
}

// Render các thẻ KPI tóm tắt
function renderKPIs(summary) {
    kpiRevenue.innerText = formatVND(summary.totalRevenue);
    kpiExpense.innerText = formatVND(summary.totalExpense);
    kpiProfit.innerText = formatVND(summary.netProfit);
    kpiOrders.innerText = summary.totalOrders.toLocaleString('vi-VN');
    kpiCustomers.innerText = summary.totalCustomers.toLocaleString('vi-VN');
    kpiProducts.innerText = summary.totalProducts.toLocaleString('vi-VN');

    // Chỉnh màu sắc nếu lợi nhuận âm (lỗ)
    if (summary.netProfit < 0) {
        kpiProfit.style.color = '#E53E3E';
    } else {
        kpiProfit.style.color = '#1A202C';
    }
}

// Vẽ biểu đồ doanh thu theo thời gian (Line Chart)
function renderRevenueChart(chartData) {
    const ctx = document.getElementById('revenueChartCanvas').getContext('2d');

    // Hủy biểu đồ cũ nếu đã tồn tại để tránh lỗi chồng hình vẽ
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    const labels = chartData.map(item => {
        // Format YYYY-MM-DD sang DD/MM
        const parts = item.dateLabel.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.dateLabel;
    });
    const revenues = chartData.map(item => item.dailyRevenue);

    // Tạo hiệu ứng gradient đổ màu đẹp mắt dưới đường biểu diễn
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(92, 64, 51, 0.35)');
    gradient.addColorStop(1, 'rgba(92, 64, 51, 0.01)');

    // Tạo biểu đồ mới
    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu ngày',
                data: revenues,
                borderColor: '#5C4033', // Màu nâu chủ đạo của hệ thống
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4, // Tạo đường cong mềm mại
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#5C4033',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#5C4033',
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Ẩn nhãn ghi chú phụ
                },
                tooltip: {
                    backgroundColor: '#1A202C',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return ' ' + formatVND(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Outfit',
                            size: 11
                        },
                        color: '#718096'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#EDF2F7'
                    },
                    ticks: {
                        font: {
                            family: 'Outfit',
                            size: 11
                        },
                        color: '#718096',
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000) + ' Tr';
                            }
                            return value.toLocaleString('vi-VN');
                        }
                    }
                }
            }
        }
    });
}

// Vẽ biểu đồ tròn cơ cấu doanh thu theo danh mục
function renderCategoryChart(chartData) {
    const ctx = document.getElementById('categoryChartCanvas').getContext('2d');

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    if (!chartData || chartData.length === 0) {
        // Hiển thị biểu đồ rỗng nếu không có dữ liệu
        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Không có dữ liệu'],
                datasets: [{
                    data: [100],
                    backgroundColor: ['#E2E8F0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } }
            }
        });
        return;
    }

    const labels = chartData.map(item => item.tenDanhMuc);
    const revenues = chartData.map(item => item.categoryRevenue);

    // Bảng màu gradient đẹp cho biểu đồ tròn
    const colors = [
        '#6366F1', // Indigo
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EC4899', // Rose
        '#06B6D4', // Cyan
        '#8B5CF6'  // Purple
    ];

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: revenues,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            family: 'Outfit',
                            size: 12
                        },
                        color: '#4A5568'
                    }
                },
                tooltip: {
                    backgroundColor: '#1A202C',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const val = context.raw;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                            return ` ${context.label}: ${formatVND(val)} (${pct})`;
                        }
                    }
                }
            },
            cutout: '60%' // Đồ thị bánh vòng rỗng ruột
        }
    });
}

// Render danh sách Top 5 sản phẩm bán chạy nhất
function renderTopProducts(products) {
    topProductsBody.innerHTML = '';

    if (!products || products.length === 0) {
        topProductsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#A0AEC0;">Không có dữ liệu bán chạy trong khoảng thời gian này.</td></tr>`;
        return;
    }

    products.forEach((sp, idx) => {
        const imgSrc = sp.hinhAnh ? `../../fe/images/${sp.hinhAnh}` : '../../fe/images/placeholder.jpg';
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <img class="product-avatar" src="${imgSrc}" onerror="this.src='https://placehold.co/40x40?text=SP'">
                    <div class="product-info">
                        <span class="product-name" title="${sp.tenSanPham}">${sp.tenSanPham}</span>
                        <span class="product-id">Mã: ${sp.maSanPham}</span>
                    </div>
                </div>
            </td>
            <td><strong>${sp.tenDanhMuc || 'Chưa phân loại'}</strong></td>
            <td style="text-align: center;">
                <span class="stock-badge" style="background-color: #EBF8FF; color: #2B6CB0; font-size:12px;">
                    ${sp.quantitySold} cái
                </span>
            </td>
            <td style="text-align: right; font-weight: 700; color: #2D3748;">
                ${formatVND(sp.totalRevenue)}
            </td>
        `;
        topProductsBody.appendChild(tr);
    });
}

// Render danh sách cảnh báo tồn kho thấp
function renderLowStock(products) {
    lowStockBody.innerHTML = '';
    
    if (!products || products.length === 0) {
        lowStockCount.innerText = 'Bình thường';
        lowStockCount.className = 'card-badge bg-gold';
        lowStockBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#38A169;font-weight:600;"><i class="ph ph-check-circle" style="vertical-align:middle;font-size:18px;"></i> Mọi sản phẩm đều đủ số lượng tồn kho!</td></tr>`;
        return;
    }

    lowStockCount.innerText = `${products.length} sản phẩm`;
    lowStockCount.className = 'card-badge bg-danger';

    products.forEach((sp) => {
        const imgSrc = sp.hinhAnh ? `../../fe/images/${sp.hinhAnh}` : '../../fe/images/placeholder.jpg';
        
        let stockBadgeClass = 'stock-warning';
        let stockText = `${sp.soLuongTon} cái`;
        if (sp.soLuongTon === 0) {
            stockBadgeClass = 'stock-out';
            stockText = 'Hết hàng';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <img class="product-avatar" src="${imgSrc}" onerror="this.src='https://placehold.co/40x40?text=SP'">
                    <div class="product-info">
                        <span class="product-name" title="${sp.tenSanPham}">${sp.tenSanPham}</span>
                        <span class="product-id">Mã: ${sp.maSanPham}</span>
                    </div>
                </div>
            </td>
            <td><strong>${sp.tenDanhMuc || 'Chưa phân loại'}</strong></td>
            <td style="text-align: center;">
                <span class="stock-badge ${stockBadgeClass}">
                    ${stockText}
                </span>
            </td>
            <td style="text-align: right; font-weight: 700; color: #2D3748;">
                ${formatVND(sp.gia)}
            </td>
        `;
        lowStockBody.appendChild(tr);
    });
}

// Helper hiển thị hiệu ứng Loading trên màn hình biểu đồ
function showLoadingState() {
    document.querySelectorAll('.chart-card').forEach(card => {
        // Nếu đã có loading overlay thì bỏ qua
        if (card.querySelector('.loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        card.style.position = 'relative';
        card.appendChild(overlay);
    });
}

// Ẩn hiệu ứng Loading
function hideLoadingState() {
    document.querySelectorAll('.loading-overlay').forEach(el => el.remove());
}

// Đăng ký sự kiện
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo lấy dữ liệu cho "Tháng này" làm mặc định
    const defaultRange = getPresetDateRange('month');
    startDateInput.value = defaultRange.startDate;
    endDateInput.value = defaultRange.endDate;
    loadReportData(defaultRange.startDate, defaultRange.endDate);

    // Lắng nghe sự kiện click các nút preset thời gian nhanh
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            presetButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const preset = this.getAttribute('data-preset');
            const range = getPresetDateRange(preset);
            
            startDateInput.value = range.startDate;
            endDateInput.value = range.endDate;

            loadReportData(range.startDate, range.endDate);
        });
    });

    // Lắng nghe nút áp dụng lọc khoảng thời gian tùy chọn
    btnApplyFilter.addEventListener('click', () => {
        const start = startDateInput.value;
        const end = endDateInput.value;

        if (start && end && new Date(start) > new Date(end)) {
            Swal.fire({
                title: 'Khoảng ngày không hợp lệ!',
                text: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.',
                icon: 'warning'
            });
            return;
        }

        // Tắt kích hoạt các preset nhanh
        presetButtons.forEach(b => b.classList.remove('active'));
        
        loadReportData(start, end);
    });

    // Xử lý sự kiện đăng xuất thống nhất với các trang khác
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await Swal.fire({
                title: 'Đăng xuất?',
                text: 'Bạn có chắc muốn đăng xuất khỏi tài khoản admin không?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#E53E3E',
                cancelButtonColor: '#A0AEC0',
                confirmButtonText: 'Đăng xuất',
                cancelButtonText: 'Hủy'
            });
            if (result.isConfirmed) {
                localStorage.removeItem('token');
                localStorage.removeItem('adminToken');
                sessionStorage.clear();
                window.location.href = '../../fe/dangnhap.html';
            }
        });
    }
});
