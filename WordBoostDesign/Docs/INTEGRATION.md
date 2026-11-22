# Xcodeへの組み込みメモ

1. XcodeでiOS 17以上、Swift 5.9以上のSwiftUIアプリを用意する。
2. `Models/WordBoostModels.swift` をアプリターゲットに追加する。
3. `Vocabulary/` 配下の4ファイル (`manifest.json`, `words_600.json`, `words_730.json`, `words_860.json`) をリソースとしてアプリバンドルに追加する。
4. SwiftDataの `ModelContainer` に `Word`, `StudyRecord`, `StudySession`, `StudyAnswer`, `UserSettings`, `Badge`, `WordPackState` を登録する。
5. 初回起動時に `manifest.json` → JSON読み込み → チェックサム検証 → `Word.id` ベースのupsert → `WordPackState` 更新を行うRepositoryを作成する。
6. オンボーディング完了後は `UserSettings` の1件を保持し、4タブから同じデータコンテナを参照する。
7. 手動追加は `Word(source: .user, level: nil)` で作り、初回学習時に `StudyRecord(wordId:)` を作成する。
8. SRSの状態変更と `StudyAnswer` の追記を1回の保存処理で行い、途中でアプリを閉じても再開できるようにする。

注意: `WordBoostModels.swift` はデータモデルの設計草案です。Xcode/iOSシミュレータでのビルドと端末テストはこの環境では実施していません。画面、Repository、SRS、テストの実装は設計承認後に進めます。

## JSON更新の運用ルール

- 原則、**既存のidを変更しない**。同じ見出し語に意味の改訂があっても同一idを使う。
- 単語の内容を変更した場合は対象レコードの `contentVersion` を増やし、`manifest.json` の `catalogVersion` とハッシュを更新する。
- 新しい単語を追加するときは使われていない番号を使う。並べ替えによる連番の付け直しは禁止。
- 公開終了は `isArchived` で非表示にし、`StudyRecord` と `StudyAnswer` を残す。
- 同梱語はユーザーが自由編集しない。個人向けの別の意味・例文を保存したい場合は後で個人メモ機能かコピー機能として追加する。

## 審査前チェック

- [ ] 全300語の英文法、日本語訳、文脈、類義語、派生語、難易度バンドの人手校閲
- [ ] 近似IPAの確認（初稿では7件が `null`）
- [ ] 例文読み上げの米・英アクセント切替とVoiceOverのテスト
- [ ] JSON取り込み失敗・アプリ更新・ユーザー単語アーカイブの動作確認
- [ ] 同一単語の重複登録、改訂時のデータ不消失、3段階評価の境界値テスト
