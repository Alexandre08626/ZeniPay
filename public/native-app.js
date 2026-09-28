/* Pont natif Zeniva — à servir par chaque site sous /native-app.js et à charger
 * dans toutes les pages : <script src="/native-app.js" defer></script>
 * Ne fait rien dans un navigateur normal : s'active uniquement dans l'app iOS/Android.
 * Options (avant le script) : window.ZENIVA_APP = { name: 'ZeniPay', accent: '#2563EB', push: false }
 */
(function () {
  var Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  var P = Cap.Plugins || {};
  var cfg = Object.assign({ name: 'Zeniva', accent: '#7C3AED', push: false }, window.ZENIVA_APP || {});
  var LOCK_KEY = 'zeniva.biometricLock';
  var RELOCK_MS = 5 * 60 * 1000; // re-verrouille après 5 min en arrière-plan
  var hiddenAt = 0;

  document.documentElement.classList.add('native-app', 'native-' + Cap.getPlatform());

  function pref(key) {
    return P.Preferences ? P.Preferences.get({ key: key }).then(function (r) { return r.value; }) : Promise.resolve(null);
  }
  function setPref(key, value) {
    return P.Preferences ? P.Preferences.set({ key: key, value: String(value) }) : Promise.resolve();
  }

  /* ---------- Verrou Face ID / empreinte ---------- */
  var Bio = P.BiometricAuthNative || P.BiometricAuth;
  var overlay;
  function showLock() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(10,10,16,.96);color:#fff;font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:24px');
    overlay.innerHTML = '<div style="font-size:20px;font-weight:600">' + cfg.name + ' est verrouillé</div>' +
      '<button type="button" style="font:inherit;font-weight:600;border:0;border-radius:12px;padding:12px 28px;background:' + cfg.accent + ';color:#fff">Déverrouiller</button>';
    overlay.querySelector('button').addEventListener('click', unlock);
    document.body.appendChild(overlay);
  }
  function hideLock() { if (overlay) { overlay.remove(); overlay = null; } }
  function bioAuth(reason) {
    if (!Bio) return Promise.resolve();
    return Bio.internalAuthenticate({
      reason: reason, cancelTitle: 'Annuler', allowDeviceCredential: true,
      iosFallbackTitle: 'Utiliser le code', androidTitle: cfg.name, androidSubtitle: reason
    });
  }
  function unlock() {
    return bioAuth('Déverrouiller ' + cfg.name).then(hideLock, function () { /* reste verrouillé */ });
  }
  function lockIfEnabled() {
    return pref(LOCK_KEY).then(function (on) { if (on === '1') { showLock(); unlock(); } });
  }

  // API publique pour une page Réglages du site : ZenivaNative.setBiometricLock(true)
  window.ZenivaNative = {
    platform: Cap.getPlatform(),
    biometricAvailable: function () {
      return Bio ? Bio.checkBiometry().then(function (r) { return !!r.isAvailable; }) : Promise.resolve(false);
    },
    getBiometricLock: function () { return pref(LOCK_KEY).then(function (v) { return v === '1'; }); },
    setBiometricLock: function (on) {
      if (!on) return setPref(LOCK_KEY, '0');
      return bioAuth('Activer le verrou ' + cfg.name)
        .then(function () { return setPref(LOCK_KEY, '1'); });
    },
    haptic: function (style) { if (P.Haptics) P.Haptics.impact({ style: style || 'LIGHT' }); },
    share: function (opts) { return P.Share ? P.Share.share(opts) : Promise.reject(new Error('share indisponible')); },
    registerPush: registerPush
  };

  /* ---------- Cycle de vie ---------- */
  if (P.App) {
    P.App.addListener('appStateChange', function (s) {
      if (!s.isActive) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > RELOCK_MS) lockIfEnabled();
    });
    // Bouton retour Android : page précédente, sinon quitter l'app
    P.App.addListener('backButton', function (e) {
      if (overlay) return;
      if (e.canGoBack) history.back(); else P.App.exitApp();
    });
  }
  if (!sessionStorage.getItem('zeniva.unlocked')) {
    sessionStorage.setItem('zeniva.unlocked', '1');
    lockIfEnabled();
  }

  /* ---------- Proposition unique d'activer le verrou ---------- */
  function offerLock() {
    pref(LOCK_KEY).then(function (v) {
      if (v !== null || !Bio) return;
      Bio.checkBiometry().then(function (r) {
        if (!r.isAvailable) return;
        var label = Cap.getPlatform() === 'ios' ? 'Face ID' : 'l\'empreinte';
        var bar = document.createElement('div');
        bar.setAttribute('style', 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483646;display:flex;align-items:center;gap:10px;padding:14px;border-radius:14px;background:#111827;color:#fff;font:14px -apple-system,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)');
        bar.innerHTML = '<span style="flex:1">Protéger ' + cfg.name + ' avec ' + label + ' ?</span>' +
          '<button type="button" data-a="no" style="font:inherit;border:0;background:none;color:#9CA3AF;padding:8px">Plus tard</button>' +
          '<button type="button" data-a="yes" style="font:inherit;font-weight:600;border:0;border-radius:10px;padding:8px 14px;background:' + cfg.accent + ';color:#fff">Activer</button>';
        bar.addEventListener('click', function (e) {
          var a = e.target.getAttribute && e.target.getAttribute('data-a');
          if (!a) return;
          bar.remove();
          if (a === 'yes') window.ZenivaNative.setBiometricLock(true).catch(function () {});
          else setPref(LOCK_KEY, '0');
        });
        document.body.appendChild(bar);
      });
    });
  }
  setTimeout(offerLock, 4000);

  /* ---------- Retour haptique léger sur les boutons ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('button, [role="button"], .btn');
    if (el && P.Haptics) P.Haptics.impact({ style: 'LIGHT' });
  }, { passive: true, capture: true });

  /* ---------- Notifications push ----------
   * Désactivé tant que Firebase (Android) / APNs (iOS) n'est pas configuré :
   * sur Android, register() sans google-services.json fait planter l'app.
   * Le jeton est envoyé à POST /api/native/push-token (à créer côté site).
   */
  function registerPush() {
    var Push = P.PushNotifications;
    if (!Push) return Promise.resolve(null);
    return Push.requestPermissions().then(function (r) {
      if (r.receive !== 'granted') return null;
      return new Promise(function (resolve) {
        Push.addListener('registration', function (t) {
          fetch('/api/native/push-token', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: t.value, platform: Cap.getPlatform() })
          }).catch(function () {});
          resolve(t.value);
        });
        Push.addListener('registrationError', function () { resolve(null); });
        Push.addListener('pushNotificationActionPerformed', function (a) {
          var url = a.notification && a.notification.data && a.notification.data.url;
          if (url && url.charAt(0) === '/') location.href = url;
        });
        Push.register();
      });
    });
  }
  if (cfg.push) registerPush();
})();
