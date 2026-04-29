// App State
let currentUser = null;
let currentTab = 'user';
let map = null;
let marker = null;

// Default credentials (in production, use proper backend auth)
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
});

function initAuth() {
    // Check if already logged in
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
    handleLogin(event);
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
        alert('Invalid credentials!');
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
        initMap();
        loadUserReports();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('login-screen').classList.add('active');
    if (map) {
        google.maps.event.clearInstanceListeners(window);
    }
}

// Map Functions
function initMap() {
    const defaultLocation = { lat: 12.9716, lng: 77.5946 }; // Bengaluru default
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: defaultLocation,
        mapTypeId: 'roadmap'
    });
    
    // Click to set location
    map.addListener('click', function(event) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        document.getElementById('lat').value = lat;
        document.getElementById('lng').value = lng;
        document.getElementById('location-text').value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        
        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: 'Garbage Location'
        });
        
        map.setCenter({ lat, lng });
        map.setZoom(16);
    });
}

function previewImage(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('image-preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

function handleReportSubmit(e) {
    e.preventDefault();
    
    if (!document.getElementById('lat').value) {
        alert('Please select location on map');
        return;
    }
    
    const formData = new FormData(e.target);
    const report = {
        id: Date.now(),
        userId: currentUser.email,
        userName: currentUser.name,
        lat: formData.get('lat'),
        lng: formData.get('lng'),
        description: formData.get('description'),
        image: document.getElementById('image').files[0] ? URL.createObjectURL(formData.get('image')) : null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    reports.unshift(report);
    localStorage.setItem('reports', JSON.stringify(reports));
    
    alert('Report submitted successfully!');
    e.target.reset();
    document.getElementById('image-preview').innerHTML = '';
    if (marker) marker.setMap(null);
    loadUserReports();
    
    if (currentUser.role === 'admin') {
        loadAdminDashboard();
    }
}

function loadUserReports() {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const userReports = reports.filter(r => r.userId === currentUser.email);
    const container = document.getElementById('user-reports-list');
    
    container.innerHTML = userReports.map(report => `
        <div class="report-card">
            ${report.image ? `<img src="${report.image}" alt="Garbage" class="report-image" onclick="openModal('${report.image}')">` : ''}
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

function loadAdminDashboard() {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    
    // Update stats
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
            ${report.image ? `<img src="${report.image}" alt="Garbage" class="report-image" onclick="openModal('${report.image}')">` : ''}
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
    const report = reports.find(r => r.id === reportId);
    if (report) {
        report.status = status;
        report.updatedAt = new Date().toISOString();
        localStorage.setItem('reports', JSON.stringify(reports));
        loadAdminDashboard();
        alert(`Report marked as ${status.replace('-', ' ')}`);
    }
}

let searchTerm = '';
let filterStatus = '';

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

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('image-modal');
    if (event.target === modal) {
        closeModal();
    }
}