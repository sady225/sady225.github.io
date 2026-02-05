/**
 * 沖縄子育て支援ポータル - ポイント・エラー報告システム
 */

const PointSystem = {
  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
    this.loadUserPoints();
  },

  /**
   * ユーザーのポイント残高を表示
   */
  async loadUserPoints() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const result = await API.request('getPoints', {userId});

      if (!result.error) {
        this.updatePointDisplay(result.points);
      }
    } catch (error) {
      console.error('Failed to load points:', error);
    }
  },

  /**
   * ポイント表示を更新
   */
  updatePointDisplay(points) {
    const displays = document.querySelectorAll('.user-points');
    displays.forEach(el => {
      el.innerHTML = `<i class="bi bi-coin"></i> ${points} pt`;
    });

    // ヘッダーにポイントバッジを追加
    const userArea = document.getElementById('userArea');
    if (userArea && !userArea.querySelector('.user-points')) {
      const pointBadge = document.createElement('span');
      pointBadge.className = 'badge bg-warning text-dark me-2 user-points';
      pointBadge.innerHTML = `<i class="bi bi-coin"></i> ${points} pt`;
      userArea.prepend(pointBadge);
    }
  },

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // エラー報告ボタン
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="report-error"]')) {
        const articleId = e.target.dataset.articleId;
        this.showReportModal(articleId);
      }
    });

    // ポイント解除ボタン
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="unlock-with-points"]')) {
        const articleId = e.target.dataset.articleId;
        this.unlockWithPoints(articleId);
      }
    });

    // 広告視聴解除ボタン
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="unlock-with-ad"]')) {
        const articleId = e.target.dataset.articleId;
        this.unlockWithAd(articleId);
      }
    });

    // 報告フォーム送信
    const reportForm = document.getElementById('errorReportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitReport();
      });
    }
  },

  /**
   * エラー報告モーダルを表示
   */
  async showReportModal(articleId) {
    // モーダルがなければ作成
    let modal = document.getElementById('errorReportModal');
    if (!modal) {
      modal = this.createReportModal();
      document.body.appendChild(modal);
    }

    // 記事IDを設定
    document.getElementById('reportArticleId').value = articleId;

    // 報告種別を読み込み
    await this.loadReportTypes();

    // モーダルを表示
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  },

  /**
   * 報告モーダルを作成
   */
  createReportModal() {
    const modal = document.createElement('div');
    modal.id = 'errorReportModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="bi bi-flag"></i> 情報の誤りを報告する</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="bi bi-gift"></i> 報告が承認されると<strong>ポイント</strong>がもらえます！
              ポイントは有料記事の閲覧に使用できます。
            </div>
            <form id="errorReportForm">
              <input type="hidden" id="reportArticleId">

              <div class="mb-3">
                <label class="form-label">報告の種類 <span class="text-danger">*</span></label>
                <select id="reportType" class="form-select" required>
                  <option value="">選択してください</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">どこが間違っていますか？ <span class="text-danger">*</span></label>
                <textarea id="reportContent" class="form-control" rows="3"
                  placeholder="例：記載されている支給額が2023年の情報のままです" required></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">正しい情報（わかる場合）</label>
                <textarea id="correctInfo" class="form-control" rows="3"
                  placeholder="例：2024年4月より月額15,000円に改定されています"></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">参考URL（あれば）</label>
                <input type="url" id="evidenceUrl" class="form-control"
                  placeholder="https://...">
                <small class="text-muted">公式サイトのURLなど、情報の根拠となるページ</small>
              </div>

              <div class="d-grid">
                <button type="submit" class="btn btn-danger">
                  <i class="bi bi-send"></i> 報告を送信
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    return modal;
  },

  /**
   * 報告種別を読み込み
   */
  async loadReportTypes() {
    try {
      const types = await API.request('reportTypes');
      const select = document.getElementById('reportType');

      if (select && Array.isArray(types)) {
        select.innerHTML = '<option value="">選択してください</option>';
        types.forEach(type => {
          const option = document.createElement('option');
          option.value = type.name;
          option.textContent = `${type.name} - ${type.description}`;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Failed to load report types:', error);
    }
  },

  /**
   * エラー報告を送信
   */
  async submitReport() {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      alert('報告するにはログインが必要です');
      return;
    }

    const data = {
      userId: userId,
      articleId: document.getElementById('reportArticleId').value,
      reportType: document.getElementById('reportType').value,
      reportContent: document.getElementById('reportContent').value,
      correctInfo: document.getElementById('correctInfo').value,
      evidenceUrl: document.getElementById('evidenceUrl').value
    };

    try {
      const result = await API.post('submitReport', data);

      if (result.success) {
        alert('報告を受け付けました。審査後にポイントが付与されます。');

        // モーダルを閉じる
        const modal = bootstrap.Modal.getInstance(document.getElementById('errorReportModal'));
        if (modal) modal.hide();

        // フォームをリセット
        document.getElementById('errorReportForm').reset();
      } else {
        alert('エラー: ' + (result.error || '送信に失敗しました'));
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('送信に失敗しました。しばらくしてからお試しください。');
    }
  },

  /**
   * ポイントで記事を解除
   */
  async unlockWithPoints(articleId) {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      alert('ログインが必要です');
      return;
    }

    const requiredPoints = parseInt(CONFIG.POINT_TO_UNLOCK) || 5;

    if (!confirm(`${requiredPoints}ポイントを使用して記事を解除しますか？`)) {
      return;
    }

    try {
      const result = await API.post('unlockWithPoints', {userId, articleId});

      if (result.success) {
        alert(`記事を解除しました！残りポイント: ${result.remainingPoints}pt`);
        window.location.reload();
      } else {
        if (result.error === 'ポイントが不足しています') {
          alert(`ポイントが不足しています。\n現在: ${result.currentPoints}pt / 必要: ${result.required}pt`);
        } else {
          alert('エラー: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Failed to unlock with points:', error);
      alert('解除に失敗しました');
    }
  },

  /**
   * 広告視聴で記事を解除
   */
  async unlockWithAd(articleId) {
    const userId = localStorage.getItem('userId') || 'anonymous';

    // 広告表示（実際の実装では広告SDKを使用）
    const adViewed = await this.showRewardedAd();

    if (!adViewed) {
      return;
    }

    try {
      const result = await API.post('unlockWithAd', {
        userId,
        articleId,
        adType: 'rewarded'
      });

      if (result.success) {
        alert(`記事を解除しました！\n有効期限: ${result.validHours}時間`);
        window.location.reload();
      } else {
        alert('エラー: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to unlock with ad:', error);
      alert('解除に失敗しました');
    }
  },

  /**
   * リワード広告を表示（デモ用）
   */
  showRewardedAd() {
    return new Promise((resolve) => {
      // 実際の実装では Google AdMob や AdSense のリワード広告を使用
      // ここではデモ用のモーダルを表示

      let adModal = document.getElementById('adViewModal');
      if (!adModal) {
        adModal = document.createElement('div');
        adModal.id = 'adViewModal';
        adModal.className = 'modal fade';
        adModal.innerHTML = `
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-info text-white">
                <h5 class="modal-title"><i class="bi bi-play-circle"></i> 広告を視聴</h5>
              </div>
              <div class="modal-body text-center py-5">
                <div id="adCountdown">
                  <p class="mb-3">広告を視聴すると記事が読めます</p>
                  <div class="spinner-border text-primary mb-3" role="status"></div>
                  <p class="h4" id="adTimer">5</p>
                  <p class="text-muted">秒後にスキップ可能</p>
                </div>
                <div id="adComplete" class="d-none">
                  <i class="bi bi-check-circle text-success" style="font-size: 4rem;"></i>
                  <p class="h5 mt-3">視聴完了！</p>
                  <button class="btn btn-success mt-3" id="adCompleteBtn">記事を読む</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(adModal);
      }

      const modal = new bootstrap.Modal(adModal, {backdrop: 'static', keyboard: false});
      modal.show();

      // カウントダウン
      let seconds = 5;
      const timerEl = document.getElementById('adTimer');
      const countdownEl = document.getElementById('adCountdown');
      const completeEl = document.getElementById('adComplete');

      countdownEl.classList.remove('d-none');
      completeEl.classList.add('d-none');

      const timer = setInterval(() => {
        seconds--;
        timerEl.textContent = seconds;

        if (seconds <= 0) {
          clearInterval(timer);
          countdownEl.classList.add('d-none');
          completeEl.classList.remove('d-none');
        }
      }, 1000);

      // 完了ボタン
      document.getElementById('adCompleteBtn').onclick = () => {
        modal.hide();
        resolve(true);
      };

      // モーダルが閉じられた場合
      adModal.addEventListener('hidden.bs.modal', () => {
        if (seconds > 0) {
          clearInterval(timer);
          resolve(false);
        }
      }, {once: true});
    });
  },

  /**
   * 解除オプションを表示するHTML生成
   */
  renderUnlockOptions(articleId, unlockStatus) {
    if (unlockStatus.unlocked) {
      return ''; // すでに解除済み
    }

    const methods = unlockStatus.methods;
    const userPoints = parseInt(localStorage.getItem('userPoints')) || 0;
    const hasEnoughPoints = userPoints >= methods.points.required;

    return `
      <div class="unlock-options mt-4 p-4 bg-light rounded">
        <h5 class="text-center mb-4"><i class="bi bi-unlock"></i> 続きを読むには</h5>

        <div class="row g-3">
          <!-- 月額会員 -->
          <div class="col-md-4">
            <div class="card h-100 border-primary">
              <div class="card-body text-center">
                <i class="bi bi-star-fill text-primary" style="font-size: 2rem;"></i>
                <h6 class="mt-2">月額会員</h6>
                <p class="h4 text-primary">¥${methods.subscription.price}/月</p>
                <p class="small text-muted">${methods.subscription.description}</p>
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
                <p class="h4">${methods.points.required} pt</p>
                <p class="small text-muted">
                  ${methods.points.description}<br>
                  <span class="user-points">現在: ${userPoints} pt</span>
                </p>
                <button class="btn ${hasEnoughPoints ? 'btn-warning' : 'btn-outline-secondary'} w-100"
                  data-action="unlock-with-points" data-article-id="${articleId}"
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
                <p class="h4">${methods.adView.duration}時間</p>
                <p class="small text-muted">${methods.adView.description}</p>
                <button class="btn btn-info w-100 text-white"
                  data-action="unlock-with-ad" data-article-id="${articleId}">
                  <i class="bi bi-play-fill"></i> 広告を見る
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-4">
          <p class="text-muted small">
            <i class="bi bi-lightbulb"></i>
            <strong>ヒント:</strong> 情報の誤りを報告するとポイントがもらえます！
            <a href="#" data-action="report-error" data-article-id="${articleId}">報告する</a>
          </p>
        </div>
      </div>
    `;
  }
};

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  PointSystem.init();
});
