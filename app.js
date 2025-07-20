// تهيئة Firebase
const firebaseConfig = {
    databaseURL: "https://pharmase-9d8bc-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// متغيرات التطبيق
let clientData = {};
let pharmacyId = null;
let currentUserType = null;

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    checkDarkModePreference();
    updateDateTime();
});

// تحميل البيانات المحفوظة
function loadSavedData() {
    // بيانات العميل
    const savedClientData = localStorage.getItem('clientData');
    if (savedClientData) {
        const data = JSON.parse(savedClientData);
        document.getElementById('client-name').value = data.name || '';
        document.getElementById('client-phone').value = data.phone || '';
        document.getElementById('client-city').value = data.city || '';
        document.getElementById('save-client-data').checked = true;
    }

    // بيانات الصيدلية
    const savedPharmacyData = localStorage.getItem('pharmacyData');
    if (savedPharmacyData) {
        const data = JSON.parse(savedPharmacyData);
        document.getElementById('pharmacy-name').value = data.name || '';
        document.getElementById('pharmacy-password').value = data.password || '';
        document.getElementById('save-pharmacy-data').checked = true;
    }
}

// عرض القسم المطلوب
function showSection(id) {
    document.querySelectorAll('.container').forEach(el => {
        el.classList.add('hidden');
    });
    
    document.getElementById(id).classList.remove('hidden');
    
    if (id === 'pharmacy-panel') {
        listenToRequests();
        updatePharmacyStatus();
    }
    
    if (id === 'client-panel') {
        updateClientInfo();
    }
    
    window.scrollTo(0, 0);
}

// تسجيل دخول العميل
function loginClient() {
    const name = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const city = document.getElementById("client-city").value.trim();
    const saveData = document.getElementById("save-client-data").checked;

    if (!name || !phone || !city) {
        showError("الرجاء ملء جميع الحقول المطلوبة");
        return;
    }

    if (phone.length !== 11 || isNaN(phone)) {
        showError("رقم الهاتف يجب أن يكون 11 رقماً");
        return;
    }

    clientData = { name, phone, city };
    currentUserType = 'client';
    
    if (saveData) {
        localStorage.setItem('clientData', JSON.stringify(clientData));
    } else {
        localStorage.removeItem('clientData');
    }
    
    showSection("client-panel");
    showSuccess(`مرحباً ${name}! يمكنك الآن البحث عن الأدوية في صيدليات مدينة ${city}`);
}

// تسجيل دخول الصيدلية
function loginPharmacy() {
    const name = document.getElementById("pharmacy-name").value.trim();
    const pass = document.getElementById("pharmacy-password").value.trim();
    const saveData = document.getElementById("save-pharmacy-data").checked;

    if (!name || !pass) {
        showError("الرجاء إدخال جميع البيانات");
        return;
    }

    if (saveData) {
        localStorage.setItem('pharmacyData', JSON.stringify({ name, password: pass }));
    } else {
        localStorage.removeItem('pharmacyData');
    }

    showLoading("جاري التحقق من بيانات الدخول...");

    db.ref("pharmacies").once("value", snap => {
        const data = snap.val();
        let pharmacyFound = false;

        for (let id in data) {
            if (data[id].name === name && data[id].password === pass) {
                pharmacyId = id;
                currentUserType = 'pharmacy';
                showSection("pharmacy-panel");
                showSuccess(`مرحباً بك ${name}!`);
                pharmacyFound = true;
                return;
            }
        }

        if (!pharmacyFound) {
            registerNewPharmacy(name, pass);
        }
    }).catch(error => {
        showError("حدث خطأ أثناء محاولة الدخول");
        console.error(error);
    });
}

// تسجيل صيدلية جديدة
function registerNewPharmacy(name, pass) {
    const city = prompt("مدينة الصيدلية:");
    if (!city) return;

    const location = prompt("رابط الموقع على الخريطة:");
    if (!location) return;

    const phone = prompt("رقم هاتف الصيدلية (اختياري):");

    pharmacyId = Date.now().toString();
    currentUserType = 'pharmacy';

    db.ref("pharmacies/" + pharmacyId).set({
        name,
        password: pass,
        city,
        location,
        phone,
        isOpen: true,
        medicines: {},
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        showSection("pharmacy-panel");
        showSuccess(`تم إنشاء حساب جديد للصيدلية ${name}`);
    }).catch(error => {
        showError("حدث خطأ أثناء إنشاء الحساب");
        console.error(error);
    });
}

