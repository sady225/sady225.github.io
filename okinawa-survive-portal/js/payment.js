/**
 * 沖縄サバイブポータル - 決済処理モジュール
 * Stripe + Buy Me a Coffee 連携
 */

const Payment = {
  stripe: null,

  /**
   * 初期化
   */
  init() {
    // Stripe.jsの読み込み
    if (typeof Stripe !== 'undefined' && CONFIG.STRIPE_PUBLIC_KEY) {
      this.stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
    }

    this.setupEventListeners();
  },

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // Stripe購読ボタン
    const subscribeBtn = document.getElementById('stripeSubscribeBtn');
    if (subscribeBtn) {
      subscribeBtn.addEventListener('click', () => this.startSubscription());
    }

    // Stripe単発寄付ボタン
    const oneTimeBtn = document.getElementById('stripeOneTimeBtn');
    if (oneTimeBtn) {
      oneTimeBtn.addEventListener('click', () => this.startOneTimeDonation());
    }

    // Buy Me a Coffee ボタン
    const bmcBtn = document.getElementById('buyMeCoffeeBtn');
    if (bmcBtn) {
      bmcBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openBuyMeCoffee();
      });
    }
  },

  /**
   * Stripe サブスクリプション開始
   */
  async startSubscription() {
    if (!this.stripe) {
      alert('決済システムの初期化中です。しばらくお待ちください。');
      return;
    }

    try {
      // GASのAPIを呼び出してStripe Checkout Sessionを作成
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createCheckoutSession',
          type: 'subscription',
          priceId: 'price_xxx', // Stripeで設定した価格ID
          successUrl: window.location.origin + '/success.html',
          cancelUrl: window.location.href
        })
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      // Stripe Checkoutにリダイレクト
      const result = await this.stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('決済処理中にエラーが発生しました: ' + error.message);
    }
  },

  /**
   * Stripe 単発寄付
   */
  async startOneTimeDonation() {
    // 金額選択のプロンプト
    const amount = prompt('寄付金額を入力してください（円）', '500');

    if (!amount || isNaN(amount) || parseInt(amount) < 100) {
      alert('100円以上の金額を入力してください');
      return;
    }

    if (!this.stripe) {
      alert('決済システムの初期化中です。しばらくお待ちください。');
      return;
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createCheckoutSession',
          type: 'donation',
          amount: parseInt(amount),
          successUrl: window.location.origin + '/thank-you.html',
          cancelUrl: window.location.href
        })
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      const result = await this.stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Donation error:', error);
      alert('決済処理中にエラーが発生しました: ' + error.message);
    }
  },

  /**
   * Buy Me a Coffee を開く
   */
  openBuyMeCoffee() {
    window.open(CONFIG.BUY_ME_COFFEE_URL, '_blank', 'noopener,noreferrer');

    // 任意: 投げ銭ボタンをクリックしたことを記録
    API.recordDonation(0, 'buymeacoffee', '').catch(console.error);
  },

  /**
   * 支払い成功後の処理
   */
  handlePaymentSuccess(sessionId) {
    // 会員情報の更新
    localStorage.setItem('memberType', '有料会員');
    localStorage.setItem('paymentSessionId', sessionId);

    // ページをリロード
    window.location.reload();
  }
};

// Stripe.js の読み込み
(function loadStripe() {
  if (document.getElementById('stripe-js')) return;

  const script = document.createElement('script');
  script.id = 'stripe-js';
  script.src = 'https://js.stripe.com/v3/';
  script.onload = () => Payment.init();
  document.head.appendChild(script);
})();

// ページ読み込み完了時
document.addEventListener('DOMContentLoaded', () => {
  // Stripeがすでに読み込まれている場合
  if (typeof Stripe !== 'undefined') {
    Payment.init();
  }
});
