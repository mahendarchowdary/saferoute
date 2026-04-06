package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

// GPSPing represents a GPS location update from a driver
type GPSPing struct {
	TripID    string    `json:"trip_id"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Speed     *float64  `json:"speed,omitempty"`
	Heading   *float64  `json:"heading,omitempty"`
	Accuracy  *float64  `json:"accuracy,omitempty"`
	Battery   *float64  `json:"battery,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// WebSocketMessage represents the message structure from clients
type WebSocketMessage struct {
	Type string  `json:"type"`
	Data GPSPing `json:"data"`
}

// Claims represents JWT claims
type Claims struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	SchoolID string `json:"schoolId,omitempty"`
	jwt.RegisteredClaims
}

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in dev, configure for prod
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	db          *pgx.Conn
	redisClient *redis.Client
	clients     = make(map[string]*Client) // tripId -> client
	broadcast   = make(chan GPSPing)
)

// Client represents a connected driver
type Client struct {
	TripID string
	Conn   *websocket.Conn
	Send   chan GPSPing
}

func main() {
	ctx := context.Background()

	// Load environment variables
	if err := loadEnv(); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	// Connect to TimescaleDB (optional - will work with memory/Redis only if DB unavailable)
	dbURL := os.Getenv("TIMESCALEDB_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/saferoute"
	}

	var err error
	db, err = pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Printf("⚠️  Warning: Could not connect to TimescaleDB: %v", err)
		log.Println("📍 GPS Service will run with Redis/memory storage only")
		db = nil
	} else {
		// Initialize TimescaleDB
		if err := initTimescaleDB(ctx); err != nil {
			log.Printf("⚠️  Warning: TimescaleDB init failed: %v", err)
		}
		defer db.Close(ctx)
		log.Println("✅ Connected to TimescaleDB")
	}

	// Connect to Redis
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	// Remove redis:// prefix if present
	redisAddr = strings.TrimPrefix(redisAddr, "redis://")
	redisAddr = strings.TrimPrefix(redisAddr, "rediss://")

	redisClient = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis connection failed: %v", err)
		redisClient = nil
	} else {
		log.Println("Connected to Redis")
	}

	// Start broadcaster
	go handleBroadcast()

	// Setup HTTP routes
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/health", handleHealth)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("GPS Service starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func loadEnv() error {
	return godotenv.Load()
}

func initTimescaleDB(ctx context.Context) error {
	// Note: gps_pings table is managed by Prisma
	// We only create the hypertable extension here
	hypertableSQL := `
		SELECT create_hypertable('gps_pings', 'timestamp', 
			if_not_exists => TRUE, 
			chunk_time_interval => INTERVAL '1 hour'
		);
	`

	if _, err := db.Exec(ctx, hypertableSQL); err != nil {
		// TimescaleDB extension may not be available on Supabase
		log.Printf("Note: Hypertable conversion (may already exist or TimescaleDB not available): %v", err)
	} else {
		log.Println("✅ TimescaleDB hypertable configured")
	}

	return nil
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract JWT token from query param
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}

	// Validate JWT
	claims, err := validateToken(tokenString)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Only drivers can connect
	if claims.Role != "DRIVER" {
		http.Error(w, "Unauthorized: Drivers only", http.StatusForbidden)
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	tripID := r.URL.Query().Get("tripId")
	if tripID == "" {
		log.Println("Missing tripId in WebSocket connection")
		conn.Close()
		return
	}

	client := &Client{
		TripID: tripID,
		Conn:   conn,
		Send:   make(chan GPSPing, 256),
	}

	clients[tripID] = client

	log.Printf("Driver %s connected for trip %s", claims.ID, tripID)

	// Start goroutines
	go client.writePump()
	go client.readPump(claims)
}

func validateToken(tokenString string) (*Claims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-change-in-production"
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

func (c *Client) readPump(claims *Claims) {
	defer func() {
		delete(clients, c.TripID)
		c.Conn.Close()
		log.Printf("Driver %s disconnected from trip %s", claims.ID, c.TripID)
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg WebSocketMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		if msg.Type == "location" {
			ping := msg.Data
			ping.TripID = c.TripID
			ping.Timestamp = time.Now()

			// Save to DB and broadcast
			broadcast <- ping
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case ping, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteJSON(ping); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleBroadcast() {
	ctx := context.Background()

	for ping := range broadcast {
		// Save to TimescaleDB
		go saveToDB(ctx, ping)

		// Publish to Redis for real-time subscribers
		go publishToRedis(ctx, ping)

		// Notify connected parent clients (if any)
		go notifyParents(ctx, ping)
	}
}

func saveToDB(ctx context.Context, ping GPSPing) {
	if db == nil {
		return // Skip if no database connection
	}
	_, err := db.Exec(ctx, `
		INSERT INTO gps_pings (trip_id, latitude, longitude, speed, heading, accuracy, battery, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, ping.TripID, ping.Lat, ping.Lng, ping.Speed, ping.Heading, ping.Accuracy, ping.Battery, ping.Timestamp)

	if err != nil {
		log.Printf("Failed to save GPS ping: %v", err)
	}
}

func publishToRedis(ctx context.Context, ping GPSPing) {
	if redisClient == nil {
		return
	}

	data, err := json.Marshal(ping)
	if err != nil {
		log.Printf("Failed to marshal GPS ping: %v", err)
		return
	}

	channel := fmt.Sprintf("trip:%s:location", ping.TripID)
	if err := redisClient.Publish(ctx, channel, data).Err(); err != nil {
		log.Printf("Failed to publish to Redis: %v", err)
	}
}

func notifyParents(ctx context.Context, ping GPSPing) {
	// Get students on this trip and notify their parents
	// This would query the DB and send FCM notifications
	// Implementation depends on notification service
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers to allow requests from any origin
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "healthy",
		"service": "gps-service",
		"database": db != nil,
		"redis": redisClient != nil,
	})
}
