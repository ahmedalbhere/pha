const firebaseConfig = {
  databaseURL: "https://pharmase-9d8bc-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Load saved data
document.addEventListener('DOMContentLoaded', () => {
  const savedClientData = localStorage.getItem('clientData');
  if (savedClientData) {
    const data = JSON.parse(savedClientData);
    document.getElementById('client-name').value = data.name || '';
    document.getElementById('client-phone').value = data.phone || '';
    document.getElementById('client-city').value = data.city || '';
    document.getElementById('save-client-data').checked = true;
  }

  const savedPharmacyData = localStorage.getItem('pharmacyData');
  if (savedPharmacyData) {
    const data = JSON.parse(savedPharmacyData);
    document.getElementById('pharmacy-name').value = data.name || '';
    document.getElementById('pharmacy-password').value = data.password || '';
    document.getElementById('save-pharmacy-data').checked = true;
  }
});

function showSection(id) {
  document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  
  // Update pharmacy status button text
  if (id === 'pharmacy-panel' && pharmacyId) {
    db.ref("pharmacies/" + pharmacyId + "/isOpen").once("value", snap => {
      const status = snap.val();
      document.getElementById("toggle-status-btn").textContent = 
        status ? "🟢 تغيير للإغلاق" : "🔴 تغيير للفتح";
    });
  }
}

// Close panels when clicking outside (for pharmacy panel)
document.addEventListener('click', (e) => {
  const pharmacyPanel = document.getElementById('pharmacy-panel');
  if (!pharmacyPanel.contains(e.target) && !pharmacyPanel.classList.contains('hidden')) {
    const activeElement = document.activeElement;
    if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'BUTTON') {
      showSection('home-screen');
    }
  }
});

// عميل
let clientData = {};
function loginClient() {
  const name = document.getElementById("client-name").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const city = document.getElementById("client-city").value.trim();
  const saveData = document.getElementById("save-client-data").checked;

  if (phone.length !== 11 || isNaN(phone)) {
    alert("رقم الهاتف يجب أن يكون 11 رقماً.");
    return;
  }

  clientData = { name, phone, city };
  
  if (saveData) {
    localStorage.setItem('clientData', JSON.stringify(clientData));
  } else {
    localStorage.removeItem('clientData');
  }
  
  showSection("client-panel");
}

function searchMedicine() {
  const name = document.getElementById("search-medicine").value.trim();
  if (!name) return alert("أدخل اسم الدواء");

  const id = Date.now();
  db.ref("medicineRequests/" + id).set({
    medicineName: name,
    city: clientData.city,
    phone: clientData.phone
  });

  document.getElementById("client-results").innerHTML = '<div class="spinner"></div>';
  
  db.ref("pharmacies").on("value", snap => {
    const pharmacies = snap.val();
    let output = '';
    for (let id in pharmacies) {
      const p = pharmacies[id];
      if (p.city === clientData.city && p.medicines && p.medicines[name] === 'available' && p.isOpen) {
        output += `<div class="pharmacy-card">
          <strong>${p.name}</strong><br>
          <span>الهاتف: ${p.phone || 'غير متوفر'}</span><br>
          <a href="${p.location}" target="_blank">الموقع على الخريطة</a>
        </div>`;
      }
    }
    document.getElementById("client-results").innerHTML = output || "لا توجد صيدليات متاحة حالياً تحتوي على هذا الدواء.";
  });
}

// صيدلية
let pharmacyId = null;
function loginPharmacy() {
  const name = document.getElementById("pharmacy-name").value.trim();
  const pass = document.getElementById("pharmacy-password").value.trim();
  const saveData = document.getElementById("save-pharmacy-data").checked;

  if (!name || !pass) return alert("الرجاء إدخال جميع البيانات");

  if (saveData) {
    localStorage.setItem('pharmacyData', JSON.stringify({ name, password: pass }));
  } else {
    localStorage.removeItem('pharmacyData');
  }

  document.getElementById("pharmacy-login").innerHTML += '<div class="spinner"></div>';
  
  db.ref("pharmacies").once("value", snap => {
    const data = snap.val();
    for (let id in data) {
      if (data[id].name === name && data[id].password === pass) {
        pharmacyId = id;
        showSection("pharmacy-panel");
        listenToRequests();
        return;
      }
    }

    const city = prompt("مدينة الصيدلية:");
    if (!city) return;
    
    const location = prompt("رابط الموقع على الخريطة:");
    if (!location) return;
    
    const phone = prompt("رقم هاتف الصيدلية (اختياري):");
    
    pharmacyId = Date.now();
    db.ref("pharmacies/" + pharmacyId).set({
      name,
      password: pass,
      city,
      location,
      phone,
      isOpen: true,
      medicines: {}
    });
    alert("تم إنشاء حساب جديد للصيدلية");
    showSection("pharmacy-panel");
    listenToRequests();
  });
}

function toggleOpen() {
  db.ref("pharmacies/" + pharmacyId + "/isOpen").once("value", snap => {
    const newStatus = !snap.val();
    db.ref("pharmacies/" + pharmacyId + "/isOpen").set(newStatus);
    document.getElementById("toggle-status-btn").textContent = 
      newStatus ? "🟢 تغيير للإغلاق" : "🔴 تغيير للفتح";
  });
}

function listenToRequests() {
  db.ref("medicineRequests").on("value", snap => {
    const data = snap.val();
    const container = document.getElementById("requests");
    container.innerHTML = '';

    db.ref("pharmacies/" + pharmacyId).once("value").then(pharmacySnap => {
      const pharmacy = pharmacySnap.val();
      for (let rid in data) {
        const req = data[rid];
        if (req.city === pharmacy.city) {
          const div = document.createElement("div");
          div.className = "pharmacy-card";
          div.innerHTML = `
            <strong>دواء: ${req.medicineName}</strong><br>
            <span>طلب من: ${req.phone}</span><br>
            <button onclick="setAvailability('${req.medicineName}', 'available')">✔ متوفر</button>
            <button class="secondary" onclick="setAvailability('${req.medicineName}', 'not_available')">✘ غير متوفر</button>
          `;
          container.appendChild(div);
        }
      }
      
      if (container.children.length === 0) {
        container.innerHTML = '<p>لا توجد طلبات جديدة في مدينتك</p>';
      }
    });
  });
}

function setAvailability(name, status) {
  db.ref("pharmacies/" + pharmacyId + "/medicines/" + name).set(status);
  alert(`تم تحديث حالة الدواء ${name} إلى ${status === 'available' ? 'متوفر' : 'غير متوفر'}`);
}

function changePassword() {
  const oldPass = document.getElementById("old-password").value;
  const newPass = document.getElementById("new-password").value;

  if (!oldPass || !newPass) return alert("الرجاء إدخال جميع الحقول");

  db.ref("pharmacies/" + pharmacyId + "/password").once("value", snap => {
    if (snap.val() === oldPass) {
      db.ref("pharmacies/" + pharmacyId + "/password").set(newPass);
      alert("تم تغيير كلمة المرور بنجاح");
      
      // Update saved data if exists
      const savedData = localStorage.getItem('pharmacyData');
      if (savedData) {
        const data = JSON.parse(savedData);
        if (data.password === oldPass) {
          data.password = newPass;
          localStorage.setItem('pharmacyData', JSON.stringify(data));
        }
      }
      
      showSection("pharmacy-panel");
    } else {
      alert("كلمة المرور القديمة غير صحيحة");
    }
  });
}

function logout() {
  pharmacyId = null;
  clientData = {};
  showSection('home-screen');
}
