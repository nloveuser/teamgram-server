// Copyright 2026 Teamgram Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package server

import (
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

//go:embed web/index.html
var embeddedWeb embed.FS

// Config is loaded from admin.yaml.
type Config struct {
	Host     string `yaml:"Host"`
	Port     int    `yaml:"Port"`
	Username string `yaml:"Username"`
	Password string `yaml:"Password"`
	WebDir   string `yaml:"WebDir"` // path to Next.js out/ dir; empty = use embedded fallback
	MySQL    struct {
		DSN string `yaml:"DSN"`
	} `yaml:"MySQL"`
}

type session struct{ expiry time.Time }

// Server is the HTTP server for the admin panel.
type Server struct {
	cfg      Config
	db       *sql.DB
	sessions map[string]*session
	mu       sync.Mutex
	start    time.Time
}

func New(cfg Config) (*Server, error) {
	db, err := sql.Open("mysql", cfg.MySQL.DSN)
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}
	db.SetMaxOpenConns(16)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(time.Hour)
	return &Server{
		cfg:      cfg,
		db:       db,
		sessions: make(map[string]*session),
		start:    time.Now(),
	}, nil
}

// ── Router ────────────────────────────────────────────────────────────────────

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS — allow Next.js dev server
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	p := r.URL.Path
	switch {
	case p == "/api/login":
		s.handleLogin(w, r)
	case p == "/api/logout":
		s.requireAuth(w, r, s.handleLogout)
	case p == "/api/stats":
		s.requireAuth(w, r, s.handleStats)
	case p == "/api/users" && r.Method == http.MethodGet:
		s.requireAuth(w, r, s.handleUsers)
	case strings.HasPrefix(p, "/api/users/") && strings.HasSuffix(p, "/ban"):
		s.requireAuth(w, r, s.handleBanUser)
	case strings.HasPrefix(p, "/api/users/") && strings.HasSuffix(p, "/unban"):
		s.requireAuth(w, r, s.handleUnbanUser)
	case strings.HasPrefix(p, "/api/users/") && strings.HasSuffix(p, "/flags"):
		s.requireAuth(w, r, s.handleUserFlags)
	case p == "/api/chats":
		s.requireAuth(w, r, s.handleChats)
	case p == "/api/system":
		s.requireAuth(w, r, s.handleSystem)
	case p == "/api/users/bulk-flags" && r.Method == http.MethodPost:
		s.requireAuth(w, r, s.handleBulkFlags)
	case p == "/api/bots" && r.Method == http.MethodGet:
		s.requireAuth(w, r, s.handleListBots)
	case p == "/api/bots" && r.Method == http.MethodPost:
		s.requireAuth(w, r, s.handleCreateBot)
	case strings.HasPrefix(p, "/api/bots/") && strings.HasSuffix(p, "/delete"):
		s.requireAuth(w, r, s.handleDeleteBot)
	default:
		s.serveStatic(w, r)
	}
}

