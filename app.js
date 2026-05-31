const connectionStatus = document.getElementById("connection-status");

function updateOnlineStatus() {
  if (navigator.onLine) {
    connectionStatus.textContent = "Conectado";
    connectionStatus.style.background = "#dcfce7";
    connectionStatus.style.color = "#166534";
  } else {
    connectionStatus.textContent = "Sin conexión — modo offline";
    connectionStatus.style.background = "#fef2f2";
    connectionStatus.style.color = "#991b1b";
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();
