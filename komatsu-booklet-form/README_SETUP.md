# ブックレット発注フォーム 導入ガイド

作成した発注フォームを実際に稼働させるための手順をまとめたのだ！

## ステップ 1：Google スプレッドシートの準備
1. [Google スプレッドシート](https://sheets.new)を新規作成する。
2. ブラウザのURLバーから、スプレッドシートのIDをコピーする。
   - `https://docs.google.com/spreadsheets/d/【ここがID】/edit`

## ステップ 2：Apps Script の設定
1. スプレッドシートの上部メニューから **「拡張機能」 > 「Apps Script」** を選択。
2. 左側の `コード.gs` に、[[order_handler.gs]](file:///Users/kanmemacbookair/Desktop/github/komatsu-booklet-form/order_handler.gs) の中身をすべて貼り付ける。
3. コード内の `SPREADSHEET_ID` を、ステップ1でコピーしたIDに書き換える。
4. `ADMIN_EMAIL` を、通知を受け取りたいメールアドレスに書き換える。

## ステップ 3：ウェブアプリとして公開
1. 画面右上の **「デプロイ」 > 「新しいデプロイ」** をクリック。
2. 種類の選択で **「ウェブアプリ」** を選ぶ。
3. 設定を以下のようにする：
   - 次のユーザーとして実行： **「自分」**
   - アクセスできるユーザー： **「全員」** （※ログイン不要でフォームを送るため）
4. 「デプロイ」をクリックし、承認を求められたら許可する。
5. 表示された **「ウェブアプリのURL」** をコピーする。

## ステップ 4：HTMLフォームへの反映
1. [[index.html]](file:///Users/kanmemacbookair/Desktop/github/komatsu-booklet-form/index.html) を開き、JavaScript内の `GAS_URL` にコピーしたURLを貼り付ける。
2. 保存した `index.html` をサーバーにアップロードするか、ブラウザで開いてテストするのだ！

---
何か不明点があれば、いつでも聞いてほしいのだ！
