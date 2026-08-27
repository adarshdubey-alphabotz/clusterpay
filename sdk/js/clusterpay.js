/**
 * ⚡ ClusterPay JavaScript & In-App Checkout SDK (v2.1.0)
 * Ultra-secure, lightweight, non-custodial crypto checkout modal & iframe manager.
 * Supports Web Apps, Mobile WebViews, Telegram Mini Apps, and Desktop browsers.
 */
(function(window) {
  'use strict';

  var ClusterPay = function(config) {
    config = config || {};
    var defaultBaseUrl = window.location.origin;
    var baseUrl = (config.baseUrl || defaultBaseUrl).replace(/\/+$/, '');

    /**
     * Internal helper to attach cross-window message listeners safely
     */
    function setupEventListener(sessionId, options, onCleanUp) {
      function messageHandler(event) {
        // Enforce strict origin validation
        if (event.origin !== baseUrl && !event.origin.includes('rapidx.me') && !event.origin.includes('clusterpay')) {
          return;
        }

        var data = event.data;
        if (!data || typeof data !== 'object') return;

        // Verify session matching
        if (data.session_id && data.session_id !== sessionId) return;

        switch (data.type) {
          case 'CLUSTERPAY_SUCCESS':
          case 'clusterpay:success':
            if (typeof options.onSuccess === 'function') {
              options.onSuccess(data.payload || data);
            }
            break;

          case 'CLUSTERPAY_EXPIRED':
          case 'clusterpay:expired':
            if (typeof options.onExpire === 'function') {
              options.onExpire(data.payload || data);
            }
            break;

          case 'CLUSTERPAY_ERROR':
          case 'clusterpay:error':
            if (typeof options.onError === 'function') {
              options.onError(data.payload || data);
            }
            break;

          case 'CLUSTERPAY_CLOSE':
          case 'clusterpay:close':
            if (typeof options.onClose === 'function') {
              options.onClose();
            }
            if (typeof onCleanUp === 'function') {
              onCleanUp();
            }
            break;

          case 'CLUSTERPAY_RESIZE':
          case 'clusterpay:resize':
            if (data.height && options.iframeElement) {
              options.iframeElement.style.height = Math.min(data.height, window.innerHeight * 0.95) + 'px';
            }
            break;
        }
      }

      window.addEventListener('message', messageHandler);
      return function remove() {
        window.removeEventListener('message', messageHandler);
      };
    }

    return {
      version: '2.1.0',
      baseUrl: baseUrl,

      /**
       * 1. Inline Mount: Embeds checkout directly inside a specified container element
       */
      mount: function(selector, options) {
        options = options || {};
        var container = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!container) {
          console.error('[ClusterPay] Mount container not found:', selector);
          return null;
        }

        var sessionId = options.session_id;
        if (!sessionId) {
          console.error('[ClusterPay] session_id is required for checkout mount');
          return null;
        }

        var height = options.height || 680;
        var paymentUrl = baseUrl + '/gateway/pay/' + encodeURIComponent(sessionId) + '?embed=true';

        var iframe = document.createElement('iframe');
        iframe.src = paymentUrl;
        iframe.style.width = '100%';
        iframe.style.height = height + 'px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = options.borderRadius || '16px';
        iframe.style.boxShadow = options.boxShadow || '0 12px 36px rgba(0, 0, 0, 0.35)';
        iframe.setAttribute('allow', 'payment; clipboard-write');
        iframe.setAttribute('title', 'ClusterPay Secure Checkout');
        iframe.id = 'clusterpay-iframe-' + sessionId;

        options.iframeElement = iframe;
        container.innerHTML = '';
        container.appendChild(iframe);

        var cleanup = setupEventListener(sessionId, options, function() {
          if (container.contains(iframe)) {
            container.removeChild(iframe);
          }
        });

        return {
          iframe: iframe,
          destroy: function() {
            cleanup();
            if (container.contains(iframe)) container.removeChild(iframe);
          }
        };
      },

      /**
       * 2. In-App Overlay Modal: Opens a responsive glassmorphism popup modal
       * Perfect for Mobile WebViews, Desktop checkouts, and single-page apps.
       */
      openModal: function(options) {
        options = options || {};
        var sessionId = options.session_id;
        if (!sessionId) {
          console.error('[ClusterPay] session_id is required to open checkout modal');
          return null;
        }

        // Create Backdrop
        var overlay = document.createElement('div');
        overlay.id = 'clusterpay-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        overlay.style.backdropFilter = 'blur(8px)';
        overlay.style.webkitBackdropFilter = 'blur(8px)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '16px';
        overlay.style.boxSizing = 'border-box';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s ease';

        // Modal Content Wrap
        var modalContent = document.createElement('div');
        modalContent.style.position = 'relative';
        modalContent.style.width = '100%';
        modalContent.style.maxWidth = options.maxWidth || '440px';
        modalContent.style.height = options.height || '720px';
        modalContent.style.maxHeight = '92vh';
        modalContent.style.background = '#0b0f19';
        modalContent.style.borderRadius = '20px';
        modalContent.style.overflow = 'hidden';
        modalContent.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.6)';
        modalContent.style.transform = 'scale(0.95)';
        modalContent.style.transition = 'transform 0.25s ease';

        // Close Button
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '12px';
        closeBtn.style.right = '12px';
        closeBtn.style.width = '32px';
        closeBtn.style.height = '32px';
        closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.color = '#fff';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '10';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';

        // Checkout Iframe
        var paymentUrl = baseUrl + '/gateway/pay/' + encodeURIComponent(sessionId) + '?embed=true';
        var iframe = document.createElement('iframe');
        iframe.src = paymentUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allow', 'payment; clipboard-write');
        iframe.setAttribute('title', 'ClusterPay In-App Checkout');

        modalContent.appendChild(closeBtn);
        modalContent.appendChild(iframe);
        overlay.appendChild(modalContent);
        document.body.appendChild(overlay);

        // Animate open
        requestAnimationFrame(function() {
          overlay.style.opacity = '1';
          modalContent.style.transform = 'scale(1)';
        });

        function closeModal() {
          overlay.style.opacity = '0';
          modalContent.style.transform = 'scale(0.95)';
          setTimeout(function() {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
          }, 250);
          if (typeof options.onClose === 'function') options.onClose();
        }

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', function(e) {
          if (e.target === overlay) closeModal();
        });

        // ESC key listener
        function keyHandler(e) {
          if (e.key === 'Escape') {
            closeModal();
            window.removeEventListener('keydown', keyHandler);
          }
        }
        window.addEventListener('keydown', keyHandler);

        options.iframeElement = iframe;
        var removeListener = setupEventListener(sessionId, options, closeModal);

        return {
          close: closeModal,
          destroy: function() {
            removeListener();
            closeModal();
          }
        };
      },

      /**
       * 3. Telegram Mini App / WebApp Checkout Helper
       * Detects window.Telegram.WebApp and adapts viewport/haptic feedback
       */
      openInTelegram: function(options) {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.expand();
          if (window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
          }
        }
        return this.openModal(options);
      }
    };
  };

  // Export to window and CommonJS / ES Modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClusterPay;
  } else {
    window.ClusterPay = ClusterPay;
  }
})(typeof window !== 'undefined' ? window : this);
