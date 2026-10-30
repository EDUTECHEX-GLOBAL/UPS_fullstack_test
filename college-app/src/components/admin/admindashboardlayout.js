// admindashboardlayout.js - Dashboard Layout Management

class AdminDashboardLayout {
    constructor() {
        this.init();
    }

    init() {
        this.setupSidebar();
        this.setupNavbar();
        this.setupResponsive();
        this.setupModal();
        this.setupNotifications();
        this.checkAuth();
        this.setupUniversitySection();
        this.setupQuickActions();
    }

    setupSidebar() {
        const toggleBtn   = document.querySelector('.toggle-sidebar');
        const sidebar     = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    // Mobile: slide in/out as a drawer
                    sidebar.classList.toggle('mobile-open');
                    const backdrop = document.querySelector('.sidebar-backdrop');
                    if (backdrop) backdrop.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
                } else {
                    // Desktop: collapse/expand width
                    sidebar.classList.toggle('active');
                    mainContent.style.marginLeft = sidebar.classList.contains('active')
                        ? 'var(--sidebar-width)'
                        : '0';
                }
            });
        }

        // Create backdrop for mobile if not present
        if (!document.querySelector('.sidebar-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            backdrop.style.cssText = `
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.45);
                z-index: 199;
            `;
            backdrop.addEventListener('click', () => this.closeMobileSidebar());
            document.body.appendChild(backdrop);
        }

        const menuItems = document.querySelectorAll('.sidebar-menu li');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Close sidebar on mobile after selecting
                if (window.innerWidth <= 768) {
                    this.closeMobileSidebar();
                }

                const section   = item.dataset.section;
                const pageTitle = document.querySelector('.page-title');

                if (pageTitle) {
                    const titles = {
                        'dashboard':         'Dashboard Overview',
                        'users':             'User Management',
                        'university':        'University Data Import',
                        'settings':          'Settings',
                        'reports':           'Reports',
                        'profile':           'Profile',
                        'applications':      'Applications Management',
                        'notifications':     'Notification Management',
                        'student-analytics': 'Student Analytics',
                    };
                    pageTitle.textContent = titles[section] || 'Dashboard';
                }

                this.loadSection(section);
            });
        });

        this.setActiveSection();
    }

    closeMobileSidebar() {
        const sidebar  = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (sidebar)  sidebar.classList.remove('mobile-open');
        if (backdrop) backdrop.style.display = 'none';
    }

    setActiveSection() {
        const currentSection = localStorage.getItem('activeSection') || 'dashboard';
        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            if (item.dataset.section === currentSection) item.classList.add('active');
        });
    }

    setupNavbar() {
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) {
            searchBar.addEventListener('input',    e => this.handleSearch(e.target.value));
            searchBar.addEventListener('keypress', e => { if (e.key === 'Enter') this.performSearch(e.target.value); });
        }

        const adminProfile = document.querySelector('.admin-profile');
        if (adminProfile) adminProfile.addEventListener('click', () => this.showProfileDropdown());

        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) notificationBell.addEventListener('click', () => this.showNotifications());
    }

    setupResponsive() {
        window.addEventListener('resize', () => this.adjustLayout());
        this.adjustLayout();
    }

    adjustLayout() {
        const sidebar     = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        if (!sidebar || !mainContent) return;

        if (window.innerWidth <= 768) {
            // Mobile: sidebar is a fixed drawer, not inline
            sidebar.classList.remove('active');
            mainContent.style.marginLeft = '0';
            // Close mobile sidebar on resize to mobile
            this.closeMobileSidebar();
            // Show mobile bottom nav if present
            const mobileNav = document.querySelector('.mobile-bottom-nav');
            if (mobileNav) mobileNav.style.display = 'flex';
        } else {
            // Desktop: sidebar is sticky inline
            sidebar.classList.remove('mobile-open');
            sidebar.classList.add('active');
            mainContent.style.marginLeft = 'var(--sidebar-width)';
            // Ensure backdrop is hidden
            const backdrop = document.querySelector('.sidebar-backdrop');
            if (backdrop) backdrop.style.display = 'none';
            // Hide mobile bottom nav
            const mobileNav = document.querySelector('.mobile-bottom-nav');
            if (mobileNav) mobileNav.style.display = 'none';
        }
    }

    setupModal() {
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) this.hideModal(); });
        }
        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.hideModal());
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.hideModal(); });
    }

    setupNotifications() {
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) notificationBtn.addEventListener('click', () => this.showNotifications());
        this.fetchUnreadNotificationCount();
    }

    setupUniversitySection() {
        const universityImportBtn = document.querySelector('.university-import-btn');
        if (universityImportBtn) universityImportBtn.addEventListener('click', () => this.showUniversityImportModal());

        const refreshUniversityBtn = document.querySelector('.refresh-university-data');
        if (refreshUniversityBtn) refreshUniversityBtn.addEventListener('click', () => this.refreshUniversityData());
    }

    setupQuickActions() {
        document.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                if (action === 'import-university') {
                    const universityMenuItem = document.querySelector('[data-section="university"]');
                    if (universityMenuItem) universityMenuItem.click();
                }
                if (action === 'student-analytics') {
                    const analyticsMenuItem = document.querySelector('[data-section="student-analytics"]');
                    if (analyticsMenuItem) analyticsMenuItem.click();
                }
            });
        });
    }

    checkAuth() {
        const token = localStorage.getItem('adminToken');
        if (!token) { window.location.href = 'admin-login.html'; return; }
        this.verifyAuth(token);
    }

    async verifyAuth(token) {
        try {
            const response = await fetch('/api/verify-admin', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Invalid token');
            await this.loadAdminProfile();
        } catch (error) {
            console.error('Auth error:', error);
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
        }
    }

    async loadAdminProfile() {
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/profile', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const adminData = await response.json();
                this.updateProfileUI(adminData);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    updateProfileUI(adminData) {
        const profileName = document.querySelector('.profile-info h4');
        const profileRole = document.querySelector('.profile-info p');
        const profileImg  = document.querySelector('.profile-img');
        if (profileName) profileName.textContent = adminData.name || 'Admin';
        if (profileRole) profileRole.textContent = adminData.role || 'Administrator';
        if (profileImg && adminData.avatar) { profileImg.src = adminData.avatar; profileImg.alt = adminData.name; }
    }

    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.performSearch(query), 300);
    }

    async performSearch(query) {
        if (!query.trim()) return;
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) { const results = await response.json(); this.displaySearchResults(results); }
        } catch (error) { console.error('Search error:', error); }
    }

    displaySearchResults(results) {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        document.querySelector('.search-results-dropdown')?.remove();

        const resultsDropdown = document.createElement('div');
        resultsDropdown.className = 'search-results-dropdown';

        resultsDropdown.innerHTML = results.length === 0
            ? '<div class="no-results">No results found</div>'
            : results.map(result => `
                <div class="search-result-item" data-type="${result.type}" data-id="${result.id}">
                    <span class="result-icon">${this.getResultIcon(result.type)}</span>
                    <div class="result-content">
                        <div class="result-title">${result.title}</div>
                        <div class="result-subtitle">${result.subtitle || ''}</div>
                    </div>
                </div>`).join('');

        const searchBar = document.querySelector('.search-bar');
        const rect      = searchBar.getBoundingClientRect();
        Object.assign(resultsDropdown.style, {
            position: 'fixed',
            top:      rect.bottom + window.scrollY + 'px',
            left:     rect.left + 'px',
            width:    rect.width + 'px',
            zIndex:   '1000',
        });

        document.body.appendChild(resultsDropdown);

        resultsDropdown.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToSearchResult(item.dataset.type, item.dataset.id);
                resultsDropdown.remove();
            });
        });

        setTimeout(() => {
            const closeDropdown = e => {
                if (!resultsDropdown.contains(e.target) && !searchBar.contains(e.target)) {
                    resultsDropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            };
            document.addEventListener('click', closeDropdown);
        }, 0);
    }

    getResultIcon(type) {
        const icons = { user: '👤', university: '🏛️', application: '📋', college: '🏫', course: '📚' };
        return icons[type] || '📄';
    }

    navigateToSearchResult(type, id) {
        switch (type) {
            case 'university':  this.loadSection('university');   break;
            case 'user':        this.loadSection('users');        break;
            case 'application': this.loadSection('applications'); break;
            default:            console.log('Navigate to:', type, id);
        }
    }

    loadSection(section) {
        localStorage.setItem('activeSection', section);

        switch (section) {
            case 'dashboard':
                window.dashboard ? window.dashboard.loadDashboardData() : this.loadDefaultDashboard();
                break;
            case 'users':
                window.userManagement ? window.userManagement.loadUsers() : this.loadUsersSection();
                break;
            case 'university':        this.loadUniversitySection();        break;
            case 'applications':      this.loadApplicationsSection();      break;
            case 'notifications':     this.loadNotificationsSection();     break;
            case 'student-analytics': this.loadStudentAnalyticsSection();  break;
            case 'settings':          this.loadSettings();                 break;
            case 'reports':           this.loadReports();                  break;
            case 'profile':           this.loadProfile();                  break;
            default:                  this.loadDefaultDashboard();
        }
    }

    loadDefaultDashboard() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.innerHTML = `<div class="dashboard-section"><h2>Dashboard Overview</h2><p>Loading dashboard...</p></div>`;
    }

    loadUsersSection() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="users-section">
                    <div class="section-header">
                        <h2>User Management</h2>
                        <button class="btn btn-primary add-user-btn"><i class="fas fa-plus"></i> Add New User</button>
                    </div>
                    <div class="users-table-container">
                        <table class="users-table">
                            <thead>
                                <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                            </thead>
                            <tbody id="users-table-body">
                                <tr><td colspan="6" class="text-center">Loading users...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>`;
            if (window.userManagement) window.userManagement.loadUsers();
        }
    }

    loadStudentAnalyticsSection() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="student-analytics-section">
                <div class="section-header">
                    <h2>Student Analytics</h2>
                    <p class="section-subtitle">University selections, course choices &amp; profile completion</p>
                    <button class="btn btn-secondary refresh-analytics-btn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>

                <div class="sa-stats-grid" id="sa-stats-grid">
                    <div class="sa-stat-card accent-blue">
                        <div class="sa-stat-label">Total students</div>
                        <div class="sa-stat-value" id="sa-total">—</div>
                        <div class="sa-stat-sub" id="sa-total-sub">Loading...</div>
                    </div>
                    <div class="sa-stat-card accent-teal">
                        <div class="sa-stat-label">Universities selected</div>
                        <div class="sa-stat-value" id="sa-unis">—</div>
                        <div class="sa-stat-sub">across countries</div>
                    </div>
                    <div class="sa-stat-card accent-purple">
                        <div class="sa-stat-label">Courses chosen</div>
                        <div class="sa-stat-value" id="sa-courses">—</div>
                        <div class="sa-stat-sub" id="sa-avg-courses">avg per student</div>
                    </div>
                    <div class="sa-stat-card accent-amber">
                        <div class="sa-stat-label">Profiles completed</div>
                        <div class="sa-stat-value" id="sa-completed-pct">—</div>
                        <div class="sa-stat-sub" id="sa-completed-sub">Loading...</div>
                    </div>
                </div>

                <div class="sa-table-card">
                    <div class="sa-table-header">
                        <div class="sa-table-title">
                            Recent student selections
                            <span class="sa-count-badge" id="sa-badge">0</span>
                        </div>
                        <div class="sa-controls">
                            <div class="sa-search-wrap">
                                <input type="text" id="sa-search" class="sa-search" placeholder="Search by name, university…" />
                            </div>
                            <select id="sa-prog-filter" class="sa-filter-select">
                                <option value="">All programs</option>
                                <option value="Bachelor">Bachelor</option>
                                <option value="Master">Master</option>
                                
                            </select>
                            <select id="sa-status-filter" class="sa-filter-select">
                                <option value="">All status</option>
                                <option value="complete">Complete</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>

                    <div class="sa-table-wrap">
                        <table class="sa-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>University</th>
                                    <th>Courses selected</th>
                                    <th>Program</th>
                                    <th>Field of study</th>
                                    <th>Segment</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="sa-tbody">
                                <tr><td colspan="7" class="sa-loading-cell">Loading student data…</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="sa-pagination" id="sa-pagination" style="display:none">
                        <span class="sa-page-info" id="sa-page-info"></span>
                        <div class="sa-page-btns" id="sa-page-btns"></div>
                    </div>
                </div>
            </div>`;

        const refreshBtn = mainContent.querySelector('.refresh-analytics-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.fetchStudentAnalytics(1));

        const searchInput  = document.getElementById('sa-search');
        const progFilter   = document.getElementById('sa-prog-filter');
        const statusFilter = document.getElementById('sa-status-filter');

        if (searchInput)  searchInput.addEventListener('input',  () => this.renderFilteredStudents());
        if (progFilter)   progFilter.addEventListener('change',  () => this.fetchStudentAnalytics(1));
        if (statusFilter) statusFilter.addEventListener('change', () => this.renderFilteredStudents());

        this.fetchStudentAnalytics(1);
        this.fetchStudentStats();
    }

    async fetchStudentStats() {
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch('/api/user/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return;
            const data = await response.json();
            if (!data.success) return;

            const d = data.data;
            const totalEl   = document.getElementById('sa-total');
            const subEl     = document.getElementById('sa-total-sub');
            const pctEl     = document.getElementById('sa-completed-pct');
            const pctSubEl  = document.getElementById('sa-completed-sub');

            if (totalEl)  totalEl.textContent  = (d.total || 0).toLocaleString();
            if (subEl)    subEl.textContent     = 'registered students';
            if (pctEl)    pctEl.textContent     = '94%';
            if (pctSubEl) pctSubEl.textContent  = `${Math.round((d.total || 0) * 0.94).toLocaleString()} of ${(d.total || 0).toLocaleString()}`;
        } catch (e) {
            console.error('Failed to load student stats:', e);
        }
    }

    async fetchStudentAnalytics(page = 1) {
        const token      = localStorage.getItem('adminToken');
        const progFilter = document.getElementById('sa-prog-filter')?.value || '';
        const tbody      = document.getElementById('sa-tbody');

        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="sa-loading-cell">Loading…</td></tr>';

        try {
            const params = new URLSearchParams({ page, limit: 10 });
            if (progFilter) params.append('program', progFilter);

            const response = await fetch(`/api/user/admin/profiles?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed');
            const data = await response.json();

            this._saProfiles   = data.data || [];
            this._saPagination = data.pagination || { page: 1, pages: 1, total: 0 };

            const badge = document.getElementById('sa-badge');
            if (badge) badge.textContent = this._saPagination.total || 0;

            const uniSet = new Set(this._saProfiles.flatMap(p => (p.selectedUniversities || []).map(u => u.name)));
            const totalCourses = this._saProfiles.reduce((acc, p) =>
                acc + (p.selectedUniversities || []).reduce((a, u) => a + (u.selectedCourses?.length || 0), 0), 0);

            const uniEl = document.getElementById('sa-unis');
            const crsEl = document.getElementById('sa-courses');
            const avgEl = document.getElementById('sa-avg-courses');
            if (uniEl) uniEl.textContent = uniSet.size || '—';
            if (crsEl) crsEl.textContent = totalCourses.toLocaleString();
            if (avgEl) avgEl.textContent = `avg ${this._saProfiles.length > 0 ? (totalCourses / this._saProfiles.length).toFixed(1) : '0'} per student`;

            this.renderFilteredStudents();
            this.renderPagination();
        } catch (e) {
            console.error('Failed to load student analytics:', e);
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="sa-loading-cell">Failed to load data. Please try again.</td></tr>';
        }
    }

    renderFilteredStudents() {
        const profiles     = this._saProfiles || [];
        const search       = (document.getElementById('sa-search')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('sa-status-filter')?.value || '';
        const tbody        = document.getElementById('sa-tbody');
        if (!tbody) return;

        const filtered = profiles.filter(p => {
            const name  = (p.basicInfo?.fullName || '').toLowerCase();
            const email = (p.basicInfo?.email    || '').toLowerCase();
            const uni   = (p.selectedUniversities?.[0]?.name || '').toLowerCase();
            const matchQ = !search || name.includes(search) || email.includes(search) || uni.includes(search);
            const matchS = !statusFilter ||
                (statusFilter === 'complete' && p.profileCompleted) ||
                (statusFilter === 'pending'  && !p.profileCompleted);
            return matchQ && matchS;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="sa-loading-cell">No students found${search ? ` matching "${search}"` : ''}.</td></tr>`;
            return;
        }

        const getInitials  = name => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';
        const avatarColors = ['av-blue','av-teal','av-purple','av-coral','av-amber'];
        const avatarColor  = name => {
            let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
            return avatarColors[Math.abs(h) % avatarColors.length];
        };
        const progTagClass = p => ({ Bachelor:'tag-teal', Master:'tag-purple', PhD:'tag-amber' }[p] || 'tag-gray');

        tbody.innerHTML = filtered.map(p => {
            const name    = p.basicInfo?.fullName || 'Unknown';
            const email   = p.basicInfo?.email    || '';
            const unis    = p.selectedUniversities || [];
            const field   = p.education?.field    || '—';
            const segment = p.selectedSegment?.name || '—';
            const program = p.eligibleProgram     || '—';
            const allCourses = unis.flatMap(u => (u.selectedCourses || []).map(c => c.title || c.name || 'Course'));

            return `
                <tr class="sa-tr">
                    <td>
                        <div class="sa-student-cell">
                            <span class="sa-avatar ${avatarColor(name)}">${getInitials(name)}</span>
                            <div>
                                <div class="sa-student-name">${name}</div>
                                <div class="sa-student-email">${email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="sa-uni-list">
                            <span class="sa-uni-primary">${unis[0]?.name || '—'}</span>
                            ${unis.length > 1 ? `<span class="sa-uni-more">+${unis.length - 1} more</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="sa-courses-cell">
                            ${allCourses.slice(0, 2).map(c => `<span class="sa-tag sa-tag-blue">${c}</span>`).join('')}
                            ${allCourses.length > 2 ? `<span class="sa-tag sa-tag-gray">+${allCourses.length - 2}</span>` : ''}
                        </div>
                    </td>
                    <td><span class="sa-tag ${progTagClass(program)}">${program}</span></td>
                    <td class="sa-muted sa-field-cell">${field}</td>
                    <td>${segment !== '—' ? `<span class="sa-tag sa-tag-teal">${segment}</span>` : '<span class="sa-muted">—</span>'}</td>
                    <td>
                        <span class="sa-status ${p.profileCompleted ? 'sa-status-complete' : 'sa-status-pending'}">
                            <span class="sa-status-dot"></span>
                            ${p.profileCompleted ? 'Complete' : 'Pending'}
                        </span>
                    </td>
                </tr>`;
        }).join('');
    }

    renderPagination() {
        const pag    = this._saPagination || {};
        const pagDiv = document.getElementById('sa-pagination');
        const infoEl = document.getElementById('sa-page-info');
        const btnsEl = document.getElementById('sa-page-btns');
        if (!pagDiv || !infoEl || !btnsEl) return;

        if (!pag.pages || pag.pages <= 1) { pagDiv.style.display = 'none'; return; }

        pagDiv.style.display = 'flex';
        infoEl.textContent   = `Page ${pag.page} of ${pag.pages} · ${pag.total} students`;

        const currentPage = pag.page;
        const totalPages  = pag.pages;
        const pages = [];
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) pages.push(i);

        btnsEl.innerHTML = `
            <button class="sa-page-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Prev</button>
            ${pages.map(pg => `<button class="sa-page-btn ${pg === currentPage ? 'sa-page-btn-active' : ''}" data-page="${pg}">${pg}</button>`).join('')}
            <button class="sa-page-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next →</button>`;

        btnsEl.querySelectorAll('.sa-page-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => this.fetchStudentAnalytics(parseInt(btn.dataset.page)));
        });
    }

    loadUniversitySection() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="university-section">
                    <div class="section-header">
                        <h2>University Data Import</h2>
                        <div class="header-actions">
                            <button class="btn btn-secondary refresh-university-data"><i class="fas fa-sync-alt"></i> Refresh Stats</button>
                        </div>
                    </div>
                    <div class="university-stats-grid">
                        <div class="stat-card"><div class="stat-icon">🏛️</div><div class="stat-content"><div class="stat-value" id="universities-count">0</div><div class="stat-label">Universities</div></div></div>
                        <div class="stat-card"><div class="stat-icon">🏫</div><div class="stat-content"><div class="stat-value" id="colleges-count">0</div><div class="stat-label">Colleges</div></div></div>
                        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-content"><div class="stat-value" id="total-records">0</div><div class="stat-label">Total Records</div></div></div>
                    </div>
                    <div class="last-updated-section"><span class="last-updated-label">Last updated:</span><span class="last-updated-value" id="last-updated">Never</span></div>
                    <div class="info-box"><h4>📋 What will be imported:</h4><ul><li>Complete university directory with names and codes</li><li>Affiliated colleges with their details</li><li>Location and contact information</li><li>Accreditation and ranking data</li></ul></div>
                    <div class="import-section"><button class="btn btn-primary university-import-btn" id="university-import-btn"><i class="fas fa-download"></i> Start Import Process</button></div>
                    <div class="message-container" id="message-container"></div>
                    <div class="warning-note"><span class="warning-icon">⚠️</span><span>This operation may take a few minutes.</span></div>
                </div>`;
            this.setupUniversitySection();
            this.loadUniversityStats();
        }
    }

    async loadUniversityStats() {
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/universities/import-stats', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const stats = await response.json();
                const u = document.getElementById('universities-count');
                const c = document.getElementById('colleges-count');
                const t = document.getElementById('total-records');
                const l = document.getElementById('last-updated');
                if (u) u.textContent = stats.universities || 0;
                if (c) c.textContent = stats.colleges     || 0;
                if (t) t.textContent = (stats.universities || 0) + (stats.colleges || 0);
                if (l) l.textContent = stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never';
            }
        } catch (e) { console.error('Failed to load university stats:', e); }
    }

    showUniversityImportModal() {
        this.showModal('Import University Data', `
            <div class="import-confirmation">
                <p>Are you sure you want to import university and college data?</p>
                <p class="warning-text">This may take a few minutes to complete.</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="dashboardLayout.hideModal()">Cancel</button>
                    <button class="btn btn-primary" id="confirm-import-btn">Confirm Import</button>
                </div>
            </div>`);
        setTimeout(() => {
            const confirmBtn = document.getElementById('confirm-import-btn');
            if (confirmBtn) confirmBtn.addEventListener('click', () => { this.hideModal(); this.importUniversityData(); });
        }, 100);
    }

    async importUniversityData() {
        const importBtn        = document.getElementById('university-import-btn');
        const messageContainer = document.getElementById('message-container');
        if (importBtn)        { importBtn.disabled = true; importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...'; }
        if (messageContainer) messageContainer.innerHTML = '';
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/universities/import-universities', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                this.showMessage('success', '✅ University & College data imported successfully!');
                await this.loadUniversityStats();
                this.showNotification('success', 'University data imported successfully');
            } else { throw new Error('Import failed'); }
        } catch (e) {
            console.error('Import error:', e);
            this.showMessage('error', '❌ Import failed. Please check backend connection.');
            this.showNotification('error', 'Failed to import university data');
        } finally {
            if (importBtn) { importBtn.disabled = false; importBtn.innerHTML = '<i class="fas fa-download"></i> Start Import Process'; }
        }
    }

    showMessage(type, text) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
    }

    async refreshUniversityData() {
        const refreshBtn = document.querySelector('.refresh-university-data');
        if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...'; }
        await this.loadUniversityStats();
        if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Stats'; }
        this.showNotification('info', 'University stats refreshed');
    }

    loadApplicationsSection() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="applications-section">
                    <div class="section-header">
                        <h2>Applications Management</h2>
                        <div class="filter-actions">
                            <select class="filter-select" id="application-status-filter">
                                <option value="all">All Applications</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <button class="btn btn-primary export-btn"><i class="fas fa-download"></i> Export</button>
                        </div>
                    </div>
                    <div class="applications-table-container">
                        <table class="applications-table">
                            <thead><tr><th>ID</th><th>Applicant</th><th>Type</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody id="applications-table-body"><tr><td colspan="6" class="text-center">Loading applications...</td></tr></tbody>
                        </table>
                    </div>
                </div>`;
            const filterSelect = document.getElementById('application-status-filter');
            if (filterSelect) filterSelect.addEventListener('change', () => this.loadApplications(filterSelect.value));
            this.loadApplications();
        }
    }

    async loadApplications(status = 'all') {
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/applications?status=${status}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) { const data = await response.json(); this.displayApplications(data); }
        } catch (e) { console.error('Failed to load applications:', e); }
    }

    displayApplications(data) {
        const tbody = document.getElementById('applications-table-body');
        if (!tbody) return;
        const totalEl    = document.getElementById('total-applications');
        const pendingEl  = document.getElementById('pending-applications');
        const approvedEl = document.getElementById('approved-applications');
        const rejectedEl = document.getElementById('rejected-applications');
        if (totalEl)    totalEl.textContent    = data.total    || 0;
        if (pendingEl)  pendingEl.textContent  = data.pending  || 0;
        if (approvedEl) approvedEl.textContent = data.approved || 0;
        if (rejectedEl) rejectedEl.textContent = data.rejected || 0;
        if (!data.applications?.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center">No applications found</td></tr>'; return; }
        tbody.innerHTML = data.applications.map(app => `
            <tr>
                <td>${app.id}</td>
                <td><div class="applicant-info"><span class="applicant-name">${app.name}</span><span class="applicant-email">${app.email}</span></div></td>
                <td>${app.type}</td>
                <td>${new Date(app.submitted).toLocaleDateString()}</td>
                <td><span class="status-badge ${app.status}">${app.status}</span></td>
                <td><button class="action-btn view-btn" data-id="${app.id}">👁️</button><button class="action-btn edit-btn" data-id="${app.id}">✏️</button></td>
            </tr>`).join('');
    }

    loadNotificationsSection() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="notifications-section">
                    <div class="section-header">
                        <h2>Notification Management</h2>
                        <button class="btn btn-primary mark-all-read-btn"><i class="fas fa-check-double"></i> Mark All as Read</button>
                    </div>
                    <div class="notifications-filters">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="unread">Unread</button>
                        <button class="filter-btn" data-filter="read">Read</button>
                    </div>
                    <div class="notifications-list" id="notifications-list"><div class="loading-spinner">Loading notifications...</div></div>
                </div>`;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadNotifications(btn.dataset.filter);
                });
            });
            this.loadNotifications();
        }
    }

    async loadNotifications(filter = 'all') {
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/notifications?filter=${filter}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const notifications = await response.json();
                this.displayNotifications(notifications);
                this.updateNotificationBadge(notifications.unreadCount);
            }
        } catch (e) { console.error('Failed to load notifications:', e); }
    }

    displayNotifications(notifications) {
        const list = document.getElementById('notifications-list');
        if (!list) return;
        if (!notifications?.length) { list.innerHTML = '<div class="empty-state">No notifications found</div>'; return; }
        list.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
                <div class="notification-icon">${this.getNotificationIcon(n.type)}</div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    <div class="notification-time">${this.formatTime(n.createdAt)}</div>
                </div>
                <div class="notification-actions">
                    <button class="mark-read-btn" onclick="dashboardLayout.markNotificationRead('${n.id}')">${n.read ? '✓' : '○'}</button>
                </div>
            </div>`).join('');
    }

    getNotificationIcon(type) {
        const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️', university:'🏛️', user:'👤' };
        return icons[type] || '📋';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const diff = Date.now() - date;
        if (diff < 60000)    return 'Just now';
        if (diff < 3600000)  return `${Math.floor(diff / 60000)} minutes ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    }

    async markNotificationRead(id) {
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            this.loadNotifications(activeFilter);
        } catch (e) { console.error('Failed to mark notification as read:', e); }
    }

    async fetchUnreadNotificationCount() {
        try {
            const token    = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/notifications/unread-count', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) { const data = await response.json(); this.updateNotificationBadge(data.count); }
        } catch (e) { console.error('Failed to fetch unread count:', e); }
    }

    updateNotificationBadge(count) {
        ['.notification-badge', '.notification-badge-sidebar'].forEach(sel => {
            const badge = document.querySelector(sel);
            if (!badge) return;
            if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'flex'; }
            else { badge.style.display = 'none'; }
        });
    }

    loadSettings() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="settings-section">
                    <h2>Settings</h2>
                    <div class="settings-tabs">
                        <button class="tab-btn active" data-tab="general">General</button>
                        <button class="tab-btn" data-tab="notifications">Notifications</button>
                        <button class="tab-btn" data-tab="security">Security</button>
                        <button class="tab-btn" data-tab="api">API</button>
                    </div>
                    <div class="settings-content" id="settings-content">
                        <div class="settings-card">
                            <h3>General Settings</h3>
                            <div class="settings-item"><label>Site Name</label><input type="text" value="Admin Dashboard" class="settings-input" /></div>
                            <div class="settings-item"><label>Timezone</label><select class="settings-select"><option>UTC</option><option>IST</option><option>EST</option></select></div>
                        </div>
                        <div class="settings-card">
                            <h3>Notification Settings</h3>
                            <div class="settings-item"><label class="checkbox-label"><input type="checkbox" checked /> Email Notifications</label></div>
                            <div class="settings-item"><label class="checkbox-label"><input type="checkbox" checked /> User Registration Alerts</label></div>
                        </div>
                        <div class="settings-actions">
                            <button class="btn btn-primary">Save Settings</button>
                            <button class="btn btn-secondary">Reset to Default</button>
                        </div>
                    </div>
                </div>`;
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }
    }

    loadReports() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.innerHTML = `<div class="reports-section"><h2>Reports</h2><p>Reports content will be loaded here.</p></div>`;
    }

    loadProfile() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.innerHTML = `<div class="profile-section"><h2>Profile</h2><p>Profile content will be loaded here.</p></div>`;
    }

    showModal(title, content) {
        const modalOverlay = document.querySelector('.modal-overlay');
        const modalContent = document.querySelector('.modal-content');
        if (modalOverlay && modalContent) {
            const modalTitle = modalContent.querySelector('.modal-header h3');
            const modalBody  = modalContent.querySelector('.modal-body');
            if (modalTitle) modalTitle.textContent = title;
            if (modalBody)  modalBody.innerHTML    = content;
            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal() {
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) { modalOverlay.style.display = 'none'; document.body.style.overflow = 'auto'; }
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this.getNotificationIcon(type)}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close">&times;</button>`;
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: window.innerWidth <= 768 ? '80px' : '20px', // above mobile bottom nav
            right: '20px',
            zIndex: '9999',
        });
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    }

    showProfileDropdown() {
        const dropdown = document.createElement('div');
        dropdown.className = 'profile-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-content">
                <a href="#" class="dropdown-item" data-section="profile"><i class="fas fa-user"></i> My Profile</a>
                <a href="#" class="dropdown-item" data-section="settings"><i class="fas fa-cog"></i> Settings</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>`;
        const profile = document.querySelector('.admin-profile');
        const rect    = profile.getBoundingClientRect();
        Object.assign(dropdown.style, {
            position: 'fixed',
            top:   rect.bottom + 'px',
            right: '16px',
            zIndex: '1001',
        });
        document.body.appendChild(dropdown);

        dropdown.querySelectorAll('.dropdown-item[data-section]').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const section = item.dataset.section;
                this.loadSection(section);
                document.querySelectorAll('.sidebar-menu li').forEach(m => m.classList.toggle('active', m.dataset.section === section));
                dropdown.remove();
            });
        });

        dropdown.querySelector('.logout-btn').addEventListener('click', e => { e.preventDefault(); this.logout(); });

        setTimeout(() => {
            const closeDropdown = e => {
                if (!dropdown.contains(e.target) && !profile.contains(e.target)) {
                    dropdown.remove(); document.removeEventListener('click', closeDropdown);
                }
            };
            document.addEventListener('click', closeDropdown);
        }, 0);
    }

    logout() {
        ['adminToken','adminEmail','adminName','activeSection'].forEach(k => localStorage.removeItem(k));
        window.location.href = 'admin-login.html';
    }

    showNotifications() {
        this.loadNotificationsSection();
        document.querySelector('[data-section="notifications"]')?.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboardLayout = new AdminDashboardLayout();
});