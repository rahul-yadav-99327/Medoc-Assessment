const API_BASE = '/api';
let globalData = {}; // Stores dashboard data

// --- NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

    document.getElementById(`view-${tabId}`).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');

    if (tabId !== 'doctors') fetchDashboard(); // Refresh data when switching tabs (except static add form)
}

// --- API & UTILS ---
async function apiCall(endpoint, method, body) {
    try {
        const res = await fetch(API_BASE + endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
        const data = await res.json();
        if (!data.success && !res.ok && !Array.isArray(data) && !data.doc1) throw new Error(data.error || data.message || 'Error occurred');
        return data;
    } catch (e) {
        showToast(e.message, true);
        throw e;
    }
}

function showToast(msg, isError = false) {
    const d = document.getElementById('notification');
    d.textContent = msg;
    d.className = isError ? 'error show' : 'show';
    setTimeout(() => d.className = '', 3000);
}

// --- DASHBOARD ---
async function fetchDashboard() {
    try {
        const data = await apiCall('/dashboard', 'GET');
        globalData = data;
        renderDashboard(data);
        populateDropdowns(data);
    } catch (e) {
        console.error(e);
    }
}

function renderDashboard(data) {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = '';

    if (Object.keys(data).length === 0) {
        container.innerHTML = '<p>No doctors found.</p>';
        return;
    }

    for (const [docId, doc] of Object.entries(data)) {
        const docEl = document.createElement('div');
        docEl.className = 'card doc-card';

        const today = new Date().toLocaleDateString();

        let slotsHtml = doc.slots.map(slot => `
            <div class="slot-card ${slot.status === 'DELAYED' ? 'delayed' : ''}">
                <div class="slot-time">
                    <span style="font-size:0.8rem; font-weight:400; display:block; color:#666;">${today}</span>
                    ${slot.startTime} - ${slot.endTime}
                </div>
                <div style="font-size:0.8rem; color:#666;">
                    Capacity: ${slot.currentTokens.length}/${slot.hardLimit}
                    ${slot.status === 'DELAYED' ? '<span style="color:red; float:right;">DELAYED</span>' : ''}
                </div>
                <ul class="token-list">
                    ${slot.currentTokens.map((t, idx) => `
                        <li class="token-item">
                            <div>
                                <span style="font-weight:600; margin-right:4px;">#${idx + 1}</span>
                                <span>${t.patientName}</span>
                                <div style="font-size:0.7em; color:#999; margin-top:2px;">ID: ${t.id}</div>
                            </div>
                            <span style="font-size:0.7em; opacity:0.7">${t.source}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        docEl.innerHTML = `
            <div class="doc-header">
                <div>
                    <h3 style="font-size:1.1rem;">${doc.name}</h3>
                    <span style="color:#666; font-size:0.9rem;">${doc.specialty} (${doc.id})</span>
                </div>
                <span class="badge">${doc.slots.length} Slots</span>
            </div>
            <div class="slots-container">
                ${slotsHtml || '<p style="color:#999;font-size:0.9rem;">No slots configured</p>'}
            </div>
        `;
        container.appendChild(docEl);
    }
}

function populateDropdowns(data) {
    // Helpers to populate selects
    const updateSelect = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const current = el.value;
        el.innerHTML = '<option value="" disabled selected>Select Doctor</option>';
        for (const [docId, doc] of Object.entries(data)) {
            const opt = document.createElement('option');
            opt.value = docId;
            opt.textContent = `${doc.name} (${doc.specialty})`;
            el.appendChild(opt);
        }
        if (current) el.value = current;
    };

    updateSelect('book_doctorId');
    updateSelect('ops_delay_doctor');
    updateSelect('ops_cancel_doctor');
}

function populateSlots(docSelectId, slotSelectId) {
    const docId = document.getElementById(docSelectId).value;
    const slotSelect = document.getElementById(slotSelectId);
    slotSelect.innerHTML = '<option value="" disabled selected>Select Slot</option>';

    if (globalData[docId]) {
        globalData[docId].slots.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.startTime} - ${s.endTime} (${s.id})`;
            slotSelect.appendChild(opt);
        });
    }
}

// --- ACTIONS ---

// 1. Book
async function handleBook(e) {
    e.preventDefault();
    const payload = {
        doctorId: document.getElementById('book_doctorId').value,
        patientName: document.getElementById('book_patient').value,
        source: document.getElementById('book_source').value
    };

    try {
        const res = await apiCall('/book', 'POST', payload);
        if (res.success) {
            showToast(`Booked! Token: ${res.token.id}`);
            document.getElementById('bookingForm').reset();
        } else {
            showToast(res.message || 'Booking failed', true);
        }
    } catch (err) { }
}

// 2. Add Doctor
async function handleAddDoctor(e) {
    e.preventDefault();
    const sTime = document.getElementById('doc_slot_start').value;
    const eTime = document.getElementById('doc_slot_end').value;

    const payload = {
        id: document.getElementById('doc_id').value,
        name: document.getElementById('doc_name').value,
        specialty: document.getElementById('doc_specialty').value,
        slots: [
            { id: 's-' + Date.now(), startTime: sTime, endTime: eTime, hardLimit: 5 }
        ]
    };

    try {
        const res = await apiCall('/doctors', 'POST', payload);
        if (res.success) {
            showToast('Doctor Added Successfully');
            document.getElementById('doctorForm').reset();
            fetchDashboard(); // Refresh cache
        }
    } catch (err) { }
}

// 3. Delay
async function handleDelay(e) {
    e.preventDefault();
    const payload = {
        doctorId: document.getElementById('ops_delay_doctor').value,
        slotId: document.getElementById('ops_delay_slot').value,
        delayMinutes: document.getElementById('ops_delay_mins').value
    };
    try {
        const res = await apiCall('/event/delay', 'POST', payload);
        if (res.success) {
            showToast('Delay Reported Successfully');
            fetchDashboard();
        }
    } catch (err) { }
}

// 4. Cancel
async function handleCancel(e) {
    e.preventDefault();
    const payload = {
        doctorId: document.getElementById('ops_cancel_doctor').value,
        slotId: document.getElementById('ops_cancel_slot').value,
        tokenIndex: document.getElementById('ops_cancel_idx').value
    };
    try {
        const res = await apiCall('/cancel', 'POST', payload);
        if (res.success) {
            showToast('Token Cancelled');
            fetchDashboard();
        } else {
            showToast('Cancellation Failed', true);
        }
    } catch (err) { }
}

// Init
fetchDashboard();
