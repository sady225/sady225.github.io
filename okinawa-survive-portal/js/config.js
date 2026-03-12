/**
 * 沖縄子育て支援ポータル - 設定ファイル
 * デプロイ時に実際の値に置き換えてください
 */

const CONFIG = {
  // GAS WebアプリのURL（デプロイ後に設定）
  API_URL: 'https://script.google.com/macros/s/AKfycbw7e0_UZw4X9Zf-02gsQSVVZFtZu3FmGtbcNAjhd_h4p1edBBwk3FGNpxS74t8UhGYB/exec',

  // Stripe公開キー（デプロイ後に設定）
  STRIPE_PUBLIC_KEY: 'pk_test_xxxxxxxxxxxxx',

  // Buy Me a Coffee URL
  BUY_ME_COFFEE_URL: 'https://buymeacoffee.com/asonpj999',

  // サイト設定
  SITE_NAME: '沖縄サバイブポータル',
  ITEMS_PER_PAGE: 20,

  // 月額料金（円）
  MONTHLY_PRICE: 500,

  // 無料プレビュー文字数
  FREE_PREVIEW_LENGTH: 200,

  // ポイントシステム設定
  POINT_PER_REPORT: 10,      // 報告承認時の付与ポイント
  POINT_TO_UNLOCK: 5,        // 記事解除に必要なポイント
  AD_VIEW_UNLOCK_HOURS: 24,  // 広告視聴後の解除時間（時間）

  // カテゴリマッピング
  CATEGORIES: {
    'money': '💰 助成金・給付金',
    'food': '🍚 食料・物資支援',
    'event': '📅 イベント',
    'system': '🏛️ 制度・条例',
    'facility': '🏠 施設・サービス',
    'other': '📋 その他'
  },

  // 逆マッピング
  CATEGORY_IDS: {
    '💰 助成金・給付金': 'money',
    '🍚 食料・物資支援': 'food',
    '📅 イベント': 'event',
    '🏛️ 制度・条例': 'system',
    '🏠 施設・サービス': 'facility',
    '📋 その他': 'other'
  }
};

// 開発環境かどうかの判定
const IS_DEV = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('github.dev');

// 開発環境ではモックデータを使用
if (IS_DEV) {
  console.log('Development mode: Using mock data');
}
