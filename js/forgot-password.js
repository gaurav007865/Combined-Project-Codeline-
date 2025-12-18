const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPeH_oXus5h88Y1H08AoMRNgSIaaZB_sX5Xuu2MT1BAFBILF_DhB3yVEX9nW7v0ozbHw/exec";

const msg = document.getElementById("msg");

function showMessage(text, color = "red") {
  msg.style.color = color;
  msg.textContent = text;
}

// STEP 1 – SEND OTP
async function sendOTP() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    showMessage("Email required");
    return;
  }

  const res = await fetch(`${SCRIPT_URL}?action=forgotPassword`, {
    method: "POST",
    body: new URLSearchParams({ email })
  });

  const data = await res.json();

  if (data.status === "success") {
    showMessage(data.message, "green");
    document.getElementById("step-email").classList.add("hidden");
    document.getElementById("step-otp").classList.remove("hidden");
  } else {
    showMessage(data.message);
  }
}

// STEP 2 – VERIFY OTP
async function verifyOTP() {
  const email = document.getElementById("email").value.trim();
  const otp = document.getElementById("otp").value.trim();

  if (!otp) {
    showMessage("OTP required");
    return;
  }

  const res = await fetch(`${SCRIPT_URL}?action=verifyForgotOTP`, {
    method: "POST",
    body: new URLSearchParams({ email, otp })
  });

  const data = await res.json();

  if (data.status === "success") {
    showMessage("OTP verified", "green");
    document.getElementById("step-otp").classList.add("hidden");
    document.getElementById("step-reset").classList.remove("hidden");
  } else {
    showMessage(data.message);
  }
}

// STEP 3 – RESET PASSWORD
async function resetPassword() {
  const email = document.getElementById("email").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!newPassword || !confirmPassword) {
    showMessage("Both password fields required");
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("Passwords do not match");
    return;
  }

  const res = await fetch(`${SCRIPT_URL}?action=resetForgotPassword`, {
    method: "POST",
    body: new URLSearchParams({ email, newPassword })
  });

  const data = await res.json();

  if (data.status === "success") {
    showMessage("Password changed successfully 🎉", "green");
     window.location.href = 'login.html';
  } else {
    showMessage(data.message);
  }
}
