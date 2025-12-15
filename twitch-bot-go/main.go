package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gempir/go-twitch-irc/v3"
	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

type Bot struct {
	client   *twitch.Client
	supabase *supabase.Client
	channel  string
	username string
	server   *http.Server
}

type HealthResponse struct {
	Status    string `json:"status"`
	Bot       string `json:"bot"`
	Channel   string `json:"channel"`
	Timestamp string `json:"timestamp"`
}

type WebhookRequest struct {
	Message string `json:"message"`
	Channel string `json:"channel"`
}

type WebhookResponse struct {
	OK bool `json:"ok"`
}

func NewBot() (*Bot, error) {
	// Load .env file for local development (ignored in production)
	_ = godotenv.Load()

	// Get environment variables
	botUsername := os.Getenv("TWITCH_BOT_USERNAME")
	oauthToken := os.Getenv("TWITCH_BOT_OAUTH_TOKEN")
	channelName := os.Getenv("TWITCH_CHANNEL_NAME")
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")
	if supabaseKey == "" {
		supabaseKey = os.Getenv("SUPABASE_ANON_KEY")
	}

	if botUsername == "" || oauthToken == "" || channelName == "" {
		return nil, fmt.Errorf("missing required Twitch credentials")
	}

	// Initialize Twitch client
	client := twitch.NewClient(botUsername, oauthToken)
	client.Join(channelName)

	// Initialize Supabase client
	var supabaseClient *supabase.Client
	if supabaseURL != "" && supabaseKey != "" {
		var err error
		supabaseClient, err = supabase.NewClient(supabaseURL, supabaseKey, nil)
		if err != nil {
			log.Printf("⚠️  Warning: Failed to initialize Supabase client: %v", err)
		} else {
			log.Println("✅ Supabase client initialized")
		}
	} else {
		log.Println("⚠️  Supabase credentials not found - chat commands requiring Supabase will be disabled")
	}

	return &Bot{
		client:   client,
		supabase: supabaseClient,
		channel:  channelName,
		username: botUsername,
	}, nil
}

func (b *Bot) setupHTTPServer(port string) {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Check if client is connected (simple check - client is connected if it's running)
		// The client will automatically reconnect if disconnected
		status := "connected"
		if b.client == nil {
			status = "disconnected"
		}

		response := HealthResponse{
			Status:    "ok",
			Bot:       status,
			Channel:   b.channel,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// Webhook endpoint for Edge Functions
	mux.HandleFunc("/webhook/message", func(w http.ResponseWriter, r *http.Request) {
		// CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var req WebhookRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Error decoding webhook request: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		if req.Message == "" || req.Channel == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Missing message or channel"})
			return
		}

		log.Printf("📨 Received webhook message: %s", req.Message)
		b.client.Say(req.Channel, req.Message)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(WebhookResponse{OK: true})
	})

	b.server = &http.Server{
		Addr:    "0.0.0.0:" + port,
		Handler: mux,
	}
}

func (b *Bot) setupTwitchHandlers() {
	// Handle chat messages
	b.client.OnPrivateMessage(func(message twitch.PrivateMessage) {
		// Ignore messages from the bot itself
		if message.User.Name == b.username {
			return
		}

		command := strings.ToLower(strings.TrimSpace(message.Message))
		parts := strings.Fields(command)

		if len(parts) == 0 {
			return
		}

		switch parts[0] {
		case "!ping":
			b.client.Say(message.Channel, "Pong!")
			return

		case "!collection":
			b.handleCollectionCommand(message, parts)
			return

		case "!stats":
			b.handleStatsCommand(message, parts)
			return

		case "!vaal":
			b.handleVaalCommand(message, parts)
			return
		}
	})

	// Handle connection events
	b.client.OnConnect(func() {
		log.Printf("✅ Bot connected to Twitch chat: %s", b.channel)
	})

	b.client.OnDisconnect(func() {
		log.Println("❌ Bot disconnected from Twitch")
	})
}

func (b *Bot) handleCollectionCommand(message twitch.PrivateMessage, parts []string) {
	if b.supabase == nil {
		b.client.Say(message.Channel, "❌ Service non disponible")
		return
	}

	targetUser := message.User.Name
	if len(parts) > 1 {
		targetUser = strings.TrimPrefix(parts[1], "@")
		targetUser = strings.ToLower(targetUser)
	} else {
		targetUser = strings.ToLower(targetUser)
	}

	// Query Supabase for user collection
	var result []struct {
		TwitchUsername string `json:"twitch_username"`
		VaalOrbs       int    `json:"vaal_orbs"`
		UserCollections []struct {
			Quantity   int `json:"quantity"`
			NormalCount int `json:"normal_count"`
			FoilCount   int `json:"foil_count"`
		} `json:"user_collections"`
	}

	data, _, err := b.supabase.From("users").
		Select("twitch_username,vaal_orbs,user_collections(quantity,normal_count,foil_count)", "exact", false).
		Eq("twitch_username", targetUser).
		Execute()

	if err != nil {
		log.Printf("Error fetching collection: %v", err)
		b.client.Say(message.Channel, fmt.Sprintf("❌ Erreur lors de la récupération de la collection"))
		return
	}

	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("Error unmarshaling collection: %v", err)
		b.client.Say(message.Channel, fmt.Sprintf("❌ Erreur lors de la récupération de la collection"))
		return
	}

	if len(result) == 0 || result[0].TwitchUsername == "" {
		b.client.Say(message.Channel, fmt.Sprintf("@%s n'a pas encore de collection", targetUser))
		return
	}

	user := result[0]

	totalCards := 0
	totalFoil := 0
	for _, col := range user.UserCollections {
		totalCards += col.Quantity
		totalFoil += col.FoilCount
	}

	b.client.Say(message.Channel, fmt.Sprintf("📦 @%s : %d cartes (%d ✨) | %d Vaal Orbs",
		targetUser, totalCards, totalFoil, user.VaalOrbs))
}

