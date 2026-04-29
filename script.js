// App State
let currentUser = null;
let currentTab = 'user';
let map = null;
let marker = null;

// Default credentials
const USERS = {
    user: { email: 'user@garbagereport.com', password: 'user123', role: 'user', name: 'Resident User' },
    admin: { email: 'admin@garbagereport.com', password: 'admin123', role: 'admin', name: 'City Admin' }
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    initReports();
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('report-form').addEventListener('submit', handleReportSubmit);
    document.getElementById('search-reports').addEventListener('input', filterReports);
    document.getElementById('filter-status').addEventListener('change', filterReports);
    
    // Image preview
    document.getElementById('image').addEventListener('change', previewImage);
    
    // Fallback map initialization
    setTimeout(initFallbackMap, 1000);
});

function initAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
}

function initReports() {
    if (!localStorage.getItem('reports')) {
        localStorage.setItem('reports', JSON.stringify([]));
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('email').placeholder = tab === 'user' ? 'user@garbagereport.com' : 'admin@garbagereport.com';
}

function loginDemo(role) {
    const user = USERS[role];
    document.getElementById('email').value = user.email;
    document.getElementById('password').value = user.password;
    handleLogin(new Event('submit'));
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const user = Object.values(USERS).find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showDashboard();
    } else {
        alert('❌ Invalid credentials!');
    }
}

function showDashboard() {
    document.getElementById('login-screen').classList.remove('active');
    
    if (currentUser.role === 'admin') {
        document.getElementById('admin-dashboard').classList.add('active');
        loadAdminDashboard();
    } else {
        document.getElementById('user-dashboard').classList.add('active');
        document.getElementById('user-name').textContent = currentUser.name;
        loadUserReports();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('login-screen').classList.add('active');
}

// 🗺️ FALLBACK MAP (No API Key needed)
function initFallbackMap() {
    const mapContainer = document.getElementById('map');
    const defaultLocation = { lat: 12.9716, lng: 77.5946 }; // Bengaluru
    
    // Create static map background
    mapContainer.innerHTML = `
        <div style="height:100%; background: linear-gradient(45deg, #e3f2fd, #f3e5f5); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer;" onclick="setDefaultLocation()">
            <i class="fas fa-map-marked-alt" style="font-size:4rem; color:#4CAF50; margin-bottom:15px;"></i>
            <div style="text-align:center; color:#666;">
                <div>👆 Click here to set location</div>
                <div style="font-size:0.9rem; margin-top:5px;">Bengaluru Default: ${defaultLocation.lat.toFixed(4)}, ${defaultLocation.lng.toFixed(4)}</div>
            </div>
        </div>
    `;
}

function setDefaultLocation() {
    const defaultLocation = { lat: 12.9716, lng: 77.5946 };
    document.getElementById('lat').value = defaultLocation.lat;
    document.getElementById('lng').value = defaultLocation.lng;
    document.getElementById('location-text').value = `Bengaluru: ${defaultLocation.lat.toFixed(4)}, ${defaultLocation.lng.toFixed(4)}`;
    
    // Visual feedback
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = `
        <div style="height:100%; background:#d4edda; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column;">
            <i class="fas fa-map-marker-alt" style="font-size:3rem; color:#28a745;"></i>
            <div style="color:#155724; font-weight:600; margin-top:10px;">✅ Location Set!</div>
            <div style="color:#666; font-size:0.9rem;">${document.getElementById('location-text').value}</div>
        </div>
    `;
}

// 🖼️ Image Preview
let imageFile = null;
function previewImage(e) {
    const file = e.target.files[0];
    imageFile = file;
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('image-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="border-radius:12px;">`;
        };
        reader.readAsDataURL(file);
    }
}

// ✅ FIXED SUBMIT FUNCTION
function handleReportSubmit(e) {
    e.preventDefault();
    console.log('Submit clicked!'); // Debug log
    
    // Validate location
    if (!document.getElementById('lat').value) {
        alert('⚠️ Please set location first (click on map)');
        return;
    }
    
    // Get form data
    const description = document.getElementById('description').value.trim();
    if (!description) {
        alert('⚠️ Please add description');
        return;
    }
    
    // Create report with image handling
    const report = {
        id: Date.now(),
        userId: currentUser.email,
        userName: currentUser.name,
        lat: parseFloat(document.getElementById('lat').value),
        lng: parseFloat(document.getElementById('lng').value),
        description: description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Handle image - store as base64 for persistence
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            report.image = e.target.result; // Base64 image
            saveReport(report);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveReport(report);
    }
}

