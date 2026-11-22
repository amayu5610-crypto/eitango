// Word Boost - SwiftData model proposal (iOS 17+, Swift 5.9+)
// Data-layer only. UI screens and repository/SRS implementations follow after approval.
// This source has not been compiled in Xcode in the current environment.

import Foundation
import SwiftData

// Keep persisted enum-like fields as strings for queryability and safe migrations.
enum WordSource: String, Codable {
    case bundled
    case user
    case downloaded // Reserved for a later release; not used in the MVP.
}

enum RecallGrade: String, Codable {
    case perfect
    case uncertain
    case forgotten
}

enum StudyMode: String, Codable {
    case flashcard
    case multipleChoice
    case spelling
    case listening
    case cloze
    case miniTest
}

@Model
final class Word {
    // Bundled: wb-600-0001. User-added: user-<UUID>.
    // This is a logical key, upserted by the repository; no @Attribute(.unique).
    var id: String
    var text: String
    var normalizedText: String
    var partOfSpeech: String
    var meaning: String
    var pronunciation: String?
    var level: Int?                 // 600/730/860; nil for user-created words
    var category: String
    var exampleEn: String
    var exampleJa: String
    var synonyms: [String]
    var derivatives: [String]
    var sourceRaw: String           // WordSource.rawValue
    var contentVersion: Int
    var isArchived: Bool
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String,
        text: String,
        partOfSpeech: String,
        meaning: String,
        pronunciation: String? = nil,
        level: Int? = nil,
        category: String = "other",
        exampleEn: String = "",
        exampleJa: String = "",
        synonyms: [String] = [],
        derivatives: [String] = [],
        source: WordSource,
        contentVersion: Int = 1,
        createdAt: Date = .now
    ) {
        self.id = id
        self.text = text
        self.normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased(with: Locale(identifier: "en_US_POSIX"))
        self.partOfSpeech = partOfSpeech
        self.meaning = meaning
        self.pronunciation = pronunciation
        self.level = level
        self.category = category
        self.exampleEn = exampleEn
        self.exampleJa = exampleJa
        self.synonyms = synonyms
        self.derivatives = derivatives
        self.sourceRaw = source.rawValue
        self.contentVersion = contentVersion
        self.isArchived = false
        self.createdAt = createdAt
        self.updatedAt = createdAt
    }
}

@Model
final class StudyRecord {
    // One record per logical word ID. Created lazily on first learning/favoriting.
    var wordId: String
    var intervalDays: Int
    var easeFactor: Double
    var reviewStage: Int
    var nextReviewAt: Date?
    var perfectCount: Int
    var uncertainCount: Int
    var forgottenCount: Int
    var consecutiveForgottenCount: Int
    var correctCount: Int          // Objective quizzes, not self-rated cards.
    var wrongCount: Int            // Objective quizzes, not self-rated cards.
    var lastAnswerRaw: String?
    var lastReviewedAt: Date?
    var isFavorite: Bool
    var isDifficult: Bool
    var isMastered: Bool
    var createdAt: Date

    init(wordId: String, createdAt: Date = .now) {
        self.wordId = wordId
        self.intervalDays = 0
        self.easeFactor = 2.5
        self.reviewStage = -1      // New/unreviewed
        self.nextReviewAt = nil    // Never queue new words as overdue reviews.
        self.perfectCount = 0
        self.uncertainCount = 0
        self.forgottenCount = 0
        self.consecutiveForgottenCount = 0
        self.correctCount = 0
        self.wrongCount = 0
        self.lastAnswerRaw = nil
        self.lastReviewedAt = nil
        self.isFavorite = false
        self.isDifficult = false
        self.isMastered = false
        self.createdAt = createdAt
    }
}

@Model
final class StudySession {
    var id: UUID
    var date: Date                // Session started-at timestamp.
    var endedAt: Date?
    var durationSeconds: Double
    var answeredCount: Int
    var correctCount: Int         // Objective quiz answers only.
    var newWordCount: Int
    var reviewWordCount: Int
    var modeRaw: String
    var localDayKey: String       // yyyy-MM-dd when session started.
    var timeZoneID: String
    var plannedWordIds: [String]  // Resume queue after interruptions.
    var currentIndex: Int
    var isCompleted: Bool

