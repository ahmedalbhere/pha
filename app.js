// إعداد Firebase
const firebaseConfig = {
  databaseURL: "https://pharmase-9d8bc-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// تسجيل عميل
function registerClient() {
  const name = document.getElementById('client-name').value;
  const phone = document.getElementById('client-phone').value;
  const clientId = Date.now();
  db.ref('clients/' + clientId).set({ name, phone });
  alert("تم تسجيل العميل");
}

// تسجيل صيدلية
let pharmacyId = localStorage.getItem('pharmacyId');
function registerPharmacy() {
  const name = document.getElementById('pharmacy-name').value;
  const city = document.getElementById('pharmacy-city').value;
  const location = document.getElementById('pharmacy-location').value;
  pharmacyId = Date.now();
  localStorage.setItem('pharmacyId', pharmacyId);
  db.ref('pharmacies/' + pharmacyId).set({ name, city, location, isOpen: true });
  alert("تم تسجيل الصيدلية");
}

// تبديل حالة الصيدلية مفتوح / مغلق
function toggleOpenState() {
  if (!pharmacyId) return alert("سجل كصيدلية أولاً");
  db.ref('pharmacies/' + pharmacyId + '/isOpen').once('value', snapshot => {
    const current = snapshot.val();
    db.ref('pharmacies/' + pharmacyId + '/isOpen').set(!current);
    alert("تم تحديث الحالة");
  });
}

// بحث عن دواء
function searchMedicine() {
  const name = document.getElementById('search-medicine').value;
  const city = document.getElementById('search-city').value;
  document.getElementById('search-results').innerHTML = "جاري البحث...";

  db.ref('pharmacies').on('value', snapshot => {
    const pharmacies = snapshot.val();
    let results = '';
    for (let id in pharmacies) {
      const p = pharmacies[id];
      if (p.city === city && p.isOpen && p.medicines && p.medicines[name] === 'available') {
        results += `<div class='pharmacy'>${p.name} - <a href='${p.location}' target='_blank'>الموقع</a></div>`;
      }
    }
    document.getElementById('search-results').innerHTML = results || "لا توجد صيدليات متاحة حالياً";
  });
}

// عرض طلبات الأدوية لحظيًا
db.ref('medicineRequests').on('value', snapshot => {
  const data = snapshot.val();
  const container = document.getElementById('medicine-requests');
  container.innerHTML = '';
  if (!data || !pharmacyId) return;

  for (let reqId in data) {
    const req = data[reqId];
    db.ref('pharmacies/' + pharmacyId).once('value', snap => {
      const p = snap.val();
      if (p.city === req.city) {
        const div = document.createElement('div');
        div.className = 'result';
        div.innerHTML = `
          <strong>دواء: ${req.medicineName}</strong><br>
          <div class="medicine-buttons">
            <button onclick="setMedicineAvailability('${req.medicineName}', 'available')">✔ متوفر</button>
            <button onclick="setMedicineAvailability('${req.medicineName}', 'not_available')">✘ غير متوفر</button>
          </div>
        `;
        container.appendChild(div);
      }
    });
  }
});

// تحديد حالة توفر الدواء
function setMedicineAvailability(name, status) {
  if (!pharmacyId) return;
  db.ref('pharmacies/' + pharmacyId + '/medicines/' + name).set(status);
  alert("تم تحديث حالة الدواء");
}
