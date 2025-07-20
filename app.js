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
});

// تحميل البيانات المحفوظة
function loadSavedData() {
  // تحميل بيانات العميل إن وجدت
  const savedClientData = localStorage.getItem('clientData');
  if (savedClientData) {
    const data = JSON.parse(savedClientData);
    document.getElementById('client-name').value = data.name || '';
    document.getElementById('client-phone').value = data.phone || '';
    document.getElementById('client-city').value = data.city || '';
    document.getElementById('save-client-data').checked = true;
  }

  // تحميل بيانات الصيدلية إن وجدت
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
  // إخفاء جميع الأقسام
  document.querySelectorAll('.container').forEach(el => {
    el.classList.add('hidden');
  });
  
  // عرض القسم المحدد
  document.getElementById(id).classList.remove('hidden');
  
  // إذا كان قسم الصيدلية، نبدأ بمراقبة الطلبات
  if (id === 'pharmacy-panel') {
    listenToRequests();
    updatePharmacyStatus();
  }
  
  // التمرير لأعلى الصفحة
  window.scrollTo(0, 0);
}

// تسجيل دخول العميل
function loginClient() {
  const name = document.getElementById("client-name").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const city = document.getElementById("client-city").value.trim();
  const saveData = document.getElementById("save-client-data").checked;

  // التحقق من صحة البيانات
  if (!name || !phone || !city) {
    showError("الرجاء ملء جميع الحقول المطلوبة");
    return;
  }

  if (phone.length !== 11 || isNaN(phone)) {
    showError("رقم الهاتف يجب أن يكون 11 رقماً");
    return;
  }

  // حفظ بيانات العميل
  clientData = { name, phone, city };
  currentUserType = 'client';
  
  // حفظ البيانات إذا طلب المستخدم ذلك
  if (saveData) {
    localStorage.setItem('clientData', JSON.stringify(clientData));
  } else {
    localStorage.removeItem('clientData');
  }
  
  // عرض لوحة التحكم
  showSection("client-panel");
  showSuccess(`مرحباً ${name}!
  يمكنك الآن البحث عن الأدوية في صيدليات مدينة ${city}`);
}

// باقي الدوال بنفس الأسلوب المحسن...
// ... (تسجيل دخول الصيدلية، البحث عن الأدوية، إدارة الطلبات، إلخ)

// دالة لعرض رسائل النجاح
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// دالة للتحقق من تفضيل الوضع المظلم
function checkDarkModePreference() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-mode');
  }
}
