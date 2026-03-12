/**
 * 沖縄子育て支援ポータル - API連携モジュール
 */

const API = {
  /**
   * APIリクエスト
   */
  async request(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    }

    try {
      // CORS対策でJSONP使用
      if (action === 'list' || action === 'detail' || action === 'categories' || action === 'cities' || action === 'search') {
        return await this.jsonpRequest(url.toString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);

      // 開発環境ではモックデータを返す
      if (IS_DEV) {
        return this.getMockData(action, params);
      }

      throw error;
    }
  },

  /**
   * JSONP リクエスト
   */
  jsonpRequest(url) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

      window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      const script = document.createElement('script');
      script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
      script.onerror = function() {
        delete window[callbackName];
        document.body.removeChild(script);

        // 開発環境ではモックデータにフォールバック
        if (IS_DEV) {
          const urlObj = new URL(url);
          const action = urlObj.searchParams.get('action');
          resolve(API.getMockData(action, Object.fromEntries(urlObj.searchParams)));
        } else {
          reject(new Error('JSONP request failed'));
        }
      };

      document.body.appendChild(script);
    });
  },

  /**
   * POSTリクエスト
   */
  async post(action, data) {
    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  },

  /**
   * 記事一覧取得
   */
  async getItems(params = {}) {
    return await this.request('list', params);
  },

  /**
   * 記事詳細取得
   */
  async getItemDetail(id, token = null) {
    return await this.request('detail', { id, token });
  },

  /**
   * カテゴリ一覧取得
   */
  async getCategories() {
    return await this.request('categories');
  },

  /**
   * 市町村一覧取得
   */
  async getCities() {
    return await this.request('cities');
  },

  /**
   * 検索
   */
  async search(params) {
    return await this.request('search', params);
  },

  /**
   * ユーザー登録
   */
  async register(email, nickname) {
    return await this.post('register', { email, nickname });
  },

  /**
   * ログイン
   */
  async login(email, password) {
    return await this.post('login', { email, password });
  },

  /**
   * 会員認証
   */
  async verifyMembership(token) {
    return await this.request('verify', { token });
  },

  /**
   * 投げ銭記録
   */
  async recordDonation(amount, method, message) {
    const userId = localStorage.getItem('userId');
    return await this.post('donate', { amount, method, message, userId });
  },

  /**
   * モックデータ（開発用）
   */
  getMockData(action, params = {}) {
    const mockItems = [
      {
        id: 'S001',
        category: '💰 助成金・給付金',
        subCategory: '児童手当',
        title: '児童手当（沖縄県）',
        summary: '中学校卒業まで（15歳の誕生日後の最初の3月31日まで）の児童を養育している方に支給されます。',
        target: '保護者',
        city: '全市町村',
        amount: '月額10,000円〜15,000円',
        deadline: '-',
        updatedAt: '2024-04-01',
        hasFullContent: true
      },
      {
        id: 'S002',
        category: '🍚 食料・物資支援',
        subCategory: 'フードバンク',
        title: '沖縄フードバンク',
        summary: '経済的に困難な家庭に食料品を無料で提供しています。',
        target: '生活困窮者、ひとり親家庭',
        city: '那覇市、浦添市、宜野湾市',
        amount: '食料品無料提供',
        deadline: '-',
        updatedAt: '2024-04-01',
        hasFullContent: true
      },
      {
        id: 'S003',
        category: '📅 イベント',
        subCategory: '親子教室',
        title: '親子でリトミック教室',
        summary: '音楽に合わせて親子で楽しく体を動かす教室です。',
        target: '0〜3歳児と保護者',
        city: '那覇市',
        amount: '無料',
        deadline: '開催日の1週間前',
        updatedAt: '2024-04-01',
        hasFullContent: true
      }
    ];

    const mockCities = [
      '全市町村', '那覇市', '宜野湾市', '浦添市', '名護市', '糸満市',
      '沖縄市', '豊見城市', 'うるま市', '宮古島市', '南城市'
    ];

    switch (action) {
      case 'list':
        let items = [...mockItems];

        // カテゴリフィルタ
        if (params.category) {
          const catName = CONFIG.CATEGORIES[params.category] || params.category;
          items = items.filter(item => item.category === catName);
        }

        // 市町村フィルタ
        if (params.city) {
          items = items.filter(item =>
            item.city === '全市町村' || item.city.includes(params.city)
          );
        }

        return {
          items: items,
          total: items.length,
          page: 1,
          limit: 20,
          totalPages: 1
        };

      case 'detail':
        const item = mockItems.find(i => i.id === params.id);
        if (item) {
          return {
            ...item,
            fullContent: '【詳細情報】\nこれは有料会員限定のコンテンツです。\n\n・詳細な申請方法\n・必要書類の詳細\n・注意事項\n\n会員登録いただくと全文をお読みいただけます。',
            applicationMethod: '市町村窓口で申請',
            requiredDocs: '出生届、健康保険証、振込先口座情報',
            contact: '各市町村児童福祉課',
            url: 'https://www.pref.okinawa.jp/',
            isPremiumContent: true,
            isUnlocked: false,
            previewText: '【詳細情報】\nこれは有料会員限定の...'
          };
        }
        return { error: 'Item not found' };

      case 'categories':
        return [
          { id: 'money', name: '💰 助成金・給付金', description: '児童手当、医療費助成など' },
          { id: 'food', name: '🍚 食料・物資支援', description: 'フードバンク、子ども食堂など' },
          { id: 'event', name: '📅 イベント', description: 'セミナー、親子教室など' },
          { id: 'system', name: '🏛️ 制度・条例', description: '法的支援制度など' },
          { id: 'facility', name: '🏠 施設・サービス', description: '子育て支援センターなど' },
          { id: 'other', name: '📋 その他', description: '相談窓口など' }
        ];

      case 'cities':
        return mockCities;

      case 'search':
        let searchResults = [...mockItems];
        if (params.keyword) {
          const keyword = params.keyword.toLowerCase();
          searchResults = searchResults.filter(item =>
            item.title.toLowerCase().includes(keyword) ||
            item.summary.toLowerCase().includes(keyword)
          );
        }
        return { items: searchResults, total: searchResults.length };

      default:
        return { error: 'Unknown action' };
    }
  }
};
