/**
 * ブックレット注文フォームのバックエンド処理 (v1.0)
 * 
 * 【設定方法】
 * 1. Google スプレッドシートを新規作成。
 * 2. 拡張機能 > Apps Script を開く。
 * 3. このコードを貼り付ける。
 * 4. 以下の SPREADSHEET_ID を作成したシートのIDに書き換える。
 * 5. 「デプロイ」>「新しいデプロイ」>「ウェブアプリ」として公開。
 *    - 次のユーザーとして実行: 「自分」
 *    - アクセスできるユーザー: 「全員」
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // 実際のスプレッドシートIDを入力
const SHEET_NAME = '受注リスト';
const ADMIN_EMAIL = 'info@ryukyu-tane.com'; // 管理者通知先（ご自身のメールアドレスに）
const BOOKLET_TITLE = 'ガマンしない断酒のヒント集';
const UNIT_PRICE = 500;

/**
 * フォームからのPOSTリクエストを処理
 */
function doPost(e) {
  try {
    const params = e.parameter;
    
    // 必須項目のバリデーション
    if (!params.name || !params.email || !params.address || !params.quantity) {
      throw new Error('必須入力項目が不足しています。');
    }

    const name = params.name;
    const email = params.email;
    const tel = params.tel || 'なし';
    const address = params.address;
    const quantity = parseInt(params.quantity);
    
    // 送料計算
    const shipping = calculateShipping(quantity);
    const total = (UNIT_PRICE * quantity) + shipping;
    
    // スプレッドシートへ記録
    recordOrder(name, email, tel, address, quantity, shipping, total);
    
    // 各種メール送信
    sendConfirmationEmail(name, email, quantity, shipping, total);
    sendAdminNotification(name, quantity, total);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: '注文が正常に受付されました。',
      total: total
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message || 'システムエラーが発生しました。'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 送料計算ロジック
 * 1-2冊: 180円 (スマートレター等)
 * 3-10冊: 370円 (レターパックライト等)
 * それ以上: 520円 (レターパックプラス等) ※要調整
 */
function calculateShipping(qty) {
  if (qty <= 2) return 180;
  if (qty <= 10) return 370;
  return 520;
}

/**
 * スプレッドシートへの記録
 */
function recordOrder(name, email, tel, address, qty, shipping, total) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['受注日時', 'お名前', 'メールアドレス', '電話番号', '配送先住所', '冊数', '送料', '合計金額', '入金状況', '発送状況', '備考']);
    sheet.getRange(1, 1, 1, 11).setBackground('#e1f5fe').setFontWeight('bold');
  }
  
  sheet.appendRow([
    new Date(),
    name,
    email,
    tel,
    address,
    qty,
    shipping,
    total,
    '未入金',
    '未発送',
    ''
  ]);
}

/**
 * 顧客への確認メール送信
 */
function sendConfirmationEmail(name, email, qty, shipping, total) {
  const subject = `【ご注文確認】${BOOKLET_TITLE} のお申し込み`;
  const body = `${name} 様

この度は「${BOOKLET_TITLE}」をご注文いただき、誠にありがとうございます。
以下の内容で承りました。ご入金を確認次第、発送の手続きを進めさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ご注文内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・商品名：${BOOKLET_TITLE}
・冊数：${qty} 冊
・送料：${shipping} 円
・合計金額：${total} 円（税込）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ お振込先
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
〇〇銀行 ✖✖支店
普通 1234567
株式会社 琉球のタネ

※恐れ入りますが、振込手数料はご負担をお願いいたします。
※ご注文から7日以内にお振込が確認できない場合、キャンセルとさせていただくことがございます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 配送先
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
お名前：${name} 様
メール：${email}

到着まで今しばらくお待ちください。
ご不明な点がございましたら、本メールへの返信にてお問い合わせください。

--
小松知己事務所 ブックレット事務局
（運営代行：株式会社 琉球のタネ / 一般社団法人 くらくサポート）
`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    name: '小松知己事務所 事務局'
  });
}

/**
 * 管理者への通知
 */
function sendAdminNotification(name, qty, total) {
  const subject = `【新規受注】${name} 様より ${qty} 冊の注文がありました`;
  const body = `「${BOOKLET_TITLE}」の新規注文が入りました。

・発注者：${name} 様
・注文冊数：${qty} 冊
・合計金額：${total} 円

受注リスト（スプレッドシート）を確認してください：
https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/
`;
  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}
