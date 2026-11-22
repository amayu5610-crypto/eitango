# Word Boost データ設計 v1.1 — MVP

対象: Swift 5.9+, SwiftUI, SwiftData, iOS 17+。ユーザー確認: 2026-11-22。

## 採用した3方針

1. ユーザーの手動単語追加はMVPで実装。英単語と日本語訳だけ必須。例文・品詞・分類は任意。IDは `user-<UUID>`、`sourceRaw = user`、`level = nil`。
2. 同梱パックの更新は**アプリ更新**のみ。起動時に `manifest.json` と保存済み `WordPackState` のバージョンおよびSHA-256を比較し、必要なパックだけ増分取り込み。
3. ユーザー単語は目標レベルによらず、毎日の復習・新規キューに参加する。既存単語との正規化見出し語重複はユーザーに確認する。

## データエンティティ

| @Model | 主キー（論理キー） | 主な属性 | 目的 |
|---|---|---|---|
| `Word` | `id: String` | text, normalizedText, partOfSpeech, meaning, pronunciation?, level?, category, exampleEn, exampleJa, synonyms[], derivatives[], sourceRaw, contentVersion, isArchived, createdAt, updatedAt | 単語の辞書本体。編集可能なユーザー単語もここに置く |
| `StudyRecord` | `wordId: String` | intervalDays, easeFactor, reviewStage, nextReviewAt?, perfectCount, uncertainCount, forgottenCount, consecutiveForgottenCount, correctCount, wrongCount, lastAnswerRaw?, lastReviewedAt?, isFavorite, isDifficult, isMastered | 単語ごとの集約された復習状態 |
| `StudySession` | `id: UUID` | date, endedAt?, durationSeconds, answeredCount, correctCount, newWordCount, reviewWordCount, modeRaw, localDayKey, timeZoneID, plannedWordIds, currentIndex, isCompleted | セッションの中断・再開、日次実績 |
| `StudyAnswer` | `id: UUID` | sessionId, wordId, modeRaw, gradeRaw?, wasCorrect?, answeredAt, durationSeconds, intervalBeforeDays, intervalAfterDays | 回答単位の追記専用イベント。グラフ・分析の基礎 |
| `UserSettings` | `id: String` | currentScore, targetScore, examDate?, dailyGoalMinutes, dailyNewWordTarget, dailyReviewLimit, sessionQuestionLimit, reminderMinuteOfDay, remindersEnabled, voiceLocaleIdentifier, onboardingCompleted | オンボーディング・端末設定（1行） |
| `Badge` | `id: String` | title, conditionKey, threshold, unlockedAt? | バッジ実績（未解放はnil） |
| `WordPackState` | `id: String` | importedContentVersion, importedAt, checksumSHA256, wordCount | 同梱JSONのインポート履歴 |

### 関係性

- `Word (id)` 1対0/1 `StudyRecord (wordId)`。初回学習またはお気に入り化で `StudyRecord` を作成。
- `StudySession (id)` 1対N `StudyAnswer (sessionId)`。
- `Word (id)` 1対N `StudyAnswer (wordId)`。
- 外部キーは**論理的な文字列ID参照**とし、データ変更やパック更新で学習履歴を巻き込まない。取り込み時と整合性チェック時にアプリ層で検証する。

### iCloud拡張への配慮

- MVPは端末内のみ。CloudKitは**オフ**で構築する。
- 将来のSwiftData + CloudKitに備え、`@Attribute(.unique)` と非オプショナルのSwiftData関係を初期モデルには導入しない。
- 同一IDの重複防止はRepositoryのupsert処理で保証する。Cloud同期導入時には競合解決を追加する必要がある。
- 変更の大きいスキーマは `VersionedSchema` / `SchemaMigrationPlan` を使い段階的に移行する。

## バンド別単語JSON

- `Vocabulary/words_600.json` : 100語
- `Vocabulary/words_730.json` : 100語
- `Vocabulary/words_860.json` : 100語
- `Vocabulary/manifest.json` : schemaVersion / catalogVersion / file / wordCount / sha256

`level` は学習用の難易度バンドであり、試験スコア到達を保証するものではない。例文・意味・発音記号は必ず教育的校閲を実施する。

### インポート（冪等設計）

1. bundle内`manifest.json`を読み込み、スキーマ版数・件数・チェックサムを検証する。
2. `WordPackState.id = wb-<level>` に対応する保存済みの版数と比較。
3. 各単語を `Word.id` で検索。未登録ならinsert、登録済みなら `sourceRaw == bundled` かつ新しい `contentVersion` の場合のみ**辞書属性**を更新する。
4. **StudyRecord / StudySession / StudyAnswerには触れない。** `sourceRaw = user` の単語も変更しない。
5. 同梱JSONから消えたIDをすぐ削除せず、`isArchived = true` にして保持。学習中の復習には既存の単語内容を残すか、配信終了扱いのUIを出す。
6. すべて成功してから`WordPackState`の版数・ハッシュ・件数を更新する。障害時は再実行可能にする。
7. JSONの**IDは公開後に振り直さない**。語句の修正は元ID・上昇した `contentVersion` を使う。新語には未使用の連番を割り当てる。

