// Logika Routing Halaman SPA (Single Page Application)
function showPage(pageId) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Tampilkan halaman yang dipilih
    document.getElementById(pageId).classList.add('active');
    
    // Matikan kamera jika pindah dari halaman capture
    if(pageId !== 'capture') {
        stopCamera();
    }
}

// Logika Placeholder untuk Scrabble
function startScrabble() {
    document.getElementById('scrabble-board').innerHTML = "<h3>Game Dimulai!</h3><p>Area papan Scrabble muncul di sini.</p>";
}

// Logika Akses Kamera untuk Capture Energy
let streamRef = null;

async function startCamera() {
    const video = document.getElementById('webcam');
    const gameArea = document.querySelector('#capture .game-area');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = 'block';
        streamRef = stream;
        
        // Catatan: Untuk "Head Catcher", Anda butuh library seperti MediaPipe atau clmtrackr
        gameArea.innerHTML += "<p>Kamera aktif! Butuh library AI tracking (misal: MediaPipe) untuk membaca pergerakan kepala.</p>";
    } catch (err) {
        alert("Akses kamera ditolak atau tidak tersedia.");
        console.error(err);
    }
}

function stopCamera() {
    if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
        document.getElementById('webcam').style.display = 'none';
        streamRef = null;
    }
}

// Logika Placeholder untuk Memory Game
function startMemoryGame() {
    document.getElementById('memory-board').innerHTML = "<h3>Game Dimulai!</h3><p>Kartu-kartu memory muncul di sini.</p>";
}