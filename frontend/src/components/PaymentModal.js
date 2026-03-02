import React, { useState, useEffect, useCallback } from 'react';
import { createCheckout, verifyPayment, demoUpgrade, updateStoredUser } from '../services/api';
import '../styles/Payment.css';

function PaymentModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStep, setPaymentStep] = useState('info'); // info, processing, success

  const handlePaymentVerification = useCallback(async (orderId) => {
    try {
      setPaymentStep('processing');
      const verifyData = await verifyPayment({ orderId });

      if (verifyData.status) {
        updateStoredUser(verifyData.user);
        if (verifyData.token) {
          localStorage.setItem('token', verifyData.token);
        }
        setPaymentStep('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError('Payment verification failed. Please contact support.');
        setPaymentStep('info');
      }
    } catch (err) {
      setError('Payment verification failed: ' + err.message);
      setPaymentStep('info');
    }
  }, [onSuccess]);

  // Check if returning from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderId = urlParams.get('order_id');

    if (paymentStatus === 'success' && orderId) {
      handlePaymentVerification(orderId);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handlePaymentVerification]);

  const handleLemonSqueezyPayment = async () => {
    try {
      setLoading(true);
      setError('');

      // Create checkout session
      const checkoutData = await createCheckout();

      if (checkoutData.useDemo) {
        setError('Lemon Squeezy not configured. Use Demo Upgrade for testing.');
        setLoading(false);
        return;
      }

      // Redirect to Lemon Squeezy checkout
      window.location.href = checkoutData.checkoutUrl;
    } catch (err) {
      setError('Failed to initiate payment: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleDemoUpgrade = async () => {
    try {
      setLoading(true);
      setError('');
      setPaymentStep('processing');

      const result = await demoUpgrade();
      
      if (result.status) {
        updateStoredUser(result.user);
        setPaymentStep('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError('Upgrade failed: ' + err.message);
      setPaymentStep('info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="payment-modal-header">
          <h3>Unlock Premium Features</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="payment-modal-content">
          {paymentStep === 'info' && (
            <>
              <div className="premium-features">
                <h4>Premium Plan Includes:</h4>
                <ul>
                  <li>
                    <span className="check-icon">✓</span>
                    Push code directly to GitHub
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Connect multiple repositories
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Extended execution time (120s)
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Higher memory limits (512MB)
                  </li>
                  <li>
                    <span className="check-icon">✓</span>
                    Unlimited file storage
                  </li>
                </ul>
              </div>

              <div className="price-section">
                <div className="price">
                  <span className="currency">₹</span>
                  <span className="amount">1</span>
                  <span className="period">one-time</span>
                </div>
                <p className="price-note">Unlock all premium features forever!</p>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="payment-buttons">
                <button 
                  className="btn btn-primary btn-pay"
                  onClick={handleLemonSqueezyPayment}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Pay ₹1 with Lemon Squeezy'}
                </button>
                
                <button 
                  className="btn btn-demo"
                  onClick={handleDemoUpgrade}
                  disabled={loading}
                >
                  Demo Upgrade (Skip Payment)
                </button>
              </div>

              <p className="secure-note">
                <span className="lock-icon">🔒</span>
                Secure payment via Lemon Squeezy
              </p>
            </>
          )}

          {paymentStep === 'processing' && (
            <div className="processing-section">
              <div className="spinner"></div>
              <p>Processing your payment...</p>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="success-section">
              <div className="success-icon">✓</div>
              <h4>Payment Successful!</h4>
              <p>You now have access to all premium features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