### 自作単語

- 必須: `text`, `meaning`。任意: `partOfSpeech`, `exampleEn`, `exampleJa`, `category`, `synonyms`, `derivatives`。
- 入力チェック: `text` のtrim・空文字拒否・例文最大文字数・改行制限、重複候補の提示。
- `id = "user-" + UUID().uuidString.lowercased()`、`level = nil`、`source = user`。
- 学習設定のレベル制限はbundled語のみに適用。ユーザー単語はすべて対象。
- 編集は `Word` のみを書き換え、`StudyRecord` は維持。削除はMVPではアーカイブを既定とし、個人履歴を残す。復元機能を設ける。

## 学習キュー

- 日次上限: `sessionQuestionLimit = 15`、`dailyNewWordTarget = 10`、`dailyReviewLimit = 10`、`dailyGoalMinutes = 3` を初期設定とする。
- 復習は `nextReviewAt <= 今日の終わり` のレコードから最大10件を選ぶ。古い期限・連続「忘れた」・低い定着度の単語を優先する。
- 残枠に未学習語を最大10件入れる。たとえば復習5件→新規10件、復習10件→新規5件。0件→新規10件。
- ユーザー追加語は難易度フィルターから除外し、`lastReviewedAt == nil` の未学習語として自然に混ぜる。
- 同日に学習済みの新規語は同じ日の別セッションで再び「新規」として扱わない。
- `isDifficult == true` の語は特別復習カードで例文を強調する。既に期限が来ている語の中で優先度を上げる。
- セッション途中で閉じても `currentIndex` と各 `StudyAnswer` を保存する。

## SRS（SM-2風の簡易版）

カレンダーの**日**単位で管理し、`Calendar`による日付加算を使う（24時間固定加算は夏時間に弱い）。

- 新規単語の初回「完璧」: 1日後、stage = 0。
- その後の連続「完璧」: 3日 → 7日 → 16日。さらに先は前回間隔×easeFactor（初期2.5、整数日へ丸める）。
- 「あいまい」: 同じ間隔を維持。初回の場合のみ1日。
- 「忘れた」: 1日後、stage = 0、連続忘却カウント+1。
- 「完璧」「あいまい」は連続忘却カウントをゼロにする。
- 「忘れた」が3回連続したら `isDifficult = true`。特別カード表示。解除基準は別途実装時に定義する（例: 完璧2回連続）。
- `isMastered` は暫定指標（例: 間隔16日以上かつ最後の評価が完璧）であり、実際の試験スコア推定とは分離する。
- 4択問題の `wasCorrect` は正答率用。自己評価 `gradeRaw` と混同しない。4択の正誤からSRSに反映するルールはテスト実装時に明文化する。

| 復習前の段階 | 完璧の次回間隔 | あいまい | 忘れた |
|---|---:|---|---|
| 初回 | 1日 | 1日 | 1日、stage=0 |
| stage=0（1日） | 3日 | 1日 | 1日、stage=0 |
| stage=1（3日） | 7日 | 3日 | 1日、stage=0 |
| stage=2（7日） | 16日 | 7日 | 1日、stage=0 |
| stage=3（16日） | 約40日 | 16日 | 1日、stage=0 |

※ 最初の3→7→16はUX向けに固定したSM-2風間隔。全段階が数学的に厳密な2.5倍ではない。

## ホーム・記録の集計

- ストリーク: その日の `StudyAnswer` が1件以上ある日を学習日とする。日付はセッション開始時の `localDayKey` を採用する。
- 今日の学習時間: その日のセッション `durationSeconds` の合計。
- 習得語数: `StudyRecord.isMastered` の件数。ただしアーカイブ語の扱いを集計画面で統一する。
- 4択正答率: `StudyAnswer.wasCorrect != nil` の回答のみを母数とする。
- 苦手ランキング: 連続忘却回数、累計忘却回数、再学習頻度、期限超過を用いる。
- スコア目標までの進捗: **習得語/対象単語語数** と表示し、試験点数を予測しているような表現は避ける。

## MVP時点での非対象

- 外部Web配信／単語パックの自動ダウンロード
- iCloud同期・多端末競合解決
- 有料プランの購入処理
- オフライン録音音声（読み上げは端末の `AVSpeechSynthesizer`）

## 品質メモ

300語の `id`、見出し語の重複、必要キー、値型、英文の語数7〜12を検証済み。`Docs/validation_report.json`参照。発音記号はCMU Pronouncing Dictionaryのデータから機械変換した近似IPAで、一部未入力。辞書・例文・類義語・派生語・語義の正確さは人手で校閲していないため、公開用の確定教材ではない。