// serveStatic serves the Next.js static export from WebDir, or falls back to
// the embedded single-page HTML.
func (s *Server) serveStatic(w http.ResponseWriter, r *http.Request) {
	dir := s.cfg.WebDir
	if dir == "" {
		dir = "./web"
	}

	// Cache Next.js immutable assets aggressively
	if strings.HasPrefix(r.URL.Path, "/_next/static/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}

	// Try the filesystem first
	if _, err := os.Stat(dir); err == nil {
		// Try exact path, then path/index.html
		candidates := []string{
			filepath.Join(dir, filepath.Clean(r.URL.Path)),
			filepath.Join(dir, filepath.Clean(r.URL.Path), "index.html"),
		}
		for _, c := range candidates {
			if info, err := os.Stat(c); err == nil && !info.IsDir() {
				http.ServeFile(w, r, c)
				return
			}
		}
		// Fallback to root index.html (SPA fallback)
		root := filepath.Join(dir, "index.html")
		if _, err := os.Stat(root); err == nil {
			http.ServeFile(w, r, root)
			return
		}
	}

	// Embedded HTML fallback
	if r.URL.Path == "/" || r.URL.Path == "/index.html" {
		data, _ := embeddedWeb.ReadFile("web/index.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(data)
		return
	}
	http.NotFound(w, r)
}

// ── Auth ──────────────────────────────────────────────────────────────────────

func (s *Server) newToken() string {
	b := make([]byte, 24)
	rand.Read(b) //nolint:errcheck
	return hex.EncodeToString(b)
}

func (s *Server) tokenFromRequest(r *http.Request) string {
	if t := r.Header.Get("X-Auth-Token"); t != "" {
		return t
	}
	if c, err := r.Cookie("admin_token"); err == nil {
		return c.Value
	}
	return ""
}

func (s *Server) validToken(token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[token]
	if !ok {
		return false
	}
	if time.Now().After(sess.expiry) {
		delete(s.sessions, token)
		return false
	}
	sess.expiry = time.Now().Add(8 * time.Hour)
	return true
}

func (s *Server) requireAuth(w http.ResponseWriter, r *http.Request, fn http.HandlerFunc) {
	if !s.validToken(s.tokenFromRequest(r)) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	fn(w, r)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad request"})
		return
	}
	if body.Username != s.cfg.Username || body.Password != s.cfg.Password {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}
	token := s.newToken()
	s.mu.Lock()
	s.sessions[token] = &session{expiry: time.Now().Add(8 * time.Hour)}
	s.mu.Unlock()
	http.SetCookie(w, &http.Cookie{Name: "admin_token", Value: token, Path: "/", MaxAge: 28800, HttpOnly: true})
	writeJSON(w, http.StatusOK, map[string]string{"token": token})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	token := s.tokenFromRequest(r)
	s.mu.Lock()
	delete(s.sessions, token)
	s.mu.Unlock()
	http.SetCookie(w, &http.Cookie{Name: "admin_token", Value: "", MaxAge: -1, Path: "/"})
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

// ── Stats ─────────────────────────────────────────────────────────────────────

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	type stats struct {
		TotalUsers    int64 `json:"total_users"`
		DeletedUsers  int64 `json:"deleted_users"`
		BotUsers      int64 `json:"bot_users"`
		PremiumUsers  int64 `json:"premium_users"`
		TotalChats    int64 `json:"total_chats"`
		TotalMessages int64 `json:"total_messages"`
	}
	var st stats
	s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users WHERE deleted=0`).Scan(&st.TotalUsers)        //nolint:errcheck
	s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users WHERE deleted=1`).Scan(&st.DeletedUsers)     //nolint:errcheck
	s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users WHERE is_bot=1 AND deleted=0`).Scan(&st.BotUsers)    //nolint:errcheck
	s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users WHERE premium=1 AND deleted=0`).Scan(&st.PremiumUsers) //nolint:errcheck
	s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM chats WHERE deactivated=0`).Scan(&st.TotalChats)   //nolint:errcheck
	s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM messages WHERE deleted=0`).Scan(&st.TotalMessages) //nolint:errcheck
	writeJSON(w, http.StatusOK, st)
}

// ── Users ─────────────────────────────────────────────────────────────────────

func (s *Server) handleUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("q")
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	const limit = 20
	offset := (page - 1) * limit

	type userRow struct {
		ID                int64  `json:"id"`
		FirstName         string `json:"first_name"`
		LastName          string `json:"last_name"`
		Username          string `json:"username"`
		Phone             string `json:"phone"`
		About             string `json:"about"`
		IsBot             bool   `json:"is_bot"`
		Premium           bool   `json:"premium"`
		Verified          bool   `json:"verified"`
		Scam              bool   `json:"scam"`
		Fake              bool   `json:"fake"`
		Support           bool   `json:"support"`
		Restricted        bool   `json:"restricted"`
		RestrictionReason string `json:"restriction_reason"`
		Color             int32  `json:"color"`
		ProfileColor      int32  `json:"profile_color"`
		Deleted           bool   `json:"deleted"`
		State             int32  `json:"state"`
		Date2             int64  `json:"date2"`
	}

	var (
		rows  *sql.Rows
		err   error
		total int64
	)
	const cols = `id, first_name, last_name, username, phone, COALESCE(about,''),
	              is_bot, premium, verified, scam, fake, support,
	              restricted, COALESCE(restriction_reason,''), color, profile_color,
	              deleted, state, date2`

	if search != "" {
		like := "%" + search + "%"
		s.db.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM users WHERE first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR phone LIKE ?`,
			like, like, like, like).Scan(&total) //nolint:errcheck
		rows, err = s.db.QueryContext(r.Context(),
			`SELECT `+cols+` FROM users
			 WHERE first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR phone LIKE ?
			 ORDER BY id DESC LIMIT ? OFFSET ?`,
			like, like, like, like, limit, offset)
	} else {
		s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users`).Scan(&total) //nolint:errcheck
		rows, err = s.db.QueryContext(r.Context(),
			`SELECT `+cols+` FROM users ORDER BY id DESC LIMIT ? OFFSET ?`,
			limit, offset)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := make([]userRow, 0, limit)
	for rows.Next() {
		var u userRow
		rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Username, &u.Phone, &u.About, //nolint:errcheck
			&u.IsBot, &u.Premium, &u.Verified, &u.Scam, &u.Fake, &u.Support,
			&u.Restricted, &u.RestrictionReason, &u.Color, &u.ProfileColor,
			&u.Deleted, &u.State, &u.Date2)
		items = append(items, u)
	}
	writeJSON(w, http.StatusOK, map[string]any{"total": total, "page": page, "items": items})
}

