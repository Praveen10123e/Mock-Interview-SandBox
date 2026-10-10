export enum EventType {
  INTERVIEW_STARTED = 'InterviewStarted',
  INTERVIEW_COMPLETED = 'InterviewCompleted',
  QUESTION_GENERATED = 'QuestionGenerated',
  QUESTION_ANSWERED = 'QuestionAnswered',
  CODE_SUBMITTED = 'CodeSubmitted',
  CODE_EXECUTED = 'CodeExecuted',
  REPLAY_GENERATED = 'ReplayGenerated',
  BEHAVIOR_CAPTURED = 'BehaviorCaptured',
  SCORE_GENERATED = 'ScoreGenerated',
  RECOMMENDATION_GENERATED = 'RecommendationGenerated',
  REPORT_GENERATED = 'ReportGenerated',
  NOTIFICATION_CREATED = 'NotificationCreated',
  USER_CREATED = 'UserCreated',
  PROFILE_CREATED = 'ProfileCreated',
  PROFILE_UPDATED = 'ProfileUpdated',
  PROFILE_VIEWED = 'ProfileViewed',
  EDUCATION_ADDED = 'EducationAdded',
  EDUCATION_UPDATED = 'EducationUpdated',
  SKILL_ADDED = 'SkillAdded',
  SKILL_REMOVED = 'SkillRemoved',
  AVATAR_CHANGED = 'AvatarChanged',
  RESUME_UPLOADED = 'ResumeUploaded',
  RESUME_DELETED = 'ResumeDeleted',
  CAREER_UPDATED = 'CareerUpdated',
  PREFERENCES_UPDATED = 'PreferencesUpdated',
  AI_PREFERENCES_UPDATED = 'AIPreferencesUpdated',
  NM_PROFILE_UPDATED = 'NMProfileUpdated',
  PROFILE_COMPLETED = 'ProfileCompleted',
  COMPLETION_CALCULATED = 'CompletionCalculated',
  SNAPSHOT_CREATED = 'SnapshotCreated',
  PROGRESS_UPDATED = 'ProgressUpdated',
  SESSION_RECOVERED = 'SessionRecovered',
  HEARTBEAT_MISSED = 'HeartbeatMissed',
  INTERVIEW_CREATED = 'InterviewCreated',
  INTERVIEW_PAUSED = 'InterviewPaused',
  INTERVIEW_RESUMED = 'InterviewResumed',
  INTERVIEW_CANCELLED = 'InterviewCancelled',
  INTERVIEW_EXPIRED = 'InterviewExpired',
  QUESTION_ASSIGNED = 'QuestionAssigned',
  QUESTION_VIEWED = 'QuestionViewed',
  ANSWER_SAVED = 'AnswerSaved',
  ANSWER_SUBMITTED = 'AnswerSubmitted',

  // Question Bank Events
  QUESTION_IMPORTED = 'QuestionImported',
  QUESTION_CREATED = 'QuestionCreated',
  QUESTION_UPDATED = 'QuestionUpdated',
  QUESTION_DELETED = 'QuestionDeleted',
  QUESTION_VERSION_CREATED = 'QuestionVersionCreated',
  QUESTION_SEARCHED = 'QuestionSearched',
  QUESTION_FILTERED = 'QuestionFiltered',
  CATEGORY_CREATED = 'CategoryCreated',
  TOPIC_CREATED = 'TopicCreated',
  IMPORT_COMPLETED = 'ImportCompleted',
}

export interface IBaseEventPayload {
  [key: string]: any;
}

export interface IEvent<T = IBaseEventPayload> {
  eventId: string;
  correlationId: string;
  eventType: EventType;
  timestamp: string;
  payload: T;
  sourceService: string;
}