// تبديل حالة الصيدلية (مفتوحة/مغلقة)
function toggleOpen() {
    db.ref("pharmacies/" + pharmacyId + "/isOpen").once("value", snap => {
        const newStatus = !snap.val();
        db.ref("pharmacies/" + pharmacyId + "/isOpen").set(newStatus);
        updatePharmacyStatus();
        showSuccess(`تم تغيير حالة الصيدلية إلى ${newStatus ? 'مفتوحة' : 'مغلقة'}`);
    });
}

// تحديث حالة الصيدلية في الواجهة
function updatePharmacyStatus() {
    db.ref("pharmacies/" + pharmacyId + "/isOpen").on("value", snap => {
        const status = snap.val();
        const statusElement = document.getElementById("status-text");
        const statusBadge = document.getElementById("pharmacy-status");
        const toggleBtn = document.getElementById("toggle-status-btn");

        if (status) {
            statusElement.textContent = "مفتوحة الآن";
            statusBadge.className = "status-badge status-open";
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> تغيير للإغلاق';
        } else {
            statusElement.textContent = "مغلقة الآن";
            statusBadge.className = "status-badge status-closed";
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> تغيير للفتح';
        }
    });
}

// الاستماع لطلبات الأدوية
function listenToRequests() {
    db.ref("medicineRequests").on("value", snap => {
        const data = snap.val();
        const container = document.getElementById("requests");
        container.innerHTML = '';

        db.ref("pharmacies/" + pharmacyId).once("value").then(pharmacySnap => {
            const pharmacy = pharmacySnap.val();
            let hasRequests = false;

            for (let rid in data) {
                const req = data[rid];
                if (req.city === pharmacy.city) {
                    hasRequests = true;
                    const div = document.createElement("div");
                    div.className = "medicine-card";
                    div.innerHTML = `
                        <div class="medicine-image" style="background: #f0f7fd;">
                            <i class="fas fa-search"></i>
                        </div>
                        <div class="medicine-details">
                            <h3>${req.medicineName}</h3>
                            <div class="medicine-info">
                                <i class="fas fa-user"></i>
                                <span>${req.phone}</span>
                            </div>
                            <div class="medicine-info">
                                <i class="fas fa-clock"></i>
                                <span>${formatTime(req.timestamp)}</span>
                            </div>
                            <div style="margin-top: 15px;">
                                <button class="btn btn-primary" onclick="setAvailability('${req.medicineName}', 'available', '${rid}')">
                                    <i class="fas fa-check"></i> متوفر
                                </button>
                                <button class="btn btn-secondary" onclick="setAvailability('${req.medicineName}', 'not_available', '${rid}')">
                                    <i class="fas fa-times"></i> غير متوفر
                                </button>
                            </div>
                        </div>
                    `;
                    container.appendChild(div);
                }
            }

            if (!hasRequests) {
                container.innerHTML = `
                <div class="medicine-card">
                    <div class="medicine-details" style="text-align: center;">
                        <i class="fas fa-inbox" style="font-size: 50px; color: #ccc; margin-bottom: 15px;"></i>
                        <h3>لا توجد طلبات جديدة</h3>
                        <p>ستظهر هنا أي طلبات جديدة من العملاء في مدينتك</p>
                    </div>
                </div>`;
            }
        });
    });
}

// تحديث حالة توفر الدواء
function setAvailability(name, status, requestId) {
    db.ref("pharmacies/" + pharmacyId + "/medicines/" + name).set(status)
        .then(() => {
            if (requestId) {
                db.ref("medicineRequests/" + requestId).remove();
            }
            showSuccess(`تم تحديث حالة الدواء "${name}" إلى ${status ===