func userIDFromPath(path, suffix string) (int64, bool) {
	trimmed := strings.TrimSuffix(strings.TrimPrefix(path, "/api/users/"), suffix)
	id, err := strconv.ParseInt(trimmed, 10, 64)
	return id, err == nil
}

func (s *Server) handleBanUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, ok := userIDFromPath(r.URL.Path, "/ban")
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if _, err := s.db.ExecContext(r.Context(), `UPDATE users SET deleted=1, delete_reason='admin_ban' WHERE id=?`, id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

func (s *Server) handleUnbanUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, ok := userIDFromPath(r.URL.Path, "/unban")
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if _, err := s.db.ExecContext(r.Context(), `UPDATE users SET deleted=0, delete_reason='' WHERE id=?`, id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

func (s *Server) handleUserFlags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, ok := userIDFromPath(r.URL.Path, "/flags")
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var body flagsBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad request"})
		return
	}
	if err := s.applyFlags(r, []int64{id}, body); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

type flagsBody struct {
	Verified          *bool   `json:"verified"`
	Scam              *bool   `json:"scam"`
	Fake              *bool   `json:"fake"`
	Support           *bool   `json:"support"`
	Premium           *bool   `json:"premium"`
	Restricted        *bool   `json:"restricted"`
	RestrictionReason *string `json:"restriction_reason"`
	Color             *int32  `json:"color"`          // 0=default, 1-7 accent colors
	ProfileColor      *int32  `json:"profile_color"`  // same palette, for profile page
}

func (s *Server) applyFlags(r *http.Request, ids []int64, body flagsBody) error {
	for _, id := range ids {
		_, err := s.db.ExecContext(r.Context(),
			`UPDATE users SET
			  verified           = COALESCE(?, verified),
			  scam               = COALESCE(?, scam),
			  fake               = COALESCE(?, fake),
			  support            = COALESCE(?, support),
			  premium            = COALESCE(?, premium),
			  restricted         = COALESCE(?, restricted),
			  restriction_reason = COALESCE(?, restriction_reason),
			  color              = COALESCE(?, color),
			  profile_color      = COALESCE(?, profile_color)
			 WHERE id = ?`,
			body.Verified, body.Scam, body.Fake, body.Support, body.Premium,
			body.Restricted, body.RestrictionReason,
			body.Color, body.ProfileColor, id)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) handleBulkFlags(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs   []int64    `json:"ids"`
		Flags flagsBody  `json:"flags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ids required"})
		return
	}
	if len(req.IDs) > 500 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "too many ids (max 500)"})
		return
	}
	if err := s.applyFlags(r, req.IDs, req.Flags); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": "true", "updated": len(req.IDs)})
}

// ── Bots ──────────────────────────────────────────────────────────────────────

func (s *Server) handleListBots(w http.ResponseWriter, r *http.Request) {
	type botRow struct {
		ID          int64  `json:"id"`
		FirstName   string `json:"first_name"`
		Username    string `json:"username"`
		Token       string `json:"token"`
		BotType     int32  `json:"bot_type"`
		Description string `json:"description"`
		Verified    bool   `json:"verified"`
		Date2       int64  `json:"date2"`
	}
	rows, err := s.db.QueryContext(r.Context(),
		`SELECT u.id, u.first_name, u.username, b.token, b.bot_type, b.description, u.verified, u.date2
		 FROM users u
		 JOIN bots b ON b.bot_id = u.id
		 WHERE u.deleted = 0
		 ORDER BY u.id DESC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()
	items := make([]botRow, 0)
	for rows.Next() {
		var b botRow
		rows.Scan(&b.ID, &b.FirstName, &b.Username, &b.Token, &b.BotType, &b.Description, &b.Verified, &b.Date2) //nolint:errcheck
		items = append(items, b)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleCreateBot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		FirstName   string `json:"first_name"`
		Username    string `json:"username"`
		Description string `json:"description"`
		BotType     int32  `json:"bot_type"` // 3=bot, 4=service
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FirstName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "first_name required"})
		return
	}
	if req.BotType == 0 {
		req.BotType = 3 // UserTypeBot
	}

	// Insert user row
	accessHash := randInt64()
	res, err := s.db.ExecContext(r.Context(),
		`INSERT INTO users(user_type, access_hash, secret_key_id, first_name, last_name, username, phone, country_code, is_bot, about)
		 VALUES (?, ?, 0, ?, '', ?, '', '', 1, ?)`,
		req.BotType, accessHash, req.FirstName, req.Username, req.Description)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	botID, _ := res.LastInsertId()

	// Generate token: "{id}:{32-hex}"
	tokenSuffix := make([]byte, 16)
	rand.Read(tokenSuffix) //nolint:errcheck
	token := fmt.Sprintf("%d:%X", botID, tokenSuffix)

	// Insert bots row
	_, err = s.db.ExecContext(r.Context(),
		`INSERT INTO bots(bot_id, bot_type, creator_user_id, token, description) VALUES (?, ?, 0, ?, ?)`,
		botID, req.BotType, token, req.Description)
	if err != nil {
		// Rollback user insert
		s.db.ExecContext(r.Context(), `DELETE FROM users WHERE id=?`, botID) //nolint:errcheck
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": botID, "token": token})
}

func (s *Server) handleDeleteBot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	trimmed := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/bots/"), "/delete")
	id, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	s.db.ExecContext(r.Context(), `UPDATE users SET deleted=1 WHERE id=? AND is_bot=1`, id) //nolint:errcheck
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

func randInt64() int64 {
	b := make([]byte, 8)
	rand.Read(b) //nolint:errcheck
	var v int64
	for _, bv := range b {
		v = v<<8 | int64(bv)
	}
	if v < 0 {
		v = -v
	}
	return v
}

// ── Chats ─────────────────────────────────────────────────────────────────────

func (s *Server) handleChats(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("q")
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	const limit = 20
	offset := (page - 1) * limit

	type chatRow struct {
		ID               int64  `json:"id"`
		Title            string `json:"title"`
		About            string `json:"about"`
		ParticipantCount int32  `json:"participant_count"`
		CreatorUserID    int64  `json:"creator_user_id"`
		Deactivated      bool   `json:"deactivated"`
		Date2            int64  `json:"date2"`
	}

	var (
		rows  *sql.Rows
		err   error
		total int64
	)

	const cols = `id, title, COALESCE(about,''), participant_count, creator_user_id, deactivated, date2`
	if search != "" {
		like := "%" + search + "%"
		s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM chats WHERE title LIKE ?`, like).Scan(&total) //nolint:errcheck
		rows, err = s.db.QueryContext(r.Context(),
			`SELECT `+cols+` FROM chats WHERE title LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`,
			like, limit, offset)
	} else {
		s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM chats`).Scan(&total) //nolint:errcheck
		rows, err = s.db.QueryContext(r.Context(),
			`SELECT `+cols+` FROM chats ORDER BY id DESC LIMIT ? OFFSET ?`, limit, offset)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := make([]chatRow, 0, limit)
	for rows.Next() {
		var c chatRow
		rows.Scan(&c.ID, &c.Title, &c.About, &c.ParticipantCount, &c.CreatorUserID, &c.Deactivated, &c.Date2) //nolint:errcheck
		items = append(items, c)
	}
	writeJSON(w, http.StatusOK, map[string]any{"total": total, "page": page, "items": items})
}

// ── System ────────────────────────────────────────────────────────────────────

func (s *Server) handleSystem(w http.ResponseWriter, r *http.Request) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	dbSt := s.db.Stats()
	writeJSON(w, http.StatusOK, map[string]any{
		"uptime_seconds":  int64(time.Since(s.start).Seconds()),
		"goroutines":      runtime.NumGoroutine(),
		"go_version":      runtime.Version(),
		"os":              runtime.GOOS,
		"arch":            runtime.GOARCH,
		"cpus":            runtime.NumCPU(),
		"heap_alloc_mb":   float64(mem.HeapAlloc) / 1024 / 1024,
		"heap_sys_mb":     float64(mem.HeapSys) / 1024 / 1024,
		"total_alloc_mb":  float64(mem.TotalAlloc) / 1024 / 1024,
		"gc_runs":         mem.NumGC,
		"db_open_conns":   dbSt.OpenConnections,
		"db_in_use":       dbSt.InUse,
		"db_idle":         dbSt.Idle,
	})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
