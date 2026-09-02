CREATE TABLE IF NOT EXISTS push_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    ip_country TEXT,
    category_preference TEXT DEFAULT 'all',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pathname TEXT NOT NULL,
    device_type TEXT,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'feedback',
    contact TEXT,
    pathname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_hi TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    level TEXT NOT NULL DEFAULT 'national',
    organization TEXT NOT NULL DEFAULT '',
    post_name TEXT NOT NULL DEFAULT '',
    total_vacancies INTEGER DEFAULT 0,
    start_date TEXT,
    closing_date TEXT,
    exam_date TEXT,
    admit_card_date TEXT,
    result_date TEXT,
    min_age TEXT,
    max_age TEXT,
    official_url TEXT,
    apply_online_url TEXT,
    notification_pdf_url TEXT,
    result_url TEXT,
    summary TEXT,
    summary_hi TEXT,
    how_to_apply TEXT,
    how_to_apply_hi TEXT,
    selection_process TEXT,
    selection_process_hi TEXT,
    documents TEXT,
    documents_hi TEXT,
    fees_json TEXT DEFAULT '[]',
    eligibility_json TEXT DEFAULT '[]',
    qualifications_json TEXT DEFAULT '[]',
    job_categories_json TEXT DEFAULT '[]',
    states_json TEXT DEFAULT '[]',
    faq_json TEXT DEFAULT '[]',
    body_blocks_json TEXT DEFAULT '[]',
    seo_title TEXT,
    seo_description TEXT,
    source_url TEXT,
    last_verified_at TEXT,
    published_at TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_status_category ON posts(status, category);
CREATE INDEX IF NOT EXISTS idx_posts_level ON posts(level);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_source_url TEXT NOT NULL,
    extracted_json TEXT NOT NULL,
    model_id TEXT,
    confidence REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'editor',
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_run_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT,
    outcome TEXT,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_crawl_log (
    url TEXT PRIMARY KEY,
    discovered_at TEXT NOT NULL,
    last_fetched_at TEXT NOT NULL,
    outcome TEXT
);
