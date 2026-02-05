/**
 * 沖縄子育て支援ポータル - メインアプリケーション
 */

document.addEventListener('DOMContentLoaded', function() {
  App.init();
});

const App = {
  user: null,
  isPremium: false,

  /**
   * 初期化
   */
  async init() {
    // ユーザー状態の復元
    this.restoreUserState();

    // 市町村リストの読み込み
    await this.loadCities();

    // ページ固有の初期化
    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/' || path === '') {
      await this.initHomePage();
    } else if (path.includes('search.html')) {
      await this.initSearchPage();
    } else if (path.includes('detail.html')) {
      await this.initDetailPage();
    }

    // イベントリスナーの設定
    this.setupEventListeners();

    // スクロールトップボタン
    this.setupScrollTop();
  },

  /**
   * ユーザー状態の復元
   */
  restoreUserState() {
    const token = localStorage.getItem('userToken');
    const userId = localStorage.getItem('userId');
    const memberType = localStorage.getItem('memberType');

    if (token && userId) {
      this.user = { id: userId, token, memberType };
      this.isPremium = memberType === '有料会員';
      this.updateUserUI();
    }
  },

  /**
   * ユーザーUI更新
   */
  updateUserUI() {
    const userArea = document.getElementById('userArea');
    if (!userArea) return;

    if (this.user) {
      userArea.innerHTML = `
        <span class="text-light me-2">
          ${this.isPremium ? '<i class="bi bi-star-fill text-warning"></i>' : ''}
          ${this.user.nickname || 'ユーザー'}
        </span>
        <a href="#" onclick="App.logout()" class="btn btn-outline-light btn-sm">
          <i class="bi bi-box-arrow-right"></i>
        </a>
      `;

      // 有料会員は広告非表示
      if (this.isPremium) {
        document.querySelectorAll('.ad-area').forEach(el => el.classList.add('hidden-for-premium'));
      }
    }
  },

  /**
   * ログアウト
   */
  logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('memberType');
    this.user = null;
    this.isPremium = false;
    window.location.reload();
  },

  /**
   * 市町村リスト読み込み
   */
  async loadCities() {
    try {
      const cities = await API.getCities();
      const select = document.getElementById('searchCity');

      if (select && Array.isArray(cities)) {
        cities.forEach(city => {
          const option = document.createElement('option');
          option.value = city;
          option.textContent = city;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  },

  /**
   * ホームページ初期化
   */
  async initHomePage() {
    await this.loadLatestItems();
  },

  /**
   * 新着情報の読み込み
   */
  async loadLatestItems() {
    const container = document.getElementById('latestItems');
    if (!container) return;

    try {
      const result = await API.getItems({ limit: 6 });

      if (result.items && result.items.length > 0) {
        container.innerHTML = result.items.map(item => this.renderItemCard(item)).join('');
      } else {
        container.innerHTML = '<div class="col-12 text-center text-muted">データがありません</div>';
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      container.innerHTML = '<div class="col-12 text-center text-danger">読み込みに失敗しました</div>';
    }
  },

  /**
   * 記事カードのレンダリング
   */
  renderItemCard(item) {
    const categoryClass = CONFIG.CATEGORY_IDS[item.category] || 'other';

    return `
      <div class="col-md-6 col-lg-4 fade-in">
        <div class="card item-card category-${categoryClass} h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-secondary badge-category">${item.category}</span>
              ${item.hasFullContent ? '<span class="badge badge-premium"><i class="bi bi-star-fill"></i></span>' : ''}
            </div>
            <h5 class="card-title">
              <a href="detail.html?id=${item.id}" class="text-decoration-none text-dark stretched-link">
                ${this.escapeHtml(item.title)}
              </a>
            </h5>
            <p class="card-text text-muted small">${this.escapeHtml(item.summary).substring(0, 80)}...</p>
            <div class="mt-auto">
              <small class="text-muted">
                <span class="city-badge">${item.city}</span>
                ${item.amount ? `<span class="ms-2">${item.amount}</span>` : ''}
              </small>
            </div>
          </div>
          <div class="card-footer bg-transparent border-0">
            <small class="text-muted">
              <i class="bi bi-clock"></i> ${item.updatedAt || '-'}
            </small>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 検索ページ初期化
   */
  async initSearchPage() {
    // URLパラメータの解析
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const city = params.get('city');
    const keyword = params.get('keyword');

    // フォームに値を設定
    if (category) {
      const categorySelect = document.getElementById('filterCategory');
      if (categorySelect) categorySelect.value = category;
    }
    if (city) {
      const citySelect = document.getElementById('filterCity');
      if (citySelect) citySelect.value = city;
    }
    if (keyword) {
      const keywordInput = document.getElementById('searchKeyword');
      if (keywordInput) keywordInput.value = keyword;
    }

    // 検索実行
    await this.performSearch({ category, city, keyword });
  },

  /**
   * 検索実行
   */
  async performSearch(params = {}) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;

    try {
      const result = params.keyword
        ? await API.search(params)
        : await API.getItems(params);

      if (result.items && result.items.length > 0) {
        let html = `
          <div class="mb-3 text-muted">
            <i class="bi bi-list-ul"></i> ${result.total}件の結果
          </div>
          <div class="row g-4">
        `;
        html += result.items.map(item => this.renderItemCard(item)).join('');
        html += '</div>';

        // ページネーション
        if (result.totalPages > 1) {
          html += this.renderPagination(result.page, result.totalPages);
        }

        resultsContainer.innerHTML = html;
      } else {
        resultsContainer.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="bi bi-search" style="font-size: 3rem;"></i>
            <p class="mt-3">条件に一致する情報が見つかりませんでした</p>
            <a href="search.html" class="btn btn-outline-primary">条件をクリア</a>
          </div>
        `;
      }
    } catch (error) {
      console.error('Search failed:', error);
      resultsContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> 検索に失敗しました
        </div>
      `;
    }
  },

  /**
   * ページネーションのレンダリング
   */
  renderPagination(currentPage, totalPages) {
    let html = '<nav class="mt-4"><ul class="pagination justify-content-center">';

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="App.goToPage(${i})">${i}</a>
        </li>
      `;
    }

    html += '</ul></nav>';
    return html;
  },

  /**
   * ページ移動
   */
  goToPage(page) {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    window.location.search = params.toString();
  },

  /**
   * 詳細ページ初期化
   */
  async initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      this.showError('記事IDが指定されていません');
      return;
    }

    const token = localStorage.getItem('userToken');
    await this.loadItemDetail(id, token);
  },

  /**
   * 記事詳細の読み込み
   */
  async loadItemDetail(id, token) {
    const container = document.getElementById('detailContent');
    if (!container) return;

    try {
      const item = await API.getItemDetail(id, token);

      if (item.error) {
        this.showError(item.error);
        return;
      }

      // タイトル設定
      document.title = `${item.title} | ${CONFIG.SITE_NAME}`;

      // コンテンツレンダリング
      container.innerHTML = this.renderItemDetail(item);

    } catch (error) {
      console.error('Failed to load detail:', error);
      this.showError('読み込みに失敗しました');
    }
  },

  /**
   * 記事詳細のレンダリング
   */
  renderItemDetail(item) {
    let fullContentHtml = '';

    if (item.isPremiumContent && !item.isUnlocked) {
      // 有料コンテンツでロックされている場合
      const userPoints = parseInt(localStorage.getItem('userPoints')) || 0;
      const pointsRequired = CONFIG.POINT_TO_UNLOCK || 5;
      const hasEnoughPoints = userPoints >= pointsRequired;

      fullContentHtml = `
        <div class="premium-blur mt-4">
          <div class="content">
            <p>${item.previewText || '...'}</p>
            <p>続きのコンテンツはここに表示されます。会員登録・ポイント・広告視聴で閲覧できます。</p>
          </div>
          <div class="overlay">
            <i class="bi bi-lock-fill" style="font-size: 3rem; color: #666;"></i>
            <h5 class="mt-3">続きを読むには</h5>
          </div>
        </div>

        <!-- 解除オプション -->
        <div class="unlock-options mt-4 p-4 bg-light rounded">
          <div class="row g-3">
            <!-- 月額会員 -->
            <div class="col-md-4">
              <div class="card h-100 border-primary">
                <div class="card-body text-center">
                  <i class="bi bi-star-fill text-primary" style="font-size: 2rem;"></i>
                  <h6 class="mt-2">月額会員</h6>
                  <p class="h4 text-primary">¥${CONFIG.MONTHLY_PRICE || 500}/月</p>
                  <p class="small text-muted">全記事読み放題<br>広告非表示</p>
                  <button class="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#membershipModal">
                    登録する
                  </button>
                </div>
              </div>
            </div>

            <!-- ポイント解除 -->
            <div class="col-md-4">
              <div class="card h-100 ${hasEnoughPoints ? 'border-warning' : ''}">
                <div class="card-body text-center">
                  <i class="bi bi-coin text-warning" style="font-size: 2rem;"></i>
                  <h6 class="mt-2">ポイントで解除</h6>
                  <p class="h4">${pointsRequired} pt</p>
                  <p class="small text-muted">
                    情報の誤りを報告するとポイントGET!<br>
                    <span class="user-points badge bg-secondary">現在: ${userPoints} pt</span>
                  </p>
                  <button class="btn ${hasEnoughPoints ? 'btn-warning' : 'btn-outline-secondary'} w-100"
                    data-action="unlock-with-points" data-article-id="${item.id}"
                    ${!hasEnoughPoints ? 'disabled' : ''}>
                    ${hasEnoughPoints ? '解除する' : 'ポイント不足'}
                  </button>
                </div>
              </div>
            </div>

            <!-- 広告視聴 -->
            <div class="col-md-4">
              <div class="card h-100 border-info">
                <div class="card-body text-center">
                  <i class="bi bi-play-circle text-info" style="font-size: 2rem;"></i>
                  <h6 class="mt-2">広告を見て解除</h6>
                  <p class="h4">${CONFIG.AD_VIEW_UNLOCK_HOURS || 24}時間</p>
                  <p class="small text-muted">短い広告を見るだけで<br>一時的に閲覧可能</p>
                  <button class="btn btn-info w-100 text-white"
                    data-action="unlock-with-ad" data-article-id="${item.id}">
                    <i class="bi bi-play-fill"></i> 広告を見る
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center mt-4">
            <p class="text-muted small mb-0">
              <i class="bi bi-lightbulb text-warning"></i>
              <strong>ヒント:</strong> 情報の誤りを<a href="#" data-action="report-error" data-article-id="${item.id}">報告</a>すると<strong>${CONFIG.POINT_PER_REPORT || 10}ポイント</strong>もらえます！
            </p>
          </div>
        </div>
      `;
    } else if (item.fullContent) {
      fullContentHtml = `
        <div class="mt-4">
          <h5><i class="bi bi-file-text"></i> 詳細情報</h5>
          <div class="bg-light p-3 rounded">
            ${this.formatContent(item.fullContent)}
          </div>
        </div>
      `;
    }

    return `
      <div class="detail-header mb-4">
        <span class="badge bg-secondary mb-2">${item.category}</span>
        ${item.isPremiumContent ? '<span class="badge badge-premium ms-1"><i class="bi bi-star-fill"></i> 有料記事</span>' : ''}
        <h1 class="h3">${this.escapeHtml(item.title)}</h1>
        <small class="text-muted">
          <i class="bi bi-clock"></i> 更新日: ${item.updatedAt || '-'}
        </small>
      </div>

      <div class="detail-content">
        <div class="info-box">
          <strong><i class="bi bi-info-circle"></i> 概要</strong>
          <p class="mb-0 mt-2">${this.escapeHtml(item.summary)}</p>
        </div>

        <div class="row g-3 mt-3">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h6><i class="bi bi-people"></i> 対象者</h6>
                <p class="mb-0">${item.target || '-'}</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h6><i class="bi bi-geo-alt"></i> 対象地域</h6>
                <p class="mb-0"><span class="city-badge">${item.city || '-'}</span></p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h6><i class="bi bi-currency-yen"></i> 金額・内容</h6>
                <p class="mb-0 fw-bold text-primary">${item.amount || '-'}</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h6><i class="bi bi-calendar-event"></i> 締切日</h6>
                <p class="mb-0">${item.deadline || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        ${fullContentHtml}

        ${item.applicationMethod ? `
          <div class="mt-4">
            <h5><i class="bi bi-pencil-square"></i> 申請方法</h5>
            <p>${this.formatContent(item.applicationMethod)}</p>
          </div>
        ` : ''}

        ${item.requiredDocs ? `
          <div class="mt-4">
            <h5><i class="bi bi-file-earmark-text"></i> 必要書類</h5>
            <p>${this.escapeHtml(item.requiredDocs)}</p>
          </div>
        ` : ''}

        ${item.contact ? `
          <div class="mt-4">
            <h5><i class="bi bi-telephone"></i> 問い合わせ先</h5>
            <p>${this.escapeHtml(item.contact)}</p>
          </div>
        ` : ''}

        ${item.url ? `
          <div class="mt-4">
            <a href="${item.url}" target="_blank" rel="noopener" class="btn btn-outline-primary">
              <i class="bi bi-box-arrow-up-right"></i> 公式サイトを見る
            </a>
          </div>
        ` : ''}
      </div>

      <div class="mt-4 text-center">
        <a href="search.html" class="btn btn-secondary">
          <i class="bi bi-arrow-left"></i> 一覧に戻る
        </a>
      </div>
    `;
  },

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // クイック検索フォーム
    const quickSearchForm = document.getElementById('quickSearchForm');
    if (quickSearchForm) {
      quickSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyword = document.getElementById('searchKeyword').value;
        const city = document.getElementById('searchCity').value;
        window.location.href = `search.html?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}`;
      });
    }

    // フィルターフォーム
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
      filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('filterCategory').value;
        const city = document.getElementById('filterCity').value;
        const keyword = document.getElementById('searchKeyword').value;
        this.performSearch({ category, city, keyword });
      });
    }

    // Buy Me a Coffee ボタン
    const bmcBtn = document.getElementById('buyMeCoffeeBtn');
    if (bmcBtn) {
      bmcBtn.href = CONFIG.BUY_ME_COFFEE_URL;
    }
  },

  /**
   * スクロールトップボタン
   */
  setupScrollTop() {
    const btn = document.createElement('button');
    btn.className = 'scroll-top';
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 300);
    });
  },

  /**
   * エラー表示
   */
  showError(message) {
    const container = document.getElementById('detailContent') || document.getElementById('searchResults');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> ${message}
        </div>
      `;
    }
  },

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * コンテンツのフォーマット（改行をbrに変換）
   */
  formatContent(text) {
    if (!text) return '';
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  }
};