    init(
        id: UUID = UUID(),
        date: Date = .now,
        mode: StudyMode,
        localDayKey: String,
        timeZoneID: String,
        plannedWordIds: [String]
    ) {
        self.id = id
        self.date = date
        self.endedAt = nil
        self.durationSeconds = 0
        self.answeredCount = 0
        self.correctCount = 0
        self.newWordCount = 0
        self.reviewWordCount = 0
        self.modeRaw = mode.rawValue
        self.localDayKey = localDayKey
        self.timeZoneID = timeZoneID
        self.plannedWordIds = plannedWordIds
        self.currentIndex = 0
        self.isCompleted = false
    }
}

@Model
final class StudyAnswer {
    // Append-only event history for charts, analytics, and auditability.
    var id: UUID
    var sessionId: UUID
    var wordId: String
    var modeRaw: String
    var gradeRaw: String?         // Flashcard: perfect/uncertain/forgotten
    var wasCorrect: Bool?         // Objective quiz; nil for flashcard.
    var answeredAt: Date
    var durationSeconds: Double
    var intervalBeforeDays: Int
    var intervalAfterDays: Int

    init(
        id: UUID = UUID(),
        sessionId: UUID,
        wordId: String,
        mode: StudyMode,
        grade: RecallGrade?,
        wasCorrect: Bool?,
        answeredAt: Date = .now,
        durationSeconds: Double,
        intervalBeforeDays: Int,
        intervalAfterDays: Int
    ) {
        self.id = id
        self.sessionId = sessionId
        self.wordId = wordId
        self.modeRaw = mode.rawValue
        self.gradeRaw = grade?.rawValue
        self.wasCorrect = wasCorrect
        self.answeredAt = answeredAt
        self.durationSeconds = durationSeconds
        self.intervalBeforeDays = intervalBeforeDays
        self.intervalAfterDays = intervalAfterDays
    }
}

@Model
final class UserSettings {
    // Singleton logical ID; managed by SettingsRepository.
    var id: String
    var currentScore: Int
    var targetScore: Int
    var examDate: Date?
    var dailyGoalMinutes: Int
    var dailyNewWordTarget: Int
    var dailyReviewLimit: Int
    var sessionQuestionLimit: Int
    var reminderMinuteOfDay: Int    // Local wall clock: hour * 60 + minute.
    var remindersEnabled: Bool
    var voiceLocaleIdentifier: String // "en-US" or "en-GB".
    var onboardingCompleted: Bool

    init(id: String = "settings-default") {
        self.id = id
        self.currentScore = 400
        self.targetScore = 730
        self.examDate = nil
        self.dailyGoalMinutes = 3
        self.dailyNewWordTarget = 10
        self.dailyReviewLimit = 10
        self.sessionQuestionLimit = 15
        self.reminderMinuteOfDay = 20 * 60
        self.remindersEnabled = false
        self.voiceLocaleIdentifier = "en-US"
        self.onboardingCompleted = false
    }
}

@Model
final class Badge {
    var id: String               // e.g. "streak-7"
    var title: String
    var conditionKey: String
    var threshold: Int
    var unlockedAt: Date?

    init(id: String, title: String, conditionKey: String, threshold: Int) {
        self.id = id
        self.title = title
        self.conditionKey = conditionKey
        self.threshold = threshold
        self.unlockedAt = nil
    }
}

@Model
final class WordPackState {
    // One row per bundled pack; used by the importer during app upgrades.
    var id: String               // "wb-600", "wb-730", "wb-860"
    var importedContentVersion: Int
    var importedAt: Date
    var checksumSHA256: String
    var wordCount: Int

    init(
        id: String,
        importedContentVersion: Int,
        importedAt: Date = .now,
        checksumSHA256: String,
        wordCount: Int
    ) {
        self.id = id
        self.importedContentVersion = importedContentVersion
        self.importedAt = importedAt
        self.checksumSHA256 = checksumSHA256
        self.wordCount = wordCount
    }
}

// Bundle JSON DTO. Bundled words have a level; user-added words are created
// directly from the form and do not require a package-level JSON entry.
struct BundledWordDTO: Codable {
    var id: String
    var text: String
    var partOfSpeech: String
    var meaning: String
    var pronunciation: String?
    var level: Int
    var category: String
    var exampleEn: String
    var exampleJa: String
    var synonyms: [String]
    var derivatives: [String]
    var source: WordSource
    var contentVersion: Int
}

struct WordPackManifest: Codable {
    struct PackEntry: Codable {
        var level: Int
        var file: String
        var wordCount: Int
        var sha256: String
    }

    var schemaVersion: Int
    var catalogVersion: Int
    var appName: String
    var source: String
    var language: String
    var targetLocale: String
    var levels: [PackEntry]
    var notes: String
}