function saveReport(report) {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    reports.unshift(report);
    localStorage.setItem('reports', JSON.stringify(reports));
    
    // Reset form
    document.getElementById('report-form').reset();
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('location-text').value = '';
    document.getElementById('lat').value = '';
    document.getElementById('lng').value = '';
    initFallbackMap(); // Reset map
    
    alert('✅ Report submitted successfully!');
    loadUserReports();
    
    // Update admin dashboard if admin is viewing
    if (currentUser.role === 'admin') {
        loadAdminDashboard();
    }
}

function loadUserReports() {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const userReports = reports.filter(r => r.userId === currentUser.email);
    const container = document.getElementById('user-reports-list');
    
    if (userReports.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:40px;">No reports yet. Submit your first one! 🚀</p>';
        return;
    }
    
    container.innerHTML = userReports.map(report => `
        <div class="report-card">
            ${report.image ? `<img src="${report.image}" alt="Garbage" class="report-image" onclick="openModal('${report.image}')">` : '<div class="report-image" style="background:#f0f0f0; display:flex; align-items:center; justify-content:center; color:#999;">📷</div>'}
            <div class="report-content">
                <div class="report-title">${report.description.substring(0, 50)}${report.description.length > 50 ? '...' : ''}</div>
                <div class="report-location">
                    <i class="fas fa-map-marker-alt"></i> ${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}
                </div>
                <div class="report-meta">
                    <span class="status-badge status-${report.status}">${report.status.replace('-', ' ').toUpperCase()}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Admin functions (unchanged but fixed)
function loadAdminDashboard() {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    
    document.getElementById('total-reports').textContent = reports.length;
    document.getElementById('pending-reports').textContent = reports.filter(r => r.status === 'pending').length;
    document.getElementById('in-progress-reports').textContent = reports.filter(r => r.status === 'in-progress').length;
    document.getElementById('resolved-reports').textContent = reports.filter(r => r.status === 'resolved').length;
    
    renderAdminReports(reports);
}

function renderAdminReports(reports) {
    const container = document.getElementById('admin-reports-list');
    container.innerHTML = reports.map(report => `
        <div class="report-card" data-id="${report.id}">
            ${report.image ? `<img src="${report.image}" alt="Garbage" class="report-image" onclick="openModal('${report.image}')">` : '<div class="report-image" style="background:#f0f0f0; display:flex; align-items:center; justify-content:center; color:#999;">📷</div>'}
            <div class="report-content">
                <div class="report-title">${report.description}</div>
                <div class="report-location">
                    <i class="fas fa-user"></i> ${report.userName}
                </div>
                <div class="report-location">
                    <i class="fas fa-map-marker-alt"></i> ${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}
                </div>
                <div class="report-meta">
                    <span class="status-badge status-${report.status}">${report.status.replace('-', ' ').toUpperCase()}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="admin-actions">
                ${report.status !== 'in-progress' ? `<button class="action-btn btn-progress" onclick="updateStatus(${report.id}, 'in-progress')">Start Work</button>` : ''}
                ${report.status !== 'resolved' ? `<button class="action-btn btn-resolve" onclick="updateStatus(${report.id}, 'resolved')">Mark Resolved</button>` : ''}
            </div>
        </div>
    `).join('');
}

function updateStatus(reportId, status) {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        reports[reportIndex].status = status;
        reports[reportIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('reports', JSON.stringify(reports));
        loadAdminDashboard();
        alert(`✅ Report marked as ${status.replace('-', ' ')}`);
    }
}

function filterReports() {
    searchTerm = document.getElementById('search-reports').value.toLowerCase();
    filterStatus = document.getElementById('filter-status').value;
    
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const filtered = reports.filter(report => {
        const matchesSearch = report.description.toLowerCase().includes(searchTerm) ||
                             report.userName.toLowerCase().includes(searchTerm);
        const matchesStatus = !filterStatus || report.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    
    renderAdminReports(filtered);
}

function openModal(imageSrc) {
    document.getElementById('modal-image').src = imageSrc;
    document.getElementById('image-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('image-modal');
    if (event.target === modal) {
        closeModal();
    }
}
