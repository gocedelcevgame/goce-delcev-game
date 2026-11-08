// WPA preview distribution - songs included for owner licensing review; no checkout or ads.
window.GAME_EDITION = window.GAME_EDITION || {
  "id": "public-playtest",
  "fullUnlock": true,
  "shop": false,
  "share": false,
  "songs": true,
  "ads": false,
  "pwa": true,
  "gameId": ""
};

(function () {
  'use strict';
  const E = window.GAME_EDITION;
  const css = document.createElement('style');
  css.textContent =
    (E.shop ? '' : '[data-ed="shop"]{display:none!important}') +
    (E.share ? '' : '[data-ed="share"]{display:none!important}') +
    (E.songs ? '' : '[data-song-btn],[data-ed="song"]{display:none!important}') +
    (E.fullUnlock ? '' : '[data-ed="full"]{display:none!important}');
  document.head.appendChild(css);

  // ---------- GameMonetize ----------
  let lastAd = 0;
  const AD_MIN_GAP_MS = 90 * 1000;   // најмногу една реклама на 90 секунди
  // Следното ниво тргнува дури по рекламата (или ако реклама не дојде за 2.5 с)
  let pending = null, adShowing = false, waitTimer = null;
  function runPending() {
    clearTimeout(waitTimer);
    const fn = pending; pending = null; adShowing = false;
    if (typeof fn === 'function') fn();
  }
  document.addEventListener('edition-ad', e => {
    if (e.detail === 'pause') {
      adShowing = true; clearTimeout(waitTimer);
      waitTimer = setTimeout(runPending, 60000);   // заштита ако SDK не јави крај
    } else if (e.detail === 'resume') {
      runPending();
    }
  });
  window.EditionAds = {
    // повикај меѓу нивоата; секогаш продолжува со играта
    between(next) {
      const now = Date.now();
      if (E.ads && typeof window.sdk !== 'undefined' && sdk.showBanner && now - lastAd > AD_MIN_GAP_MS && !pending) {
        lastAd = now;
        pending = next;
        waitTimer = setTimeout(() => { if (!adShowing) runPending(); }, 2500);
        try { sdk.showBanner(); } catch (e) { runPending(); }
        return;
      }
      if (typeof next === 'function') next();
    }
  };
  if (E.ads && E.gameId && !E.gameId.includes("YOUR_")) {
    window.SDK_OPTIONS = {
      gameId: E.gameId,
      onEvent: function (event) {
        if (event.name === 'SDK_GAME_PAUSE') document.dispatchEvent(new CustomEvent('edition-ad', { detail: 'pause' }));
        if (event.name === 'SDK_GAME_START') document.dispatchEvent(new CustomEvent('edition-ad', { detail: 'resume' }));
      }
    };
    (function (d, s, id) {
      if (d.getElementById(id)) return;
      const js = d.createElement(s); js.id = id; js.src = 'https://api.gamemonetize.com/sdk.js';
      d.head.appendChild(js);
    })(document, 'script', 'gamemonetize-sdk');
  }
})();
