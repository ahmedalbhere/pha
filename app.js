const firebaseConfig = {
  databaseURL: "https://pharmase-9d8bc-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function showSection(id) {
  document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// عميل
let clientData = {};
function loginClient() {
  const name = document.getElementById("client-name").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const city = document.getElementById("client-city").value.trim();

  if (phone.length !== 11 || isNaN(phone)) {
    alert("رقم الهاتف يجب أن يكون 11 رقماً.");
    return;
  }

  clientData = { name, phone, city };
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

  db.ref("pharmacies").on("value", snap => {
    const pharmacies = snap.val();
    let output = '';
    for (let id in pharmacies) {
      const p = pharmacies[id];
      if (p.city === clientData.city && p.medicines && p.medicines[name] === 'available') {
        output += `<div class="pharmacy-card">
          <strong>${p.name}</strong><br>
          <a href="${p.location}" target="_blank">الموقع</a>
        </div>`;
      }
    }
    document.getElementById("client-results").innerHTML = output || "لا توجد صيدليات حالياً.";
  });
}

// صيدلية
let pharmacyId = null;
function loginPharmacy() {
  const name = document.getElementById("pharmacy-name").value;
  const pass = document.getElementById("pharmacy-password").value;

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
    const location = prompt("رابط اللوكيشن:");
    pharmacyId = Date.now();
    db.ref("pharmacies/" + pharmacyId).set({
      name,
      password: pass,
      city,
      location,
      isOpen: true
    });
    alert("تم إنشاء حساب جديد");
    showSection("pharmacy-panel");
    listenToRequests();
  });
}

function toggleOpen() {
  db.ref("pharmacies/" + pharmacyId + "/isOpen").once("value", snap => {
    db.ref("pharmacies/" + pharmacyId + "/isOpen").set(!snap.val());
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
            <button onclick="setAvailability('${req.medicineName}', 'available')">✔ متوفر</button>
            <button onclick="setAvailability('${req.medicineName}', 'not_available')">✘ غير متوفر</button>
          `;
          container.appendChild(div);
        }
      }
    });
  });
}

function setAvailability(name, status) {
  db.ref("pharmacies/" + pharmacyId + "/medicines/" + name).set(status);
  alert("تم تحديث حالة الدواء");
}

function changePassword() {
  const oldPass = document.getElementById("old-password").value;
  const newPass = document.getElementById("new-password").value;

  db.ref("pharmacies/" + pharmacyId + "/password").once("value", snap => {
    if (snap.val() === oldPass) {
      db.ref("pharmacies/" + pharmacyId + "/password").set(newPass);
      alert("تم تغيير كلمة المرور بنجاح");
      showSection("pharmacy-panel");
    } else {
      alert("كلمة المرور القديمة غير صحيحة");
    }
  });
}