func (b *Bot) handleStatsCommand(message twitch.PrivateMessage, parts []string) {
	if b.supabase == nil {
		b.client.Say(message.Channel, "❌ Service non disponible")
		return
	}

	targetUser := message.User.Name
	if len(parts) > 1 {
		targetUser = strings.TrimPrefix(parts[1], "@")
		targetUser = strings.ToLower(targetUser)
	} else {
		targetUser = strings.ToLower(targetUser)
	}

	var result []struct {
		TwitchUsername string `json:"twitch_username"`
		VaalOrbs       int    `json:"vaal_orbs"`
		UserCollections []struct {
			Quantity int `json:"quantity"`
		} `json:"user_collections"`
		UserBoosters []struct {
			ID string `json:"id"`
		} `json:"user_boosters"`
	}

	data, _, err := b.supabase.From("users").
		Select("twitch_username,vaal_orbs,user_collections(quantity),user_boosters(id)", "exact", false).
		Eq("twitch_username", targetUser).
		Execute()

	if err != nil {
		log.Printf("Error fetching stats: %v", err)
		b.client.Say(message.Channel, fmt.Sprintf("❌ Erreur lors de la récupération des stats"))
		return
	}

	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("Error unmarshaling stats: %v", err)
		b.client.Say(message.Channel, fmt.Sprintf("❌ Erreur lors de la récupération des stats"))
		return
	}

	if len(result) == 0 || result[0].TwitchUsername == "" {
		b.client.Say(message.Channel, fmt.Sprintf("@%s n'a pas encore de stats", targetUser))
		return
	}

	user := result[0]
	totalCards := 0
	for _, col := range user.UserCollections {
		totalCards += col.Quantity
	}
	totalBoosters := len(user.UserBoosters)

	b.client.Say(message.Channel, fmt.Sprintf("📊 @%s : %d cartes | %d boosters ouverts | %d Vaal Orbs",
		targetUser, totalCards, totalBoosters, user.VaalOrbs))
}

func (b *Bot) handleVaalCommand(message twitch.PrivateMessage, parts []string) {
	if b.supabase == nil {
		b.client.Say(message.Channel, "❌ Service non disponible")
		return
	}

	targetUser := message.User.Name
	if len(parts) > 1 {
		targetUser = strings.TrimPrefix(parts[1], "@")
		targetUser = strings.ToLower(targetUser)
	} else {
		targetUser = strings.ToLower(targetUser)
	}

	var result []struct {
		TwitchUsername string `json:"twitch_username"`
		VaalOrbs       int    `json:"vaal_orbs"`
	}

	data, _, err := b.supabase.From("users").
		Select("twitch_username,vaal_orbs", "exact", false).
		Eq("twitch_username", targetUser).
		Execute()

	if err != nil {
		log.Printf("Error fetching vaal orbs: %v", err)
		b.client.Say(message.Channel, fmt.Sprintf("❌ Erreur lors de la récupération des Vaal Orbs"))
		return
	}

	if err := json.Unmarshal(data, &result); err != nil {
		log.Printf("Error unmarshaling vaal orbs: %v", err)
		b.client.Say(message.Channel, fmt.Sprintf("❌ Erreur lors de la récupération des Vaal Orbs"))
		return
	}

	if len(result) == 0 || result[0].TwitchUsername == "" {
		b.client.Say(message.Channel, fmt.Sprintf("@%s n'a pas encore de Vaal Orbs", targetUser))
		return
	}

	b.client.Say(message.Channel, fmt.Sprintf("💎 @%s a %d Vaal Orbs", targetUser, result[0].VaalOrbs))
}

func (b *Bot) Start() error {
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("WEBHOOK_PORT")
	}
	if port == "" {
		port = "3001"
	}

	// Setup HTTP server
	b.setupHTTPServer(port)

	// Start HTTP server in goroutine
	go func() {
		log.Printf("📡 Webhook server listening on port %s", port)
		log.Printf("   Endpoint: http://0.0.0.0:%s/webhook/message", port)
		log.Printf("   Health check: http://0.0.0.0:%s/health", port)

		if err := b.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}()

	// Setup Twitch handlers
	b.setupTwitchHandlers()

	// Connect to Twitch
	log.Println("🔌 Connecting to Twitch...")
	log.Println("✅ Service ready and listening for requests")

	// Connect to Twitch (this blocks)
	return b.client.Connect()
}

func (b *Bot) Stop() error {
	log.Println("🛑 Shutting down bot...")
	
	// Disconnect from Twitch
	b.client.Disconnect()

	// Shutdown HTTP server gracefully
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := b.server.Shutdown(ctx); err != nil {
		log.Printf("Error shutting down HTTP server: %v", err)
		return err
	}

	log.Println("🛑 Bot stopped")
	return nil
}

func main() {
	log.Println("🤖 Twitch Bot Service starting...")

	bot, err := NewBot()
	if err != nil {
		log.Fatalf("Failed to create bot: %v", err)
	}

	log.Printf("   Channel: %s", bot.channel)
	log.Printf("   Username: %s", bot.username)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start bot in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := bot.Start(); err != nil {
			errChan <- err
		}
	}()

	// Wait for signal or error
	select {
	case sig := <-sigChan:
		log.Printf("🛑 Received signal: %v", sig)
		if err := bot.Stop(); err != nil {
			log.Printf("Error stopping bot: %v", err)
		}
		os.Exit(0)
	case err := <-errChan:
		log.Fatalf("Bot error: %v", err)
	}
}
