(function () {
  "use strict";

  const profileStorageKey = "visionstock-profile";
  const whatsappStorageKey = "visionstock-whatsapp";
  const profileForm = document.getElementById("profile-form");
  const whatsappForm = document.getElementById("whatsapp-form");

  function showMessage(element, message) {
    element.textContent = message;
  }

  function readSessionValue(key) {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  function goToDashboard() {
    window.location.href = "dashboard.html";
  }

  document.querySelectorAll(".back-to-dashboard").forEach(function (button) {
    button.addEventListener("click", goToDashboard);
  });

  try {
    const profile = readSessionValue(profileStorageKey);
    if (profile) {
      document.getElementById("nama").value = profile.name || "";
      document.getElementById("email").value = profile.email || "";
    }

    const whatsapp = readSessionValue(whatsappStorageKey);
    if (whatsapp && whatsapp.phone) {
      document.getElementById("nomor-whatsapp").value = whatsapp.phone;
      document.getElementById("whatsapp-connection-status").textContent =
        "Status koneksi: Nomor tersimpan untuk sesi ini (belum terhubung ke layanan WhatsApp).";
    }
  } catch (error) {
    showMessage(
      document.getElementById("profile-status"),
      "Data pengaturan sesi tidak dapat dibaca: " + error.message
    );
  }

  profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const status = document.getElementById("profile-status");
    showMessage(status, "");
    if (!profileForm.reportValidity()) {
      return;
    }

    const password = document.getElementById("password-baru").value;
    const confirmation = document.getElementById("konfirmasi-password").value;
    if (password && password !== confirmation) {
      showMessage(status, "Konfirmasi password tidak sama. Periksa kembali password Anda.");
      return;
    }

    try {
      const previousProfile = readSessionValue(profileStorageKey) || {};
      let passwordHash = previousProfile.passwordHash || "";
      if (password) {
        if (!window.crypto || !window.crypto.subtle) {
          throw new Error("Browser tidak menyediakan fitur hash password yang diperlukan.");
        }
        const bytes = new TextEncoder().encode(password);
        const digest = await window.crypto.subtle.digest("SHA-256", bytes);
        passwordHash = Array.from(new Uint8Array(digest)).map(function (byte) {
          return byte.toString(16).padStart(2, "0");
        }).join("");
      }

      window.sessionStorage.setItem(profileStorageKey, JSON.stringify({
        name: document.getElementById("nama").value.trim(),
        email: document.getElementById("email").value.trim(),
        passwordHash: passwordHash,
        passwordConfigured: Boolean(password) || Boolean(previousProfile.passwordConfigured)
      }));
      goToDashboard();
    } catch (error) {
      showMessage(status, "Profil tidak dapat disimpan untuk sesi ini: " + error.message);
    }
  });

  whatsappForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const status = document.getElementById("whatsapp-status");
    showMessage(status, "");
    if (!whatsappForm.reportValidity()) {
      return;
    }

    try {
      const phone = document.getElementById("nomor-whatsapp").value.trim();
      window.sessionStorage.setItem(whatsappStorageKey, JSON.stringify({ phone: phone }));
      document.getElementById("whatsapp-connection-status").textContent =
        "Status koneksi: Nomor tersimpan untuk sesi ini (belum terhubung ke layanan WhatsApp).";
      showMessage(status, "Nomor WhatsApp tersimpan untuk sesi ini. Integrasi WhatsApp belum aktif.");
    } catch (error) {
      showMessage(status, "Nomor WhatsApp tidak dapat disimpan untuk sesi ini: " + error.message);
    }
  });
}());
