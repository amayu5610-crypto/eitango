# 発音データの由来と公開前の確認

同梱サンプルJSONの `pronunciation` は、CMU Pronouncing Dictionary（CMUdict）の北米英語の音素列を基に、独自の簡易変換処理でIPAに近似変換したデータです。

- CMUdict: https://github.com/cmusphinx/cmudict
- ライセンス: https://github.com/cmusphinx/cmudict/blob/master/LICENSE
- 表記: Copyright (C) 1993–2015 Carnegie Mellon University（CMUdictの公開ライセンス表示に基づく）

公開時には元データの利用条件と必要な帰属表示を再確認し、アプリ内の謝辞・ライセンス画面へ適切に掲載してください。発音記号の変換は厳密な音声学的IPA化ではありません。確認が済むまでは実アプリで発音記号表示をオフにし、AVSpeechSynthesizerによる読み上げのみを利用する方法も安全です。

英語例文・日本語の語義・日本語訳は当アプリ向けの新規原稿です。原稿の正確さは専門家や英語指導者による校閲前であり、他作品との類似確認も公開前の工程に含めてください。
