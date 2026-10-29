(function () {
    const soundUrl = 'https://zafuozcduvijohjnbycw.supabase.co/storage/v1/object/public/sounds/notif.mp3';
    const sound = new Audio(soundUrl);
    sound.preload = 'auto';
    const button = document.getElementById('soundToggle');
    const status = document.getElementById('soundStatus');
    const icon = button?.querySelector('.sound-icon');
    const label = button?.querySelector('.sound-label');
    let enabled = false;

    if (!button) return;

    sound.addEventListener('error', () => {
        console.error('Notification audio could not be loaded.', sound.error);
        if (status) status.textContent = 'Audio notifikasi gagal dimuat. Periksa URL file notif.mp3.';
    });

    function setButtonState() {
        if (icon) icon.textContent = enabled ? '🔔' : '🔕';
        if (label) label.textContent = enabled ? 'Suara Aktif' : 'Aktifkan Suara';
        if (!icon || !label) button.textContent = enabled ? '🔔 Suara Aktif' : '🔕 Aktifkan Suara';
        button.setAttribute('aria-pressed', String(enabled));
    }

    window.playNotificationSound = function () {
        if (!enabled) return;
        try {
            sound.currentTime = 0;
            sound.play().catch((error) => {
                console.error('Notification sound could not be played.', error);
                if (status) status.textContent = 'Audio notifikasi gagal diputar.';
            });
        } catch (error) {
            console.error('Notification sound could not be played.', error);
            if (status) status.textContent = 'Audio notifikasi gagal diputar.';
        }
    };

    button.addEventListener('click', async () => {
        if (enabled) {
            enabled = false;
            sound.pause();
            sound.currentTime = 0;
            setButtonState();
            if (status) status.textContent = 'Notifikasi suara dimatikan.';
            return;
        }

        sound.currentTime = 0;
        try {
            await sound.play();
            sound.pause();
            sound.currentTime = 0;
            enabled = true;
            setButtonState();
            if (status) status.textContent = 'Notifikasi suara aktif.';
        } catch (error) {
            console.error('Notification sound could not be enabled.', error);
            if (status) status.textContent = 'Audio belum dapat diaktifkan. Periksa koneksi dan coba lagi.';
        }
    });

    setButtonState();
})();
