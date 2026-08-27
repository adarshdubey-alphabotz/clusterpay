/**
 * ClusterPay JavaScript SDK (v2.0)
 * 1-Line Embedded Modal and Checkout Integration
 */
(function(window) {
  window.ClusterPay = function(config) {
    var defaultBaseUrl = window.location.origin;
    var baseUrl = (config && config.baseUrl) || defaultBaseUrl;

    return {
      /**
       * Mounts the checkout iframe into a specified container selector
       */
      mount: function(selector, options) {
        options = options || {};
        var container = document.querySelector(selector);
        if (!container) {
          console.error('[ClusterPay] Mount container not found:', selector);
          return;
        }

        var sessionId = options.session_id;
        if (!sessionId) {
          console.error('[ClusterPay] session_id is required');
          return;
        }

        var height = options.height || 650;
        var paymentUrl = baseUrl + '/gateway/pay/' + encodeURIComponent(sessionId) + '?embed=true';

        var iframe = document.createElement('iframe');
        iframe.src = paymentUrl;
        iframe.style.width = '100%';
        iframe.style.height = height + 'px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '16px';
        iframe.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.35)';
        iframe.setAttribute('allow', 'payment');
        iframe.setAttribute('title', 'ClusterPay Secure Checkout');

        container.innerHTML = '';
        container.appendChild(iframe);

        // Cross-window event listener for payment triggers
        window.addEventListener('message', function(event) {
          if (event.origin !== baseUrl && !event.origin.includes('rapidx.me')) {
            return;
          }
          if (event.data && event.data.type === 'CLUSTERPAY_SUCCESS') {
            if (typeof options.onSuccess === 'function') {
              options.onSuccess(event.data.payload);
            }
          }
          if (event.data && event.data.type === 'CLUSTERPAY_EXPIRED') {
            if (typeof options.onExpire === 'function') {
              options.onExpire(event.data.payload);
            }
          }
        });
      }
    };
  };
})(window);
